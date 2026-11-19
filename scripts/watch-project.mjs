import { appendFileSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const projectId = process.env.MDZS_PROJECT_ID ?? "5a6f7b54-0fd0-47b2-a772-be226094b18e";
const report = ".phase2-full-monitor.log";
const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).trim()];
    }),
);

if (!vars.DATABASE_URL) throw new Error("DATABASE_URL tidak ditemukan");
const sql = neon(vars.DATABASE_URL);

let lastCount = -1;
let staleChecks = 0;

while (true) {
  const now = new Date().toISOString();
  try {
    const rows = await sql`
      select type, status, word_count, updated_at
      from documents
      where project_id = ${projectId}
      order by updated_at desc
    `;
    const count = rows.length;
    const latest = rows[0];
    staleChecks = count === lastCount ? staleChecks + 1 : 0;
    lastCount = count;

    const state =
      count >= 15
        ? "SELESAI"
        : staleChecks >= 3
          ? "MUNGKIN_STUCK"
          : "AMAN";
    const line = `[${now}] status=${state} docs=${count}/15 latest=${latest?.type ?? "-"} docStatus=${latest?.status ?? "-"} words=${latest?.word_count ?? 0} staleChecks=${staleChecks}`;
    appendFileSync(report, `${line}\n`);
    console.log(line);

    if (count >= 15) break;
  } catch (error) {
    const line = `[${now}] status=ERROR message=${error instanceof Error ? error.message : String(error)}`;
    appendFileSync(report, `${line}\n`);
    console.log(line);
  }

  await new Promise((resolve) => setTimeout(resolve, 300_000));
}
