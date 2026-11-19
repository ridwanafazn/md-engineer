import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "@/client/components/AppShell";
import { api, type Project } from "@/client/lib/api";

const STATUS_LABEL: Record<string, string> = {
  intake: "Intake",
  analyzed: "Analisis selesai",
  interview: "Interview",
  planned: "Siap generate",
  generating: "Generating",
  ready: "Ready",
  archived: "Archived",
};

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ProjectsPage({
  onOpen,
  onLogout,
}: {
  onOpen: (id: string, mode: "wizard" | "workspace") => void;
  onLogout: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [language, setLanguage] = useState<"id" | "en">("id");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api.listProjects();
      setProjects(result.projects);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat proyek.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || idea.trim().length < 10) {
      setError("Nama wajib diisi dan ide minimal 10 karakter.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const result = await api.createProject({ name: name.trim(), idea: idea.trim(), language });
      onOpen(result.project.id, "wizard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal membuat proyek.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell onLogout={onLogout} onHome={() => void load()}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="neu min-h-[calc(100vh-8rem)] p-5">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Workspace
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Proyek</h2>
            </div>
            <span className="neu-inset rounded-full px-3 py-1.5 text-xs text-[var(--muted)]">
              {projects.length} proyek
            </span>
          </div>

          {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

          {loading ? (
            <div className="neu-inset rounded-2xl p-6 text-sm text-[var(--muted)]">Memuat proyek…</div>
          ) : projects.length === 0 ? (
            <div className="neu-inset flex min-h-[320px] flex-col items-center justify-center rounded-3xl p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] text-lg font-semibold shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)]">
                15
              </div>
              <h3 className="text-xl font-semibold">Belum ada proyek</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                Mulai dari ide di panel kanan. mdzs akan menganalisis, melakukan interview, lalu
                menyusun PRD pertama.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {projects.map((project) => (
                <article key={project.id} className="neu-inset rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">{project.name}</h3>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        {STATUS_LABEL[project.status] ?? project.status} · {formatDate(project.updatedAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/40 px-2.5 py-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                      {project.language}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{project.idea}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => onOpen(project.id, project.status === "ready" ? "workspace" : "wizard")}
                      className="neu-button flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-white"
                    >
                      {project.status === "ready" ? "Buka workspace" : "Lanjutkan"}
                    </button>
                    <button
                      onClick={() => onOpen(project.id, "workspace")}
                      className="neu-button rounded-xl px-3 py-2 text-xs font-medium text-[var(--text)]"
                    >
                      Dokumen
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="neu p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Proyek baru
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Mulai dari ide</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Tulis ide produk dalam bahasa natural. Analisis dan interview akan menyesuaikan.
          </p>

          <form onSubmit={createProject} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                Nama proyek
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: TenakUang"
                className="neu-inset w-full rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                Ide produk
              </label>
              <textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                rows={9}
                placeholder="Aplikasi keuangan pribadi untuk mencatat arus kas, menerapkan prinsip 50/30/20, dan membantu pengguna menyelesaikan 7 tangga kebebasan finansial."
                className="neu-inset w-full resize-none rounded-2xl px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <p className="mt-1 text-right text-[10px] text-[var(--muted)]">{idea.length} karakter</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                Bahasa output
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["id", "en"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLanguage(value)}
                    className={`rounded-xl px-3 py-2 text-xs font-medium ${
                      language === value
                        ? "neu-inset text-[var(--text)]"
                        : "neu-button text-[var(--muted)]"
                    }`}
                  >
                    {value === "id" ? "Indonesia" : "English"}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="neu-button w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {creating ? "Membuat…" : "Buat proyek"}
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-white/30 p-4 text-xs leading-6 text-[var(--muted)]">
            <p className="font-medium text-[var(--text)]">Yang terjadi berikutnya</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Analisis produk dan role.</li>
              <li>Interview adaptif 3–8 pertanyaan.</li>
              <li>Rekomendasi tech stack.</li>
              <li>PRD pertama, full length.</li>
            </ol>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
