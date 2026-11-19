import { readFileSync } from "node:fs";

const base = process.env.MDZS_BASE_URL ?? "https://mdzs.ridwanafzn.workers.dev";
const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).trim()];
    }),
);

if (!vars.MDZS_PASSCODE) throw new Error("MDZS_PASSCODE tidak ditemukan di .dev.vars");

let cookie = "";

async function api(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} -> ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function aiJson(messages, sessionId, maxTokens = 12_000) {
  const response = await fetch(`${base}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ messages, sessionId, stream: false, json: true, maxTokens }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`AI ${response.status}: ${text.slice(0, 300)}`);
  const payload = JSON.parse(text);
  const content = payload.choices?.[0]?.message?.content ?? "";
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`AI bukan JSON: ${content.slice(0, 300)}`);
  return JSON.parse(candidate.slice(start, end + 1));
}

async function aiStream(messages, sessionId, maxTokens = 16_000) {
  const response = await fetch(`${base}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ messages, sessionId, stream: true, json: false, maxTokens }),
  });
  if (!response.ok) throw new Error(`AI stream ${response.status}: ${(await response.text()).slice(0, 300)}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Tidak ada stream");
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim().startsWith("data:")) continue;
      const data = line.trim().slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) full += delta;
      } catch {
        // ignore
      }
    }
  }
  return full;
}

function log(step, detail) {
  console.log(`[phase1] ${step}: ${detail}`);
}

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ passcode: vars.MDZS_PASSCODE }),
});
if (!login.ok) throw new Error(`Login gagal: ${login.status}`);
const cookies = login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie") ?? ""];
cookie = cookies[0].split(";")[0];
log("login", "ok");

const created = await api("/api/projects", {
  method: "POST",
  body: JSON.stringify({
    name: "Phase 1 Smoke",
    idea: "Aplikasi catatan pribadi untuk menyimpan ide, memberi tag, dan mencari catatan dengan cepat. Satu pengguna, tanpa kolaborasi.",
    language: "id",
  }),
});
const projectId = created.project.id;
log("project", projectId);

const analysis = await aiJson(
  [
    {
      role: "system",
      content:
        'Kembalikan HANYA JSON valid: {"summary":string,"problem":string,"targetUsers":string[],"roles":[{"name":string,"description":string,"permissions":string[]}],"features":[{"name":string,"description":string,"priority":"mvp"|"later"}],"complexity":"simple"|"medium"|"complex","suggestedDocs":string[],"risks":string[],"assumptions":string[]}',
    },
    { role: "user", content: "Analisis ide catatan pribadi ini secara singkat. Bahasa Indonesia." },
  ],
  `smoke-analysis-${projectId}`,
);
await api(`/api/projects/${projectId}`, {
  method: "PATCH",
  body: JSON.stringify({ analysis, status: "analyzed" }),
});
log("analysis", `${analysis.roles?.length ?? 0} roles, ${analysis.features?.length ?? 0} features`);

const interview = await aiJson(
  [
    {
      role: "system",
      content:
        'Kembalikan HANYA JSON valid: {"questions":[{"id":"q1","question":string,"options":[{"value":string,"label":string}],"allowCustom":true,"rationale":string}]}. Buat tepat 3 pertanyaan arsitektur. Bahasa Indonesia.',
    },
    { role: "user", content: "Buat interview untuk aplikasi catatan pribadi satu pengguna." },
  ],
  `smoke-interview-${projectId}`,
);
const savedInterview = await api(`/api/projects/${projectId}/interview`, {
  method: "PUT",
  body: JSON.stringify({ questions: interview.questions }),
});
log("interview", `${savedInterview.questions.length} pertanyaan`);

for (const question of savedInterview.questions) {
  const answer = question.options?.[0]?.label ?? "Tidak ada preferensi khusus.";
  await api(`/api/projects/${projectId}/interview/${question.id}`, {
    method: "PATCH",
    body: JSON.stringify({ answer }),
  });
}
await api(`/api/projects/${projectId}`, {
  method: "PATCH",
  body: JSON.stringify({ status: "interview" }),
});
log("answers", `${savedInterview.questions.length} dijawab`);

const stack = await aiJson(
  [
    {
      role: "system",
      content:
        'Kembalikan HANYA JSON valid: {"frontend":string,"backend":string,"database":string,"auth":string,"storage":string,"payment":string,"deployment":string,"reasoning":string,"alternatives":[{"layer":string,"option":string,"tradeoff":string}]}',
    },
    { role: "user", content: "Rekomendasikan stack sederhana untuk aplikasi catatan pribadi." },
  ],
  `smoke-stack-${projectId}`,
  8_000,
);
await api(`/api/projects/${projectId}`, {
  method: "PATCH",
  body: JSON.stringify({ stack, status: "planned" }),
});
log("stack", stack.frontend);

const prd = await aiStream(
  [
    {
      role: "system",
      content:
        "Tulis PRD Markdown ringkas namun lengkap. Sections: Executive Summary, Problem, Target Users, Roles, Scope, Features, Functional Requirements dengan REQ-001, Non-Functional, Success Metrics, Risks, Open Questions. Bahasa Indonesia. Tanpa placeholder TBD.",
    },
    {
      role: "user",
      content: `Ide: aplikasi catatan pribadi. Analisis: ${JSON.stringify(analysis)}. Stack: ${JSON.stringify(stack)}. Tulis PRD.`,
    },
  ],
  `smoke-prd-${projectId}`,
  64_000,
);
const words = prd.trim() ? prd.trim().split(/\s+/).length : 0;
if (words < 200) throw new Error(`PRD terlalu pendek: ${words} kata`);
await api(`/api/projects/${projectId}/documents`, {
  method: "PUT",
  body: JSON.stringify({
    type: "PRD",
    title: "Product Requirements",
    contentMd: prd,
    status: words >= 400 ? "verified" : "draft",
  }),
});
await api(`/api/projects/${projectId}`, {
  method: "PATCH",
  body: JSON.stringify({ status: "ready" }),
});
log("prd", `${words} kata`);

const detail = await api(`/api/projects/${projectId}`);
log("detail", `${detail.documents.length} dokumen, ${detail.interview.length} interview`);

await api(`/api/projects/${projectId}`, { method: "DELETE" });
log("cleanup", "project dihapus");
console.log("PHASE1_SMOKE_OK");
