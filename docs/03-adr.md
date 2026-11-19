# Architecture Decision Records

## ADR-001 — Hono + React SPA + Cloudflare Vite Plugin

**Status:** Accepted

**Konteks:** Aplikasi harus jalan di Cloudflare Workers Free, dikembangkan di Windows, dan memakai UI React.

**Keputusan:** Gunakan Hono sebagai API Worker, React 19 + Vite sebagai SPA, dan `@cloudflare/vite-plugin` untuk integrasi build/dev.

**Alasan:**
- Next.js + OpenNext di Workers menambah kompleksitas dan tidak menjamin dukungan penuh di Windows.
- Hono ringan, Workers-native, dan cocok untuk streaming SSE.
- SPA statis tidak memakai CPU Worker untuk rendering.
- Vite memberi HMR cepat.

**Konsekuensi:**
- Tidak ada SSR/RSC.
- Routing client-side.
- Semua beban rendering dan pemrosesan teks ada di browser.

---

## ADR-002 — Neon Postgres + Drizzle + HTTP Driver

**Status:** Accepted

**Konteks:** Data harus persisten, gratisan, dan ramah Workers.

**Keputusan:** Neon Free + Drizzle ORM + `@neondatabase/serverless` (HTTP).

**Alasan:**
- Prisma di Workers lebih berat dan menambah langkah generate/adapter.
- Drizzle ringan dan type-safe.
- HTTP driver tidak butuh koneksi TCP persisten.
- Neon Free cukup untuk satu user.

**Konsekuensi:**
- Migrasi dijalankan dari lokal/CI, bukan dari Worker.
- Query berat harus dihindari; dokumen disimpan sebagai teks.

---

## ADR-003 — Browser-Heavy Orchestration, Tanpa Workflows di MVP

**Status:** Accepted

**Konteks:** Workers Free hanya memberi 10 ms CPU per invocation. Workflows Free juga 10 ms CPU per step.

**Keputusan:** Browser menjadi orkestrator:
- menyusun prompt;
- mengirim ke Worker `/api/ai`;
- mem-parsing stream;
- menjalankan lint, diff, ZIP, Mermaid;
- menyimpan hasil per dokumen.

Worker hanya:
- auth;
- proxy AI;
- CRUD Neon.

**Alasan:**
- Panggilan AI adalah I/O, tidak dihitung CPU.
- Pemrosesan teks besar dipindahkan ke laptop.
- Menghindari kebutuhan Workflows/Queues.
- Tetap Free.

**Konsekuensi:**
- Tab harus tetap terbuka selama generasi.
- Jika tab ditutup, generasi berhenti; dokumen yang sudah selesai tetap tersimpan.
- Tidak ada background job.
- Keandalan lebih rendah dari Workflows, tetapi cukup untuk satu user.

---

## ADR-004 — Passcode Auth di workers.dev

**Status:** Accepted

**Konteks:** Tidak ada domain, tidak ada layanan paid, hanya satu user.

**Keputusan:** Passcode tunggal + signed HttpOnly cookie.

**Alasan:**
- Cloudflare Access membutuhkan domain.
- Tidak perlu tabel user/session.
- Cukup untuk satu pengguna.

**Konsekuensi:**
- Tidak ada multi-user/role.
- Passcode harus panjang dan acak.
- Tidak ada rate limiting terdistribusi di Free; gunakan passcode kuat.

---

## ADR-005 — Tidak Memakai REA untuk MVP

**Status:** Accepted

**Konteks:** REA adalah MCP server untuk reverse engineering software, bukan aplikasi spec.

**Keputusan:** Skip REA. Gunakan halaman publik, screenshot, changelog, dan DevTools.

**Alasan:**
- REA tidak bisa mengungkap prompt/server SpecKit.
- Menambah dependensi, konfigurasi, dan risiko ToS.
- Kebutuhan utama adalah kualitas prompt dan konsistensi, bukan inspeksi binary.

**Konsekuensi:**
- Tidak ada otomasi inspeksi aplikasi ber-login.
- Fokus pada clean-room behavioral spec.

---

## ADR-006 — Neumorphism sebagai Permukaan, Bukan Teks

**Status:** Accepted

**Konteks:** UI harus neumorphism, tetapi workspace membaca dokumen panjang.

**Keputusan:** Neumorphism untuk shell, panel, tombol, dan state; area baca tetap kontras tinggi.

**Alasan:**
- Shadow lembut memberi karakter visual.
- Teks body tetap terbaca.
- Fokus keyboard jelas.

**Konsekuensi:**
- Tidak semua elemen memakai shadow.
- Aksesibilitas diuji (kontras, focus ring).

---

## ADR-007 — Tidak Ada Layanan Paid di Luar OpenCode Go

**Status:** Accepted

**Konteks:** Pengguna tidak ingin biaya tambahan.

**Keputusan:** Cloudflare Free, Neon Free, GitHub Free, workers.dev, tanpa domain, tanpa R2, tanpa Workers Paid.

**Konsekuensi:**
- Semua fitur harus muat di batas Free.
- Jika batas tercapai, optimalkan atau kurangi scope; jangan upgrade.
- ZIP dan lint di browser.
- Tidak ada background job.
