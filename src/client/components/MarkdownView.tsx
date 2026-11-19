import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidBlock } from "@/client/components/MermaidBlock";

const MERMAID_BLOCK = /(```mermaid[\s\S]*?```)/g;

export function MarkdownView({ markdown }: { markdown: string }) {
  const parts = markdown.split(MERMAID_BLOCK);

  return (
    <div className="markdown">
      {parts.map((part, index) => {
        const mermaid = part.match(/^```mermaid\s*([\s\S]*?)```$/);
        if (mermaid) {
          return <MermaidBlock key={`mermaid-${index}`} code={mermaid[1].trim()} />;
        }
        if (!part.trim()) return null;
        return (
          <ReactMarkdown key={`markdown-${index}`} remarkPlugins={[remarkGfm]}>
            {part}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}
