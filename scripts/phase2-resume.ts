import { readFileSync } from "node:fs";
import { DOC_DEPS, GENERATION_ORDER } from "../src/client/lib/docs";
import { lintDocuments } from "../src/client/lib/lint";
import { documentMessages, type AnsweredQuestion } from "../src/client/lib/prompts";
import type { ProjectAnalysis, SpecModel, StackRecommendation } from "../src/shared/types";

const base = process.env.MDZS_BASE_URL ?? "https://mdzs.ridwanafzn.workers.dev";
const projectId = process.env.PHASE2_PROJECT_ID;
if (!projectId) throw new Error("PHASE2_PROJECT_ID wajib diisi");

const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).trim()];
    }),
);

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

async function postAi(body: Record<string, unknown>): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`AI ${response.status}: ${text.slice(0, 300)}`);
      }
      return response;
    } catch (caught) {
      lastError = caught;
      console.log(`[resume] retry ${attempt}/3: ${caught instanceof Error ? caught.message : caught}`);
      if (attempt < 3) await sleep(2_000 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI gagal");
}

async function aiStream(messages: unknown, sessionId: string, maxTokens: number): Promise<string> {
  const response = await postAi({ messages, sessionId, stream: true, json: false, maxTokens });
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

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ passcode: vars.MDZS_PASSCODE }),
});
if (!login.ok) throw new Error(`Login gagal: ${login.status}`);
cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie") ?? ""])[0].split(";")[0];

const detail = await api(`/api/projects/${projectId}`);
const analysis = detail.project.analysis as ProjectAnalysis | null;
const stack = detail.project.stack as StackRecommendation | null;
const specModel = detail.project.specModel as SpecModel | null;
if (!analysis || !stack || !specModel) throw new Error("Project belum punya analysis/stack/specModel");

const answers: AnsweredQuestion[] = detail.interview
  .filter((question: { answer?: string | null }) => question.answer)
  .map((question: { question: string; answer: string }) => ({
    question: question.question,
    answer: question.answer,
  }));

const generated: Record<string, { contentMd: string; wordCount: number }> = {};
for (const document of detail.documents) {
  generated[document.type] = document;
}

console.log(`[resume] project ${projectId}: ${detail.documents.length}/15 dokumen`);

for (const [index, type] of GENERATION_ORDER.entries()) {
  if (generated[type]?.contentMd?.trim()) {
    console.log(`[resume] skip ${type}.md (${generated[type].wordCount} kata)`);
    continue;
  }

  console.log(`[resume] document ${index + 1}/15 ${type}.md`);
  const dependencies = Object.fromEntries(
    DOC_DEPS[type].map((dependency) => [dependency, generated[dependency]?.contentMd ?? ""]),
  );

  const text = await aiStream(
    documentMessages(type, {
      idea: detail.project.idea,
      analysis,
      answers,
      stack: stack as unknown as Record<string, unknown>,
      specModel,
      dependencies,
    }),
    `resume-${projectId}-${type}`,
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
  console.log(`[resume] saved ${type}.md ${saved.document.wordCount} kata`);
}

const report = await lintDocuments(Object.values(generated), specModel);
for (const type of GENERATION_ORDER) {
  if (!generated[type]) continue;
  const issues = report.byType[type] ?? [];
  const status = issues.some((issue) => issue.severity === "error") ? "draft" : "verified";
  await api(`/api/projects/${projectId}/documents/${type}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (issues.length > 0) {
    console.log(`[resume] lint ${type}: ${issues.map((issue) => issue.message).join(" | ")}`);
  }
}

await api(`/api/projects/${projectId}`, {
  method: "PATCH",
  body: JSON.stringify({ status: report.ok ? "ready" : "planned" }),
});

console.log(`[resume] lint ${report.errors} error, ${report.warnings} warning`);
console.log("PHASE2_RESUME_OK");
