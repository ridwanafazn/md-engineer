# Teardown: SpecKit.tech

> **Status:** 19 November 2026
> **Sumber:** halaman publik `speckit.tech` (landing, pricing, docs, about, changelog), dokumentasi OpenCode Console/Go, dan katalog model OpenCode.
> **Konvensi:** **[Fakta]** = terlihat langsung di halaman publik/dokumentasi. **[Inferensi]** = rekonstruksi dari perilaku, changelog, dan pola arsitektur umum — bukan klaim tentang source code internal.

---

## 1. Ringkasan Eksekutif

SpecKit adalah **"AI software architect"**: aplikasi web yang mengubah ide produk berbahasa natural menjadi **satu set dokumen spesifikasi teknis Markdown yang saling terhubung** — PRD, requirements, database, API, arsitektur, user flow, business rules, roadmap, dan lainnya.

Nilai utamanya bukan model AI-nya. Model hanyalah mesin generatif. Nilai utamanya adalah:

1. **Pipeline yang opinionated** — urutan analisis → interview → stack → dokumen.
2. **Document graph** — dokumen saling mereferensikan dan dijaga konsisten.
3. **Impact analysis** — perubahan satu dokumen memicu pembaruan dokumen terkait.
4. **UX workspace** — review, edit, diff, version history, export.
5. **Prompt engineering per jenis dokumen** — output panjang, terstruktur, dan sesuai stack.

Dengan kata lain: **SpecKit adalah spec compiler, bukan chatbot.**

---

## 2. Pekerjaan yang Diselesaikan

**Job-to-be-done:** "Saya punya ide. Saya butuh blueprint teknis yang cukup detail dan konsisten sehingga saya (atau coding agent) bisa mulai implementasi tanpa kebingungan."

Yang dihasilkan bukan kode, melainkan **konteks implementasi**:

- siapa penggunanya dan apa perannya;
- fitur dan requirement yang bisa diuji;
- model data dan relasi;
- kontrak API;
- arsitektur dan alur integrasi;
- aturan bisnis dan edge case;
- rencana pengiriman.

Dokumen-dokumen ini dirancang untuk bisa langsung diletakkan di `docs/` dan dibaca oleh manusia maupun coding agent.

---

## 3. User Journey

**[Fakta]** Berdasarkan landing page, docs, dan changelog:

1. **Input ide**
   - Manual, maksimum 5.000 karakter.
   - Upload file ide, maksimum 10.000–20.000 karakter tergantung tier.
   - Upload PRD, maksimum 20.000–50.000 karakter.

2. **Analisis produk**
   - AI mendeteksi user roles, fitur, model bisnis, kompleksitas proyek.
   - Menentukan dokumen apa saja yang relevan.

3. **Adaptive AI interview**
   - Pertanyaan pilihan ganda adaptif, bukan kuesioner statis.
   - Free: maksimal 5 pertanyaan.
   - Starter/Pro: dinamis 3–8 pertanyaan.
   - Branch pruning: jawaban lama bisa membatalkan pertanyaan turunan.

4. **Rekomendasi tech stack**
   - Frontend, backend, database, auth, storage, payment.
   - Bisa diterima atau dikustomisasi.
   - Stack memengaruhi kosakata dokumen (tipe data, contoh endpoint, istilah framework).

5. **Pemilihan bundle dokumen**
   - Free: 5 dokumen inti.
   - Starter: 11 dokumen.
   - Pro: 15+ dokumen.
   - PAYG: 5 inti + 3 dokumen pilihan per token.

6. **Generasi blueprint**
   - Dokumen dibuat berurutan/terbatch dengan progress UI.
   - PRD bisa mencapai ±20.480 token; dokumen teknis ±7.500 token per dokumen.
   - Progress screen dengan estimasi waktu dan log aktivitas.

7. **Workspace tiga panel**
   - Kiri: daftar dokumen.
   - Tengah: Markdown preview/editor.
   - Kanan: AI assistant.
   - Fitur: impact analysis, version history, diff compare, Mermaid viewer.

8. **Iterasi**
   - Chat untuk mengubah atau memperluas spesifikasi.
   - Impact analysis menunjukkan dokumen yang terdampak.
   - Perubahan diterapkan secara sinkron setelah disetujui.

9. **Export**
   - ZIP berisi file `.md`.
   - Tidak ada sinkronisasi Git otomatis; user menaruh file di repo sendiri.

---

## 4. Inventaris Fitur

| Area | Fitur | Catatan |
|---|---|---|
| Intake | Ide manual, upload ide, upload PRD | Batas karakter per tier |
| Analisis | Deteksi roles, fitur, model bisnis, kompleksitas | Output memengaruhi doc plan |
| Interview | Pertanyaan adaptif, opsi + jawaban custom | 3–8 pertanyaan; branch pruning |
| Stack | Rekomendasi + kustomisasi | Frontend/backend/DB/auth/storage/payment |
| Dokumen | 15+ jenis dokumen Markdown | Bertingkat per plan |
| Workspace | Tiga panel, preview, editor, chat | Pengalaman utama |
| Konsistensi | Cross-document validation, auto-reconciliation saat export | Endpoint yang hilang ditambahkan otomatis |
| Impact analysis | Menentukan dokumen terdampak sebelum update | Berbasis dokumen + AI |
| Versioning | Riwayat versi dan rollback | Snapshot dokumen |
| Diagram | Mermaid `graph TD` dan `sequenceDiagram` | Wajib di ARCHITECTURE |
| Bahasa | Indonesia dan English | Pemilihan saat summary |
| Export | ZIP Markdown | Bukan Git sync |
| Admin | Dashboard user, revenue, token cost, feedback, changelog | Operasional bisnis |
| Billing | Polar + Midtrans, webhook idempotent | Subscription + PAYG |
| Kuota | Ledger kredit, refund saat gagal | Proteksi margin |

---

## 5. Dokumen dan Tier

**[Fakta]** Berdasarkan pricing page:

| Kelompok | Dokumen |
|---|---|
| Core (semua plan) | `PRD`, `FEATURES`, `DATABASE`, `API`, `DESIGN` |
| Architecture (Starter+) | `USER_FLOW`, `BUSINESS_RULES`, `ROADMAP`, `REQUIREMENTS`, `ARCHITECTURE`, `INTEGRATIONS` |
| Advanced (Pro) | `SECURITY`, `TESTING`, `DEPLOYMENT`, `MONITORING`, `SEO_STRATEGY`, `COMPLIANCE` |

SpecKit secara eksplisit menyatakan jumlah dokumen **adaptif terhadap kompleksitas**: proyek sederhana bisa 4 dokumen, proyek teregulasi bisa 15+.

---

## 6. Pricing dan Unit Economics

**[Fakta]**

| Plan | Harga | Blueprint | AI chat | AI calls | Dokumen |
|---|---:|---:|---:|---:|---|
| Free | $0 | 1/bulan | 4/bulan | 30/bulan | 5 core |
| PAYG | $0.99/blueprint | sesuai pembelian | +10/token | free plan + credits | 5 core + 3 pilihan |
| Starter | $3.99/bulan | 6/bulan | 60/bulan | 180/bulan | 11 |
| Pro | $9.99/bulan | 20/bulan | 200/bulan | 600/bulan | 15+ |

**Implikasi:**

- Pro = $0,50 pendapatan per blueprint. Jika biaya AI per blueprint $0,10–$0,30, gross margin masih positif tetapi tidak besar.
- Kuota berfungsi sebagai **proteksi margin**, bukan sekadar pembatasan marketing.
- Free tier adalah akuisisi; PAYG adalah jalur konversi tanpa komitmen.
- Bisnis ini monetisasi **orchestration + UX**, bukan akses model.

---

## 7. Teknologi yang Teramati

**[Fakta]** Dari changelog publik:

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4, shadcn/ui, Radix UI |
| Database | MongoDB |
| ORM | Prisma 6 |
| Runtime | Node.js 22 |
| Diagram | Mermaid 11 |
| Sanitasi | DOMPurify 3 |
| AI | DeepSeek V3/V4, Google Vertex AI (Gemini 2.5), AWS Bedrock (Claude 3.5) |
| Failover | Multi-provider auto-failover |
| Pembayaran | Polar (global), Midtrans (Indonesia) |
| Deployment | Docker, Oracle Ampere A1 VPS, GitHub Actions ARM64 |
| Observability | Dozzle, health endpoint, admin dashboard |
| Auth | Auth internal + middleware/proxy Next.js 16 |

Catatan penting: **SpecKit sendiri menggunakan DeepSeek V3/V4** sebagai salah satu provider. Artinya, model yang Anda rencanakan (DeepSeek V4.1 Flash) berada di kelas yang sama dengan mesin di balik produk ini.

---

## 8. Arsitektur yang Diinferensikan

**[Inferensi]** Berdasarkan endpoint yang disebut di changelog (`/api/ai/generate`, `/api/ai/chat`, `/api/webhooks/polar`, `/api/health`), pola Next.js App Router, dan fitur produk:

```
┌──────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│  Next.js App Router + React 19 + Tailwind + shadcn/ui         │
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│ API / Server Actions                                         │
│  /api/projects/*   /api/ai/generate   /api/ai/chat            │
│  /api/export/*     /api/webhooks/*    /api/admin/*            │
└───────────────┬───────────────────────────────┬──────────────┘
                │                               │
┌───────────────▼──────────────┐   ┌────────────▼──────────────┐
│ Orchestration Layer          │   │ Commerce & Entitlement     │
│  - prompt builder            │   │  - Polar / Midtrans        │
│  - document planner          │   │  - webhook idempotency     │
│  - interview engine          │   │  - quota ledger            │
│  - consistency validator     │   │  - plan gating             │
│  - impact analyzer           │   └────────────┬──────────────┘
└───────────────┬──────────────┘                │
                │                               │
┌───────────────▼──────────────┐   ┌────────────▼──────────────┐
│ Provider Adapters            │   │ MongoDB                   │
│  DeepSeek / Vertex / Bedrock │   │  projects, documents,     │
│  auto failover + quotas      │   │  versions, chats, usage   │
└──────────────────────────────┘   └───────────────────────────┘
```

**Komponen kunci:**

1. **Wizard/workspace UI** — onboarding, interview, editor, preview.
2. **AI orchestration** — menyusun prompt, memilih model, memvalidasi output.
3. **Document store** — dokumen Markdown + versi + metadata.
4. **Consistency layer** — validasi lintas dokumen dan rekonsiliasi export.
5. **Entitlement layer** — plan, kuota, kredit, refund.
6. **Export service** — ZIP, pembersihan, penamaan file.
7. **Admin/observability** — biaya token, user activity, feedback.

---

## 9. Cara Kerja AI-nya (Rekonstruksi)

**[Inferensi]** Pipeline yang paling masuk akal berdasarkan fitur dan changelog:

### 9.1 Analisis ide

Input ide + konteks → output terstruktur:

```json
{
  "summary": "...",
  "roles": ["guest", "customer", "admin"],
  "features": ["..."],
  "businessModel": "...",
  "complexity": "medium",
  "suggestedDocuments": ["PRD", "REQUIREMENTS", "DATABASE", "API"],
  "risks": ["..."]
}
```

Output ini menjadi dasar **doc plan**, bukan langsung menjadi dokumen.

### 9.2 Adaptive interview

Model diberi ide + analisis + jawaban sebelumnya, lalu menghasilkan 3–8 pertanyaan pilihan ganda. Setiap pertanyaan punya opsi dan memungkinkan jawaban custom. Jika jawaban berubah, pertanyaan turunan yang tidak relevan dibuang (*branch pruning*).

Tujuan interview bukan mengumpulkan data sebanyak mungkin, tetapi **menutup keputusan yang akan mengubah arsitektur** — role, workflow, pembayaran, otorisasi, integrasi, edge case.

### 9.3 Rekomendasi stack

Output terstruktur berisi pilihan frontend/backend/DB/auth/storage/payment beserta alasan. Stack kemudian menjadi **kosakata** untuk dokumen teknis: tipe data, contoh endpoint, istilah ORM, pola deployment.

### 9.4 Generasi dokumen

Dokumen tidak dibuat sekaligus dalam satu prompt raksasa. Pola yang paling mungkin:

- **Batch** berdasarkan jenis dokumen.
- **Urutan dependensi**: PRD → requirements → data/API → arsitektur → dokumen lanjutan.
- Setiap dokumen punya **prompt khusus** dengan batas token sendiri.
- PRD mendapat alokasi terbesar (±20K token), dokumen teknis ±7.500 token.
- Ada **strict scope guardrail** agar dokumen tidak membahas isi dokumen lain.
- Mermaid diwajibkan untuk arsitektur (`graph TD`, `sequenceDiagram`).

### 9.5 Konsistensi lintas dokumen

Ini bagian yang paling penting dan paling sulit.

- Setelah dokumen dibuat, ada validasi referensi silang.
- Saat export, ada **auto-reconciliation**: misalnya endpoint yang disebut di `USER_FLOW.md` tetapi belum ada di `API.md` ditambahkan otomatis.
- Ini menunjukkan adanya **model kanonik** (setidaknya secara logis): daftar role, entity, endpoint, requirement ID.

### 9.6 Impact analysis

Saat user meminta perubahan:

1. Model menganalisis permintaan.
2. Model menentukan dokumen dan bagian yang terdampak.
3. UI menampilkan daftar dampak.
4. User menyetujui.
5. Perubahan diterapkan ke beberapa dokumen sekaligus.
6. Versi baru disimpan.

Ini bukan sekadar chat; ini **change management** untuk dokumen.

### 9.7 Versioning

Setiap perubahan menghasilkan snapshot. User bisa melihat diff dan rollback. Ini penting karena output AI panjang sulit direview tanpa pembanding.

---

## 10. Data Model yang Diinferensikan

**[Inferensi]** Berdasarkan fitur dan istilah di changelog:

```
users
  id, email, name, plan, role, created_at

projects
  id, user_id, name, idea, status, complexity, created_at, updated_at

analyses
  id, project_id, json, created_at

interviews
  id, project_id, questions_json, answers_json, status

stack_choices
  id, project_id, json

documents
  id, project_id, type, title, slug, content_md,
  version, status, created_at, updated_at

document_versions
  id, document_id, version, content_md, reason, created_at

document_links
  id, project_id, from_doc, to_doc, kind, ref

chats
  id, project_id, role, content, created_at

ai_usage_ledger
  id, user_id, project_id, provider, model,
  input_tokens, output_tokens, cost, created_at

transactions / subscriptions
  id, user_id, provider, plan, status, metadata

feedback / changelog
  id, user_id, content, status, created_at
```

---

## 11. Mengapa Produk Ini Terasa "Magic"

1. **Pipeline yang jelas** — user tidak perlu tahu prompt; ia hanya menjawab pertanyaan.
2. **Dokumen saling terhubung** — bukan 10 file terpisah yang saling bertentangan.
3. **Impact analysis** — perubahan terasa "pintar" karena sistem tahu dependensi.
4. **Output panjang dan terstruktur** — setiap dokumen punya format yang konsisten.
5. **UX yang mengurangi beban kognitif** — tiga panel, preview, diff, versi.
6. **Provider failover** — pengalaman tetap stabil meski satu model lambat.
7. **Batas scope per dokumen** — mencegah model menulis hal yang tidak relevan.

**Yang bukan moat:** akses ke model. DeepSeek, Gemini, dan Claude bisa diakses siapa saja. Moat-nya adalah **orkestrasi + kualitas prompt + konsistensi + UX**.

---

## 12. Kelemahan dan Peluang

| Kelemahan | Peluang untuk versi pribadi |
|---|---|
| Kuota bulanan (20 blueprint untuk Pro) | Tanpa kuota artificial; batasnya allowance API |
| Cloud-only, ide disimpan di server mereka | Local-first, data tetap di mesin sendiri |
| Export hanya ZIP, bukan Git sync | Tulis langsung ke `docs/` repo + commit |
| Tidak repo-aware | Bisa membaca kode untuk update spesifikasi |
| Template dokumen tetap | Template bisa dikustomisasi per jenis proyek |
| Tidak ada code generation/validation | Bisa menambahkan validasi terhadap kode |
| Output bisa generik | Bisa menyuntikkan konteks domain dan style sendiri |
| Tidak ada knowledge base lintas proyek | Bisa menyimpan pola dan keputusan lintas proyek |
| UI berat untuk penggunaan pribadi | UI minimal, fokus pada alur inti |
| Bahasa/dokumen dibatasi tier | Semua dokumen selalu tersedia |

---

## 13. Build vs Buy

| Kondisi Anda | Rekomendasi |
|---|---|
| Butuh ≤20 blueprint/bulan, tidak butuh kustomisasi | **Beli Pro** — $9,99 lebih murah dari waktu membangun |
| Butuh template sendiri, local-first, atau integrasi repo | **Bangun** |
| Akan menghasilkan >20 blueprint/bulan | **Bangun** — allowance API lebih besar |
| Ingin belajar arsitektur AI product | **Bangun** |
| Butuh hasil terbaik secepat mungkin | **Beli** |
| Ingin menjual kembali sebagai produk | **Bangun**, tetapi jangan pakai Go untuk produksi |

**Kesimpulan jujur:** jika motifnya semata-mata menghemat $9,99/bulan, membangun aplikasi ini tidak rasional. Jika motifnya **kontrol, kustomisasi, privasi, integrasi repo, dan volume**, membangun sangat masuk akal.

---

## 14. Risiko

### 14.1 Risiko Go / API

**[Fakta]** OpenCode Go $10/bulan:

- DeepSeek V4.1 Flash 1017 memiliki **monthly limit $100** (Go) dan $200 (Go Plus).
- Batas 5 jam = 20% allowance; batas mingguan = 50%.
- Go ditujukan untuk **OpenCode dan coding agent lain** yang menghasilkan traffic serupa.
- Client wajib mengirim `x-opencode-session`.
- Traffic dipantau untuk penyalahgunaan.

**Implikasi:** bukan unlimited. Untuk pemakaian pribadi, $100 allowance sangat besar (ratusan blueprint). Tetapi jangan membangun produk publik/multi-tenant di atas langganan Go.

### 14.2 Risiko kualitas

- Prompt generik menghasilkan dokumen generik.
- Tanpa model kanonik, dokumen akan saling bertentangan.
- Tanpa eval, regresi prompt tidak terdeteksi.
- Output panjang rawan terpotong.

### 14.3 Risiko legal

- Jangan menyalin prompt, teks, aset, atau UI SpecKit.
- Gunakan **clean-room**: amati perilaku publik, tulis requirement sendiri, implementasi sendiri.
- Jangan menyalin dokumen contoh atau copywriting mereka.

### 14.4 Risiko keamanan

- API key harus di server, tidak pernah di browser.
- Jika di-deploy, tambahkan autentikasi dan rate limiting.
- Jangan log API key atau isi prompt sensitif.

---

## 15. Pertanyaan Terbuka

1. Apakah Go menerima traffic non-coding-agent seperti spec generator? (Perlu konfirmasi ke support atau uji volume kecil.)
2. Parameter reasoning yang tepat untuk `reasoning_effort: "max"` di endpoint OpenAI-compatible.
3. Seberapa baik prompt caching DeepSeek bekerja untuk prefix panjang yang stabil?
4. Berapa output token maksimum efektif per request sebelum truncation?
5. Seberapa konsisten DeepSeek V4.1 Flash mengikuti format Markdown dan ID referensi?
6. Apakah lebih baik generate dokumen secara paralel atau berurutan dengan konteks kanonik?

---

## 16. Kesimpulan

SpecKit adalah produk yang **matang secara alur, bukan secara teknologi**. Yang mahal bukan modelnya, melainkan:

- desain pipeline,
- kualitas prompt per dokumen,
- konsistensi lintas dokumen,
- impact analysis,
- dan UX review/versioning.

Semua itu bisa direplikasi untuk penggunaan pribadi dengan ruang lingkup yang jauh lebih kecil: **satu user, tanpa billing, tanpa admin, tanpa multi-tenant**. Justru di situ peluangnya — versi pribadi bisa lebih sederhana, lebih privat, lebih murah, dan lebih terintegrasi dengan repo Anda.
