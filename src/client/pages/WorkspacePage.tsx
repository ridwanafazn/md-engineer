import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/client/components/AppShell";
import { ChatPanel } from "@/client/components/ChatPanel";
import { DiffView } from "@/client/components/DiffView";
import { GithubCommitModal } from "@/client/components/GithubCommitModal";
import { MarkdownView } from "@/client/components/MarkdownView";
import { ShareModal } from "@/client/components/ShareModal";
import { api, type DocumentVersion, type ProjectDetail } from "@/client/lib/api";
import { downloadProjectZip } from "@/client/lib/export";
import { lintDocuments, type LintReport } from "@/client/lib/lint";
import { DOC_LABELS, DOC_TYPES, type DocType } from "@/shared/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  generating: "Generating",
  verified: "Verified",
  stale: "Stale",
};

type Tab = "preview" | "raw" | "diff";

export function WorkspacePage({
  projectId,
  onBack,
  onResume,
  onLogout,
}: {
  projectId: string;
  onBack: () => void;
  onResume: (id: string) => void;
  onLogout: () => void;
}) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [selected, setSelected] = useState<DocType>("PRD");
  const [tab, setTab] = useState<Tab>("preview");
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [compareVersion, setCompareVersion] = useState<number | "previous">("previous");
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [lintReport, setLintReport] = useState<LintReport | null>(null);
  const [linting, setLinting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [selectedContent, setSelectedContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProject = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const data = await api.getProject(projectId, true);
        setDetail(data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Gagal memuat workspace.");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    void loadProject(true);
  }, [loadProject]);

  const selectedDoc = detail?.documents.find((document) => document.type === selected);

  useEffect(() => {
    setCompareVersion("previous");
    setVersions([]);
    setRestoreError("");
    setSelectedContent("");
  }, [selected]);

  useEffect(() => {
    if (!selectedDoc) {
      setSelectedContent("");
      return;
    }
    let alive = true;
    setLoadingContent(true);
    void api
      .getDocument(projectId, selected)
      .then((result) => {
        if (alive) setSelectedContent(result.document.contentMd);
      })
      .catch(() => {
        if (alive) setSelectedContent("");
      })
      .finally(() => {
        if (alive) setLoadingContent(false);
      });
    return () => {
      alive = false;
    };
  }, [projectId, selected, selectedDoc?.version]);

  async function lintAll() {
    if (!detail) return;
    setLinting(true);
    setError("");
    try {
      const fullDocs = [];
      for (const document of detail.documents) {
        const result = await api.getDocument(projectId, document.type);
        fullDocs.push(result.document);
      }
      const report = await lintDocuments(fullDocs, detail.project.specModel ?? null);
      setLintReport(report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Lint gagal.");
    } finally {
      setLinting(false);
    }
  }

  async function exportZip() {
    if (!detail) return;
    setExporting(true);
    setError("");
    try {
      const fullDocs = [];
      for (const document of detail.documents) {
        const result = await api.getDocument(projectId, document.type);
        fullDocs.push(result.document);
      }
      downloadProjectZip(detail.project.name, fullDocs);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export ZIP gagal.");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    if (tab !== "diff" || !selectedDoc) return;
    let alive = true;
    setVersionsLoading(true);
    void api
      .listVersions(projectId, selected)
      .then((result) => {
        if (alive) setVersions(result.versions);
      })
      .catch(() => {
        if (alive) setVersions([]);
      })
      .finally(() => {
        if (alive) setVersionsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tab, selected, projectId, selectedDoc?.version]);

  const previousVersion = useMemo(() => {
    if (!selectedDoc) return null;
    return (
      versions
        .filter((version) => version.version < selectedDoc.version)
        .sort((a, b) => b.version - a.version)[0] ?? null
    );
  }, [versions, selectedDoc]);

  const compareSnapshot =
    compareVersion === "previous"
      ? previousVersion
      : (versions.find((version) => version.version === compareVersion) ?? previousVersion);

  const selectedIssues = lintReport?.byType[selected] ?? [];
  const completed = detail?.documents.length ?? 0;

  async function restoreSnapshot() {
    if (!compareSnapshot) return;
    const confirmed = window.confirm(
      `Restore ${selected}.md ke versi v${compareSnapshot.version}? Versi saat ini akan disimpan sebagai snapshot.`,
    );
    if (!confirmed) return;

    setRestoring(true);
    setRestoreError("");
    try {
      await api.restoreVersion(projectId, selected, compareSnapshot.version);
      await loadProject(false);
      const result = await api.listVersions(projectId, selected);
      setVersions(result.versions);
      setCompareVersion("previous");
    } catch (caught) {
      setRestoreError(caught instanceof Error ? caught.message : "Gagal restore versi.");
    } finally {
      setRestoring(false);
    }
  }

  if (loading) {
    return (
      <AppShell onLogout={onLogout} onHome={onBack}>
        <div className="neu p-6 text-sm text-[var(--muted)]">Memuat workspace…</div>
      </AppShell>
    );
  }

  if (!detail) {
    return (
      <AppShell onLogout={onLogout} onHome={onBack}>
        <div className="neu p-6 text-sm text-red-600">{error || "Proyek tidak ditemukan."}</div>
      </AppShell>
    );
  }

  return (
    <AppShell onLogout={onLogout} onHome={onBack} projectName={detail.project.name}>
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="neu flex max-h-[calc(100vh-8rem)] flex-col p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Blueprint
            </span>
            <span className="text-[11px] text-[var(--muted)]">{completed} / 15</span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {DOC_TYPES.map((type, index) => {
              const document = detail.documents.find((item) => item.type === type);
              const active = selected === type;
              const issues = lintReport?.byType[type] ?? [];
              const hasError = issues.some((issue) => issue.severity === "error");
              return (
                <button
                  key={type}
                  onClick={() => setSelected(type)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? "neu-inset font-medium text-[var(--text)]"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="w-5 text-right text-[11px] tabular-nums opacity-60">{index + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">{type}.md</span>
                  <span
                    className={`text-[9px] uppercase tracking-wide ${
                      hasError
                        ? "text-red-600"
                        : document?.status === "verified"
                          ? "text-emerald-600"
                          : document
                            ? "text-amber-600"
                            : "opacity-40"
                    }`}
                  >
                    {hasError ? "Issue" : document ? (STATUS_LABEL[document.status] ?? document.status) : "—"}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-4 space-y-2">
            <button
              onClick={() => void exportZip()}
              disabled={exporting}
              className="neu-button w-full rounded-xl px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {exporting ? "Menyiapkan ZIP…" : "Export ZIP"}
            </button>
            <button
              onClick={() => void lintAll()}
              disabled={linting}
              className="neu-button w-full rounded-xl px-3 py-2.5 text-xs font-medium text-[var(--text)] disabled:opacity-50"
            >
              {linting ? "Lint semua…" : "Lint semua"}
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="neu-button w-full rounded-xl px-3 py-2.5 text-xs font-medium text-[var(--text)]"
            >
              Share read-only
            </button>
            <button
              onClick={() => setShowGithub(true)}
              className="neu-button w-full rounded-xl px-3 py-2.5 text-xs font-medium text-[var(--text)]"
            >
              Commit GitHub
            </button>
            <button
              onClick={() => onResume(projectId)}
              className="neu-button w-full rounded-xl px-3 py-2.5 text-xs font-medium text-[var(--muted)]"
            >
              Lanjutkan wizard
            </button>
          </div>
        </aside>

        <section className="neu flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/50 px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Dokumen</p>
              <h2 className="text-lg font-semibold">{selected}.md</h2>
            </div>
            <div className="flex gap-1 rounded-xl p-1 neu-inset">
              {(
                [
                  ["preview", "Rich Preview"],
                  ["raw", "Raw Markdown"],
                  ["diff", "Diff Compare"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs ${
                    tab === value ? "font-medium text-[var(--text)]" : "text-[var(--muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {selectedDoc ? (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-white/50 px-5 py-3 text-[11px] text-[var(--muted)]">
                <span className="rounded-full bg-white/40 px-2.5 py-1">v{selectedDoc.version}</span>
                <span
                  className={`rounded-full px-2.5 py-1 ${
                    selectedDoc.status === "verified"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {STATUS_LABEL[selectedDoc.status] ?? selectedDoc.status}
                </span>
                <span>{selectedDoc.wordCount} kata</span>
                {selectedIssues.length > 0 ? (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                    {selectedIssues.length} isu lint
                  </span>
                ) : null}
                <span className="ml-auto">{DOC_LABELS[selected]}</span>
              </div>
              <div className="flex-1 overflow-auto p-5">
                {loadingContent ? (
                  <div className="neu-inset rounded-2xl p-5 text-sm text-[var(--muted)]">
                    Memuat dokumen…
                  </div>
                ) : tab === "preview" ? (
                  <MarkdownView markdown={selectedContent} />
                ) : tab === "raw" ? (
                  <pre className="whitespace-pre-wrap font-mono text-[13px] leading-7">
                    {selectedContent}
                  </pre>
                ) : versionsLoading ? (
                  <div className="neu-inset rounded-2xl p-5 text-sm text-[var(--muted)]">
                    Memuat versi…
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={String(compareVersion)}
                        onChange={(event) =>
                          setCompareVersion(
                            event.target.value === "previous"
                              ? "previous"
                              : Number(event.target.value),
                          )
                        }
                        className="neu-inset rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      >
                        <option value="previous">Versi sebelumnya</option>
                        {versions.map((version) => (
                          <option key={version.version} value={version.version}>
                            v{version.version} · {version.reason || "snapshot"}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => void restoreSnapshot()}
                        disabled={!compareSnapshot || restoring}
                        className="neu-button rounded-xl px-3 py-2 text-xs font-medium text-[var(--text)] disabled:opacity-50"
                      >
                        {restoring ? "Restore…" : "Restore versi ini"}
                      </button>
                      {restoreError ? <span className="text-xs text-red-600">{restoreError}</span> : null}
                    </div>
                    <DiffView
                      oldText={compareSnapshot?.contentMd ?? ""}
                      newText={selectedContent}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="max-w-md text-center">
                <div className="neu-inset mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-semibold text-[var(--muted)]">
                  {selected}
                </div>
                <h3 className="text-xl font-semibold">{selected}.md belum dibuat</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Jalankan wizard untuk menghasilkan SpecModel dan 15 dokumen.
                </p>
                <button
                  onClick={() => onResume(projectId)}
                  className="neu-button mt-5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white"
                >
                  Lanjutkan wizard →
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/50 px-5 py-3 text-xs text-[var(--muted)]">
            <span>{detail.project.name}</span>
            <span className="uppercase tracking-[0.14em]">{detail.project.status}</span>
          </div>
        </section>

        <aside className="neu flex min-h-[calc(100vh-8rem)] flex-col p-4">
          <ChatPanel
            projectId={projectId}
            detail={detail}
            selected={selected}
            onDocsChanged={() => loadProject(false)}
          />
        </aside>
      </div>

      {showShare ? (
        <ShareModal
          projectId={projectId}
          projectName={detail.project.name}
          onClose={() => setShowShare(false)}
        />
      ) : null}

      {showGithub ? (
        <GithubCommitModal
          projectId={projectId}
          projectName={detail.project.name}
          onClose={() => setShowGithub(false)}
        />
      ) : null}
    </AppShell>
  );
}
