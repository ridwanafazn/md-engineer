import { diffLines } from "diff";

export function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  if (!oldText) {
    return (
      <div className="neu-inset rounded-2xl p-5 text-sm text-[var(--muted)]">
        Belum ada versi sebelumnya. Diff akan tersedia setelah dokumen diperbarui.
      </div>
    );
  }

  const parts = diffLines(oldText, newText);

  return (
    <pre className="overflow-auto rounded-2xl bg-white/35 p-4 font-mono text-[12px] leading-6">
      {parts.map((part, index) => {
        const color = part.added
          ? "bg-emerald-100/80 text-emerald-900"
          : part.removed
            ? "bg-red-100/80 text-red-900"
            : "text-[var(--muted)]";
        return (
          <span key={index} className={`block whitespace-pre-wrap px-2 ${color}`}>
            {part.added ? "+ " : part.removed ? "- " : "  "}
            {part.value.replace(/\n$/, "")}
          </span>
        );
      })}
    </pre>
  );
}
