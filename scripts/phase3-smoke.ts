import { readFileSync } from "node:fs";
import { DOC_DEPS } from "../src/client/lib/docs";
import { chatImpactMessages, revisionMessages } from "../src/client/lib/prompts";
import type { ChatResponse, SpecModel } from "../src/shared/types";

const base = process.env.MDZS_BASE_URL ?? "https://mdzs.ridwanafzn.workers.dev";
const projectId = process.env.PHASE3_PROJECT_ID ?? "5a6f7b54-0fd0-47b2-a772-be226094b18e";
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

async function postAi(body: Record<string, unknown>): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`AI ${response.status}: ${(await response.text()).slice(0, 300)}`);
      return response;
    } catch (caught) {
      lastError = caught;
      console.log(`[phase3] retry ${attempt}/3: ${caught instanceof Error ? caught.message : caught}`);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI gagal");
}

async function streamContent(body: Record<string, unknown>): Promise<string> {
  const response = await postAi(body);
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

async function aiJson<T>(messages: unknown, sessionId: string, maxTokens: number): Promise<T> {
  const content = await streamContent({
    messages,
    sessionId,
    stream: true,
    json: true,
    maxTokens,
  });
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`AI bukan JSON: ${content.slice(0, 300)}`);
  return JSON.parse(candidate.slice(start, end + 1)) as T;
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

const documents = detail.documents.map((document: { type: string; contentMd: string }) => ({
  type: document.type,
  contentMd: document.contentMd,
}));

const userMessage =
  "Tambahkan prioritas tugas (low/medium/high) ke model data dan API, lalu tampilkan di PRD.";
console.log(`[phase3] chat request: ${userMessage}`);

const chat = await aiJson<ChatResponse>(
  chatImpactMessages({
    projectName: detail.project.name,
    idea: detail.project.idea,
    specModel,
    documents,
    selectedType: "DATABASE",
    history: [],
    userMessage,
  }),
  `phase3-chat-${projectId}`,
  32_000,
);

console.log(`[phase3] reply: ${chat.reply.slice(0, 200)}`);
console.log(
  `[phase3] affected: ${chat.impact.affected.map((item) => item.doc).join(", ") || "(none)"}`,
);
if (!chat.impact.required || chat.impact.affected.length === 0) {
  throw new Error("Impact analysis tidak menghasilkan dokumen terdampak");
}

await api(`/api/projects/${projectId}/chat`, {
  method: "POST",
  body: JSON.stringify({ role: "user", content: userMessage }),
});
await api(`/api/projects/${projectId}/chat`, {
  method: "POST",
  body: JSON.stringify({
    role: "assistant",
    content: chat.reply,
    impactPlan: chat.impact,
  }),
});

const target = chat.impact.affected.find((item) =>
  detail.documents.some((document: { type: string }) => document.type === item.doc),
);
if (!target) throw new Error("Tidak ada dokumen target yang tersedia");
const current = detail.documents.find(
  (document: { type: string; contentMd: string; version: number }) => document.type === target.doc,
);
if (!current) throw new Error("Dokumen target tidak ditemukan");

console.log(`[phase3] revision ${target.doc}.md v${current.version}`);
const relatedDocs = Object.fromEntries(
  DOC_DEPS[target.doc].map((dependency) => [
    dependency,
    detail.documents.find((document: { type: string }) => document.type === dependency)?.contentMd ?? "",
  ]),
);

const revised = await streamContent({
  messages: revisionMessages({
    type: target.doc,
    instruction: target.instruction,
    currentContent: current.contentMd,
    specModel,
    relatedDocs,
  }),
  sessionId: `phase3-revision-${projectId}`,
  stream: true,
  json: false,
  maxTokens: 96_000,
});

if (revised.trim().length < 200) throw new Error("Revisi kosong");
const saved = await api(`/api/projects/${projectId}/documents`, {
  method: "PUT",
  body: JSON.stringify({
    type: target.doc,
    title: target.doc,
    contentMd: revised,
    status: "draft",
  }),
});
console.log(`[phase3] saved ${target.doc}.md v${saved.document.version} ${saved.document.wordCount} kata`);
if (saved.document.version !== current.version + 1) {
  throw new Error(`Versi tidak naik: ${current.version} -> ${saved.document.version}`);
}

const restored = await api(`/api/projects/${projectId}/documents/${target.doc}/restore`, {
  method: "POST",
  body: JSON.stringify({ version: current.version }),
});
console.log(`[phase3] restored ${target.doc}.md v${restored.document.version}`);
if (restored.document.contentMd !== current.contentMd) {
  throw new Error("Restore tidak mengembalikan konten lama");
}

const after = await api(`/api/projects/${projectId}`);
const restoredDoc = after.documents.find((document: { type: string }) => document.type === target.doc);
if (!restoredDoc || restoredDoc.contentMd !== current.contentMd) {
  throw new Error("Verifikasi restore gagal");
}

const chatRows = await api(`/api/projects/${projectId}/chat`);
console.log(`[phase3] chat messages: ${chatRows.messages.length}`);
console.log("PHASE3_SMOKE_OK");
