# Build Plan

## Fase 0 — Fondasi (selesai)

**Tujuan:** repo, arsitektur, database, auth, AI proxy, shell UI.

- [x] Clone `ridwanafazn/md-engineer`.
- [x] Dokumen riset dan arsitektur.
- [x] Neon project `mdzs` (Singapore).
- [x] Drizzle schema.
- [x] Worker Hono: health, auth, projects, documents, AI proxy.
- [x] React SPA + neumorphism shell.
- [x] `.dev.vars` dan contoh env.
- [x] `npm install` selesai.
- [x] Migrasi schema ke Neon (9 tabel).
- [x] Build lokal lolos.
- [x] Smoke test: login, create project, upsert document, delete.
- [x] Deploy `workers.dev`.
- [x] Commit awal dan push ke GitHub.

**Live:** https://mdzs.ridwanafzn.workers.dev

**Acceptance:** login passcode berhasil, `/api/health` menunjukkan `db=true` dan `ai=true`, smoke test AI mengembalikan `OK`.

---

## Fase 1 — Vertical Slice (selesai)

**Tujuan:** satu ide → analisis → interview → PRD.

- [x] Intake form (teks) + daftar proyek.
- [x] Analisis produk via AI (JSON terstruktur).
- [x] Adaptive interview 3–8 pertanyaan + jawaban custom.
- [x] Rekomendasi stack yang bisa diedit.
- [x] Generate PRD dengan streaming.
- [x] Simpan analysis, interview, stack, dan PRD ke Neon.
- [x] Tampilkan PRD di workspace tiga panel.
- [x] Auth passcode + navigasi wizard.
- [x] API interview: list, replace, answer.
- [x] Smoke test end-to-end.

**Acceptance:** satu proyek menghasilkan PRD full length, tersimpan, dan bisa dibuka di workspace.
**Hasil smoke:** analysis 2 roles/11 fitur, 3 interview, PRD 2.278 kata, 1 dokumen, cleanup OK.

---

## Fase 2 — 15 Dokumen + Workspace (selesai)

**Tujuan:** semua dokumen dan linter.

- [x] Doc plan adaptif.
- [x] SpecModel kanonik (roles, entities, endpoints, requirements, flows, rules).
- [x] Generate Wave 1 dan Wave 2.
- [x] Workspace tiga panel penuh.
- [x] Rich Preview dengan Markdown + Mermaid.
- [x] Raw Markdown.
- [x] Diff Compare + version snapshot.
- [x] Linter deterministik (heading, REQ, endpoint, entity, Mermaid, TBD).
- [x] Status `draft`/`verified`/`stale`.
- [x] API status dokumen + daftar versi.
- [x] Stream JSON untuk SpecModel (menghindari headers timeout).
- [x] Retry untuk request AI.

**Acceptance:** 15 dokumen dihasilkan, 100% lolos lint referensi dan Mermaid.
**Hasil full smoke:** 15/15 dokumen, total ±61.363 kata, **0 error, 0 warning**, project status `ready`. Mermaid terverifikasi di browser (flowchart dan sequence).

---

## Fase 3 — Chat + Impact Analysis (selesai)

**Tujuan:** revisi terkontrol.

- [x] Chat assistant dengan konteks SpecModel + 15 dokumen.
- [x] Impact plan terstruktur (`reply`, `affected`, `instruction`).
- [x] Diff modal sebelum apply.
- [x] Revisi per dokumen dengan streaming.
- [x] Apply multi-dokumen + snapshot versi otomatis.
- [x] Persistensi chat di Neon.
- [x] Restore versi dari tab Diff.
- [x] Chat history + impact plan tersimpan.

**Hasil smoke:**
- Impact plan: DATABASE, API, REQUIREMENTS, PRD, FEATURES, DESIGN.
- DATABASE: v1 (4.199 kata) → v2 (4.482 kata) → restore v3 = konten v1.
- API: v1 (4.227 kata) → v2 (4.711 kata) → restore v3 = konten v1.
- Chat messages: 2.
- Lint akhir: 15 dokumen, 0 error, 0 warning.

**Acceptance:** perubahan requirement mengidentifikasi minimal 2 dokumen, revisi/apply/restore diverifikasi pada 2 dokumen dengan versi baru.

---

## Fase 4 — Export + Share (selesai)

**Tujuan:** keluaran dan review.

- [x] Export ZIP di browser (fflate, 15 dokumen + manifest).
- [x] Commit GitHub via Git Data API.
- [x] Token GitHub per-request, tidak disimpan di server.
- [x] Shared read-only link (token, tanpa login).
- [x] Halaman publik read-only + Markdown/Mermaid.
- [x] Daftar link + revoke.

**Hasil smoke:**
- ZIP: 139.496 byte, 16 entry (15 dokumen + `MANIFEST.json`).
- Share publik: status 200, 15 dokumen.
- Revoke: status 404 setelah dicabut.
- GitHub: 15 file masuk ke `docs/blueprints/phase4-smoke`, commit `b3ed21e`.

**Acceptance:** ZIP berisi 15 file; commit masuk ke repo; link read-only bisa dibuka dan dicabut.

---

## Fase 5 — Polish + Deploy

**Tujuan:** kualitas dan rilis.

- Eval 5 ide.
- Perbaikan prompt.
- Benchmark CPU Free.
- Optimasi neumorphism/aksesibilitas.
- Deploy `workers.dev`.
- Dokumentasi penggunaan.

**Acceptance:** 5 ide lulus quality gate; tidak ada error CPU; URL aktif.

---

## Risiko

| Risiko | Mitigasi |
|---|---|
| 10 ms CPU terlampaui | Worker tipis; lint/ZIP di browser; benchmark awal |
| Go limit 5 jam/mingguan | Antrean, retry, simpan per dokumen |
| Output terpotong | Generate per section; continuation |
| Kualitas prompt | Eval corpus + iterasi |
| Scope creep | Satu fase per prompt “lanjutkan” |
| Data loss | Snapshot versi + commit Git |

## Aturan Eksekusi

- Satu fase per prompt **“lanjutkan”**.
- Setiap fase diakhiri dengan build/check dan commit.
- Tidak menambah layanan paid.
- Tidak memakai REA.
