import { useEffect, useRef, useState } from "react";

export function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
        });
        const rendered = await mermaid.render(idRef.current, code);
        if (active) {
          setSvg(rendered.svg);
          setError("");
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Gagal merender diagram.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-4 rounded-2xl border border-red-200 bg-red-50/70 p-4">
        <p className="text-xs font-medium text-red-700">Mermaid tidak valid</p>
        <pre className="mt-2 overflow-auto text-[11px] text-red-700">{code}</pre>
        <p className="mt-2 text-[11px] text-red-600">{error}</p>
      </div>
    );
  }

  if (!svg) {
    return <div className="neu-inset my-4 rounded-2xl p-4 text-xs text-[var(--muted)]">Merender diagram…</div>;
  }

  return (
    <div
      className="my-4 overflow-auto rounded-2xl bg-white/40 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
