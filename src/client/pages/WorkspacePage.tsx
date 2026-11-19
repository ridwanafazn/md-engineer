import { useEffect, useState } from "react";
import { AppShell } from "@/client/components/AppShell";
import { api, type ProjectDetail } from "@/client/lib/api";
import { DOC_LABELS, DOC_TYPES, type DocType } from "@/shared/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  generating: "Generating",
  verified: "Verified",
  stale: "Stale",
};

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
  const [tab, setTab] = useState<"preview" | "raw">("preview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await api.getProject(projectId);
        setDetail(data);
        const prd = data.documents.find((document) => document.type === "PRD");
        if (!prd) setSelected("PRD");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Gagal memuat workspace.");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const selectedDoc = detail?.documents.find((document) => document.type === selected);
  const completed = detail?.documents.length ?? 0;

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
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
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
                      document?.status === "verified"
                        ? "text-emerald-600"
                        : document
                          ? "text-amber-600"
                          : "opacity-40"
                    }`}
                  >
                    {document ? (STATUS_LABEL[document.status] ?? document.status) : "—"}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-4 space-y-2">
            <button
              onClick={() => onResume(projectId)}
              className="neu-button w-full rounded-xl px-3 py-2.5 text-xs font-semibold text-white"
            >
              Lanjutkan wizard
            </button>
            <button
              disabled
              className="neu-button w-full rounded-xl px-3 py-2.5 text-xs font-medium text-[var(--text)] opacity-50"
            >
              Export semua · Fase 4
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
              <button
                onClick={() => setTab("preview")}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  tab === "preview" ? "font-medium text-[var(--text)]" : "text-[var(--muted)]"
                }`}
              >
                Rich Preview
              </button>
              <button
                onClick={() => setTab("raw")}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  tab === "raw" ? "font-medium text-[var(--text)]" : "text-[var(--muted)]"
                }`}
              >
                Raw Markdown
              </button>
              <button
                disabled
                className="rounded-lg px-3 py-1.5 text-xs text-[var(--muted)] opacity-50"
              >
                Diff Compare
              </button>
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
                <span className="ml-auto">{DOC_LABELS[selected]}</span>
              </div>
              <div className="flex-1 overflow-auto p-5">
                <pre
                  className={`whitespace-pre-wrap text-sm leading-7 ${
                    tab === "raw" ? "font-mono text-[13px]" : "font-sans"
                  }`}
                >
                  {selectedDoc.contentMd}
                </pre>
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
                  Dokumen ini akan tersedia setelah wizard dan fase berikutnya. Untuk sekarang,
                  lanjutkan wizard untuk menyelesaikan PRD.
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            AI Assistant
          </p>
          <h2 className="mt-1 text-lg font-semibold">Spec architect</h2>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
            <div className="neu-inset rounded-2xl p-4 text-sm leading-6 text-[var(--muted)]">
              PRD sudah tersedia. Fase 2 akan menambahkan 14 dokumen lainnya, linter konsistensi,
              dan rich preview.
            </div>
            <div className="rounded-2xl bg-white/35 p-4 text-xs leading-6 text-[var(--muted)]">
              <p className="font-medium text-[var(--text)]">Kontek proyek</p>
              <ul className="mt-2 space-y-1">
                <li>Status: {detail.project.status}</li>
                <li>Dokumen: {completed} / 15</li>
                <li>Bahasa: {detail.project.language}</li>
                <li>Interview: {detail.interview.length} pertanyaan</li>
              </ul>
            </div>
            {detail.project.analysis ? (
              <div className="rounded-2xl bg-white/25 p-4 text-xs leading-6 text-[var(--muted)]">
                <p className="font-medium text-[var(--text)]">Kompleksitas</p>
                <p className="mt-1 capitalize">{detail.project.analysis.complexity}</p>
                <p className="mt-2">{detail.project.analysis.summary}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <div className="neu-inset flex items-end gap-2 rounded-2xl p-3">
              <textarea
                rows={2}
                disabled
                placeholder="Chat assistant tersedia di Fase 3…"
                className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
              />
              <button
                disabled
                className="neu-button flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold text-white opacity-50"
              >
                ↑
              </button>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
