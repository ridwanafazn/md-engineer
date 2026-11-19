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
- [ ] Commit awal.

**Live:** https://mdzs.ridwanafzn.workers.dev

**Acceptance:** login passcode berhasil, `/api/health` menunjukkan DB siap; AI menunggu API key OpenCode Go diisi pengguna.

---

## Fase 1 — Vertical Slice

**Tujuan:** satu ide → analisis → interview → PRD.

- Intake form (teks).
- Analisis produk via AI (JSON terstruktur).
- Adaptive interview 3–8 pertanyaan.
- Rekomendasi stack.
- Generate PRD.
- Simpan ke Neon.
- Tampilkan di workspace.
- Streaming progress.

**Acceptance:** satu proyek menghasilkan PRD full length, tersimpan, bisa diedit.

---

## Fase 2 — 15 Dokumen + Workspace

**Tujuan:** semua dokumen dan linter.

- Doc plan adaptif.
- SpecModel kanonik.
- Generate Wave 1 dan Wave 2.
- Workspace tiga panel penuh.
- Rich Preview / Raw Markdown / Diff.
- Linter deterministik.
- Status `draft`/`verified`/`stale`.
- Mermaid render.

**Acceptance:** 15 dokumen dihasilkan, 100% lolos lint referensi dan Mermaid.

---

## Fase 3 — Chat + Impact Analysis

**Tujuan:** revisi terkontrol.

- Chat assistant.
- Impact plan terstruktur.
- Diff per dokumen.
- Apply perubahan.
- Snapshot versi.
- Restore versi.

**Acceptance:** perubahan requirement memperbarui minimal 2 dokumen terkait dengan diff dan versi baru.

---

## Fase 4 — Export + Share

**Tujuan:** keluaran dan review.

- Export ZIP di browser.
- Commit ke GitHub via token.
- Shared read-only link (token, tanpa login).
- Cabut link.

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
