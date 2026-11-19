import type { DocType, ProjectAnalysis, SpecModel } from "@/shared/types";
import { DOC_DEPS, DOC_PURPOSE, DOC_SECTIONS } from "./docs";
import type { ChatMessage } from "./ai";

export type AnsweredQuestion = {
  question: string;
  answer: string;
};

function formatAnswers(answers: AnsweredQuestion[]): string {
  if (answers.length === 0) return "(belum ada jawaban interview)";
  return answers
    .map((item, index) => `${index + 1}. ${item.question}\n   Jawaban: ${item.answer || "(kosong)"}`)
    .join("\n");
}

export function analysisMessages(idea: string, language: "id" | "en"): ChatMessage[] {
  const outputLanguage = language === "en" ? "English" : "Bahasa Indonesia";
  return [
    {
      role: "system",
      content: `Anda adalah analis produk senior dan software architect. Tugas Anda mengubah ide mentah menjadi analisis terstruktur.

Kembalikan HANYA satu objek JSON valid. Tanpa markdown, tanpa code fence, tanpa penjelasan.

Skema:
{
  "summary": "ringkasan produk 2-4 kalimat",
  "problem": "masalah utama yang diselesaikan",
  "targetUsers": ["segmen pengguna"],
  "roles": [
    { "name": "nama role", "description": "deskripsi", "permissions": ["aksi yang diizinkan"] }
  ],
  "features": [
    { "name": "nama fitur", "description": "perilaku yang bisa diuji", "priority": "mvp" | "later" }
  ],
  "businessModel": "model bisnis atau string kosong jika tidak relevan",
  "complexity": "simple" | "medium" | "complex",
  "suggestedDocs": ["PRD", "REQUIREMENTS", "..."],
  "risks": ["risiko produk/teknis"],
  "assumptions": ["asumsi yang perlu dikonfirmasi"]
}

Aturan:
- Tulis konten dalam ${outputLanguage}.
- Roles 2-6, features 5-12, risks 2-6.
- Fitur harus spesifik dan bisa diuji, bukan slogan.
- suggestedDocs hanya dari: PRD, DESIGN, REQUIREMENTS, FEATURES, USER_FLOW, DATABASE, API, BUSINESS_RULES, ARCHITECTURE, SECURITY, TESTING, ROADMAP, DECISIONS, TASKS, README.
- Jangan mengarang integrasi atau requirement yang tidak tersirat dari ide.
- Jika ada hal tidak pasti, masukkan ke assumptions, bukan fakta.`,
    },
    {
      role: "user",
      content: `Ide produk:\n${idea}\n\nAnalisis ide ini dan kembalikan JSON sesuai skema.`,
    },
  ];
}

export function interviewMessages(idea: string, analysis: ProjectAnalysis): ChatMessage[] {
  return [
    {
      role: "system",
      content: `Anda adalah product architect yang memimpin interview kebutuhan. Tugas Anda menghasilkan pertanyaan yang benar-benar mengubah keputusan arsitektur.

Kembalikan HANYA satu objek JSON valid:
{
  "questions": [
    {
      "id": "q1",
      "question": "pertanyaan singkat dan jelas",
      "options": [
        { "value": "kode", "label": "jawaban yang terlihat pengguna", "consequence": "dampak arsitektur singkat" }
      ],
      "allowCustom": true,
      "rationale": "mengapa pertanyaan ini penting"
    }
  ]
}

Aturan:
- 3-8 pertanyaan. Jangan lebih.
- Setiap pertanyaan punya 2-5 opsi; allowCustom selalu true.
- Prioritaskan keputusan yang mengubah arsitektur: role/permission, auth, pembayaran, data sensitif, integrasi eksternal, skala, workflow utama, dan edge case.
- Jangan menanyakan hal yang sudah jelas di ide atau analisis.
- Gunakan Bahasa Indonesia.
- Pertanyaan harus operasional, bukan "apa visi Anda".`,
    },
    {
      role: "user",
      content: `Ide produk:\n${idea}\n\nAnalisis:\n${JSON.stringify(analysis, null, 2)}\n\nBuat interview yang diperlukan.`,
    },
  ];
}

export function stackMessages(
  idea: string,
  analysis: ProjectAnalysis,
  answers: AnsweredQuestion[],
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `Anda adalah software architect. Rekomendasikan tech stack yang sederhana, realistis, dan semurah mungkin untuk solo builder.

Kembalikan HANYA satu objek JSON valid:
{
  "frontend": "framework + alasan singkat",
  "backend": "runtime/framework + alasan singkat",
  "database": "database + alasan singkat",
  "auth": "pendekatan auth",
  "storage": "opsi storage atau string kosong",
  "payment": "opsi payment atau string kosong",
  "deployment": "target deployment",
  "reasoning": "ringkasan keputusan",
  "alternatives": [
    { "layer": "frontend", "option": "alternatif", "tradeoff": "tradeoff singkat" }
  ]
}

Aturan:
- Prioritaskan stack yang matang, gratis untuk skala kecil, dan tidak memerlukan tim DevOps.
- Jangan mengarang kebutuhan enterprise.
- Jika pembayaran tidak relevan, isi string kosong.
- Gunakan Bahasa Indonesia.`,
    },
    {
      role: "user",
      content: `Ide produk:\n${idea}\n\nAnalisis:\n${JSON.stringify(analysis, null, 2)}\n\nJawaban interview:\n${formatAnswers(answers)}\n\nRekomendasikan stack.`,
    },
  ];
}

export function prdMessages(input: {
  idea: string;
  analysis: ProjectAnalysis;
  answers: AnsweredQuestion[];
  stack: Record<string, unknown>;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: `Anda adalah product manager senior. Tulis PRD lengkap dalam Markdown yang bisa langsung dipakai tim engineering dan coding agent.

Struktur wajib:
# PRD: <nama produk>
## 1. Executive Summary & Product Vision
## 2. Problem Statement
## 3. Target Users & Personas
## 4. Roles & Permissions
## 5. Scope (In / Out)
## 6. Key Features
## 7. User Stories
## 8. Functional Requirements
## 9. Non-Functional Requirements
## 10. Success Metrics
## 11. Risks & Mitigations
## 12. Assumptions
## 13. Open Questions

Aturan:
- Gunakan Bahasa Indonesia; istilah teknis boleh tetap English.
- Requirement fungsional memakai ID unik: REQ-001, REQ-002, dst.
- Setiap requirement punya acceptance criteria yang bisa diuji.
- Jangan memakai placeholder TBD di luar Open Questions.
- Jangan mengarang fitur yang tidak ada di analisis/interview.
- Minimal 1.500 kata. Padat, spesifik, tanpa basa-basi.
- Sertakan stack yang dipilih di bagian non-functional atau catatan implementasi.
- Jangan membungkus seluruh jawaban dalam code fence.`,
    },
    {
      role: "user",
      content: `Ide produk:\n${input.idea}\n\nAnalisis:\n${JSON.stringify(input.analysis, null, 2)}\n\nJawaban interview:\n${formatAnswers(input.answers)}\n\nStack:\n${JSON.stringify(input.stack, null, 2)}\n\nTulis PRD lengkap.`,
    },
  ];
}

export function specModelMessages(input: {
  idea: string;
  analysis: ProjectAnalysis;
  answers: AnsweredQuestion[];
  stack: Record<string, unknown>;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: `Anda adalah software architect. Bangun SpecModel kanonik yang menjadi satu-satunya sumber kebenaran untuk 15 dokumen.

Kembalikan HANYA satu objek JSON valid. Tanpa markdown, tanpa code fence.

Skema:
{
  "project": { "name": "nama", "summary": "ringkasan", "stack": { "frontend": "", "backend": "", "database": "", "auth": "", "storage": "", "payment": "", "deployment": "" } },
  "roles": [ { "name": "", "description": "", "permissions": [""] } ],
  "entities": [ { "name": "snake_case", "description": "", "fields": [ { "name": "snake_case", "type": "text|uuid|integer|boolean|timestamp|jsonb|numeric", "required": true, "description": "" } ] } ],
  "endpoints": [ { "id": "EP-001", "method": "GET", "path": "/api/...", "auth": true, "description": "", "request": "", "response": "" } ],
  "requirements": [ { "id": "REQ-001", "statement": "", "priority": "mvp", "acceptance": [""] } ],
  "flows": [ { "name": "", "actor": "", "steps": [""] } ],
  "businessRules": [ { "id": "BR-001", "rule": "", "consequence": "" } ],
  "nonFunctional": [""],
  "openQuestions": [""],
  "decisions": [ { "title": "", "decision": "", "rationale": "" } ]
}

Aturan:
- 3-6 entities, 5-15 endpoints, 8-20 requirements, 2-5 flows, 2-6 business rules, 2-5 nonFunctional, 2-5 openQuestions, 2-5 decisions.
- Semua ID unik dan berurutan.
- Entity dan field memakai snake_case.
- Endpoint path dimulai dengan /api/.
- Requirements harus bisa diuji, punya acceptance criteria.
- Roles harus konsisten dengan analisis.
- Jangan mengarang integrasi, entity, atau endpoint yang tidak tersirat dari ide, analisis, interview, dan stack.
- Gunakan Bahasa Indonesia untuk deskripsi; nama teknis tetap English.`,
    },
    {
      role: "user",
      content: `Ide:\n${input.idea}\n\nAnalisis:\n${JSON.stringify(input.analysis, null, 2)}\n\nJawaban interview:\n${formatAnswers(input.answers)}\n\nStack:\n${JSON.stringify(input.stack, null, 2)}\n\nBangun SpecModel.`,
    },
  ];
}

export function documentMessages(
  type: DocType,
  input: {
    idea: string;
    analysis: ProjectAnalysis;
    answers: AnsweredQuestion[];
    stack: Record<string, unknown>;
    specModel: SpecModel;
    dependencies: Partial<Record<DocType, string>>;
  },
): ChatMessage[] {
  const sections = DOC_SECTIONS[type].map((section, index) => `${index + 1}. ${section}`).join("\n");
  const dependencyDocs = DOC_DEPS[type]
    .map((dependency) => {
      const content = input.dependencies[dependency];
      if (!content) return "";
      const trimmed = content.length > 8_000 ? `${content.slice(0, 8_000)}\n\n[...dipotong...]` : content;
      return `--- ${dependency}.md ---\n${trimmed}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return [
    {
      role: "system",
      content: `Anda adalah technical writer senior. Tulis dokumen ${type}.md untuk proyek "${input.specModel.project.name}".

Tujuan dokumen: ${DOC_PURPOSE[type]}.

SpecModel adalah satu-satunya sumber kebenaran. Jangan mengarang entity, endpoint, requirement, role, atau aturan yang tidak ada di SpecModel. Gunakan ID kanonik (REQ-xxx, EP-xxx, BR-xxx) dan nama entity yang sama.

Section wajib:
${sections}

Aturan:
- Markdown murni. Jangan membungkus seluruh dokumen dalam code fence.
- Bahasa Indonesia; istilah teknis boleh English.
- Minimal 800 kata. PRD minimal 1.500 kata.
- Spesifik, bisa diuji, tanpa basa-basi.
- Jangan memakai placeholder TBD di luar "Open Questions".
- Jika ada ketidakpastian, tulis di Open Questions.
- Dokumen ini harus konsisten dengan dokumen dependensi; jangan menyalin mentah, gunakan sebagai konteks.
- Untuk ARCHITECTURE: wajib menyertakan minimal satu diagram Mermaid \`graph TD\` dan satu \`sequenceDiagram\`.
- Untuk DATABASE: jelaskan entity, field, relasi, index, dan constraint.
- Untuk API: gunakan endpoint dari SpecModel; sertakan method, path, auth, request, response, dan error.
- Untuk REQUIREMENTS: setiap requirement memakai ID dan acceptance criteria.
- Untuk TESTING: petakan test ke ID requirement.
- Untuk TASKS: gunakan ID requirement dan urutan implementasi.
- Untuk README: sertakan peta seluruh 15 dokumen.`,
    },
    {
      role: "user",
      content: `Ide:\n${input.idea}\n\nAnalisis:\n${JSON.stringify(input.analysis, null, 2)}\n\nJawaban interview:\n${formatAnswers(input.answers)}\n\nStack:\n${JSON.stringify(input.stack, null, 2)}\n\nSpecModel:\n${JSON.stringify(input.specModel, null, 2)}\n\nDokumen dependensi:\n${dependencyDocs || "(tidak ada)"}\n\nTulis ${type}.md sekarang.`,
    },
  ];
}
