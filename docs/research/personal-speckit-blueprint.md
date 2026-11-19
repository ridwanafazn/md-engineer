# Personal Spec Compiler — Build Blueprint

> Rencana implementasi untuk menggantikan SpecKit.tech **untuk konsumsi pribadi**.
> Prinsip: satu user, local-first, tanpa billing, tanpa admin, tanpa multi-tenant.
> Model: `deepseek-v4.1-flash` via OpenCode Go (OpenAI-compatible).

---

## 1. Tujuan

Membuat web app pribadi yang:

1. Mengubah ide produk menjadi **satu set dokumen Markdown** yang saling konsisten.
2. Bisa memakai **API key OpenCode Go** milik sendiri.
3. Menyimpan data secara lokal.
4. Bisa **menulis langsung ke repo** (`docs/`), bukan hanya ZIP.
5. Bisa dikustomisasi: template, gaya penulisan, daftar dokumen, stack pilihan.

**Non-goals untuk versi pertama:**

- Multi-user, login, register, lupa password.
- Subscription, pembayaran, kuota, kredit, invoice.
- Admin panel, analytics produk, feedback widget.
- Mobile app, realtime collaboration, PDF export.
- Code generation penuh (fokus pada spesifikasi).

---

## 2. Prinsip Desain

1. **SpecModel adalah sumber kebenaran.**
   Dokumen dihasilkan dari model kanonik (roles, entities, endpoints, requirements), bukan dari prompt bebas.

2. **Cek deterministik sebelum cek LLM.**
   Validasi ID, referensi endpoint, nama tabel, dan sintaks Mermaid dilakukan dengan kode, bukan diserahkan ke model.

3. **Setiap perubahan adalah diff.**
   Tidak ada perubahan dokumen tanpa preview dan snapshot versi.

4. **Local-first.**
   Data di SQLite, file export di disk, API key di `.env.local`.

5. **Provider-agnostic.**
   Satu adapter; Go adalah default, tetapi bisa diganti ke Console PAYG atau DeepSeek langsung.

6. **Kecil dan bisa diselesaikan.**
   Vertical slice dulu: satu proyek, enam dokumen, satu alur review. Jangan mulai dari 15 dokumen.

---

## 3. Stack yang Direkomendasikan

| Kebutuhan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript | Server actions, routing, ekosistem |
| Styling | Tailwind CSS v4 + shadcn/ui | Cepat, konsisten, tidak perlu desain dari nol |
| Database | SQLite (`better-sqlite3`) + Drizzle ORM | Lokal, nol konfigurasi, mudah backup |
| AI | `@ai-sdk/openai-compatible` atau fetch langsung | Streaming, tool calling, structured output |
| Validasi | Zod | Skema output AI dan form |
| Markdown | `react-markdown` + `remark-gfm` | Preview dokumen |
| Diagram | Mermaid | Sama seperti SpecKit |
| Diff | `diff` + tampilan side-by-side | Review perubahan |
| Export | `jszip` atau `archiver` | ZIP Markdown |
| File access | Node `fs` | Tulis ke repo lokal |
| Testing | Vitest + Playwright | Unit dan alur UI |

**Alternatif jika ingin di-deploy:** Vercel + Neon Postgres + Auth sederhana. Namun untuk tahap pertama, local-first lebih cepat dan lebih privat.

---

## 4. Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│ Next.js App Router (localhost:3000)                         │
│                                                             │
│  /                        Daftar proyek                     │
│  /projects/new            Wizard intake                     │
│  /projects/[id]/interview Interview adaptif                 │
│  /projects/[id]/stack     Pilihan stack                     │
│  /projects/[id]/plan      Rencana dokumen                   │
│  /projects/[id]           Workspace 3 panel                 │
│  /settings                Provider, model, template         │
└──────────────────────────┬──────────────────────────────────┘
                           │ Server Actions / Route Handlers
┌──────────────────────────▼──────────────────────────────────┐
│ Core Modules                                                │
│                                                             │
│  lib/ai/provider.ts       Adapter OpenCode / DeepSeek       │
│  lib/ai/prompts/*         Prompt per tahap & per dokumen    │
│  lib/ai/schemas.ts        Skema Zod output                  │
│  lib/spec/model.ts        SpecModel & builder               │
│  lib/spec/consistency.ts  Linter lintas dokumen             │
│  lib/spec/impact.ts       Analisis dampak perubahan         │
│  lib/spec/graph.ts        Document graph                    │
│  lib/export/zip.ts        Export ZIP                        │
│  lib/export/repo.ts       Tulis ke folder repo              │
│  lib/db/schema.ts         Drizzle schema                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ SQLite                                                      │
│  projects, analyses, interviews, stack_choices,             │
│  doc_plans, spec_models, documents, document_versions,      │
│  doc_links, chat_messages, runs                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Data Model

```ts
projects(id, name, idea, status, created_at, updated_at)
analyses(id, project_id, json, created_at)
interviews(id, project_id, questions_json, answers_json, status)
stack_choices(id, project_id, json)
doc_plans(id, project_id, json)
spec_models(id, project_id, json, version, created_at)
documents(id, project_id, type, title, slug, content_md,
          version, status, updated_at)
document_versions(id, document_id, version, content_md,
                  reason, created_at)
doc_links(id, project_id, from_doc, to_doc, kind, ref)
chat_messages(id, project_id, role, content, created_at)
runs(id, project_id, stage, model, input_tokens, output_tokens,
     reasoning_tokens, cost_usd, duration_ms, created_at)
settings(key, value)
```

**Catatan:**

- `documents.type` memakai enum: `PRD`, `REQUIREMENTS`, `FEATURES`, `DATABASE`, `API`, `ARCHITECTURE`, `USER_FLOW`, `BUSINESS_RULES`, `ROADMAP`, `SECURITY`, `TESTING`, `DEPLOYMENT`, `MONITORING`, `SEO`, `COMPLIANCE`.
- `doc_links` menyimpan edge graph: `PRD references REQUIREMENTS`, `USER_FLOW references API`, dan seterusnya.
- `runs` penting untuk mengukur biaya dan kualitas per tahap.

---

## 6. Pipeline AI

### Stage 0 — Intake

Input: ide bebas, boleh upload `.md`/`.txt`.
Output: `ProjectBrief` (teks + metadata).

Tidak perlu LLM. Cukup validasi panjang dan simpan.

### Stage 1 — Analisis Produk

Output terstruktur:

```ts
type ProjectAnalysis = {
  summary: string;
  problem: string;
  targetUsers: string[];
  roles: { name: string; description: string; permissions: string[] }[];
  features: { name: string; description: string; priority: "mvp" | "later" }[];
  businessModel?: string;
  complexity: "simple" | "medium" | "complex";
  suggestedDocs: DocType[];
  risks: string[];
  assumptions: string[];
};
```

Prompt: "Analis produk. Jangan mengarang fitur. Tandai asumsi."

### Stage 2 — Adaptive Interview

Output: 3–8 pertanyaan, masing-masing:

```ts
type InterviewQuestion = {
  id: string;
  question: string;
  options: { value: string; label: string; consequence?: string }[];
  allowCustom: boolean;
  rationale: string;
  dependsOn?: { questionId: string; value: string };
};
```

Aturan:

- Prioritaskan pertanyaan yang mengubah arsitektur: role, auth, pembayaran, integrasi, data sensitif, skala.
- Jangan menanyakan hal yang sudah jelas di ide.
- Setelah jawaban berubah, buang pertanyaan turunan yang tidak relevan.

### Stage 3 — Rekomendasi Stack

```ts
type StackRecommendation = {
  frontend: string;
  backend: string;
  database: string;
  auth: string;
  storage?: string;
  payment?: string;
  deployment: string;
  reasoning: string;
  alternatives: { layer: string; option: string; tradeoff: string }[];
};
```

User bisa menerima atau mengganti. Stack terpilih masuk ke `SpecModel.stack`.

### Stage 4 — Doc Plan

Tentukan dokumen berdasarkan kompleksitas dan jawaban interview.

```ts
type DocPlan = {
  docs: {
    type: DocType;
    title: string;
    purpose: string;
    dependsOn: DocType[];
    sections: string[];
  }[];
};
```

Aturan: jangan menghasilkan dokumen yang tidak relevan. Proyek sederhana cukup 5–6 dokumen.

### Stage 5 — SpecModel (Kanonik)

Ini inti yang membedakan dari chatbot.

```ts
type SpecModel = {
  project: { name: string; summary: string; stack: StackChoice };
  roles: Role[];
  entities: Entity[];          // tabel/collection + field
  endpoints: Endpoint[];       // method, path, auth, request, response
  requirements: Requirement[]; // ID, statement, priority, acceptance
  flows: Flow[];               // langkah, aktor, kondisi
  businessRules: BusinessRule[];
  nonFunctional: string[];
  openQuestions: string[];
  decisions: Decision[];
};
```

Dokumen digenerate **dari** model ini. Jika model berubah, dokumen bisa diregenerasi.

### Stage 6 — Generate Dokumen

Urutan dependensi:

```
PRD
 → REQUIREMENTS
 → FEATURES
 → USER_FLOW
 → DATABASE
 → API
 → ARCHITECTURE
 → BUSINESS_RULES
 → ROADMAP
 → SECURITY / TESTING / DEPLOYMENT (opsional)
```

Untuk setiap dokumen:

- Kirim `SpecModel` (ringkas) + dokumen dependensi yang relevan.
- Minta Markdown dengan heading yang sudah ditentukan.
- Gunakan ID kanonik (`REQ-001`, `EP-001`, `TBL-user`).
- Wajib menyertakan bagian "Open Questions" jika ada.
- Jangan mengarang endpoint/entity di luar model.

**Strategi konteks:**

- System prompt stabil di awal (untuk prompt caching).
- `SpecModel` ringkas, bukan seluruh dokumen.
- Dokumen dependensi hanya yang relevan.
- Untuk dokumen panjang, generate per section lalu gabungkan.

### Stage 7 — Consistency Pass

**Deterministik (kode):**

- Semua `REQ-*` unik.
- Semua endpoint yang direferensikan ada di `API.md`.
- Semua entity yang direferensikan ada di `DATABASE.md`.
- Semua role konsisten.
- Semua Mermaid block bisa diparse.
- Tidak ada placeholder `TBD` di luar "Open Questions".

**Semantik (LLM):**

- Pertentangan aturan bisnis.
- Requirement tanpa acceptance criteria.
- Flow yang mereferensikan fitur yang tidak ada.

Output: daftar isu + auto-fix opsional.

### Stage 8 — Review, Chat, Impact Analysis

Chat dengan konteks `SpecModel` + dokumen aktif. Untuk perubahan:

```ts
type ImpactPlan = {
  request: string;
  affected: {
    doc: DocType;
    sections: string[];
    changeType: "add" | "update" | "remove";
    reason: string;
  }[];
  newEntities?: Entity[];
  newEndpoints?: Endpoint[];
  newRequirements?: Requirement[];
};
```

Alur:

1. Hitung kandidat dokumen dari `doc_links` (deterministik).
2. LLM memfilter dan menjelaskan dampak.
3. Tampilkan diff per dokumen.
4. User approve.
5. Update `SpecModel` + dokumen + snapshot versi.

### Stage 9 — Export

- ZIP semua dokumen.
- Tulis ke `docs/` repo pilihan.
- Opsional: buat commit dengan pesan `docs: update specs for <project>`.
- Sertakan `README.md` kecil yang menjelaskan struktur.

---

## 7. Document Graph

Contoh edge:

```
PRD              → REQUIREMENTS, FEATURES, USER_FLOW
REQUIREMENTS     → FEATURES, TESTING
FEATURES         → USER_FLOW, API, DATABASE
USER_FLOW        → API, BUSINESS_RULES
DATABASE         → API, ARCHITECTURE
API              → ARCHITECTURE, TESTING
ARCHITECTURE     → DEPLOYMENT, SECURITY, MONITORING
BUSINESS_RULES   → REQUIREMENTS, TESTING
ROADMAP          → FEATURES
```

Graph ini dipakai untuk:

- menentukan dokumen dependensi saat generate;
- menentukan kandidat dampak saat perubahan;
- validasi referensi silang.

---

## 8. UX

### 8.1 Halaman

1. **Projects** — daftar proyek, status, tombol baru.
2. **New Project** — textarea ide, upload, contoh prompt.
3. **Analysis Review** — ringkasan roles, fitur, kompleksitas, doc plan.
4. **Interview** — satu pertanyaan per kartu, progress, back/next.
5. **Stack** — rekomendasi + dropdown kustom.
6. **Plan** — checklist dokumen yang akan dibuat.
7. **Workspace** — tiga panel:
   - kiri: daftar dokumen + status;
   - tengah: preview/editor + tab Diff/History;
   - kanan: chat + impact analysis.
8. **Export** — ZIP, folder repo, commit.
9. **Settings** — provider, model, reasoning effort, template.

### 8.2 Detail UX yang penting

- **Streaming** saat generate agar tidak terasa macet.
- **Progress per dokumen**, bukan spinner global.
- **Auto-save** editor.
- **Diff view** sebelum apply perubahan.
- **Version history** dengan restore.
- **Keyboard shortcuts** untuk navigasi dokumen.
- **Toast** untuk sukses/gagal, bukan alert.

---

## 9. Provider Adapter

### 9.1 OpenCode Go

**[Fakta]** Dari dokumentasi OpenCode:

```
Base URL Go:
https://opencode.ai/inference/go

OpenAI Chat Completions:
POST https://opencode.ai/inference/go/openai/v1/chat/completions

Header:
Authorization: Bearer <OPENCODE_API_KEY>
Content-Type: application/json
x-opencode-session: ses_<stable-id>

Body:
{
  "model": "deepseek-v4.1-flash",
  "messages": [...],
  "stream": true,
  "reasoning_effort": "max",
  "max_tokens": 32768
}
```

**Catatan:**

- `reasoning_effort` perlu diverifikasi dengan smoke test; model mendukung `low`, `high`, `max`.
- `x-opencode-session` wajib untuk Go; gunakan ID stabil per proyek/chat.
- Reasoning content biasanya muncul di `reasoning_content`; jangan campur dengan jawaban final.
- Model: context 1.000.000 token, output maksimum 384.000 token.
- Harga list: $0,30/1M input, $1,20/1M output, cache read $0,006/1M.

### 9.2 Fallback

| Provider | Base URL | Kapan dipakai |
|---|---|---|
| OpenCode Go | `https://opencode.ai/inference/go/openai/v1` | Default, personal |
| OpenCode Console PAYG | `https://opencode.ai/inference/openai/v1` | Jika Go limit/ToS tidak cocok |
| DeepSeek langsung | `https://api.deepseek.com` | Jika punya API key sendiri |

Adapter harus membaca env:

```
AI_PROVIDER=opencode-go
AI_BASE_URL=https://opencode.ai/inference/go/openai/v1
AI_MODEL=deepseek-v4.1-flash
AI_REASONING_EFFORT=max
OPENCODE_API_KEY=...
```

### 9.3 Penanganan error

- Retry dengan exponential backoff untuk 429/5xx.
- Timeout per request (mis. 10 menit untuk dokumen panjang).
- Jika output terpotong: lanjutkan dengan prompt "continue from where you stopped" atau generate per section.
- Log usage ke `runs` untuk analisis biaya.

---

## 10. MVP Scope

### Phase 1 — Core Loop (3–5 hari kerja fokus)

- Scaffold Next.js + Tailwind + shadcn/ui.
- SQLite + Drizzle.
- Provider adapter + smoke test.
- Intake → analysis → interview → stack.
- Doc plan 6 dokumen: `PRD`, `REQUIREMENTS`, `FEATURES`, `DATABASE`, `API`, `ARCHITECTURE`.
- Generate satu per satu dengan streaming.
- Workspace preview + edit.
- Export ZIP.

**Definition of done:** satu ide → enam dokumen Markdown yang bisa dibaca dan diedit, tersimpan di SQLite, bisa di-export.

### Phase 2 — Consistency & Control (1–2 minggu)

- `SpecModel` kanonik.
- Generate dokumen dari `SpecModel`.
- Consistency linter deterministik.
- Version history + diff.
- Impact analysis.
- Tambah `USER_FLOW`, `BUSINESS_RULES`, `ROADMAP`.

**Definition of done:** perubahan requirement bisa memicu update API/DB dengan diff dan snapshot.

### Phase 3 — Personal Power Features (2–4 minggu)

- Tulis langsung ke repo + commit.
- Template per jenis proyek (SaaS, marketplace, internal tool).
- Eval suite 5–10 ide.
- Lebih banyak dokumen: `SECURITY`, `TESTING`, `DEPLOYMENT`, `MONITORING`.
- Dukungan Mermaid penuh.
- Optional deploy ke Vercel + Neon.

---

## 11. Eval Plan

Tanpa eval, kualitas prompt akan menurun tanpa disadari.

**Corpus:** 5–10 ide dengan kompleksitas berbeda.

**Rubrik (skor 1–5):**

| Kriteria | Pertanyaan |
|---|---|
| Completeness | Apakah semua section wajib ada? |
| Consistency | Apakah role/entity/endpoint konsisten? |
| Specificity | Apakah spesifik, bukan generik? |
| Testability | Apakah requirement punya acceptance criteria? |
| Stack fidelity | Apakah sesuai stack yang dipilih? |
| Diagram validity | Apakah Mermaid valid? |
| Actionability | Bisakah coding agent mengimplementasikan? |
| Cost | Berapa token dan biaya per blueprint? |

**Otomatisasi:**

- Cek heading wajib.
- Cek ID unik.
- Cek referensi endpoint/entity.
- Parse Mermaid.
- Cek placeholder.

**Regression:** simpan hasil eval per versi prompt; bandingkan.

---

## 12. Estimasi Biaya

Asumsi satu blueprint 8–12 dokumen:

- Output dokumen: 40.000–100.000 token.
- Analisis/interview/konsistensi: 10.000–30.000 token.
- Reasoning tokens: 1–3x output.
- Input: 50.000–200.000 token (sebagian cache).

Dengan harga DeepSeek V4.1 Flash:

- Output: $0,05–$0,12 (tanpa reasoning), bisa $0,10–$0,35 dengan reasoning.
- Input: $0,015–$0,06; cache read jauh lebih murah.
- **Total: sekitar $0,10–$0,50 per blueprint.**

Dengan allowance Go $100/bulan, secara teori bisa ratusan blueprint. Namun batas 5 jam ($20) dan mingguan ($50) tetap berlaku.

**Kesimpulan:** untuk pemakaian pribadi, biaya API bukan kendala utama. Kendala utama adalah waktu membangun dan kualitas prompt.

---

## 13. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Go tidak menerima traffic non-coding-agent | Uji volume kecil; siapkan fallback Console PAYG/DeepSeek |
| Limit 5 jam/mingguan | Antrian generation, retry, cache, generate per section |
| Output terpotong | Section-based generation, continuation prompt, validasi panjang |
| Dokumen tidak konsisten | SpecModel + linter deterministik |
| Prompt regression | Eval suite + versioning prompt |
| API key bocor | Server-only env, jangan expose ke client |
| Scope creep | Fase ketat; jangan tambah fitur sebelum core stabil |
| Legal | Clean-room; jangan salin aset/prompt/teks SpecKit |

---

## 14. Struktur Folder yang Diusulkan

```
rea-speckit/
├── app/
│   ├── page.tsx
│   ├── projects/
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── interview/page.tsx
│   │       ├── stack/page.tsx
│   │       └── plan/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── workspace/
│   ├── interview/
│   └── ui/
├── lib/
│   ├── ai/
│   │   ├── provider.ts
│   │   ├── schemas.ts
│   │   └── prompts/
│   ├── spec/
│   │   ├── model.ts
│   │   ├── graph.ts
│   │   ├── consistency.ts
│   │   └── impact.ts
│   ├── db/
│   │   ├── schema.ts
│   │   └── client.ts
│   └── export/
│       ├── zip.ts
│       └── repo.ts
├── docs/
├── scripts/
│   └── smoke-test.ts
├── .env.local
└── package.json
```

---

## 15. Langkah Berikutnya

1. Konfirmasi mode: **local-first** (rekomendasi) atau langsung deploy.
2. Scaffold Next.js + Tailwind + shadcn/ui.
3. Buat schema SQLite + halaman daftar proyek.
4. Buat provider adapter dan smoke test ke OpenCode Go.
5. Bangun vertical slice: intake → analysis → interview → satu dokumen (PRD).
6. Evaluasi output, lalu perluas ke enam dokumen.

**Kriteria sukses MVP:** dalam satu sesi, satu ide berubah menjadi enam dokumen Markdown yang konsisten, bisa diedit, dan bisa di-export — tanpa membuka chat terpisah.
