import { useEffect, useState } from "react";
import { api, type ShareLink } from "@/client/lib/api";

export function ShareModal({
  projectId,
  projectName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  onClose: () => void;
}) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const result = await api.listShares(projectId);
      setLinks(result.links);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat link.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [projectId]);

  async function create() {
    setCreating(true);
    setError("");
    try {
      const result = await api.createShare(projectId);
      setLinks((previous) => [result.link, ...previous]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal membuat link.");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(link: ShareLink) {
    if (!window.confirm("Cabut link read-only ini? Link tidak bisa dipakai lagi.")) return;
    setError("");
    try {
      await api.revokeShare(projectId, link.id);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal mencabut link.");
    }
  }

  async function copy(link: ShareLink) {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(link.id);
      window.setTimeout(() => setCopied(""), 1_500);
    } catch {
      setError("Clipboard tidak tersedia. Salin URL secara manual.");
    }
  }

  const active = links.filter((link) => !link.revokedAt);
  const revoked = links.filter((link) => link.revokedAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="neu flex max-h-[90vh] w-full max-w-2xl flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Read-only
            </p>
            <h3 className="text-xl font-semibold">Bagikan {projectName}</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Siapa pun dengan link dapat membaca dokumen. Tidak bisa mengedit, tanpa akun. Link
              bisa dicabut kapan saja.
            </p>
          </div>
          <button onClick={onClose} className="neu-button rounded-xl px-3 py-2 text-xs font-medium">
            Tutup
          </button>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <button
          onClick={() => void create()}
          disabled={creating}
          className="neu-button mt-4 rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {creating ? "Membuat link…" : "Buat link read-only baru"}
        </button>

        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <p className="text-xs text-[var(--muted)]">Memuat link…</p>
          ) : active.length === 0 ? (
            <p className="neu-inset rounded-xl p-3 text-xs text-[var(--muted)]">
              Belum ada link aktif.
            </p>
          ) : (
            active.map((link) => (
              <div key={link.id} className="neu-inset rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  Dibuat {new Date(link.createdAt).toLocaleString("id-ID")}
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    readOnly
                    value={link.url}
                    className="min-w-0 flex-1 rounded-lg bg-white/45 px-2 py-1.5 text-[11px] outline-none"
                  />
                  <button
                    onClick={() => void copy(link)}
                    className="neu-button rounded-lg px-3 py-1.5 text-[11px] font-medium"
                  >
                    {copied === link.id ? "Tersalin" : "Salin"}
                  </button>
                  <button
                    onClick={() => void revoke(link)}
                    className="neu-button rounded-lg px-3 py-1.5 text-[11px] font-medium text-red-700"
                  >
                    Cabut
                  </button>
                </div>
              </div>
            ))
          )}

          {revoked.length > 0 ? (
            <div className="rounded-xl bg-white/25 p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                Sudah dicabut
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-[var(--muted)]">
                {revoked.map((link) => (
                  <li key={link.id} className="truncate">
                    {link.url} · {new Date(link.revokedAt!).toLocaleString("id-ID")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
