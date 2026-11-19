import { useMemo, useState } from "react";
import { api, type DocumentRow, type ProjectDetail } from "@/client/lib/api";
import { aiJson, aiStream } from "@/client/lib/ai";
import {
  DOC_DEPS,
  DOC_PURPOSE,
  DOC_SECTIONS,
  GENERATION_ORDER,
} from "@/client/lib/docs";
import { lintDocuments, type LintReport } from "@/client/lib/lint";
import {
  documentMessages,
  specModelMessages,
  type AnsweredQuestion,
} from "@/client/lib/prompts";
import {
  DOC_LABELS,
  type DocType,
  type ProjectAnalysis,
  type SpecModel,
  type StackRecommendation,
} from "@/shared/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  generating: "Generating",
  verified: "Verified",
  stale: "Stale",
};

export function DocumentGenerator({
  projectId,
  detail,
  analysis,
  answers,
  stack,
  onComplete,
}: {
  projectId: string;
  detail: ProjectDetail;
  analysis: ProjectAnalysis;
  answers: AnsweredQuestion[];
  stack: StackRecommendation;
  onComplete: (id: string) => void;
}) {
  const [specModel, setSpecModel] = useState<SpecModel | null>(detail.project.specModel ?? null);
  const [docs, setDocs] = useState<Partial<Record<DocType, DocumentRow>>>(() =>
    Object.fromEntries(detail.documents.map((document) => [document.type as DocType, document])),
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [currentType, setCurrentType] = useState<DocType | null>(null);
  const [lintReport, setLintReport] = useState<LintReport | null>(null);

  const completedCount = useMemo(
    () => GENERATION_ORDER.filter((type) => docs[type]?.contentMd?.trim()).length,
    [docs],
  );
  const allGenerated = completedCount === GENERATION_ORDER.length;
  const nextMissing = GENERATION_ORDER.find((type) => !docs[type]?.contentMd?.trim());

  async function buildSpecModel() {
    setBusy(true);
    setError("");
    setStatus("Menyusun SpecModel kanonik: roles, entity, endpoint, requirement…");
    try {
      const model = await aiJson<SpecModel>(
        specModelMessages({
          idea: detail.project.idea,
          analysis,
          answers,
          stack: stack as unknown as Record<string, unknown>,
        }),
        `spec-${projectId}`,
        64_000,
      );

      if (!model.requirements?.length || !model.entities?.length || !model.endpoints?.length) {
        throw new Error("SpecModel tidak lengkap. Coba susun ulang.");
      }

      const normalized: SpecModel = {
        ...model,
        project: {
          ...model.project,
          name: detail.project.name,
          summary: model.project?.summary || analysis.summary,
        },
      };

      const docPlan = GENERATION_ORDER.map((type) => ({
        type,
        title: `${type}.md`,
        purpose: DOC_PURPOSE[type],
        dependsOn: DOC_DEPS[type],
        sections: DOC_SECTIONS[type],
      }));

      setSpecModel(normalized);
      await api.updateProject(projectId, {
        specModel: normalized,
        docPlan,
        status: "planned",
      });
      setStatus("SpecModel siap. Lanjut generate 15 dokumen.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyusun SpecModel.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function runLint(docsToLint: Partial<Record<DocType, DocumentRow>>) {
    const list = Object.values(docsToLint).filter(Boolean) as DocumentRow[];
    if (list.length === 0) return;
    setStatus("Menjalankan lint konsistensi dan Mermaid…");
    const report = await lintDocuments(list, specModel);
    setLintReport(report);

    const updated: Partial<Record<DocType, DocumentRow>> = { ...docsToLint };
    for (const type of GENERATION_ORDER) {
      const issues = report.byType[type];
      if (!issues) continue;
      const nextStatus = issues.some((issue) => issue.severity === "error") ? "draft" : "verified";
      try {
        const result = await api.updateDocumentStatus(projectId, type, nextStatus);
        updated[type] = result.document;
      } catch {
        if (updated[type]) updated[type] = { ...updated[type]!, status: nextStatus };
      }
    }
    setDocs(updated);

    const all = GENERATION_ORDER.every((type) => updated[type]?.contentMd?.trim());
    if (all && report.ok) {
      await api.updateProject(projectId, { status: "ready" }).catch(() => undefined);
    }
    setStatus(
      report.ok
        ? `Lint selesai: 0 error, ${report.warnings} warning.`
        : `Lint selesai: ${report.errors} error, ${report.warnings} warning.`,
    );
  }

  async function generateAll() {
    if (!specModel) return;
    setBusy(true);
    setError("");
    setLintReport(null);
    let localDocs = { ...docs };

    try {
      for (const [index, type] of GENERATION_ORDER.entries()) {
        if (localDocs[type]?.contentMd?.trim()) continue;

        setCurrentType(type);
        setStatus(`Menulis ${type}.md (${index + 1}/${GENERATION_ORDER.length})…`);

        const dependencies = Object.fromEntries(
          DOC_DEPS[type].map((dependency) => [dependency, localDocs[dependency]?.contentMd ?? ""]),
        ) as Partial<Record<DocType, string>>;

        let text = "";
        await aiStream(
          documentMessages(type, {
            idea: detail.project.idea,
            analysis,
            answers,
            stack: stack as unknown as Record<string, unknown>,
            specModel,
            dependencies,
          }),
          `doc-${projectId}-${type}`,
          (delta) => {
            text += delta;
          },
          96_000,
        );

        if (text.trim().length < 200) {
          throw new Error(`${type}.md kosong atau terlalu pendek.`);
        }

        const saved = await api.upsertDocument(projectId, {
          type,
          title: DOC_LABELS[type],
          contentMd: text,
          status: "draft",
        });
        localDocs = { ...localDocs, [type]: saved.document };
        setDocs(localDocs);
      }

      setCurrentType(null);
      await runLint(localDocs);
      await api.updateProject(projectId, { status: "ready" }).catch(() => undefined);
      setStatus("15 dokumen selesai. Buka workspace untuk review.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generasi dokumen berhenti.");
      setStatus("Generasi berhenti. Dokumen yang sudah selesai tetap tersimpan.");
    } finally {
      setBusy(false);
      setCurrentType(null);
    }
  }

  return (
    <section className="neu p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Langkah 4
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">SpecModel & 15 dokumen</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
        SpecModel menjadi sumber kebenaran. Setiap dokumen ditulis dari model yang sama, lalu
        diperiksa lint referensi, requirement ID, entity, dan Mermaid.
      </p>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {status ? (
        <div className="neu-inset mt-4 rounded-2xl px-4 py-3 text-sm text-[var(--muted)]">{status}</div>
      ) : null}

      {!specModel ? (
        <div className="mt-6">
          <button
            onClick={buildSpecModel}
            disabled={busy}
            className="neu-button rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Menyusun SpecModel…" : "Bangun SpecModel"}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Roles", specModel.roles.length],
              ["Entities", specModel.entities.length],
              ["Endpoints", specModel.endpoints.length],
              ["Requirements", specModel.requirements.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="neu-inset rounded-2xl px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
              <span>
                {completedCount} / {GENERATION_ORDER.length} dokumen
              </span>
              <span>{Math.round((completedCount / GENERATION_ORDER.length) * 100)}%</span>
            </div>
            <div className="neu-inset h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${(completedCount / GENERATION_ORDER.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {GENERATION_ORDER.map((type, index) => {
              const document = docs[type];
              const active = currentType === type;
              return (
                <div
                  key={type}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                    active ? "neu-inset" : "bg-white/20"
                  }`}
                >
                  <span className="w-5 text-right text-[11px] tabular-nums text-[var(--muted)]">
                    {index + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{type}.md</p>
                    <p className="truncate text-[10px] text-[var(--muted)]">{DOC_PURPOSE[type]}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[9px] uppercase tracking-wide ${
                      active
                        ? "bg-indigo-100 text-indigo-800"
                        : document?.status === "verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : document
                            ? "bg-amber-100 text-amber-800"
                            : "bg-white/40 text-[var(--muted)]"
                    }`}
                  >
                    {active
                      ? "Generating"
                      : document
                        ? (STATUS_LABEL[document.status] ?? document.status)
                        : "Missing"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            {!allGenerated ? (
              <button
                onClick={generateAll}
                disabled={busy}
                className="neu-button rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? currentType
                    ? `Menulis ${currentType}.md…`
                    : "Generate…"
                  : completedCount > 0
                    ? `Lanjutkan generate (${completedCount}/15)`
                    : "Generate 15 dokumen"}
              </button>
            ) : (
              <>
                <button
                  onClick={() => void runLint(docs)}
                  disabled={busy}
                  className="neu-button rounded-2xl px-5 py-3 text-sm font-medium text-[var(--text)] disabled:opacity-50"
                >
                  Lint ulang
                </button>
                <button
                  onClick={() => onComplete(projectId)}
                  disabled={busy}
                  className="neu-button rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Buka workspace →
                </button>
              </>
            )}
          </div>

          {busy ? (
            <p className="text-xs leading-5 text-[var(--muted)]">
              Jangan tutup tab. Setiap dokumen disimpan setelah selesai; jika proses berhenti, tombol
              lanjutkan akan melewati dokumen yang sudah ada.
            </p>
          ) : null}

          {lintReport ? (
            <div className="neu-inset rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Lint report</p>
                <p className={`text-xs ${lintReport.ok ? "text-emerald-700" : "text-red-700"}`}>
                  {lintReport.errors} error · {lintReport.warnings} warning
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {Object.entries(lintReport.byType)
                  .filter(([, issues]) => (issues?.length ?? 0) > 0)
                  .map(([type, issues]) => (
                    <details key={type} className="rounded-xl bg-white/35 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-medium">
                        {type}.md · {issues?.length ?? 0} isu
                      </summary>
                      <ul className="mt-2 space-y-1 text-[11px] leading-5 text-[var(--muted)]">
                        {issues?.map((issue, index) => (
                          <li
                            key={`${type}-${index}`}
                            className={issue.severity === "error" ? "text-red-700" : "text-amber-700"}
                          >
                            [{issue.severity}] {issue.message}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                {Object.values(lintReport.byType).every((issues) => !issues?.length) ? (
                  <p className="text-xs text-emerald-700">Semua dokumen lolos lint.</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {allGenerated && !busy ? (
            <div className="rounded-2xl bg-emerald-50/80 p-4 text-sm text-emerald-900">
              15 dokumen sudah tersimpan. Status mengikuti hasil lint; dokumen dengan error tetap
              bisa dibuka dan direvisi.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
