import { useEffect, useState } from "react";
import { MarkdownView } from "@/client/components/MarkdownView";
import { api, type SharedProject } from "@/client/lib/api";
import { DOC_LABELS, DOC_TYPES, type DocType } from "@/shared/types";

export function SharedProjectPage({ token }: { token: string }) {
  const [data, setData] = useState<SharedProject | null>(null);
  const [selected, setSelected] = useState<DocType>("PRD");
  const [tab, setTab] = useState<"preview" | "raw">("preview");
  const [content, setContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const result = await api.getSharedProject(token);
        setData(result);
        if (!result.documents.some((document) => document.type === "PRD")) {
          setSelected((result.documents[0]?.type as DocType) ?? "PRD");
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Link tidak valid.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const selectedDoc = data?.documents.find((document) => document.type === selected);

  useEffect(() => {
    if (!selectedDoc) {
      setContent("");
      return;
    }
    let alive = true;
    setLoadingContent(true);
    void api
      .getSharedDocument(token, selected)
      .then((result) => {
        if (alive) setContent(result.document.contentMd);
      })
      .catch(() => {
        if (alive) setContent("");
      })
      .finally(() => {
        if (alive) setLoadingContent(false);
      });
    return () => {
      alive = false;
    };
  }, [token, selected, selectedDoc?.version]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="neu px-8 py-6 text-sm text-[var(--muted)]">Memuat blueprint…</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="neu max-w-md p-8 text-center">
          <h1 className="text-2xl font-semibold">Link tidak tersedia</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {error || "Link ini sudah dicabut atau tidak valid."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <header className="neu mb-4 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface)] text-sm font-semibold shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)]">
            md
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">mdzs</h1>
            <p className="text-xs text-[var(--muted)]">Read-only blueprint · {data.project.name}</p>
          </div>
        </div>
        <span className="neu-inset rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Tidak bisa diedit
        </span>
      </header>

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)_280px]">
        <aside className="neu flex max-h-[calc(100vh-8rem)] flex-col p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Blueprint
            </span>
            <span className="text-[11px] text-[var(--muted)]">{data.documents.length} / 15</span>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {DOC_TYPES.map((type, index) => {
              const document = data.documents.find((item) => item.type === type);
              if (!document) return null;
              const active = selected === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelected(type)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                    active
                      ? "neu-inset font-medium text-[var(--text)]"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="w-5 text-right text-[11px] tabular-nums opacity-60">{index + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">{type}.md</span>
                </button>
              );
            })}
          </nav>
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
            </div>
          </div>

          {selectedDoc ? (
            <div className="flex-1 overflow-auto p-5">
              {loadingContent ? (
                <div className="neu-inset rounded-2xl p-5 text-sm text-[var(--muted)]">
                  Memuat dokumen…
                </div>
              ) : tab === "preview" ? (
                <MarkdownView markdown={content} />
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-[13px] leading-7">{content}</pre>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--muted)]">
              Dokumen ini tidak tersedia.
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/50 px-5 py-3 text-xs text-[var(--muted)]">
            <span>{DOC_LABELS[selected]}</span>
            <span>v{selectedDoc?.version ?? "—"}</span>
          </div>
        </section>

        <aside className="neu flex min-h-[calc(100vh-8rem)] flex-col p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Tentang blueprint
          </p>
          <h2 className="mt-1 text-lg font-semibold">{data.project.name}</h2>
          <p className="mt-2 line-clamp-6 text-sm leading-6 text-[var(--muted)]">{data.project.idea}</p>

          <div className="neu-inset mt-4 rounded-2xl p-4 text-xs leading-6 text-[var(--muted)]">
            <p className="font-medium text-[var(--text)]">Akses</p>
            <p className="mt-1">Read-only. Tidak ada login, edit, chat, atau export.</p>
            <p className="mt-2">
              Dibagikan {new Date(data.link.createdAt).toLocaleString("id-ID")}
            </p>
          </div>

          <div className="mt-auto pt-4 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            mdzs · personal spec compiler
          </div>
        </aside>
      </div>
    </div>
  );
}
