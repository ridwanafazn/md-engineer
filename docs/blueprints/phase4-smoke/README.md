# README — KerjaTim

| Field | Nilai |
|---|---|
| Produk | KerjaTim |
| Jenis aplikasi | Web app manajemen tugas untuk tim kecil |
| Sumber kebenaran | SpecModel proyek KerjaTim |
| Stack | Next.js App Router + TypeScript + Tailwind/shadcn; Route Handlers/Server Actions + Zod; PostgreSQL Supabase; Supabase Auth; Resend |
| Deployment | Vercel Hobby + Supabase free tier + Resend free |
| Model komersial | Tanpa pembayaran |
| Entity kanonik | `profiles`, `projects`, `project_members`, `tasks`, `comments` |
| Endpoint kanonik | `EP-001`–`EP-015` |
| Requirement kanonik | `REQ-001`–`REQ-017`; MVP `REQ-001`–`REQ-015` |
| Business rule kanonik | `BR-001`–`BR-006` |

Dokumen ini adalah pintu masuk proyek dan peta dokumentasi. SpecModel adalah satu-satunya sumber kebenaran. README ini tidak menambahkan entity, endpoint, role, requirement, atau aturan baru. Jika README berbeda dari SpecModel, SpecModel menang.

## 1. Project Overview

KerjaTim adalah aplikasi web manajemen tugas untuk tim kecil berukuran sekitar 2–10 orang. Produk memusatkan proyek, tugas, komentar, dan laporan mingguan dalam satu tempat. Pengguna mendaftar dan masuk dengan email/password, lalu memiliki role `owner` atau `member` per proyek.

Masalah yang diselesaikan: tim kecil kesulitan memantau pekerjaan proyek, pembagian tugas, diskusi, dan progres mingguan secara terpusat tanpa alat yang terlalu kompleks. KerjaTim menjaga alur tetap sempit: proyek memiliki anggota, tugas memiliki penanggung jawab dan status selesai/belum selesai, diskusi melekat pada tugas, dan laporan mingguan dapat dibaca tanpa rekap manual.

### 1.1 Aktor dan otorisasi

| Role | Hak utama |
|---|---|
| `owner` | Membuat proyek; mengubah nama/deskripsi; menambahkan member berdasarkan email persis; mengeluarkan member; mengalihkan kepemilikan; membuat, mengubah, dan menghapus tugas; mengubah semua field tugas; berkomentar; melihat laporan mingguan. |
| `member` | Melihat proyek yang diikuti; membuat tugas; mengubah status tugas yang ditugaskan kepadanya; berkomentar; melihat laporan mingguan. |

Aturan yang mengikat:

- Role berlaku per proyek (`BR-002`). Satu pengguna dapat menjadi `owner` di satu proyek dan `member` di proyek lain.
- Setiap proyek memiliki tepat satu owner yang disimpan sebagai `project_members.role = owner` (`BR-001`). Transfer kepemilikan mengubah owner lama menjadi `member` dan owner baru menjadi `owner` dalam satu transaksi (`REQ-009`).
- Member hanya boleh mengubah `is_completed` pada tugas dengan `assignee_id` miliknya. Mengubah konten, mengganti assignee, atau menghapus tugas hanya boleh dilakukan owner (`BR-003`, `REQ-011`, `REQ-012`).
- Mengeluarkan member menghapus baris `project_members`, tetapi tugas dan komentar tetap ada; nama penulis tetap diambil dari `profiles` (`BR-004`, `REQ-008`).
- Penambahan member hanya melalui pencocokan email persis. Sistem tidak menampilkan daftar pengguna (`BR-006`, `REQ-007`).
- Otorisasi diperiksa di server pada setiap endpoint terproteksi. Pengguna tanpa sesi mendapat `401`; member yang mencoba aksi khusus owner mendapat `403` (`REQ-015`).

### 1.2 Cakupan MVP

| Area | Requirement | Endpoint |
|---|---|---|
| Registrasi, login, logout, reset password | `REQ-001`–`REQ-003` | `EP-001`–`EP-004` |
| Proyek dan anggota | `REQ-004`–`REQ-009` | `EP-005`–`EP-010`, `EP-007` |
| Tugas | `REQ-010`–`REQ-012` | `EP-011`–`EP-013` |
| Komentar | `REQ-013` | `EP-014` |
| Laporan mingguan | `REQ-014` | `EP-015` |
| Kontrol akses berbasis role | `REQ-015` | Semua endpoint terproteksi |

Pencarian/filter tugas (`REQ-016`) dan ringkasan tugas pribadi (`REQ-017`) berstatus `later`. `EP-007` tetap mendukung query `q`, `status`, dan `assignee_id` sesuai kontrak SpecModel.

Di luar cakupan MVP: pembayaran, notifikasi, lampiran file, undangan melalui email, integrasi pihak ketiga, dan multi-workspace.

### 1.3 Entity dan laporan

Entity kanonik: `profiles`, `projects`, `project_members`, `tasks`, `comments`. Laporan mingguan tidak memakai tabel snapshot atau cron; laporan dihitung saat dibaca dari `tasks`. Laporan memakai `is_completed` terkini untuk tugas yang `created_at` atau `updated_at` berada pada periode Senin–Minggu (`REQ-014`, `BR-005`).

## 2. Quick Start

### Prasyarat

- Node.js 20 LTS dan npm 10.
- Git.
- Docker Desktop untuk Supabase lokal.
- Supabase CLI.
- Untuk deployment: akun Vercel, proyek Supabase, dan Resend.

### Langkah lokal

```bash
npm ci
cp .env.example .env.local
npx supabase start
npx supabase db reset
npm run dev
```

Setelah `supabase start`, salin API URL dan anon key dari output terminal ke `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local`. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Aplikasi berjalan di `http://localhost:3000`.

Jika memakai Supabase cloud, lewati `supabase start` dan `supabase db reset`; gunakan URL/anon key proyek cloud dan terapkan migrasi ke proyek tersebut melalui Supabase CLI yang sudah ditautkan.

### Verifikasi cepat

1. Tanpa cookie sesi, endpoint terproteksi harus menolak:

   ```bash
   curl -i http://localhost:3000/api/projects
   ```

   Respons yang diharapkan: `401` (`REQ-015`).

2. Buka `/signup`, daftarkan pengguna dengan email valid, password minimal 8 karakter, dan `display_name` (`REQ-001`). Jika konfirmasi email Supabase diaktifkan, konfirmasi email sebelum login; status ini masih tercatat di Open Questions.
3. Login, buat proyek, lalu pastikan pembuat tercatat sebagai `owner` (`REQ-004`).
4. Buat tugas dengan penanggung jawab dari anggota proyek (`REQ-010`), tambahkan komentar (`REQ-013`), dan buka laporan mingguan dengan `week_start` hari Senin (`REQ-014`).
5. Daftarkan pengguna kedua, tambahkan sebagai member menggunakan email persis (`REQ-007`), lalu uji bahwa member tidak dapat menghapus tugas, mengubah konten tugas, atau mengubah anggota proyek (`REQ-008`, `REQ-011`, `REQ-012`, `REQ-015`).

## 3. Repository Structure

```text
.
├── README.md
├── PRD.md
├── FEATURES.md
├── REQUIREMENTS.md
├── USER_FLOW.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── BUSINESS_RULES.md
├── SECURITY.md
├── TESTING.md
├── TASKS.md
├── ROADMAP.md
├── DEPLOYMENT.md
├── OBSERVABILITY.md
├── .env.example
├── package.json
├── package-lock.json
├── next.config.ts
├── middleware.ts
├── tailwind.config.ts
├── tsconfig.json
├── app
│   ├── (auth)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (app)
│   │   └── projects
│   │       ├── page.tsx
│   │       └── [project_id]
│   │           ├── page.tsx
│   │           └── reports/page.tsx
│   └── api
│       ├── auth
│       │   ├── signup/route.ts
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   └── password/forgot/route.ts
│       ├── projects
│       │   ├── route.ts
│       │   └── [project_id]
│       │       ├── route.ts
│       │       ├── members/route.ts
│       │       ├── members/[user_id]/route.ts
│       │       ├── tasks/route.ts
│       │       └── reports/weekly/route.ts
│       └── tasks
│           ├── [task_id]/route.ts
│           └── [task_id]/comments/route.ts
├── components
├── lib
│   ├── auth
│   ├── authz
│   ├── db
│   ├── services
│   ├── supabase
│   └── validation
├── supabase
│   ├── config.toml
│   ├── migrations
│   └── seed.sql
└── tests
    ├── unit
    ├── integration
    └── e2e
```

Pemetaan route API wajib mengikuti endpoint kanonik: `EP-001` signup, `EP-002` login, `EP-003` logout, `EP-004` forgot password, `EP-005`/`EP-006` daftar dan pembuatan proyek, `EP-007`/`EP-008` detail dan perubahan proyek, `EP-009` tambah member, `EP-010` keluarkan member, `EP-011` buat tugas, `EP-012`/`EP-013` ubah dan hapus tugas, `EP-014` komentar, `EP-015` laporan mingguan. Jangan menambahkan route API di luar daftar tersebut tanpa memperbarui SpecModel dan `API.md`.

## 4. Environment Variables

| Variabel | Wajib | Lingkup | Fungsi |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Ya | Browser + server | URL proyek Supabase. Lokal: nilai dari output `supabase start`. Produksi: nilai dari dashboard Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ya | Browser + server | Anon key Supabase. Nilai ini memang tersedia di client, tetapi akses data tetap dibatasi RLS dan authorization guard server. |
| `NEXT_PUBLIC_APP_URL` | Ya | Browser + server | Origin aplikasi untuk redirect login/reset dan pembentukan URL absolut. Lokal: `http://localhost:3000`. Produksi: domain Vercel. Nilai ini harus konsisten dengan Site URL Supabase Auth. |

Ketentuan:

- `.env.local` tidak dikomit. `.env.example` hanya memuat nama variabel, bukan kredensial nyata.
- Jangan menaruh secret server, service role key, atau kredensial email di variabel `NEXT_PUBLIC_*`.
- Sesi pengguna disimpan pada cookie HttpOnly, Secure, dan SameSite=Lax. Token sesi tidak disimpan di `localStorage` (`REQ-002`, `REQ-015`).
- Resend tidak dibaca sebagai environment variable aplikasi Next.js. Kredensial SMTP Resend dikonfigurasi pada Supabase Auth untuk pengiriman tautan reset password (`EP-004`, `REQ-003`).
- Nilai produksi diatur pada environment Vercel untuk Preview dan Production. Jangan menggunakan kredensial produksi pada test lokal.

## 5. Development

### Alur kerja

1. Pastikan perubahan perilaku sudah ada di SpecModel. Jika belum, perbarui SpecModel lebih dahulu; README, `API.md`, `DATABASE.md`, dan dokumen terkait mengikuti.
2. Implementasikan validasi request dengan Zod di server.
3. Jalankan authorization guard sebelum query atau mutasi. Untuk endpoint proyek, ambil `project_id` dari path dan `user_id` dari sesi. Untuk endpoint tugas/komentar, resolusi proyek dari `task_id`, lalu periksa keanggotaan dan role pada `project_members`.
4. Jangan menerima `role`, `user_id` pelaku, `author_id`, atau `owner_id` dari client sebagai dasar otorisasi.
5. Kembalikan status code sesuai kontrak: `200`, `201`, `202`, `204`, `400`, `401`, `403`, `404`, atau `409`.
6. Tambahkan atau perbarui test yang merujuk ID requirement terkait.

### Aturan domain

- Transfer kepemilikan proyek wajib atomik: tepat satu owner setelah transaksi (`BR-001`, `REQ-009`).
- Member hanya boleh mengirim `is_completed` untuk tugas dengan `assignee_id` dirinya; owner dapat mengubah seluruh field tugas (`BR-003`, `REQ-011`).
- Hapus tugas menghapus komentar terkait; hapus member tidak menghapus tugas/komentar (`REQ-008`, `REQ-012`).
- Laporan mingguan dihitung saat dibaca dari `tasks`, tanpa tabel laporan dan tanpa cron (`BR-005`, `REQ-014`).
- Jangan menambahkan pembayaran, notifikasi, lampiran file, undangan email, integrasi pihak ketiga, atau multi-workspace pada MVP.

### Script yang digunakan

| Script | Fungsi |
|---|---|
| `npm run dev` | Menjalankan Next.js dalam mode development. |
| `npm run build` | Build produksi Next.js. |
| `npm run start` | Menjalankan hasil build. |
| `npm run lint` | Lint kode. |
| `npm run typecheck` | Pemeriksaan TypeScript tanpa emit. |
| `npm test` | Unit test. |
| `npm run test:integration` | Integration test terhadap Supabase lokal. |
| `npm run test:e2e` | End-to-end test web app. |

### Database

- Migrasi disimpan di `supabase/migrations/` dan diterapkan dengan Supabase CLI. Jangan mengubah migrasi yang sudah diterapkan; buat migrasi baru.
- Gunakan `npx supabase db reset` untuk membangun ulang database lokal dari migrasi dan seed.
- Review migrasi sebelum diterapkan ke proyek cloud. Perubahan skema harus konsisten dengan `DATABASE.md` dan `BUSINESS_RULES.md`.
- RLS diaktifkan sebagai lapisan pertahanan tambahan; RLS bukan pengganti authorization guard server (`REQ-015`).

## 6. Testing

Test dibagi menjadi unit, integration, dan end-to-end. Test unit memeriksa validasi Zod, aturan transisi status, dan fungsi agregasi laporan. Test integration memeriksa route handler, sesi cookie, query database, constraint, dan otorisasi. Test E2E memeriksa alur pengguna utama di browser.

| Requirement | Cakupan test minimum |
|---|---|
| `REQ-001` | Signup valid; email tidak valid; password kurang dari 8 karakter; email duplikat menghasilkan `409`; profil aplikasi dibuat. |
| `REQ-002` | Login benar membuat sesi; login salah `401`; logout menghapus cookie; halaman terproteksi mengalihkan ke login. |
| `REQ-003` | Permintaan reset email terdaftar memicu pengiriman; email tidak terdaftar tetap menghasilkan pesan netral; password lama tidak berlaku setelah reset. |
| `REQ-004` | Proyek baru tersimpan; pembuat tercatat sebagai `owner`; proyek muncul di daftar proyek pembuat. |
| `REQ-005` | Daftar proyek hanya berisi proyek tempat pengguna menjadi anggota; non-anggota mendapat `403` atau `404`. |
| `REQ-006` | Owner dapat mengubah nama/deskripsi; member/non-anggota `403`; nama kosong `400`. |
| `REQ-007` | Pencocokan email persis; email tidak ditemukan `404`; anggota yang sudah ada `409`; tidak ada daftar pengguna. |
| `REQ-008` | Owner mengeluarkan member; mantan member kehilangan akses; tugas/komentar tetap ada; owner tidak dapat mengeluarkan diri sendiri. |
| `REQ-009` | Transfer ke member aktif menghasilkan tepat satu owner; owner lama menjadi member; target non-anggota ditolak; member `403`. |
| `REQ-010` | Anggota membuat tugas; `assignee_id` bukan anggota proyek `400`; tugas baru `is_completed=false`. |
| `REQ-011` | Owner mengubah semua field; member hanya `is_completed` untuk tugas miliknya; perubahan lain `403`; `updated_at` diperbarui. |
| `REQ-012` | Owner menghapus tugas beserta komentar terkait; member/non-anggota `403`. |
| `REQ-013` | Komentar non-kosong tersimpan dengan `author_id` dan `created_at`; tampil kronologis dengan `display_name`; body kosong `400`; non-anggota `403`. |
| `REQ-014` | `week_start` Senin; periode Senin–Minggu; tugas di luar periode tidak muncul; kelompok selesai/belum selesai memakai status terkini; non-anggota `403`. |
| `REQ-015` | Semua endpoint terproteksi menolak tanpa sesi (`401`); aksi owner oleh member ditolak (`403`); pengecekan memakai `project_id` dan `user_id` sesi. |
| `REQ-016`, `REQ-017` | Berstatus `later`; test regresi hanya dijalankan setelah fitur diimplementasikan. Bukan gate MVP. |

Perintah verifikasi:

```bash
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
```

Integration test memakai Supabase lokal dan database yang direset. E2E tidak boleh dijalankan terhadap data produksi. Nama test harus menyertakan ID requirement, misalnya `REQ-011 member tidak dapat mengubah konten tugas anggota lain`.

## 7. Deployment

Target deployment: Vercel Hobby untuk Next.js, Supabase free tier untuk PostgreSQL dan Supabase Auth, serta Resend free untuk email reset password. Tidak ada backend terpisah, worker, cron, atau layanan pembayaran.

### Langkah deployment

1. Buat proyek Supabase. Terapkan migrasi dari `supabase/migrations/` melalui Supabase CLI.
2. Aktifkan Supabase Auth email/password. Atur Site URL dan redirect URL ke domain produksi serta halaman reset password aplikasi.
3. Konfigurasikan SMTP Resend pada Supabase Auth. Selesaikan verifikasi domain pengirim Resend sebelum mengandalkan pengiriman email reset (`EP-004`, `REQ-003`).
4. Pertahankan keputusan verifikasi email sesuai Open Questions. Jangan mengklaim alur yang belum diputuskan pada dokumentasi maupun UI.
5. Hubungkan repository ke Vercel. Gunakan Node.js 20 LTS. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `NEXT_PUBLIC_APP_URL` untuk Preview dan Production.
6. Pastikan build lokal lulus sebelum deploy:

   ```bash
   npm ci
   npm run build
   ```

7. Deploy melalui integrasi Git Vercel. Setelah deploy, jalankan smoke test:
   - signup, login, logout (`REQ-001`, `REQ-002`);
   - reset password dan pesan netral (`REQ-003`);
   - pembuatan proyek dan pencatatan owner (`REQ-004`);
   - penambahan member dengan email persis (`REQ-007`);
   - penolakan aksi owner oleh member dan penolakan non-anggota (`REQ-015`);
   - transfer kepemilikan (`REQ-009`);
   - laporan mingguan (`REQ-014`).
8. Periksa cookie sesi: HttpOnly, Secure, SameSite=Lax. Jangan menyimpan token di `localStorage`.
9. Pantau kuota free tier Supabase, Vercel, dan Resend. Batas free tier dapat menghentikan atau membatasi layanan.

### Rollback dan operasi

- Rollback aplikasi dilakukan dengan mempromosikan deployment Vercel sebelumnya.
- Migrasi database harus forward-compatible. Jangan menjalankan migrasi destruktif tanpa backup dan review.
- Laporan mingguan tidak memerlukan cron atau job terjadwal; perhitungan dilakukan saat endpoint `EP-015` dipanggil (`BR-005`).
- Log server dan error tersedia melalui Vercel dan Supabase. Jangan menulis token, cookie, atau kredensial ke log.

## 8. Documentation Map

Set dokumentasi proyek terdiri dari 15 dokumen berikut, termasuk README ini. Dokumen dependensi yang sudah ada, seperti `PRD.md` dan `ARCHITECTURE.md`, harus konsisten dengan SpecModel dan README ini. README tidak menyalin seluruh isi dokumen dependensi; gunakan peta ini untuk menelusuri detail.

| No | Dokumen | Isi utama | ID dan batas |
|---|---|---|---|
| 1 | `README.md` | Pintu masuk proyek: overview, quick start, struktur repository, environment variables, development, testing, deployment, peta dokumentasi, Open Questions. | Semua ID kanonik; tidak menambah aturan baru. |
| 2 | `PRD.md` | Problem, visi produk, target users/personas, roles, scope MVP, metrik keberhasilan, risiko, dan open questions tingkat produk. | `REQ-*`, `BR-*`; tidak menambah entity/endpoint. |
| 3 | `FEATURES.md` | Katalog fitur MVP dan `later`, prioritas, ringkasan perilaku, dan keterkaitan ke requirement/endpoint. | `REQ-001`–`REQ-017`, `EP-001`–`EP-015`. |
| 4 | `REQUIREMENTS.md` | Seluruh requirement dengan ID, prioritas, statement, dan acceptance criteria yang dapat diuji. | `REQ-001`–`REQ-017`; MVP `REQ-001`–`REQ-015`. |
| 5 | `USER_FLOW.md` | Alur registrasi/login/reset password, proyek/anggota, tugas, komentar, dan laporan mingguan beserta aktor dan langkahnya. | Flow SpecModel; `REQ-*`, `EP-*`. |
| 6 | `ARCHITECTURE.md` | System context, komponen, batas kepercayaan, alur request, deployment, tradeoff, serta minimal satu diagram Mermaid `graph TD` dan satu `sequenceDiagram`. | `EP-001`–`EP-015`, `REQ-001`–`REQ-017`, `BR-001`–`BR-006`. |
| 7 | `DATABASE.md` | Entity `profiles`, `projects`, `project_members`, `tasks`, `comments`; field, relasi, index, constraint, RLS, dan aturan tepat satu owner. | `BR-001`, `BR-002`, `BR-004`, `REQ-004`–`REQ-014`. |
| 8 | `API.md` | Kontrak `EP-001`–`EP-015`: method, path, auth, request, response, error, status code, dan aturan validasi. | `EP-001`–`EP-015`; `REQ-001`–`REQ-015`. |
| 9 | `BUSINESS_RULES.md` | `BR-001`–`BR-006` beserta konsekuensi, enforcement server, dan dampak pada data/otorisasi. | `BR-001`–`BR-006`. |
| 10 | `SECURITY.md` | Supabase Auth, sesi cookie, reset password, pencocokan email, authorization guard per proyek, RLS, penanganan `401`/`403`, dan pengelolaan secret. | `REQ-002`, `REQ-003`, `REQ-015`, `BR-002`, `BR-003`. |
| 11 | `TESTING.md` | Strategi unit/integration/E2E, data test, environment, dan pemetaan test ke setiap ID requirement. | `REQ-001`–`REQ-017`; MVP gate `REQ-001`–`REQ-015`. |
| 12 | `TASKS.md` | Urutan implementasi berdasarkan ID requirement, endpoint, dependensi, dan kriteria selesai. | `REQ-*`, `EP-*`; tidak menambah requirement. |
| 13 | `ROADMAP.md` | Urutan rilis MVP, batas `later` untuk `REQ-016`/`REQ-017`, dan ketergantungan produk. | `REQ-001`–`REQ-017`. |
| 14 | `DEPLOYMENT.md` | Konfigurasi Vercel, Supabase, Resend, environment, migrasi, smoke test, rollback, dan batas free tier. | `EP-001`–`EP-015`, `REQ-001`–`REQ-015`. |
| 15 | `OBSERVABILITY.md` | Logging server, log Supabase/Vercel, pemantauan error, audit kegagalan otorisasi, dan larangan menulis token/kredensial ke log. | Operasional; tidak menambah endpoint atau fitur produk. |

Urutan baca yang disarankan: README → PRD → REQUIREMENTS dan BUSINESS_RULES → USER_FLOW → ARCHITECTURE → DATABASE → API → SECURITY → TESTING → TASKS dan ROADMAP → DEPLOYMENT → OBSERVABILITY. Setiap perubahan perilaku dimulai dari SpecModel, lalu dicerminkan pada dokumen dan test terkait.

## Open Questions

1. Zona waktu default laporan mingguan belum ditetapkan. Usulan `Asia/Jakarta` perlu dikonfirmasi; periode Senin–Minggu dan penggunaan status terkini sudah ditetapkan.
2. Apakah verifikasi email Supabase diaktifkan saat pendaftaran, atau akun langsung aktif setelah signup?
3. Apakah komentar boleh diedit atau dihapus, atau bersifat permanen pada MVP?
4. Bagaimana penanganan tugas yang masih ditugaskan ke mantan member setelah ia dikeluarkan: tetap terbuka sampai owner mengganti assignee, atau otomatis dilepas?

Ketidakpastian di luar daftar ini tidak boleh diperlakukan sebagai requirement. Perubahan apa pun harus terlebih dahulu dicatat di SpecModel.