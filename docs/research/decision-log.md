# Decision Log — Personal Spec Compiler

> Status: **draft, belum implementasi**. Dokumen ini mengunci keputusan dari diskusi dan menandai hal yang masih terbuka.

---

## 1. Keputusan yang Sudah Dikunci

| Area | Keputusan |
|---|---|
| Deploy | Cloudflare Workers **Free** + Neon **Free** |
| Frontend | React 19 + Vite + Tailwind CSS + shadcn/ui |
| API | Hono di Cloudflare Workers |
| Database | Neon Postgres + Drizzle ORM + `@neondatabase/serverless` |
| Orkestrasi | Cloudflare Workflows (Free) atau client-driven; diuji terhadap batas CPU |
| Auth | Single user; passcode + signed cookie. Cloudflare Access hanya jika ada domain |
| Dokumen | **15 dokumen**, full length, tanpa gating |
| Scope | MVP; solo; shared read-only link setelah core stabil |
| Git commit | Masuk MVP |
| Kuota produk | Tidak ada |
| AI | OpenCode Go, `deepseek-v4.1-flash`, reasoning `max` |
| Pendekatan | Clean-room; parity fungsi, bukan salin aset/prompt/UI |

---

## 2. 15 Dokumen (dari Screenshot SpecKit)

1. `PRD.md`
2. `DESIGN.md`
3. `REQUIREMENTS.md`
4. `FEATURES.md`
5. `USER_FLOW.md`
6. `DATABASE.md`
7. `API.md`
8. `BUSINESS_RULES.md`
9. `ARCHITECTURE.md`
10. `SECURITY.md`
11. `TESTING.md`
12. `ROADMAP.md`
13. `DECISIONS.md`
14. `TASKS.md`
15. `README.md`

**Urutan generasi yang diusulkan:**

```
PRD
 → REQUIREMENTS
 → FEATURES
 → DESIGN
 → USER_FLOW
 → DATABASE
 → API
 → BUSINESS_RULES
 → ARCHITECTURE
 → SECURITY
 → TESTING
 → ROADMAP
 → DECISIONS
 → TASKS
 → README
```

Dokumen inti (PRD–ARCHITECTURE) distabilkan lebih dulu; sisanya menyusul dalam wave kedua. Semua tetap full length, tanpa versi "draft ringkas".

---

## 3. Definisi 1:1 vs n>1

**1:1** = fitur dan alur setara SpecKit.

**n>1** = parity tersebut ditambah diferensiasi yang membuat tool ini lebih cocok untuk penggunaan pribadi.

| Dimensi | SpecKit | Target kita |
|---|---|---|
| Jumlah dokumen | 15, sebagian terkunci di Free | 15, semuanya terbuka |
| Panjang dokumen | Free dibatasi ±1.000 kata | Full length selalu |
| Kuota | 20 blueprint/bulan (Pro) | Tidak ada kuota produk |
| Export | ZIP | ZIP + commit ke GitHub |
| Shared review | Tidak ada | Read-only link |
| Data | Cloud milik mereka | Neon milik sendiri |
| Template | Tetap | Bisa dikustomisasi (fase lanjut) |
| Repo-aware | Tidak | Fase lanjut |
| Biaya marginal | $9,99/bulan | $0 marginal selama allowance Go mencukupi |

**Catatan:** "n>1" bukan klaim subjektif "lebih bagus n kali". Ini daftar diferensiasi terukur. Kualitas output tetap harus dibuktikan lewat eval.

---

## 4. Arsitektur

```
Browser (React SPA, static assets)
  │
  ├─ SSE / fetch
  ▼
Cloudflare Worker (Hono)
  ├─ Auth passcode
  ├─ API projects/docs/chat/export
  ├─ AI proxy → OpenCode Go
  └─ Workflow trigger
        │
        ▼
Cloudflare Workflow
  ├─ step: analyze
  ├─ step: interview
  ├─ step: generate doc (x15)
  ├─ step: lint
  └─ step: finalize
        │
        ▼
Neon Postgres (Drizzle)
  projects, documents, versions, links, runs
```

**Prinsip CPU-light untuk Free plan:**

- Panggilan AI = waktu tunggu I/O, tidak dihitung CPU.
- Parsing Markdown, lint, dan ZIP sebaiknya di browser atau dipecah menjadi langkah kecil.
- Prompt dibangun dari data yang sudah tersimpan; hindari pemrosesan besar di Worker.
- Jika benchmark menunjukkan 10 ms CPU tidak cukup, opsinya: optimalkan atau upgrade ke Workers Paid $5.

---

## 5. Alur MVP

1. **Intake** — ide teks, upload Markdown/TXT.
2. **Analysis** — roles, fitur, kompleksitas, doc plan.
3. **Adaptive interview** — 3–8 pertanyaan.
4. **Stack** — rekomendasi + override.
5. **SpecModel** — roles, entities, endpoints, requirements, flows, rules.
6. **Generate 15 dokumen** — Workflow, per dokumen, full length.
7. **Consistency lint** — referensi, ID, Mermaid, placeholder.
8. **Workspace** — 3 panel: dokumen, preview/raw/diff, AI assistant.
9. **Impact analysis** — chat → diff → apply → version snapshot.
10. **Export** — ZIP + commit GitHub.
11. **Shared read-only link** — setelah core stabil.

---

## 6. Quality Gates

- 100% dokumen punya heading wajib.
- 100% referensi endpoint/entity/role valid.
- 100% Mermaid block bisa diparse.
- Tidak ada placeholder `TBD` di luar "Open Questions".
- Eval 5 ide: completeness, consistency, specificity, testability, stack fidelity, actionability.
- Tidak ada kuota buatan; batas hanya platform/API.

---

## 7. Batas Platform yang Harus Diuji

| Platform | Batas | Dampak |
|---|---|---|
| Workers Free | 10 ms CPU/invocation, 100k request/hari | Parsing/lint/ZIP harus ringan |
| Workflows Free | 10 ms CPU/step, 3.000 step/hari, 100 instance konkuren | 15 step/blueprint masih aman; CPU perlu diuji |
| Neon Free | 100 CU-hours/project, 1 GB storage, 5 GB egress | Cukup untuk satu user |
| OpenCode Go | $100/bulan, 5 jam $20, mingguan $50 | Bukan unlimited; perlu antrean/fallback |
| Go ToS | Traffic coding-agent, `x-opencode-session` | Personal use; bukan produk publik |

---

## 8. Hal yang Masih Terbuka

1. **"Clone rea repo"** — repo mana yang dimaksud?
   - SpecKit.tech: tidak publik, tidak bisa di-clone.
   - `github/spec-kit`: CLI toolkit, bukan web app.
   - Repo sendiri: folder ini belum berupa git repo.
2. **Domain** — ada atau tidak? Menentukan Cloudflare Access vs passcode.
3. **"Jangan batas"** — maksudnya tidak ada kuota produk, atau budget infra juga tidak dibatasi?
4. **Akses Cloudflare** — API token/MCP, account ID.
5. **Akses Neon** — API key/MCP, region, database.
6. **API key OpenCode Go** — disimpan sebagai secret, jangan di chat.
7. **Repo GitHub** — URL, branch, PAT `contents:write`.
8. **Definisi "n>1"** — apakah cukup differentiator di tabel, atau ada kriteria lain?

---

## 9. Yang Diperlukan Sebelum Scaffold

### Akses

- Cloudflare: account ID + API token (Workers, Workflows, R2 opsional) atau OAuth MCP.
- Neon: akses project/organization; region Singapore.
- GitHub: repo + PAT fine-grained `contents:write`, atau izin membuat repo.
- OpenCode: API key Go; konfirmasi model `deepseek-v4.1-flash`.

### Keputusan

- Passcode atau Cloudflare Access.
- "Jangan batas" = no product quota atau no infra budget.
- Shared link: fase 2 atau MVP?
- Nama project/repo dan nama aplikasi.

### Tidak Diperlukan

- Sampel ide: akan dibuat 5 ide eval sendiri.
- Desain UI pixel-perfect: kita tiru pola three-panel, bukan asetnya.

---

## 10. Langkah Berikutnya

1. Konfirmasi "clone rea repo" dan keputusan terbuka di atas.
2. Tulis **parity matrix + acceptance criteria**.
3. Tulis **ADR**: Hono vs Next.js, Workflows vs client-driven, passcode vs Access.
4. Rancang **schema Neon** dan **document graph**.
5. Benchmark CPU Free plan dengan prompt/doc size realistis.
6. Baru scaffold vertical slice: intake → analysis → interview → PRD.
