# Parity Matrix & Acceptance Criteria

Definisi:
- **Parity** = fungsi setara SpecKit.
- **n>1** = parity + diferensiasi yang terukur.
- **Quality gate** = syarat yang harus lolos sebelum fase dianggap selesai.

## 1. Matriks Fitur

| # | Fitur | SpecKit | mdzs | Target | Acceptance |
|---|---|---|---|---|---|
| 1 | Intake ide teks | Ya | Ya | Parity | Simpan ide, validasi panjang |
| 2 | Upload brief | Ya | Ya | Parity | Markdown/TXT; PDF/DOCX fase lanjut |
| 3 | Analisis produk | Ya | Ya | Parity | Menghasilkan roles, fitur, kompleksitas, doc plan |
| 4 | Adaptive interview | Ya | Ya | Parity | 3–8 pertanyaan, opsi + custom |
| 5 | Rekomendasi stack | Ya | Ya | Parity | Frontend/backend/DB/auth/storage/payment |
| 6 | 15 dokumen | Ya, bertingkat | Ya, semua | n>1 | Semua full length, tanpa lock |
| 7 | Konsistensi lintas dokumen | Ya | Ya | n>1 | Linter deterministik + laporan |
| 8 | Impact analysis | Ya | Ya | Parity | Diff per dokumen sebelum apply |
| 9 | Version history | Ya | Ya | Parity | Snapshot + restore |
| 10 | Mermaid | Ya | Ya | Parity | `graph TD` + `sequenceDiagram` valid |
| 11 | Bilingual | Ya | Ya | Parity | ID/EN |
| 12 | Export ZIP | Ya | Ya | Parity | ZIP 15 file `.md` |
| 13 | Commit GitHub | Tidak | Ya | n>1 | Commit ke branch repo |
| 14 | Read-only share | Tidak | Ya | n>1 | Link token, tanpa login, bisa dicabut |
| 15 | Kuota produk | Ya | Tidak | n>1 | Tidak ada batas proyek/dokumen/chat |
| 16 | Repo-aware | Tidak | Ya | n>1 (fase 5) | Baca repo untuk update spec |
| 17 | Template kustom | Tidak | Ya | n>1 (fase 5) | Template per jenis proyek |
| 18 | UI neumorphism | Tidak | Ya | n>1 | Konsisten, kontras ≥4.5:1 |

## 2. Quality Gates

### Gate A — Dokumen

- 15 dokumen ada.
- Semua punya heading wajib.
- Tidak ada placeholder `TBD` di luar `Open Questions`.
- Panjang minimum per dokumen: 800 kata (PRD 1.500 kata).

### Gate B — Konsistensi

- 100% `REQ-*` unik.
- 100% endpoint yang direferensikan ada di `API`.
- 100% entity yang direferensikan ada di `DATABASE`.
- 100% role konsisten di `PRD`, `REQUIREMENTS`, `USER_FLOW`.
- 100% Mermaid block bisa diparse.

### Gate C — Review

- Diff ditampilkan sebelum apply.
- Versi lama tersimpan.
- Restore versi berfungsi.

### Gate D — Performa

- Tidak ada error 1102 (CPU) di alur normal.
- Generate 15 dokumen selesai < 30 menit.
- ZIP dibuat di browser < 2 detik.

### Gate E — Biaya

- Tidak ada layanan paid baru.
- Pemakaian Go tercatat di tabel `runs`.
- Biaya per blueprint < $0,50 (estimasi).

## 3. Eval Corpus

Lima ide uji:

1. Marketplace jasa lokal.
2. SaaS manajemen inventori.
3. Aplikasi booking layanan.
4. Platform kursus online.
5. Tools internal untuk tim kecil.

Setiap ide dinilai:

| Kriteria | Skor 1–5 |
|---|---|
| Completeness | Semua section |
| Consistency | Referensi valid |
| Specificity | Tidak generik |
| Testability | Acceptance criteria |
| Stack fidelity | Sesuai stack |
| Actionability | Bisa diimplementasikan |

Ambang lulus: rata-rata ≥4, tidak ada skor 1–2 di consistency/actionability.

## 4. Definisi Selesai MVP

- Fase 0–4 selesai.
- 5 ide eval lulus.
- Deploy `workers.dev` berfungsi.
- Passcode auth aktif.
- Tidak ada layanan paid selain OpenCode Go.
