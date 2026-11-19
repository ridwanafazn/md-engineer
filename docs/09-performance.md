# Performance & CPU Benchmark

Target: Cloudflare Workers Free — **10 ms CPU per invocation**.

## Metode

- `wrangler tail mdzs --format json`.
- 5 request per skenario.
- CPU time dibaca dari field `cpuTime` (milidetik), bukan wall time.

## Sebelum optimasi (20 Nov 2026)

| Skenario | CPU time |
|---|---:|
| `GET /api/health` | 0–1 ms |
| `POST /api/auth/login` | 1–2 ms |
| `GET /api/projects/:id` — 15 dokumen penuh | **17–55 ms** |
| `PUT /api/projects/:id/documents` — body 217 KB | **17 ms** |
| `DELETE /api/projects/:id` | 3 ms |

## Diagnosis

`GET /api/projects/:id` mengembalikan seluruh isi 15 dokumen (±400 KB) dalam satu respons. Serialisasi JSON-nya melewati batas 10 ms. Ini akan gagal di Free plan untuk proyek besar.

## Perbaikan

1. `GET /api/projects/:id?meta=1` mengembalikan metadata dokumen tanpa `contentMd`.
2. `GET /api/projects/:id/documents/:type` mengambil isi satu dokumen.
3. Workspace memuat metadata dulu, lalu isi dokumen yang dipilih.
4. Lint dan Export ZIP mengambil dokumen satu per satu dari browser.
5. Chat mengambil dokumen lengkap secara lazy saat pertama kali dibutuhkan.
6. Halaman share juga metadata + dokumen per request.
7. GitHub commit tetap operasi berat yang jarang; tidak dipakai di jalur baca utama.

## Sesudah optimasi

Diukur ulang setelah deploy. Target:

- Metadata project: **< 5 ms**.
- Satu dokumen: **< 5 ms**.
- Health/login: **< 3 ms**.

Jika masih melewati 10 ms pada jalur normal, opsi berikutnya adalah memecah respons atau menunda fitur berat; bukan upgrade paid.
