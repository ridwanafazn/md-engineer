import { readFileSync } from "node:fs";
import { GENERATION_ORDER } from "../src/client/lib/docs";
import { lintDocuments } from "../src/client/lib/lint";

const base = process.env.MDZS_BASE_URL ?? "https://mdzs.ridwanafzn.workers.dev";
const projectId = process.env.PHASE2_PROJECT_ID ?? "5a6f7b54-0fd0-47b2-a772-be226094b18e";
const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).trim()];
    }),
);

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ passcode: vars.MDZS_PASSCODE }),
});
if (!login.ok) throw new Error(`Login gagal: ${login.status}`);
const cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie") ?? ""])[0].split(";")[0];

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} -> ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const detail = await api(`/api/projects/${projectId}`);
const report = await lintDocuments(detail.documents, detail.project.specModel);
const existingTypes = new Set(detail.documents.map((document: { type: string }) => document.type));

console.log(
  `lint: ${report.errors} error, ${report.warnings} warning, ${detail.documents.length} dokumen`,
);
for (const type of GENERATION_ORDER) {
  if (!existingTypes.has(type)) continue;
  const issues = report.byType[type] ?? [];
  const status = issues.some((issue) => issue.severity === "error") ? "draft" : "verified";
  await api(`/api/projects/${projectId}/documents/${type}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (issues.length > 0) {
    console.log(`${type}:`);
    for (const issue of issues) console.log(`  [${issue.severity}] ${issue.message}`);
  } else {
    console.log(`${type}: OK`);
  }
}

console.log(report.errors === 0 ? "PHASE2_LINT_OK" : "PHASE2_LINT_HAS_ERRORS");
