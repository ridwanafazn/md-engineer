import type { ProjectAnalysis } from "@/shared/types";
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
