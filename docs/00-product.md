# mdzs — Product Definition

## 1. Problem

SpecKit.tech berguna, tetapi:

- Berbayar dan berkuota (Pro: 20 blueprint/bulan).
- Semua dokumen di cloud mereka.
- Export hanya ZIP; tidak menulis langsung ke repo.
- Tidak repo-aware.
- Tidak bisa dikustomisasi penuh.

Kebutuhan pengguna fluktuatif: kadang butuh banyak blueprint, kadang tidak sama sekali. Kuota bulanan tetap terasa seperti biaya terbuang.

## 2. Goal

Membangun aplikasi web pribadi yang:

1. Menghasilkan 15 dokumen spesifikasi teknis yang konsisten.
2. Memakai OpenCode Go milik sendiri.
3. Berjalan di Cloudflare Free + Neon Free.
4. Tidak menambahkan kuota produk apa pun.
5. Bisa dioperasikan dari browser laptop, dengan beban berat di klien.
6. Memiliki UI neumorphism yang nyaman untuk membaca dokumen panjang.

## 3. Non-Goals

- SaaS multi-user, billing, subscription, admin panel.
- Kolaborasi real-time.
- Mobile app.
- Code generation penuh.
- Domain kustom.
- Layanan berbayar di luar OpenCode Go.
- Clone 1:1 aset/prompt/UI SpecKit.

## 4. Definisi "n>1"

n>1 berarti **lebih baik dari parity**, bukan multi-varian dokumen.

| Dimensi | Target |
|---|---|
| Dokumen | 15, semuanya terbuka, full length |
| Kuota produk | Tidak ada |
| Export | ZIP + commit GitHub |
| Shared review | Read-only link (fase 2) |
| Data | Neon milik sendiri |
| UI | Neumorphism |
| Biaya marginal | $0 selama allowance Go cukup |
| Repo-aware | Fase lanjut |

## 5. Constraint Teknis

| Platform | Batas | Strategi |
|---|---|---|
| Cloudflare Free | 10 ms CPU/invocation | Worker tipis; beban di browser |
| Workers Free | 100.000 request/hari | Cukup untuk satu user |
| Neon Free | 100 CU-hours, 1 GB, 5 GB egress | Dokumen teks kecil |
| OpenCode Go | $100/bulan, 5 jam $20, mingguan $50 | Antrean, retry, tanpa fallback paid |
| workers.dev | Tanpa domain | Passcode + signed cookie |

## 6. Success Metrics

- 15 dokumen dihasilkan dari satu ide tanpa intervensi manual.
- 100% lolos lint referensi/ID/Mermaid.
- Tidak ada placeholder `TBD` di luar Open Questions.
- Satu blueprint selesai < 30 menit (termasuk review).
- Tidak ada error CPU 1102 di alur normal.
- Biaya marginal per blueprint < $0,50 (di dalam allowance Go).

## 7. Prinsip UX

- Neumorphism sebagai permukaan, bukan teks.
- Kontras body ≥ 4.5:1.
- Fokus keyboard terlihat.
- Workspace tiga panel: dokumen, preview/raw/diff, assistant.
- Status dokumen jelas: `draft`, `generating`, `verified`, `stale`.
