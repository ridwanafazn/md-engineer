import { readFileSync } from "node:fs";
import { DOC_DEPS } from "../src/client/lib/docs";
import { revisionMessages } from "../src/client/lib/prompts";
import type { SpecModel } from "../src/shared/types";

const base = process.env.MDZS_BASE_URL ?? "https://mdzs.ridwanafzn.workers.dev";
const projectId = process.env.PHASE3_PROJECT_ID ?? "5a6f7b54-0fd0-47b2-a772-be226094b18e";
const targetType = process.env.PHASE3_TARGET_DOC ?? "API";
const instruction =
  process.env.PHASE3_INSTRUCTION ??
  "Tambahkan field priority (low/medium/high) pada task dan endpoint API terkait. Perbarui request/response, validasi, dan contoh. Jangan mengubah endpoint lain.";

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

async function aiStream(messages: unknown, sessionId: string, maxTokens: number): Promise<string> {
  const response = await fetch(`${base}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ messages, sessionId, stream: true, json: false, maxTokens }),
  });
  if (!response.ok) throw new Error(`AI ${response.status}: ${(await response.text()).slice(0, 300)}`);
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
  if (!full.trim()) throw new Error("Revisi kosong");
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
const specModel = detail.project.specModel as SpecModel | null;
if (!specModel) throw new Error("SpecModel tidak ditemukan");
const current = detail.documents.find((document: { type: string }) => document.type === targetType);
if (!current) throw new Error(`${targetType} tidak ditemukan`);

const relatedDocs = Object.fromEntries(
  DOC_DEPS[targetType as keyof typeof DOC_DEPS].map((dependency: string) => [
    dependency,
    detail.documents.find((document: { type: string }) => document.type === dependency)?.contentMd ?? "",
  ]),
);

console.log(`[phase3-revise] ${targetType}.md v${current.version} ${current.wordCount} kata`);
const revised = await aiStream(
  revisionMessages({
    type: targetType as any,
    instruction,
    currentContent: current.contentMd,
    specModel,
    relatedDocs,
  }),
  `phase3-revise-${projectId}-${targetType}`,
  96_000,
);
console.log(`[phase3-revise] revised ${revised.trim().split(/\s+/).length} kata`);

const saved = await api(`/api/projects/${projectId}/documents`, {
  method: "PUT",
  body: JSON.stringify({
    type: targetType,
    title: targetType,
    contentMd: revised,
    status: "draft",
  }),
});
console.log(`[phase3-revise] saved v${saved.document.version}`);
if (saved.document.version !== current.version + 1) {
  throw new Error(`Versi tidak naik: ${current.version} -> ${saved.document.version}`);
}

const restored = await api(`/api/projects/${projectId}/documents/${targetType}/restore`, {
  method: "POST",
  body: JSON.stringify({ version: current.version }),
});
if (restored.document.contentMd !== current.contentMd) {
  throw new Error("Restore tidak mengembalikan konten lama");
}
console.log(`[phase3-revise] restored v${restored.document.version}`);
console.log("PHASE3_REVISE_OK");
