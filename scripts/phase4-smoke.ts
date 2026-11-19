import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { strToU8, unzipSync, zipSync } from "fflate";

const base = process.env.MDZS_BASE_URL ?? "https://mdzs.ridwanafzn.workers.dev";
const projectId = process.env.PHASE4_PROJECT_ID ?? "5a6f7b54-0fd0-47b2-a772-be226094b18e";
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

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ passcode: vars.MDZS_PASSCODE }),
});
if (!login.ok) throw new Error(`Login gagal: ${login.status}`);
cookie = (login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie") ?? ""])[0].split(";")[0];

const detail = await api(`/api/projects/${projectId}`);
console.log(`[phase4] project ${detail.project.name}: ${detail.documents.length} dokumen`);

const share = await api(`/api/projects/${projectId}/share`, { method: "POST" });
const publicResponse = await fetch(`${base}/api/share/${share.link.token}`);
const publicData = await publicResponse.json();
console.log(`[phase4] share public status=${publicResponse.status} docs=${publicData.documents?.length}`);
if (!publicResponse.ok || publicData.documents.length !== detail.documents.length) {
  throw new Error("Public share tidak sesuai");
}

await api(`/api/projects/${projectId}/share/${share.link.id}/revoke`, { method: "POST" });
const revokedResponse = await fetch(`${base}/api/share/${share.link.token}`);
console.log(`[phase4] revoked status=${revokedResponse.status}`);
if (revokedResponse.status !== 404) throw new Error("Revoke gagal");

const files: Record<string, Uint8Array> = {};
for (const document of detail.documents) {
  files[`${document.type}.md`] = strToU8(document.contentMd);
}
files["MANIFEST.json"] = strToU8(JSON.stringify({ project: detail.project.name }));
const zipped = zipSync(files, { level: 6 });
const unzipped = unzipSync(zipped);
console.log(
  `[phase4] zip bytes=${zipped.byteLength} entries=${Object.keys(unzipped).length}`,
);
if (Object.keys(unzipped).length !== detail.documents.length + 1) {
  throw new Error("Isi ZIP tidak sesuai");
}

const githubToken = execSync("gh auth token", { encoding: "utf8" }).trim();
const commit = await api(`/api/projects/${projectId}/github/commit`, {
  method: "POST",
  body: JSON.stringify({
    repo: "ridwanafazn/md-engineer",
    branch: "main",
    token: githubToken,
    pathPrefix: "docs/blueprints/phase4-smoke",
  }),
});
console.log(`[phase4] github files=${commit.files} url=${commit.url}`);
console.log("PHASE4_SMOKE_OK");
