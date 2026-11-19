import type { DocType, SpecModel } from "@/shared/types";
import type { DocumentRow } from "./api";
import { DOC_SECTIONS } from "./docs";

export type LintIssue = {
  severity: "error" | "warning";
  message: string;
};

export type LintReport = {
  byType: Partial<Record<DocType, LintIssue[]>>;
  errors: number;
  warnings: number;
  ok: boolean;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function hasSection(content: string, section: string): boolean {
  const target = normalize(section);
  return content
    .split(/\r?\n/)
    .filter((line) => /^#{2,3}\s+/.test(line))
    .some((line) => normalize(line).includes(target));
}

function extractRequirementIds(content: string): string[] {
  return [...content.matchAll(/\bREQ-\d{3,}\b/g)].map((match) => match[0]);
}

function normalizeEndpointPath(path: string): string {
  const withoutQuery = path.split("?")[0].replace(/[`.,;)]+$/g, "");
  return withoutQuery
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "{}")
    .replace(/\{[^}]+\}/g, "{}")
    .replace(/:[A-Za-z0-9_]+/g, "{}")
    .replace(/\/\d+(?=\/|$)/g, "/{}");
}

function extractEndpointRefs(content: string): string[] {
  return [...content.matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[A-Za-z0-9_\-/{}/:.?=&%]+)/g)].map(
    (match) => `${match[1]} ${normalizeEndpointPath(match[2])}`,
  );
}

function extractMermaidBlocks(content: string): string[] {
  return [...content.matchAll(/```mermaid\s*([\s\S]*?)```/gi)].map((match) => match[1].trim());
}

let mermaidClient: typeof import("mermaid").default | null = null;

async function getMermaid(): Promise<typeof import("mermaid").default> {
  if (!mermaidClient) {
    const module = await import("mermaid");
    mermaidClient = module.default;
    mermaidClient.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
    });
  }
  return mermaidClient;
}

export async function lintDocuments(
  documents: DocumentRow[],
  specModel: SpecModel | null,
): Promise<LintReport> {
  const byType: Partial<Record<DocType, LintIssue[]>> = {};
  const docMap = new Map(documents.map((document) => [document.type as DocType, document]));
  const canonicalRequirements = new Set(specModel?.requirements.map((requirement) => requirement.id) ?? []);
  const canonicalEndpoints = new Set(
    specModel?.endpoints.map(
      (endpoint) => `${endpoint.method} ${normalizeEndpointPath(endpoint.path)}`,
    ) ?? [],
  );
  const canonicalEntities = specModel?.entities.map((entity) => entity.name) ?? [];

  let mermaid: typeof import("mermaid").default | null = null;
  try {
    mermaid = await getMermaid();
  } catch {
    mermaid = null;
  }

  for (const [type, document] of docMap) {
    const issues: LintIssue[] = [];
    const content = document.contentMd ?? "";
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;

    if (words < 300) {
      issues.push({ severity: "error", message: `Dokumen terlalu pendek (${words} kata).` });
    } else if (words < 800) {
      issues.push({ severity: "warning", message: `Dokumen masih ringkas (${words} kata).` });
    }

    for (const section of DOC_SECTIONS[type]) {
      if (!hasSection(content, section)) {
        issues.push({ severity: "error", message: `Section wajib tidak ditemukan: ${section}.` });
      }
    }

    const openQuestionsIndex = content.search(/^##+\s*.*open questions/im);
    const bodyBeforeOpenQuestions =
      openQuestionsIndex >= 0 ? content.slice(0, openQuestionsIndex) : content;
    if (/\bTBD\b/i.test(bodyBeforeOpenQuestions)) {
      issues.push({ severity: "error", message: "Placeholder TBD ditemukan di luar Open Questions." });
    }

    const requirementIds = extractRequirementIds(content);
    if (type === "REQUIREMENTS") {
      if (requirementIds.length < 5) {
        issues.push({ severity: "error", message: "REQUIREMENTS.md harus memuat minimal 5 REQ-xxx." });
      }
      for (const id of canonicalRequirements) {
        if (!requirementIds.includes(id)) {
          issues.push({ severity: "error", message: `Requirement ${id} tidak ada di REQUIREMENTS.md.` });
        }
      }
    }
    for (const id of requirementIds) {
      if (canonicalRequirements.size > 0 && !canonicalRequirements.has(id)) {
        issues.push({ severity: "error", message: `Requirement ${id} tidak ada di SpecModel.` });
      }
    }

    const endpointRefs = [...new Set(extractEndpointRefs(content))];
    if (type === "API") {
      for (const endpoint of canonicalEndpoints) {
        if (!endpointRefs.includes(endpoint)) {
          issues.push({ severity: "error", message: `Endpoint ${endpoint} belum ada di API.md.` });
        }
      }
      for (const endpoint of endpointRefs) {
        if (!canonicalEndpoints.has(endpoint)) {
          issues.push({ severity: "error", message: `Endpoint ${endpoint} tidak ada di SpecModel.` });
        }
      }
    } else {
      for (const endpoint of endpointRefs) {
        if (canonicalEndpoints.size > 0 && !canonicalEndpoints.has(endpoint)) {
          issues.push({ severity: "error", message: `Endpoint ${endpoint} tidak ada di SpecModel.` });
        }
      }
    }

    if (type === "DATABASE") {
      for (const entity of canonicalEntities) {
        if (!content.includes(entity)) {
          issues.push({ severity: "error", message: `Entity ${entity} tidak ada di DATABASE.md.` });
        }
      }
    }

    const mermaidBlocks = extractMermaidBlocks(content);
    if (type === "ARCHITECTURE") {
      if (mermaidBlocks.length < 2) {
        issues.push({ severity: "error", message: "ARCHITECTURE.md wajib memuat minimal 2 diagram Mermaid." });
      }
      if (!mermaidBlocks.some((block) => /^(graph|flowchart)\b/i.test(block))) {
        issues.push({ severity: "error", message: "ARCHITECTURE.md wajib memuat diagram graph/flowchart." });
      }
      if (!mermaidBlocks.some((block) => /^sequenceDiagram\b/i.test(block))) {
        issues.push({ severity: "error", message: "ARCHITECTURE.md wajib memuat sequenceDiagram." });
      }
    }

    if (mermaid && typeof window !== "undefined") {
      for (const [index, block] of mermaidBlocks.entries()) {
        try {
          await mermaid.parse(block);
        } catch (caught) {
          issues.push({
            severity: "error",
            message: `Mermaid block #${index + 1} tidak valid: ${
              caught instanceof Error ? caught.message.split("\n")[0] : "parse error"
            }`,
          });
        }
      }
    }

    byType[type] = issues;
  }

  const all = Object.values(byType).flat();
  const errors = all.filter((issue) => issue.severity === "error").length;
  const warnings = all.filter((issue) => issue.severity === "warning").length;
  return { byType, errors, warnings, ok: errors === 0 };
}
