import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { analysisMessages, specModelMessages } from "../src/client/lib/prompts";
import type { ProjectAnalysis, SpecModel, StackRecommendation } from "../src/shared/types";

const base = process.env.MDZS_BASE_URL ?? "https://mdzs.ridwanafzn.workers.dev";
const limit = Number(process.env.EVAL_LIMIT ?? "5");
const keep = process.env.EVAL_KEEP === "1";
const timeoutMs = Number(process.env.EVAL_TIMEOUT_MS ?? "360000");
const only = process.env.EVAL_ONLY?.split(",").map(Number);
const append = process.env.EVAL_APPEND === "1";
const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).trim()];
    }),
);

const ideas = [
  "Marketplace jasa lokal untuk menghubungkan penyedia jasa seperti tukang, cleaner, dan montir dengan pelanggan di sekitar. Ada profil penyedia, pencarian, booking, pembayaran, dan ulasan.",
  "SaaS manajemen inventori untuk toko kecil: produk, stok, supplier, purchase order, penjualan, laporan stok rendah, dan multi-gudang sederhana.",
  "Aplikasi booking layanan salon dan barbershop: jadwal, layanan, staf, pelanggan, pembayaran, dan reminder.",
  "Platform kursus online: instruktur, kursus, video, kuis, enrollment, progres belajar, sertifikat, dan pembayaran.",
  "Tools internal untuk tim kecil: proyek, tugas, dokumen, approval, notifikasi, dan laporan mingguan.",
].slice(0, limit);

const genericStack: StackRecommendation = {
  frontend: "Next.js App Router + React + TypeScript",
  backend: "Next.js Route Handlers",
  database: "PostgreSQL",
  auth: "Auth.js",
  storage: "S3-compatible object storage",
  payment: "Stripe",
  deployment: "Vercel",
  reasoning: "Stack umum untuk MVP web satu tim.",
  alternatives: [],
};

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
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} -> ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function streamContent(body: Record<string, unknown>): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
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
      if (!full.trim()) throw new Error("AI stream kosong");
      return full;
    } catch (caught) {
      lastError = caught;
      console.log(`[eval] retry ${attempt}/3: ${caught instanceof Error ? caught.message : caught}`);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI gagal");
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

type EvalResult = {
  index: number;
  idea: string;
  projectId?: string;
  analysis?: { roles: number; features: number; complexity: string };
  spec?: {
    entities: number;
    endpoints: number;
    requirements: number;
    flows: number;
    businessRules: number;
  };
  score?: number;
  durationMs?: number;
  error?: string;
};

let results: EvalResult[] = [];
if (append && existsSync("eval/results.json")) {
  results = JSON.parse(readFileSync("eval/results.json", "utf8")) as EvalResult[];
}

function record(result: EvalResult) {
  const position = results.findIndex((item) => item.index === result.index);
  if (position >= 0) results[position] = result;
  else results.push(result);
  results.sort((a, b) => a.index - b.index);
}

function saveResults() {
  mkdirSync("eval", { recursive: true });
  writeFileSync("eval/results.json", JSON.stringify(results, null, 2));
  const lines = [
    "# Eval 5 Ide",
    "",
    "| # | Skor | Roles | Fitur | Entities | Endpoints | Reqs | Flows | Rules | Durasi | Status |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|",
  ];
  for (const result of results) {
    lines.push(
      `| ${result.index} | ${result.score ?? "-"} | ${result.analysis?.roles ?? "-"} | ${result.analysis?.features ?? "-"} | ${result.spec?.entities ?? "-"} | ${result.spec?.endpoints ?? "-"} | ${result.spec?.requirements ?? "-"} | ${result.spec?.flows ?? "-"} | ${result.spec?.businessRules ?? "-"} | ${result.durationMs ? Math.round(result.durationMs / 1000) + "s" : "-"} | ${result.error ? "ERROR" : "OK"} |`,
    );
  }
  writeFileSync("eval/report.md", `${lines.join("\n")}\n`);
}

for (const [index, idea] of ideas.entries()) {
  if (only && !only.includes(index + 1)) continue;
  const started = Date.now();
  let projectId = "";
  console.log(`[eval] ${index + 1}/${ideas.length} start`);
  try {
    const created = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: `Eval ${index + 1}`, idea, language: "id" }),
    });
    projectId = created.project.id;

    const analysis = await aiJson<ProjectAnalysis>(
      analysisMessages(idea, "id"),
      `eval-analysis-${index}`,
      32_000,
    );
    await api(`/api/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify({ analysis, status: "analyzed" }),
    });

    const specModel = await aiJson<SpecModel>(
      specModelMessages({
        idea,
        analysis,
        answers: [],
        stack: genericStack as unknown as Record<string, unknown>,
      }),
      `eval-spec-${index}`,
      64_000,
    );
    await api(`/api/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify({ specModel, status: "planned" }),
    });

    const reqIds = specModel.requirements.map((item) => item.id);
    const uniqueReqIds = new Set(reqIds).size === reqIds.length;
    const endpointsValid = specModel.endpoints.every((item) => item.path.startsWith("/api/"));
    const checks = [
      analysis.roles.length >= 2,
      analysis.features.length >= 5,
      specModel.entities.length >= 3,
      specModel.endpoints.length >= 5,
      specModel.requirements.length >= 8,
      specModel.flows.length >= 2,
      specModel.businessRules.length >= 2,
      uniqueReqIds,
      endpointsValid,
    ];
    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    const durationMs = Date.now() - started;

    record({
      index: index + 1,
      idea,
      projectId,
      analysis: {
        roles: analysis.roles.length,
        features: analysis.features.length,
        complexity: analysis.complexity,
      },
      spec: {
        entities: specModel.entities.length,
        endpoints: specModel.endpoints.length,
        requirements: specModel.requirements.length,
        flows: specModel.flows.length,
        businessRules: specModel.businessRules.length,
      },
      score,
      durationMs,
    });
    console.log(
      `[eval] ${index + 1} score=${score} entities=${specModel.entities.length} endpoints=${specModel.endpoints.length} reqs=${specModel.requirements.length} duration=${Math.round(durationMs / 1000)}s`,
    );
    saveResults();
  } catch (caught) {
    record({
      index: index + 1,
      idea,
      projectId,
      error: caught instanceof Error ? caught.message : String(caught),
      durationMs: Date.now() - started,
    });
    console.log(`[eval] ${index + 1} ERROR: ${caught instanceof Error ? caught.message : caught}`);
    saveResults();
  } finally {
    if (projectId && !keep) {
      await api(`/api/projects/${projectId}`, { method: "DELETE" }).catch(() => undefined);
    }
  }
}

saveResults();
console.log("EVAL5_OK");
