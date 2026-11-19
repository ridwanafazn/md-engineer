import { strToU8, zipSync } from "fflate";
import type { DocumentRow } from "@/client/lib/api";
import { DOC_TYPES } from "@/shared/types";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "blueprint"
  );
}

export function downloadProjectZip(projectName: string, documents: DocumentRow[]): void {
  const files: Record<string, Uint8Array> = {};

  for (const type of DOC_TYPES) {
    const document = documents.find((item) => item.type === type);
    if (document) files[`${type}.md`] = strToU8(document.contentMd);
  }

  files["MANIFEST.json"] = strToU8(
    JSON.stringify(
      {
        project: projectName,
        generatedAt: new Date().toISOString(),
        documents: Object.keys(files).filter((name) => name.endsWith(".md")),
      },
      null,
      2,
    ),
  );

  const zipped = zipSync(files, { level: 6 });
  const blob = new Blob([zipped], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(projectName)}-blueprint.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
