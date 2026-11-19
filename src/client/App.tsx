import { useEffect, useState, type FormEvent } from "react";
import { ProjectsPage } from "@/client/pages/ProjectsPage";
import { WizardPage } from "@/client/pages/WizardPage";
import { WorkspacePage } from "@/client/pages/WorkspacePage";
import { api } from "@/client/lib/api";

type Phase = "loading" | "login" | "ready";
type View =
  | { name: "projects" }
  | { name: "wizard"; id: string }
  | { name: "workspace"; id: string };

export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [view, setView] = useState<View>({ name: "projects" });
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [health, setHealth] = useState<{ db: boolean; ai: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [healthResult, meResult] = await Promise.allSettled([fetch("/api/health"), api.me()]);
      if (!alive) return;
      if (healthResult.status === "fulfilled" && healthResult.value.ok) {
        setHealth((await healthResult.value.json()) as { db: boolean; ai: boolean });
      }
      setPhase(meResult.status === "fulfilled" ? "ready" : "login");
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api.login(passcode);
      setPasscode("");
      setView({ name: "projects" });
      setPhase("ready");
    } catch {
      setError("Passcode salah. Coba lagi.");
    }
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    setView({ name: "projects" });
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

  if (view.name === "wizard") {
    return (
      <WizardPage
        projectId={view.id}
        onBack={() => setView({ name: "projects" })}
        onComplete={(id) => setView({ name: "workspace", id })}
        onLogout={logout}
      />
    );
  }

  if (view.name === "workspace") {
    return (
      <WorkspacePage
        projectId={view.id}
        onBack={() => setView({ name: "projects" })}
        onResume={(id) => setView({ name: "wizard", id })}
        onLogout={logout}
      />
    );
  }

  return (
    <ProjectsPage
      onOpen={(id, mode) =>
        setView(mode === "wizard" ? { name: "wizard", id } : { name: "workspace", id })
      }
      onLogout={logout}
    />
  );
}
