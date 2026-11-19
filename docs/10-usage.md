# Usage Guide

## Akses

- URL: https://mdzs.ridwanafzn.workers.dev
- Passcode: lihat `MDZS_PASSCODE` di `.dev.vars`.
- Tidak ada akun, billing, atau kuota produk.

## Alur Utama

1. **Buat proyek** — isi nama dan ide produk.
2. **Analisis** — AI memetakan roles, fitur, kompleksitas, dan dokumen.
3. **Interview** — jawab 3–8 pertanyaan; opsi atau jawaban custom.
4. **Stack** — terima atau edit rekomendasi.
5. **SpecModel** — model kanonik: entities, endpoints, requirements.
6. **Generate 15 dokumen** — Wave 1 lalu Wave 2.
7. **Workspace** — baca, edit, chat, lint, diff, restore.
8. **Export** — ZIP atau commit GitHub.
9. **Share** — link read-only atau cabut.

## Workspace

- **Rich Preview** — Markdown + Mermaid.
- **Raw Markdown** — teks asli.
- **Diff Compare** — bandingkan dengan versi sebelumnya; restore versi.
- **Lint semua** — cek heading, REQ, endpoint, entity, Mermaid, TBD.
- **Chat** — minta perubahan; impact plan muncul sebelum diff.
- **Export ZIP** — dibuat di browser; 15 dokumen + manifest.
- **Share read-only** — link tanpa login; bisa dicabut.
- **Commit GitHub** — butuh fine-grained PAT `contents:write`.

## GitHub Commit

1. Buat fine-grained PAT untuk repo tujuan.
2. Beri izin **Contents: Read and write**.
3. Buka **Commit GitHub** di workspace.
4. Isi `owner/repo`, branch yang sudah ada, folder tujuan, dan token.
5. Token hanya dipakai untuk request tersebut dan tidak disimpan.

## Catatan Operasional

- Generate dokumen memakai reasoning `max`; bisa beberapa menit per dokumen.
- Jangan tutup tab saat generate di UI. Jika berhenti, dokumen yang sudah selesai tersimpan dan bisa dilanjutkan.
- Go allowance: $100/bulan, limit 5 jam/mingguan tetap berlaku.
- Jika tab ditutup, lanjutkan lewat wizard; dokumen yang ada akan dilewati.
- Data tersimpan di Neon project `mdzs` (Singapore).

## Keamanan

- Passcode dan session secret hanya di Worker secret.
- API key OpenCode Go tidak pernah dikirim ke browser.
- Token GitHub tidak disimpan di server.
- `.dev.vars` tidak di-commit.
