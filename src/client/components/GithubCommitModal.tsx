import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/client/lib/api";

export function GithubCommitModal({
  projectId,
  projectName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  onClose: () => void;
}) {
  const [repo, setRepo] = useState("ridwanafazn/md-engineer");
  const [branch, setBranch] = useState("main");
  const [pathPrefix, setPathPrefix] = useState("docs/blueprints");
  const [token, setToken] = useState("");
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; files: number } | null>(null);

  useEffect(() => {
    setRepo(localStorage.getItem("mdzs.githubRepo") ?? "ridwanafazn/md-engineer");
    setBranch(localStorage.getItem("mdzs.githubBranch") ?? "main");
    setPathPrefix(localStorage.getItem("mdzs.githubPath") ?? "docs/blueprints");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
      setError("Format repo harus owner/repo.");
      return;
    }
    if (token.trim().length < 20) {
      setError("Token GitHub tidak valid atau terlalu pendek.");
      return;
    }

    setCommitting(true);
    try {
      const response = await api.commitGithub(projectId, {
        repo: repo.trim(),
        branch: branch.trim(),
        pathPrefix: pathPrefix.trim(),
        token: token.trim(),
      });
      localStorage.setItem("mdzs.githubRepo", repo.trim());
      localStorage.setItem("mdzs.githubBranch", branch.trim());
      localStorage.setItem("mdzs.githubPath", pathPrefix.trim());
      setResult({ url: response.url, files: response.files });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Commit GitHub gagal.");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <form onSubmit={submit} className="neu w-full max-w-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              GitHub
            </p>
            <h3 className="text-xl font-semibold">Commit {projectName}</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              15 dokumen akan ditulis ke folder target dalam satu commit. Branch harus sudah ada.
            </p>
          </div>
          <button type="button" onClick={onClose} className="neu-button rounded-xl px-3 py-2 text-xs">
            Tutup
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Repository
            </span>
            <input
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
              placeholder="owner/repo"
              className="neu-inset w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Branch
              </span>
              <input
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                className="neu-inset w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Folder
              </span>
              <input
                value={pathPrefix}
                onChange={(event) => setPathPrefix(event.target.value)}
                className="neu-inset w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Fine-grained PAT · contents:write
            </span>
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="github_pat_..."
              className="neu-inset w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <span className="mt-1 block text-[10px] leading-4 text-[var(--muted)]">
              Token hanya dipakai untuk request ini, tidak disimpan di server.
            </span>
          </label>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-3 text-xs text-emerald-900">
            <p className="font-medium">Commit berhasil · {result.files} file</p>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all underline"
            >
              {result.url}
            </a>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="neu-button rounded-xl px-4 py-2.5 text-xs font-medium"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={committing}
            className="neu-button rounded-xl px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {committing ? "Commit…" : "Commit ke GitHub"}
          </button>
        </div>
      </form>
    </div>
  );
}
