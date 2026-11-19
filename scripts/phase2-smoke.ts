import { readFileSync } from "node:fs";
import { DOC_DEPS, GENERATION_ORDER } from "../src/client/lib/docs";
import { lintDocuments } from "../src/client/lib/lint";
import {
  analysisMessages,
  documentMessages,
  interviewMessages,
  specModelMessages,
  stackMessages,
  type AnsweredQuestion,
} from "../src/client/lib/prompts";
import type { ProjectAnalysis, SpecModel, StackRecommendation } from "../src/shared/types";

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

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} -> ${response.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function aiJsonOnce<T>(messages: unknown, sessionId: string, maxTokens: number): Promise<T> {
  const content = await aiStreamOnce(messages, sessionId, maxTokens, true);
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`AI bukan JSON: ${content.slice(0, 300)}`);
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

async function aiJson<T>(messages: unknown, sessionId: string, maxTokens: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await aiJsonOnce<T>(messages, sessionId, maxTokens);
    } catch (caught) {
      lastError = caught;
      console.log(`[phase2] retry json ${attempt}/3: ${caught instanceof Error ? caught.message : caught}`);
      if (attempt < 3) await sleep(2_000 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI JSON gagal");
}

async function aiStreamOnce(
  messages: unknown,
  sessionId: string,
  maxTokens: number,
  json = false,
): Promise<string> {
  const response = await fetch(`${base}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ messages, sessionId, stream: true, json, maxTokens }),
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
  if (!full.trim()) throw new Error("AI stream kosong");
  return full;
}

async function aiStream(messages: unknown, sessionId: string, maxTokens: number): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await aiStreamOnce(messages, sessionId, maxTokens);
    } catch (caught) {
      lastError = caught;
      console.log(`[phase2] retry stream ${attempt}/2: ${caught instanceof Error ? caught.message : caught}`);
      if (attempt < 2) await sleep(2_000);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI stream gagal");
}

function log(step: string, detail: string) {
  console.log(`[phase2] ${step}: ${detail}`);
}

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ passcode: vars.MDZS_PASSCODE }),
});
if (!login.ok) throw new Error(`Login gagal: ${login.status}`);
cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie") ?? ""])[0].split(";")[0];
log("login", "ok");

const created = await api("/api/projects", {
  method: "POST",
  body: JSON.stringify({
    name: "Phase 2 Smoke",
    idea: "Aplikasi manajemen tugas untuk tim kecil. Pengguna dapat membuat proyek, menambah tugas, memberi komentar, dan melihat laporan mingguan. Ada role owner dan member. Login email/password. Tanpa pembayaran.",
    language: "id",
  }),
});
const projectId = created.project.id;
log("project", projectId);

const analysis = await aiJson<ProjectAnalysis>(
  analysisMessages(
    "Aplikasi manajemen tugas untuk tim kecil. Pengguna dapat membuat proyek, menambah tugas, memberi komentar, dan melihat laporan mingguan. Ada role owner dan member. Login email/password. Tanpa pembayaran.",
    "id",
  ),
  `p2-analysis-${projectId}`,
  32_000,
);
await api(`/api/projects/${projectId}`, {
  method: "PATCH",
  body: JSON.stringify({ analysis, status: "analyzed" }),
});
log("analysis", `${analysis.roles.length} roles, ${analysis.features.length} features`);

const interview = await aiJson<{ questions: { id: string; question: string; options: { value: string; label: string }[]; allowCustom: boolean; rationale: string }[] }>(
  interviewMessages(created.project.idea, analysis),
  `p2-interview-${projectId}`,
  32_000,
);
const savedInterview = await api(`/api/projects/${projectId}/interview`, {
  method: "PUT",
  body: JSON.stringify({ questions: interview.questions }),
});
const answered: AnsweredQuestion[] = [];
for (const question of savedInterview.questions) {
  const answer = question.options?.[0]?.label ?? "Tidak ada preferensi khusus.";
  await api(`/api/projects/${projectId}/interview/${question.id}`, {
    method: "PATCH",
    body: JSON.stringify({ answer }),
  });
  answered.push({ question: question.question, answer });
}
log("interview", `${savedInterview.questions.length} pertanyaan`);

const stack = await aiJson<StackRecommendation>(
  stackMessages(created.project.idea, analysis, answered),
  `p2-stack-${projectId}`,
  16_000,
);
await api(`/api/projects/${projectId}`, {
  method: "PATCH",
  body: JSON.stringify({ stack, status: "planned" }),
});
log("stack", stack.frontend);

const specModel = await aiJson<SpecModel>(
  specModelMessages({
    idea: created.project.idea,
    analysis,
    answers: answered,
    stack: stack as unknown as Record<string, unknown>,
  }),
  `p2-spec-${projectId}`,
  64_000,
);
await api(`/api/projects/${projectId}`, {
  method: "PATCH",
  body: JSON.stringify({ specModel, status: "planned" }),
});
log(
  "specModel",
  `${specModel.entities.length} entities, ${specModel.endpoints.length} endpoints, ${specModel.requirements.length} requirements`,
);

const generated: Record<string, any> = {};
const started = Date.now();

const requestedDocs = process.env.PHASE2_DOCS?.split(",").map((value) => value.trim()).filter(Boolean);
const documentOrder = requestedDocs
  ? GENERATION_ORDER.filter((type) => requestedDocs.includes(type))
  : GENERATION_ORDER;

for (const [index, type] of documentOrder.entries()) {
  log("document", `${index + 1}/${documentOrder.length} ${type}.md`);
  const dependencies = Object.fromEntries(
    DOC_DEPS[type].map((dependency) => [dependency, generated[dependency]?.contentMd ?? ""]),
  );
  const text = await aiStream(
    documentMessages(type, {
      idea: created.project.idea,
      analysis,
      answers: answered,
      stack: stack as unknown as Record<string, unknown>,
      specModel,
      dependencies,
    }),
    `p2-doc-${projectId}-${type}`,
    96_000,
  );
  if (text.trim().length < 200) throw new Error(`${type}.md kosong`);
  const saved = await api(`/api/projects/${projectId}/documents`, {
    method: "PUT",
    body: JSON.stringify({
      type,
      title: type,
      contentMd: text,
      status: "draft",
    }),
  });
  generated[type] = saved.document;
  log("saved", `${type}.md ${saved.document.wordCount} kata`);
}

const report = await lintDocuments(Object.values(generated), specModel);
for (const type of documentOrder) {
  const issues = report.byType[type] ?? [];
  const status = issues.some((issue) => issue.severity === "error") ? "draft" : "verified";
  await api(`/api/projects/${projectId}/documents/${type}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
log("lint", `${report.errors} error, ${report.warnings} warning`);
for (const type of documentOrder) {
  const issues = report.byType[type] ?? [];
  if (issues.length > 0) {
    console.log(`[phase2] lint ${type}: ${issues.slice(0, 3).map((issue) => issue.message).join(" | ")}`);
  }
}

const detail = await api(`/api/projects/${projectId}`);
log("detail", `${detail.documents.length} dokumen`);
log("duration", `${Math.round((Date.now() - started) / 1000)} detik`);

if (process.env.PHASE2_KEEP) {
  log("kept", projectId);
} else {
  await api(`/api/projects/${projectId}`, { method: "DELETE" });
  log("cleanup", "project dihapus");
}

console.log("PHASE2_SMOKE_OK");
