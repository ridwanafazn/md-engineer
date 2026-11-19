import type { ReactNode } from "react";

export function AppShell({
  children,
  onLogout,
  onHome,
  projectName,
}: {
  children: ReactNode;
  onLogout: () => void;
  onHome?: () => void;
  projectName?: string;
}) {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <header className="neu mb-4 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onHome}
            aria-label="Kembali ke proyek"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface)] text-sm font-semibold shadow-[5px_5px_10px_var(--shadow-dark),-5px_-5px_10px_var(--shadow-light)]"
            title="Kembali ke proyek"
          >
            md
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">mdzs</h1>
            <p className="text-xs text-[var(--muted)]">
              {projectName ? projectName : "Personal spec compiler · 15 dokumen"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="neu-inset hidden rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] sm:inline">
            Free tier · tanpa kuota produk
          </span>
          <button
            onClick={onLogout}
            className="neu-button rounded-full px-4 py-2 text-xs font-medium text-[var(--text)]"
          >
            Keluar
          </button>
        </div>
      </header>

      {children}
    </div>
  );
}
