import { useEffect, useState, type FormEvent } from "react";
import { DOC_LABELS, DOC_TYPES } from "@/shared/types";

type Health = { ok: boolean; db: boolean; ai: boolean };
type Phase = "loading" | "login" | "ready";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  generating: "Generating",
  verified: "Verified",
  stale: "Stale",
};

export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const [selected, setSelected] = useState<string>("PRD");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [healthRes, meRes] = await Promise.all([
        fetch("/api/health").catch(() => null),
        fetch("/api/auth/me").catch(() => null),
      ]);
      if (!alive) return;
      if (healthRes?.ok) setHealth((await healthRes.json()) as Health);
      setPhase(meRes?.ok ? "ready" : "login");
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (response.ok) {
      setPhase("ready");
      setPasscode("");
    } else {
      setError("Passcode salah. Coba lagi.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setPhase("login");
  }

  if (phase === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="neu px-8 py-6 text-sm text-[var(--muted)]">Memuat mdzs…</div>
      </main>
    );
  }

  if (phase === "login") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <form onSubmit={login} className="neu w-full max-w-md p-8">
          <div className="mb-8">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)] text-lg font-semibold shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)]">
              md
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">mdzs</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Personal spec compiler. Satu passcode, tanpa akun, tanpa kuota produk.
            </p>
          </div>

          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
            Passcode
          </label>
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            autoFocus
            className="neu-inset mb-3 w-full rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="Masukkan passcode"
          />
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            className="neu-button w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white"
          >
            Masuk
          </button>

          <div className="mt-6 flex items-center gap-3 text-xs text-[var(--muted)]">
            <span className={`h-2 w-2 rounded-full ${health?.db ? "bg-emerald-500" : "bg-amber-500"}`} />
            Database {health?.db ? "siap" : "belum dikonfigurasi"}
            <span className={`h-2 w-2 rounded-full ${health?.ai ? "bg-emerald-500" : "bg-amber-500"}`} />
            AI {health?.ai ? "siap" : "belum dikonfigurasi"}
          </div>
        </form>
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
            <p className="text-xs text-[var(--muted)]">Personal spec compiler · 15 dokumen</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="neu-inset hidden items-center gap-4 rounded-full px-4 py-2 text-xs text-[var(--muted)] sm:flex">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${health?.db ? "bg-emerald-500" : "bg-amber-500"}`} />
              Neon
            </span>
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${health?.ai ? "bg-emerald-500" : "bg-amber-500"}`} />
              OpenCode Go
            </span>
          </div>
          <button
            onClick={logout}
            className="neu-button rounded-full px-4 py-2 text-xs font-medium text-[var(--text)]"
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
        <aside className="neu flex max-h-[calc(100vh-8rem)] flex-col p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Blueprint
            </span>
            <span className="text-[11px] text-[var(--muted)]">15</span>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {DOC_TYPES.map((type, index) => {
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
                  <span className="text-[10px] uppercase tracking-wide opacity-50">draft</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-4 space-y-2">
            <button className="neu-button w-full rounded-xl px-3 py-2.5 text-xs font-semibold text-white">
              Buat proyek
            </button>
            <button className="neu-button w-full rounded-xl px-3 py-2.5 text-xs font-medium text-[var(--text)]">
              Export semua
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
              <button className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text)]">Rich Preview</button>
              <button className="rounded-lg px-3 py-1.5 text-xs text-[var(--muted)]">Raw Markdown</button>
              <button className="rounded-lg px-3 py-1.5 text-xs text-[var(--muted)]">Diff Compare</button>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-xl text-center">
              <div className="neu-inset mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl text-xl font-semibold text-[var(--muted)]">
                {selected.slice(0, 2)}
              </div>
              <h3 className="text-2xl font-semibold tracking-tight">Belum ada blueprint</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                Fase 0 selesai: fondasi aplikasi, auth, database, dan AI proxy sudah siap. Fase 1 akan
                menambahkan alur intake, analysis, interview, dan PRD pertama.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {["PRD", "DATABASE", "API", "ARCHITECTURE"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)]"
                  >
                    {DOC_LABELS[item as keyof typeof DOC_LABELS]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/50 px-5 py-3 text-xs text-[var(--muted)]">
            <span>Versi 0.1 · Fase 0</span>
            <span>{STATUS_LABEL.draft}</span>
          </div>
        </section>

        <aside className="neu flex min-h-[calc(100vh-8rem)] flex-col p-4">
          <div className="mb-3 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              AI Assistant
            </p>
            <h2 className="mt-1 text-lg font-semibold">Spec architect</h2>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            <div className="neu-inset rounded-2xl p-4 text-sm leading-6 text-[var(--muted)]">
              Halo. Saya akan membantu menyusun 15 dokumen blueprint. Di Fase 1, kita mulai dari ide
              produk sampai PRD pertama.
            </div>
            <div className="rounded-2xl bg-white/35 p-4 text-xs leading-6 text-[var(--muted)]">
              <p className="font-medium text-[var(--text)]">Yang sudah siap</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Passcode auth</li>
                <li>Neon + Drizzle schema</li>
                <li>OpenCode Go proxy</li>
                <li>Neumorphism shell</li>
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <div className="neu-inset flex items-end gap-2 rounded-2xl p-3">
              <textarea
                rows={2}
                disabled
                placeholder="Tersedia di Fase 1…"
                className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
              />
              <button
                disabled
                className="neu-button flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold text-white opacity-50"
              >
                ↑
              </button>
            </div>
            <p className="mt-2 px-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Tanpa kuota produk · Free tier
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
