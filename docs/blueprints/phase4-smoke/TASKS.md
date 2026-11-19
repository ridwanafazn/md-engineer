# TASKS.md — KerjaTim

| Field | Nilai |
|---|---|
| Nama dokumen | TASKS.md |
| Produk | KerjaTim |
| Versi | 1.0 |
| Status | Siap untuk review |
| Sumber kebenaran | SpecModel proyek KerjaTim |
| Acuan dependensi | FEATURES.md, REQUIREMENTS.md, ROADMAP.md |
| Cakupan | Backlog implementasi MVP dan later, urutan implementasi, estimasi, Definition of Done, dan dependensi |
| Platform | Web app; Next.js App Router + TypeScript + Tailwind/shadcn |
| Backend, data, auth | Next.js Route Handlers/Server Actions + Zod; PostgreSQL Supabase; Supabase Auth email/password dengan cookie SSR |
| Prioritas | `mvp`, `later` |

Dokumen ini menerjemahkan SpecModel menjadi backlog implementasi yang dapat dieksekusi. SpecModel adalah satu-satunya sumber kebenaran. Dokumen ini tidak menambahkan entity, endpoint, requirement, role, atau aturan bisnis baru. Semua ID yang dipakai adalah ID kanonik dari SpecModel: `REQ-xxx`, `EP-xxx`, `BR-xxx`, dan nama entity `profiles`, `projects`, `project_members`, `tasks`, `comments`. Jika terjadi konflik antara dokumen ini dan SpecModel, SpecModel menang.

Batasan yang mengikat seluruh task:

- Role hanya `owner` dan `member`, berlaku per proyek pada `project_members`; tidak ada role global (`BR-002`).
- Endpoint aplikasi hanya `EP-001` sampai `EP-015`. Task tidak boleh membuat endpoint baru. Penyelesaian reset password memakai alur Supabase Auth dan tidak menambah endpoint aplikasi.
- Entity hanya `profiles`, `projects`, `project_members`, `tasks`, dan `comments`.
- MVP tidak mencakup pembayaran, notifikasi, lampiran file, integrasi pihak ketiga, atau multi-workspace.
- Otorisasi diperiksa di server; RLS Supabase adalah lapisan pertahanan tambahan, bukan pengganti pengecekan server (`REQ-015`).

## 1. Task Format

### 1.1 Struktur task

Setiap task di backlog memakai struktur berikut. Tabel backlog boleh merangkum beberapa field, tetapi issue tracker wajib menyimpan field lengkap.

| Field | Wajib | Aturan |
|---|---|---|
| ID | Ya | Format `T-NNN`, unik, tidak dipakai ulang. |
| Judul | Ya | Imperatif dan spesifik; menyebut endpoint, entity, atau UI yang dihasilkan. |
| Priority | Ya | Hanya `mvp` atau `later`; mengikuti priority requirement terkait. |
| Increment dan milestone | Ya | `Inc-1` sampai `Inc-5`; `M1` sampai `M5` mengikuti ROADMAP.md. |
| Requirement | Ya | Minimal satu `REQ-xxx`; `BR-xxx` ditulis bila task menegakkan aturan bisnis. |
| Endpoint | Ya | `EP-xxx` dari SpecModel. Untuk task fondasi, tulis endpoint target. Untuk task prasyarat tanpa endpoint, tulis `—` dan status `blocked`. |
| Entity | Ya | Nama kanonik entity yang disentuh. |
| Depends on | Ya | ID task lain atau dependensi eksternal. Gunakan `—` bila tidak ada. |
| Estimate | Ya | Person-day, kelipatan 0.5. |
| Output | Ya | Artefak yang dihasilkan: route, migrasi, halaman, test suite, atau checklist. |
| Selesai bila | Ya | Kriteria yang dapat diuji, termasuk status code bila kontrak endpoint menyebutkannya. |
| Test mapping | Ya | `AC-REQ-xxx.y` dan `BR-xxx` yang dicakup; nama test memuat ID tersebut. |
| Status | Ya | `todo`, `in_progress`, `review`, `done`, atau `blocked`. Status awal seluruh task adalah `todo`, kecuali T-040 yang `blocked`. |

Contoh penerapan format:

- ID: `T-026`
- Judul: Implementasi `EP-012` untuk perubahan tugas dengan matriks izin owner/member
- Priority: `mvp`
- Increment/milestone: `Inc-3` / `M3`
- Requirement: `REQ-011`, `BR-003`
- Endpoint: `EP-012`
- Entity: `tasks`, `project_members`
- Depends on: `T-025`
- Estimate: 2.5 PD
- Output: route `PATCH /api/tasks/{task_id}`, skema Zod, pengecekan role server, dan integration test
- Selesai bila: owner dapat mengubah semua field; member hanya dapat mengirim `is_completed` untuk tugas dengan `assignee_id` miliknya; permintaan lain mendapat `403`; `updated_at` diperbarui
- Test mapping: `AC-REQ-011.x`, `BR-003`

### 1.2 Aturan pemecahan task

1. Satu task berukuran 0.5–3.0 PD. Jika melebihi 3.0 PD, pecah menjadi task endpoint, task UI, atau task test tersendiri.
2. Task endpoint memiliki route, validasi Zod, otorisasi server, akses data, dan integration test untuk status `200`/`201`/`204` serta error yang relevan.
3. Task UI hanya mengonsumsi kontrak endpoint yang sudah ada; UI tidak menduplikasi aturan otorisasi atau aturan bisnis di client.
4. Task migrasi boleh menambahkan index, constraint, foreign key, dan kebijakan RLS untuk entity yang sudah ada. Task tidak boleh menambahkan field atau entity baru di luar SpecModel.
5. Setiap task wajib dapat dilacak ke minimal satu `REQ-xxx`. Task yang mendukung beberapa requirement menuliskan requirement utama lebih dahulu.
6. Task `later` tidak boleh menjadi blocker MVP dan tidak boleh dikerjakan sebelum gate M4 lulus.
7. Perubahan kontrak endpoint, entity, role, atau business rule harus melalui pembaruan SpecModel terlebih dahulu; TASKS.md tidak boleh menjadi tempat mendefinisikan kontrak baru.

### 1.3 Gate dan status

| Gate | Task penutup | Syarat lulus |
|---|---|---|
| M1 | `T-012` | Autentikasi dan fondasi otorisasi lulus test; endpoint terproteksi menolak tanpa sesi dengan `401`. |
| M2 | `T-023` | Proyek, anggota, transfer kepemilikan, dan pengecekan role per proyek lulus test. |
| M3 | `T-031` | Tugas dan komentar lulus matriks izin owner/member serta test regresi lintas proyek. |
| M4 | `T-036` | Laporan mingguan, audit otorisasi, UAT, dan rilis MVP selesai. |
| M5 | `T-039` | Pencarian/filter tasks lulus test dan tidak menimbulkan regresi MVP. |

## 2. Backlog

### 2.1 Ringkasan increment

| Increment | Milestone | Rentang task | Requirement utama | Estimasi dasar | Gate |
|---|---|---|---|---|---|
| Inc-1 | M1 | `T-001`–`T-012` | `REQ-001`, `REQ-002`, `REQ-003`, fondasi `REQ-015` | 17.5 PD | `T-012` |
| Inc-2 | M2 | `T-013`–`T-023` | `REQ-004`–`REQ-009`, lanjutan `REQ-015` | 17.0 PD | `T-023` |
| Inc-3 | M3 | `T-024`–`T-031` | `REQ-010`–`REQ-013`, lanjutan `REQ-015` | 14.5 PD | `T-031` |
| Inc-4 | M4 | `T-032`–`T-036` | `REQ-014`, penutupan `REQ-015` | 9.5 PD | `T-036` |
| Inc-5 | M5 | `T-037`–`T-040` | `REQ-016`, prasyarat `REQ-017` | 5.0 PD | `T-039`; `T-040` blocked |

Seluruh task pada Inc-1 sampai Inc-4 berpriority `mvp`. Seluruh task pada Inc-5 berpriority `later`.

### 2.2 Inc-1 — Akun dan fondasi otorisasi

Priority: `mvp`. Fokus: autentikasi email/password, profil aplikasi, sesi cookie, dan fondasi pemeriksaan role di server.

| ID | Judul dan output | REQ/BR | EP | Entity | Depends | PD | Selesai bila |
|---|---|---|---|---|---|---|---|
| `T-001` | Scaffold Next.js App Router, TypeScript, Tailwind/shadcn, env Supabase/Resend, dan CI | `REQ-001`–`REQ-003` | `EP-001`–`EP-004` target | `profiles` | — | 2.0 | App berjalan lokal; env tervalidasi; lint, typecheck, dan test berjalan di CI; preview Vercel dibuat; tidak ada entity atau endpoint baru. |
| `T-002` | Supabase SSR client dan middleware sesi | `REQ-002` | `EP-002`, `EP-003` | `profiles` | `T-001` | 1.5 | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; refresh sesi di server; token tidak disimpan di `localStorage`. |
| `T-003` | Migrasi tabel `profiles` | `REQ-001` | `EP-001` | `profiles` | `T-001` | 1.0 | Field `id`, `email`, `display_name`, `created_at`; PK/FK ke `auth.users`; email unik; migrasi up/down berhasil. |
| `T-004` | Guard sesi server dan kontrak error | `REQ-015`, `REQ-002` | `EP-003`, `EP-005`–`EP-015` | `profiles`, `project_members` | `T-002`, `T-003` | 1.5 | `requireUser` menghasilkan `401` tanpa sesi; error `400`/`401`/`403`/`404`/`409` konsisten; helper Zod tersedia; unit test lulus. |
| `T-005` | Implementasi `EP-001` signup | `REQ-001` | `EP-001` | `profiles` | `T-003`, `T-004` | 1.5 | `201` membuat akun Supabase Auth dan baris `profiles`; `400` untuk email/password/display_name tidak valid; `409` untuk email duplikat; tidak ada profil dibuat saat gagal. |
| `T-006` | Implementasi `EP-002` login | `REQ-002` | `EP-002` | `profiles` | `T-005` | 1.5 | `200` dengan cookie sesi untuk kredensial benar; `401` tanpa sesi untuk kredensial salah; redirect ke daftar proyek. |
| `T-007` | Implementasi `EP-003` logout dan proteksi halaman | `REQ-002`, `REQ-015` | `EP-003` | `profiles` | `T-006` | 1.0 | `204` menghapus cookie sesi; halaman terproteksi mengalihkan ke login; endpoint terproteksi mengembalikan `401`. |
| `T-008` | Implementasi `EP-004` permintaan reset password | `REQ-003` | `EP-004` | `profiles` | `T-005` | 1.5 | `202` dengan pesan netral untuk email terdaftar maupun tidak; Supabase Auth mengirim tautan melalui Resend; status akun tidak bocor. |
| `T-009` | Halaman penyelesaian reset password | `REQ-003` | `EP-004`; penyelesaian via Supabase Auth | `profiles` | `T-008` | 1.0 | Tautan valid membuka halaman; password baru dapat ditetapkan; password lama gagal; redirect ke login; aplikasi tidak menyimpan token reset sendiri. |
| `T-010` | UI signup, login, forgot password, dan reset password | `REQ-001`–`REQ-003` | `EP-001`–`EP-004` | `profiles` | `T-005`–`T-009` | 1.5 | Form memiliki label, navigasi keyboard, dan responsif; error `400`/`401`/`409` tampil; redirect setelah login berhasil. |
| `T-011` | Helper otorisasi role per proyek | `REQ-015`, `BR-002` | `EP-005`–`EP-015` | `project_members` | `T-004` | 2.0 | `requireProjectRole` membaca `project_members` berdasarkan `project_id` dan `user_id` dari sesi; `403` untuk non-member atau role mismatch; test owner/member/non-member/cross-project lulus. |
| `T-012` | Gate Inc-1: integration test dan review | `REQ-001`–`REQ-003`, `REQ-015` | `EP-001`–`EP-004` | `profiles` | `T-005`–`T-011` | 1.5 | Test `201`/`400`/`409`, `200`/`401`, `204`, `202` netral, dan `401` endpoint terproteksi lulus; checklist M1 ditandatangani. |

### 2.3 Inc-2 — Proyek dan keanggotaan

Priority: `mvp`. Fokus: pembuatan proyek, daftar proyek, detail proyek, pengelolaan anggota, transfer kepemilikan, dan RLS.

| ID | Judul dan output | REQ/BR | EP | Entity | Depends | PD | Selesai bila |
|---|---|---|---|---|---|---|---|
| `T-013` | Migrasi `projects` dan `project_members` | `REQ-004`, `REQ-007`, `REQ-009`, `BR-001` | `EP-006`, `EP-008`, `EP-009` | `projects`, `project_members` | `T-003` | 1.5 | Field sesuai SpecModel; FK ke `profiles` dan `projects`; unik `(project_id, user_id)`; check role `owner`/`member`; partial unique index memastikan tepat satu owner per proyek; index untuk lookup keanggotaan. |
| `T-014` | Implementasi `EP-006` buat proyek | `REQ-004`, `BR-001` | `EP-006` | `projects`, `project_members` | `T-011`, `T-013` | 2.0 | `201` membuat proyek dan baris `project_members` role `owner` untuk pembuat dalam satu transaksi; `name` wajib; `description` boleh kosong; `401` tanpa sesi. |
| `T-015` | Implementasi `EP-005` daftar proyek | `REQ-005` | `EP-005` | `projects`, `project_members` | `T-013`, `T-014` | 1.0 | `200` hanya berisi proyek tempat pengguna menjadi anggota; respons menyertakan `id`, `name`, `description`, role pengguna, dan `member_count`; tidak ada kebocoran proyek lain. |
| `T-016` | Implementasi `EP-007` detail proyek | `REQ-005` | `EP-007` | `projects`, `project_members`, `tasks`, `comments`, `profiles` | `T-013`, `T-015` | 2.0 | `200` untuk anggota dengan project, members, tasks, dan comments; `403` untuk non-anggota; parameter `q`, `status`, dan `assignee_id` belum menjadi filter sampai `T-037`; pemeriksaan keanggotaan tetap berlaku. |
| `T-017` | Implementasi `EP-008` ubah nama/deskripsi proyek | `REQ-006` | `EP-008` | `projects` | `T-011`, `T-014` | 1.0 | Owner mendapat `200`; member dan non-anggota mendapat `403`; `name` kosong ditolak `400`; `updated_at` diperbarui. |
| `T-018` | Implementasi `EP-009` tambah member berdasarkan email persis | `REQ-007`, `BR-006` | `EP-009` | `profiles`, `project_members` | `T-013`, `T-017` | 1.5 | Owner-only; pencocokan email persis tanpa daftar pengguna; `201` membuat role `member`; `404` email tidak ditemukan; `409` sudah menjadi anggota; tidak ada undangan email. |
| `T-019` | Implementasi `EP-010` keluarkan member | `REQ-008`, `BR-004` | `EP-010` | `project_members`, `tasks`, `comments`, `profiles` | `T-013`, `T-018` | 1.0 | `204` menghapus baris keanggotaan saja; tasks dan comments tetap ada; mantan member mendapat `403` setelah dikeluarkan; owner tidak dapat mengeluarkan dirinya sendiri dan tidak ada data yang berubah. |
| `T-020` | Implementasi `EP-008` transfer kepemilikan | `REQ-009`, `BR-001` | `EP-008` | `projects`, `project_members` | `T-017`, `T-019` | 1.5 | Owner-only; `new_owner_id` harus member aktif; transaksi mengubah owner lama menjadi member dan owner baru menjadi owner; tepat satu owner; target bukan anggota ditolak; member yang mencoba transfer mendapat `403`. |
| `T-021` | UI daftar proyek, buat proyek, detail proyek, dan pengaturan anggota | `REQ-004`–`REQ-009` | `EP-005`–`EP-010` | `projects`, `project_members`, `profiles` | `T-014`–`T-020` | 3.0 | Pengguna dapat membuat proyek, melihat daftar proyek yang diikuti, membuka detail, menambah/mengeluarkan member, dan mentransfer kepemilikan; kontrol owner disembunyikan untuk member, tetapi server tetap menegakkan izin; UI responsif dan menampilkan error server. |
| `T-022` | RLS untuk `projects` dan `project_members` | `REQ-015`, `BR-002` | `EP-005`–`EP-010` | `projects`, `project_members` | `T-013` | 1.0 | RLS aktif; SELECT dibatasi ke proyek tempat pengguna menjadi anggota; perubahan proyek dan keanggotaan mengikuti role owner; SQL test lintas proyek lulus. |
| `T-023` | Gate Inc-2: integration test dan review | `REQ-004`–`REQ-009`, `REQ-015` | `EP-005`–`EP-010` | `projects`, `project_members`, `profiles`, `tasks`, `comments` | `T-013`–`T-022` | 1.5 | Test `201`/`400`/`401`/`403`/`404`/`409` lulus; transfer menghasilkan tepat satu owner; pengeluaran member mempertahankan tasks dan comments; akses lintas proyek ditolak; checklist M2 lulus. |

### 2.4 Inc-3 — Tugas dan komentar

Priority: `mvp`. Fokus: tugas dengan assignee dari anggota proyek, matriks izin owner/member, komentar kronologis, dan RLS.

| ID | Judul dan output | REQ/BR | EP | Entity | Depends | PD | Selesai bila |
|---|---|---|---|---|---|---|---|
| `T-024` | Migrasi `tasks` dan `comments` | `REQ-010`–`REQ-013` | `EP-011`–`EP-014` | `tasks`, `comments` | `T-013` | 1.5 | Field sesuai SpecModel; FK ke `projects`, `profiles`, dan `tasks`; index untuk `project_id`, `assignee_id`, `created_at`, `updated_at`, dan `task_id`; check `body` tidak kosong; komentar terhapus saat task dihapus. |
| `T-025` | Implementasi `EP-011` buat tugas | `REQ-010` | `EP-011` | `tasks`, `project_members` | `T-011`, `T-024` | 1.5 | `201` membuat task dengan `is_completed=false`; `title`, `description`, dan `assignee_id` tervalidasi; assignee harus anggota proyek, jika tidak `400`; non-anggota `403`; task muncul pada detail proyek. |
| `T-026` | Implementasi `EP-012` ubah tugas dengan matriks izin | `REQ-011`, `BR-003` | `EP-012` | `tasks`, `project_members` | `T-025` | 2.5 | Owner dapat mengubah `title`, `description`, `assignee_id`, dan `is_completed`; member hanya dapat mengirim `is_completed` untuk tugas dengan `assignee_id` miliknya; perubahan lain `403`; assignee tidak valid `400`; `updated_at` diperbarui. |
| `T-027` | Implementasi `EP-013` hapus tugas | `REQ-012` | `EP-013` | `tasks`, `comments` | `T-026` | 1.0 | Owner-only; `204` menghapus task dan komentar terkait; member dan non-anggota `403`; task hilang dari daftar. |
| `T-028` | Implementasi `EP-014` tambah komentar | `REQ-013` | `EP-014` | `comments`, `profiles`, `project_members`, `tasks` | `T-024`, `T-025` | 1.5 | `201` menyimpan `body` non-kosong, `author_id`, `display_name`, dan `created_at`; `400` untuk body kosong; `403` untuk non-anggota; komentar dibaca kronologis. |
| `T-029` | UI daftar tugas, detail tugas, dan thread komentar | `REQ-005`, `REQ-010`–`REQ-013` | `EP-007`, `EP-011`–`EP-014` | `tasks`, `comments`, `profiles` | `T-025`–`T-028` | 3.0 | Daftar tugas menampilkan status dan assignee; owner melihat kontrol create/edit/delete; member hanya melihat kontrol status untuk tugas miliknya; komentar tampil kronologis dengan nama penulis dan waktu; responsif dan dapat diakses dengan keyboard. |
| `T-030` | RLS untuk `tasks` dan `comments` | `REQ-015` | `EP-007`, `EP-011`–`EP-014` | `tasks`, `comments`, `project_members` | `T-024` | 1.0 | RLS aktif; SELECT dan mutasi dibatasi melalui keanggotaan proyek; aturan owner/member tercermin pada policy; SQL test lintas proyek lulus. |
| `T-031` | Gate Inc-3: integration test dan review | `REQ-010`–`REQ-013`, `REQ-015` | `EP-011`–`EP-014` | `tasks`, `comments`, `project_members`, `profiles` | `T-024`–`T-030` | 2.5 | Matriks izin owner/member lulus; status `400`/`401`/`403` sesuai kontrak; urutan komentar kronologis; komentar ikut terhapus saat task dihapus; checklist M3 lulus. |

### 2.5 Inc-4 — Laporan mingguan dan rilis MVP

Priority: `mvp`. Fokus: laporan mingguan, audit otorisasi menyeluruh, dan rilis.

| ID | Judul dan output | REQ/BR | EP | Entity | Depends | PD | Selesai bila |
|---|---|---|---|---|---|---|---|
| `T-032` | Implementasi `EP-015` laporan mingguan | `REQ-014`, `BR-005` | `EP-015` | `tasks`, `projects`, `project_members` | `T-025`, `T-026` | 2.5 | `week_start` wajib hari Senin; `400` untuk format/tanggal tidak valid; `403` untuk non-anggota; periode Senin–Minggu dihitung pada zona waktu yang ditetapkan OQ-1; tugas yang `created_at` atau `updated_at` berada dalam periode diambil; task yang memenuhi keduanya dihitung sekali; dikelompokkan berdasarkan `is_completed` terkini; respons memuat `week_start`, `week_end`, `completed_tasks`, `incomplete_tasks`. |
| `T-033` | UI laporan mingguan | `REQ-014` | `EP-015` | `tasks`, `projects`, `project_members` | `T-032` | 1.5 | Tab laporan tersedia; pemilih minggu menggunakan hari Senin; dua daftar selesai dan belum selesai tampil; empty state dan error `400`/`403` ditangani; responsif. |
| `T-034` | Test batas laporan mingguan | `REQ-014`, `BR-005` | `EP-015` | `tasks` | `T-032`, `T-033` | 1.5 | Test mencakup batas Senin 00:00 dan Minggu 23:59, task dibuat sebelum minggu tetapi diperbarui dalam minggu, deduplikasi, perubahan status terkini, dan akses lintas proyek. |
| `T-035` | Audit otorisasi dan keamanan seluruh endpoint terproteksi | `REQ-015` | `EP-003`, `EP-005`–`EP-015` | `projects`, `project_members`, `tasks`, `comments` | `T-012`, `T-023`, `T-031`, `T-032` | 2.0 | Matriks `401`/`403` untuk semua endpoint lulus; IDOR dan akses lintas proyek diuji; role per proyek konsisten; RLS diaudit; cookie sesuai ketentuan; tidak ada token sensitif di `localStorage`; temuan diperbaiki. |
| `T-036` | Gate rilis MVP: UAT, regresi, dan deploy produksi | `REQ-001`–`REQ-015` | `EP-001`–`EP-015` | Semua entity | `T-035` dan seluruh task MVP | 2.0 | UAT dengan skenario tim 2–10 pengguna lulus; seluruh acceptance criteria `REQ-001`–`REQ-015` lulus; regresi hijau; deploy Vercel + Supabase + Resend berhasil; checklist rilis ditandatangani; tidak ada task MVP tersisa. |

### 2.6 Inc-5 — Later

Priority: `later`. Fokus: pencarian/filter tugas dan prasyarat ringkasan tugas pribadi. Tidak boleh menjadi blocker MVP.

| ID | Judul dan output | REQ/BR | EP | Entity | Depends | PD | Selesai bila |
|---|---|---|---|---|---|---|---|
| `T-037` | Implementasi filter tugas pada `EP-007` | `REQ-016` | `EP-007` | `tasks`, `project_members` | `T-016`, `T-036` | 1.5 | Query `q` mencari judul, `status` memfilter `is_completed`, `assignee_id` memfilter penanggung jawab; kombinasi memakai AND; `400` untuk nilai tidak valid; `403` untuk non-anggota; hanya tugas dari proyek yang diikuti yang dapat muncul. |
| `T-038` | UI pencarian dan filter tugas | `REQ-016` | `EP-007` | `tasks`, `project_members` | `T-037` | 1.5 | Input pencarian, filter status, dan filter assignee tersedia; reset filter; state filter dapat dibagikan melalui URL; empty state; tidak mengubah izin pengguna. |
| `T-039` | Test regresi filter lintas proyek | `REQ-016`, `REQ-015` | `EP-007` | `tasks`, `project_members` | `T-037`, `T-038` | 1.0 | Kombinasi filter diuji; akses lintas proyek ditolak; `401`/`403` benar; tidak ada kebocoran data; performa memadai untuk tim kecil. |
| `T-040` | Prasyarat `REQ-017`: usulan kontrak endpoint untuk SpecModel | `REQ-017` | — | `tasks`, `project_members` | SpecModel addendum | 1.0 | Status `blocked`; tidak ada endpoint baru yang ditetapkan di TASKS.md; usulan kontrak dan keputusan dicatat untuk diajukan ke SpecModel; implementasi tidak dimulai sebelum SpecModel memiliki endpoint resmi. |

### 2.7 Traceability requirement ke task

| Requirement | Task terkait |
|---|---|
| `REQ-001` | `T-001`, `T-003`, `T-005`, `T-010`, `T-012` |
| `REQ-002` | `T-002`, `T-004`, `T-006`, `T-007`, `T-010`, `T-012` |
| `REQ-003` | `T-008`, `T-009`, `T-010`, `T-012` |
| `REQ-004` | `T-013`, `T-014`, `T-021`, `T-023` |
| `REQ-005` | `T-015`, `T-016`, `T-021`, `T-023` |
| `REQ-006` | `T-017`, `T-021`, `T-023` |
| `REQ-007` | `T-018`, `T-021`, `T-023` |
| `REQ-008` | `T-019`, `T-021`, `T-023` |
| `REQ-009` | `T-020`, `T-021`, `T-023` |
| `REQ-010` | `T-024`, `T-025`, `T-029`, `T-031` |
| `REQ-011` | `T-024`, `T-026`, `T-029`, `T-031` |
| `REQ-012` | `T-024`, `T-027`, `T-029`, `T-031` |
| `REQ-013` | `T-024`, `T-028`, `T-029`, `T-031` |
| `REQ-014` | `T-032`, `T-033`, `T-034` |
| `REQ-015` | `T-004`, `T-011`, `T-022`, `T-030`, `T-035`, `T-036` |
| `REQ-016` | `T-037`, `T-038`, `T-039` |
| `REQ-017` | `T-040`; prasyarat kontrak, belum ada task implementasi sampai SpecModel diperbarui |

### 2.8 Traceability business rule ke task

| Business rule | Task terkait |
|---|---|
| `BR-001` | `T-013`, `T-014`, `T-020`, `T-023` |
| `BR-002` | `T-011`, `T-015`, `T-016`, `T-035` |
| `BR-003` | `T-026`, `T-031` |
| `BR-004` | `T-019`, `T-028`, `T-035` |
| `BR-005` | `T-032`, `T-034` |
| `BR-006` | `T-018`, `T-023` |

## 3. Implementation Order

### 3.1 Urutan fase

| Fase | Task | Gate | Alasan urutan |
|---|---|---|---|
| 0. Fondasi | `T-001` → `T-002`/`T-003` → `T-004` → `T-011` | `T-004` dan `T-011` siap | Semua endpoint terproteksi membutuhkan sesi, koneksi database, dan helper role server. |
| 1. M1 | `T-005` → `T-006` → `T-007`; `T-005` → `T-008` → `T-009`; `T-005`–`T-009` → `T-010`; `T-012` terakhir | M1 | Autentikasi harus stabil sebelum proyek dan anggota dibuat. |
| 2. M2 | `T-013` → `T-014` → `T-015`/`T-016`/`T-017`; `T-013` → `T-018` → `T-019` → `T-020`; endpoint selesai → `T-021`; `T-013` → `T-022`; `T-023` terakhir | M2 | Proyek dan keanggotaan adalah prasyarat tugas, komentar, dan laporan. |
| 3. M3 | `T-024` → `T-025` → `T-026` → `T-027`; `T-024`/`T-025` → `T-028`; `T-025`–`T-028` → `T-029`; `T-024` → `T-030`; `T-031` terakhir | M3 | Tugas harus ada sebelum komentar dan laporan; matriks izin harus diuji sebelum rilis. |
| 4. M4 | `T-025`/`T-026` → `T-032` → `T-033` → `T-034`; seluruh endpoint → `T-035` → `T-036` | M4 | Laporan membutuhkan data tugas; audit otorisasi harus setelah semua endpoint ada. |
| 5. M5 | `T-016`/`T-036` → `T-037` → `T-038` → `T-039`; `T-040` kapan saja setelah M4 | M5 | Filter adalah fitur later dan tidak boleh mengganggu rilis MVP. |

### 3.2 Jalur kritis

Jalur kritis MVP:

`T-001` → `T-002`/`T-003` → `T-004` → `T-011` → `T-013` → `T-014` → `T-017` → `T-020` → `T-024` → `T-025` → `T-026` → `T-032` → `T-035` → `T-036`

Jalur ini menentukan durasi MVP karena menyentuh fondasi sesi, otorisasi role, skema proyek dan keanggotaan, skema tugas, transfer kepemilikan, laporan mingguan, dan audit akhir. Task UI seperti `T-021`, `T-029`, dan `T-033` dapat berjalan paralel setelah kontrak endpoint stabil, tetapi tidak boleh menutup gate sebelum endpoint terkait selesai.

### 3.3 Paralelisasi untuk 2 engineer

- **Lane backend/data:** `T-001`, `T-002`, `T-003`, `T-004`, `T-005`, `T-006`, `T-008`, `T-011`, `T-013`, `T-014`, `T-017`, `T-018`, `T-019`, `T-020`, `T-022`, `T-024`, `T-025`, `T-026`, `T-027`, `T-028`, `T-030`, `T-032`, `T-034`, `T-035`.
- **Lane frontend/UI:** `T-010`, `T-009`, `T-007`, `T-021`, `T-029`, `T-033`, `T-036`.
- **Lane QA/test:** `T-012`, `T-023`, `T-031`, `T-034`, `T-039`, serta review keamanan `T-035`.
- UI boleh memakai typed client dan mock contract dari SpecModel sebelum endpoint selesai, tetapi integrasi akhir wajib menunggu endpoint dan pengecekan server tersedia.
- `T-035` boleh dimulai setelah M2 untuk audit awal, tetapi status `done` hanya setelah seluruh endpoint MVP selesai dan temuan ditutup.

### 3.4 Aturan urutan yang tidak boleh dilanggar

1. Jangan memulai endpoint proyek, tugas, komentar, atau laporan sebelum `T-011` selesai.
2. Jangan memulai `T-014` dan seterusnya sebelum migrasi `T-013` diterapkan.
3. Jangan memulai `T-025` sebelum migrasi `T-024` dan helper `T-011` selesai.
4. Jangan memulai `T-032` sebelum `T-025` dan `T-026` stabil, karena laporan membaca status tugas terkini.
5. Jangan menutup M4 sebelum `T-035` selesai dan seluruh acceptance `REQ-001`–`REQ-015` lulus.
6. Jangan mengerjakan `T-037`–`T-039` sebelum `T-036` selesai, kecuali untuk eksplorasi yang tidak mengubah kode produksi.
7. `T-040` tetap `blocked` sampai SpecModel memiliki endpoint resmi untuk `REQ-017`.

## 4. Estimates

### 4.1 Dasar estimasi

- Estimasi memakai person-day (PD); 1 PD setara 6–7 jam kerja produktif.
- Estimasi mencakup implementasi, unit test, integration test, perbaikan review, dan pembaruan dokumentasi task.
- Estimasi tidak mencakup waktu tunggu verifikasi email, deliverability Resend, antrean review eksternal, atau perubahan requirement di luar SpecModel.
- Asumsi tim: 1–2 engineer full-stack; estimasi dikalibrasi untuk tim kecil.
- Angka bersifat indikatif, bukan komitmen kontrak. Kontingensi 20% sudah disiapkan untuk debugging RLS, edge case otorisasi, dan perbaikan test.
- `T-040` hanya estimasi untuk penyusunan usulan kontrak; tidak ada estimasi implementasi `REQ-017` sampai endpoint masuk ke SpecModel.

### 4.2 Estimasi per increment

| Increment | Task | Estimasi dasar | Kontingensi 20% | Total terencana | Perkiraan kalender dengan 1.5–2 engineer |
|---|---|---|---|---|---|
| Inc-1 | `T-001`–`T-012` | 17.5 PD | 3.5 PD | 21.0 PD | 1.5–2 minggu |
| Inc-2 | `T-013`–`T-023` | 17.0 PD | 3.4 PD | 20.4 PD | 2 minggu |
| Inc-3 | `T-024`–`T-031` | 14.5 PD | 2.9 PD | 17.4 PD | 2–2.5 minggu |
| Inc-4 | `T-032`–`T-036` | 9.5 PD | 1.9 PD | 11.4 PD | 1–1.5 minggu |
| **MVP** | **`T-001`–`T-036`** | **58.5 PD** | **11.7 PD** | **70.2 PD** | **7–9 minggu** |
| Inc-5 | `T-037`–`T-040` | 5.0 PD | 1.0 PD | 6.0 PD | 1–1.5 minggu |
| **Total** | **`T-001`–`T-040`** | **63.5 PD** | **12.7 PD** | **76.2 PD** | **8–10 minggu** |

Dengan satu engineer, MVP diperkirakan 12–14 minggu karena jalur kritis tidak dapat diparalelkan. Angka ini konsisten dengan ROADMAP.md yang menempatkan M1–M4 pada kisaran 6–9 minggu untuk 1–2 engineer dan menambahkan M5 setelah MVP stabil.

### 4.3 Ketidakpastian estimasi

- OQ-1 tentang zona waktu laporan dapat menambah 0.5–1 PD pada `T-032`/`T-034` bila keputusan mengubah cara konversi periode atau test batas.
- OQ-2 tentang verifikasi email dapat menambah 0.5–1 PD pada `T-005`/`T-010` karena alur sesi setelah signup dapat berbeda; tidak menambah endpoint aplikasi.
- Debugging RLS dan kebijakan Supabase dapat memakai sebagian besar kontingensi Inc-2 dan Inc-3.
- Perbaikan bug otorisasi yang ditemukan `T-035` dapat memotong buffer M4; karena itu audit awal dimulai setelah M2.
- `T-040` tidak memiliki estimasi implementasi karena `REQ-017` belum memiliki endpoint dalam SpecModel.

## 5. Definition of Done

### 5.1 Definition of Done per task

Sebuah task baru boleh berstatus `done` jika seluruh kriteria berikut terpenuhi, kecuali task tersebut secara eksplisit `blocked`.

| Area | Kriteria |
|---|---|
| Traceability | Task mencantumkan `REQ-xxx`, `EP-xxx`, entity kanonik, dan `BR-xxx` terkait; tidak ada ID baru di luar SpecModel. |
| Kontrak endpoint | Method, path, auth, request, response, dan error sesuai SpecModel. Tidak ada endpoint, field, atau status domain baru yang tidak tercantum. |
| Otorisasi | Pemeriksaan sesi dan role dilakukan di server; `401` untuk tanpa sesi; `403` untuk role atau keanggotaan yang tidak berhak; tidak ada pengecekan client-only yang dianggap kontrol keamanan. |
| Validasi | Input divalidasi dengan Zod di server; error `400`, `401`, `403`, `404`, dan `409` konsisten dengan kontrak. |
| Data | Migrasi memiliki PK, FK, index, constraint, dan RLS yang relevan; tidak ada field baru di luar SpecModel. |
| Test | Minimal satu test untuk happy path dan setiap status error yang relevan; test memuat ID requirement atau business rule di nama atau metadata. |
| UI | Halaman menampilkan hasil yang dapat diamati pengguna, responsif untuk desktop dan mobile, memiliki label form, kontras memadai, dan navigasi keyboard. |
| Kualitas | Lint, typecheck, dan test suite lulus; code review disetujui; tidak ada `console.log` debugging atau secret di repository. |
| Scope | Tidak menambahkan pembayaran, notifikasi, lampiran file, integrasi pihak ketiga, multi-workspace, atau role baru. |
| Dokumentasi | Status task diperbarui; keputusan yang memengaruhi Open Questions dicatat; perubahan kontrak tidak dilakukan di TASKS.md. |

### 5.2 Definition of Done per increment

1. Seluruh task dalam increment berstatus `done`, kecuali task `blocked` yang secara eksplisit tidak menjadi bagian gate.
2. Acceptance criteria seluruh requirement yang tercakup lulus, termasuk status code dan aturan bisnis terkait.
3. Integration test untuk endpoint increment lulus; test regresi increment sebelumnya tetap hijau.
4. Matriks `401`/`403` untuk endpoint increment diperiksa; akses lintas proyek diuji.
5. RLS untuk entity increment aktif dan diuji, bila increment memiliki task RLS.
6. UI increment dapat didemokan tanpa error konsol dan tanpa ketergantungan pada data mock.
7. Preview deployment dibuat dan diuji; tidak ada bug prioritas tinggi yang terbuka.
8. Gate checklist increment ditandatangani; task berikutnya tidak dimulai sebelum gate sebelumnya lulus, kecuali pekerjaan paralel yang tidak mengubah kontrak.

### 5.3 Definition of Done rilis MVP

MVP dinyatakan siap rilis jika:

- Seluruh acceptance criteria `REQ-001` sampai `REQ-015` lulus.
- Seluruh endpoint `EP-001` sampai `EP-015` terimplementasi dengan method, path, auth, request, response, dan error sesuai SpecModel.
- Tidak ada endpoint aplikasi di luar `EP-001`–`EP-015`; penyelesaian reset password memakai alur Supabase Auth.
- Otorisasi owner/member diperiksa di server pada setiap endpoint proyek, tugas, komentar, dan laporan; RLS aktif sebagai lapisan tambahan.
- Cookie sesi memakai `HttpOnly`, `Secure`, dan `SameSite=Lax`; token sensitif tidak disimpan di `localStorage`.
- UAT dengan skenario tim 2–10 pengguna lulus: signup, login, reset password, buat proyek, tambah member, buat tugas, ubah status, komentar, lihat laporan, transfer kepemilikan, dan pengeluaran member.
- Regresi penuh hijau; tidak ada bug terbuka yang memblokir alur utama.
- Deploy produksi Vercel + Supabase + Resend berhasil; environment variable dan email reset terverifikasi.
- OQ-1 dan OQ-2 sudah diputuskan atau tidak lagi memblokir; OQ-3, OQ-4, dan OQ-5 terdokumentasi dan tidak menimbulkan perilaku tersembunyi.
- Fitur `later` (`REQ-016`, `REQ-017`) tidak termasuk rilis MVP dan tidak menjadi blocker.

### 5.4 Definition of Done untuk fitur later

- `REQ-016` selesai jika `T-037`–`T-039` lulus, filter tidak membocorkan tugas lintas proyek, dan tidak ada regresi pada `REQ-001`–`REQ-015`.
- `REQ-017` belum memiliki Definition of Done implementasi karena belum ada endpoint dalam SpecModel. `T-040` hanya menyiapkan prasyarat kontrak; implementasi menunggu pembaruan SpecModel.

## 6. Dependencies

### 6.1 Rantai dependensi internal

| Blok | Rantai dependensi | Catatan |
|---|---|---|
| Fondasi | `T-001` → `T-002`/`T-003` → `T-004` → `T-011` | `T-011` wajib sebelum endpoint proyek, tugas, komentar, dan laporan. |
| Autentikasi | `T-004`/`T-005` → `T-006` → `T-007`; `T-005` → `T-008` → `T-009`; `T-005`–`T-009` → `T-010` | Signup harus ada sebelum login, reset, dan UI autentikasi. |
| Proyek | `T-013` → `T-014` → `T-015`/`T-016`/`T-017`; `T-013` → `T-018` → `T-019` → `T-020`; endpoint selesai → `T-021`; `T-013` → `T-022`; semua → `T-023` | Transfer kepemilikan membutuhkan update proyek dan pengeluaran member. |
| Tugas | `T-024` → `T-025` → `T-026` → `T-027`; `T-024`/`T-025` → `T-028`; `T-025`–`T-028` → `T-029`; `T-024` → `T-030`; semua → `T-031` | Komentar membutuhkan tugas; UI membutuhkan endpoint tugas dan komentar. |
| Laporan | `T-025`/`T-026` → `T-032` → `T-033` → `T-034`; semua endpoint MVP → `T-035` → `T-036` | Laporan tidak boleh mendahului data tugas; audit akhir mencakup seluruh endpoint. |
| Later | `T-016`/`T-036` → `T-037` → `T-038` → `T-039`; `T-040` blocked | Filter tidak boleh menjadi blocker MVP. |

### 6.2 Dependensi eksternal

| Dependensi | Digunakan oleh | Kebutuhan |
|---|---|---|
| Proyek Supabase | `T-001`–`T-036` | PostgreSQL, Supabase Auth email/password, dan kredensial server/client. Harus tersedia sebelum `T-002`. |
| Email reset password | `T-008`, `T-009` | Supabase Auth mengirim tautan; Resend free tier dikonfigurasi sebagai pengirim; template email dan redirect URL diuji. |
| Vercel Hobby | `T-001`, `T-036` | Preview deployment dan produksi; environment variable disetel untuk preview dan production. |
| RLS test role | `T-022`, `T-030`, `T-035` | Koneksi atau role database yang dapat menguji policy tanpa menonaktifkan RLS. |
| Supabase email confirmation | `T-005`, `T-006`, `T-010`, `T-012` | Keputusan OQ-2 memengaruhi apakah sesi langsung aktif setelah signup. Tidak menambah endpoint aplikasi. |
| Zona waktu laporan | `T-032`, `T-034` | Keputusan OQ-1 diperlukan sebelum M4 gate; implementasi harus memusatkan konversi periode di satu modul. |

### 6.3 Dependensi requirement

| Requirement | Prasyarat task | Catatan |
|---|---|---|
| `REQ-001`, `REQ-002`, `REQ-003` | `T-001`–`T-009` | Fondasi autentikasi dan profil; memblokir seluruh endpoint terproteksi. |
| `REQ-004` | `T-011`, `T-013`, `T-014` | Membuat proyek sekaligus baris owner; membutuhkan helper role dan constraint satu owner. |
| `REQ-005` | `T-014`, `T-015`, `T-016` | Daftar dan detail proyek hanya untuk anggota. |
| `REQ-006` | `T-017` | Update nama/deskripsi owner-only. |
| `REQ-007` | `T-018` | Pencocokan email persis; tidak ada daftar pengguna. |
| `REQ-008` | `T-019` | Pengeluaran member mempertahankan data historis. |
| `REQ-009` | `T-020` | Transfer kepemilikan atomik dan tepat satu owner. |
| `REQ-010` | `T-024`, `T-025` | Tugas membutuhkan assignee dari anggota proyek. |
| `REQ-011` | `T-026` | Matriks izin owner/member bergantung pada `assignee_id` dan role. |
| `REQ-012` | `T-027` | Penghapusan hanya owner; komentar ikut terhapus. |
| `REQ-013` | `T-028` | Komentar membutuhkan anggota proyek dan body non-kosong. |
| `REQ-014` | `T-032` | Laporan membutuhkan tugas dengan `created_at`, `updated_at`, dan `is_completed`. |
| `REQ-015` | `T-004`, `T-011`, `T-022`, `T-030`, `T-035` | Lintas-potong; tidak boleh ditunda ke akhir. |
| `REQ-016` | `T-037` | Later; bergantung pada `EP-007` dan tidak memblokir MVP. |
| `REQ-017` | `T-040` | Blocked; belum ada endpoint dalam `EP-001`–`EP-015`. |

### 6.4 Dependensi keputusan dan Open Questions

| Open Question | Task terdampak | Penanganan dalam backlog |
|---|---|---|
| OQ-1 zona waktu laporan | `T-032`, `T-034` | Implementasi memakai satu modul konversi periode; keputusan wajib sebelum M4 gate. Tidak ada hardcode tersebar. |
| OQ-2 verifikasi email Supabase | `T-005`, `T-006`, `T-010`, `T-012` | Keputusan diperlukan sebelum M1 gate; jika verifikasi aktif, UI mengikuti alur Supabase Auth tanpa endpoint baru. |
| OQ-3 edit/hapus komentar | `T-028`, `T-029` | Tidak ada endpoint edit/hapus komentar; MVP tidak mengerjakan task tersebut sampai SpecModel diperbarui. |
| OQ-4 tugas milik mantan member | `T-019`, `T-026`, `T-029` | Mengikuti `BR-004`: data tetap ada dan nama penulis tetap tampil; tidak ada auto-unassign; owner harus mengganti assignee. |
| OQ-5 penyelesaian reset password | `T-009` | Memakai alur Supabase Auth di halaman callback; tidak menambah endpoint aplikasi; keputusan dicatat sebelum M1. |

### 6.5 Aturan dependensi

1. Task yang dependensinya belum `done` tidak boleh masuk `review`, kecuali task tersebut memang dirancang sebagai test gate.
2. `T-011` adalah dependency wajib untuk seluruh endpoint proyek, tugas, komentar, dan laporan. Melanggar urutan ini berisiko menciptakan endpoint tanpa pengecekan role.
3. `T-022` dan `T-030` wajib selesai sebelum gate increment masing-masing; RLS tidak boleh dianggap pekerjaan opsional.
4. `T-035` wajib selesai sebelum `T-036`; rilis MVP tidak boleh mengandalkan test manual otorisasi.
5. Task `later` tidak boleh mengubah kontrak MVP. Jika `REQ-016` membutuhkan perubahan kontrak `EP-007`, perubahan harus masuk SpecModel terlebih dahulu.
6. Perubahan requirement, endpoint, entity, role, atau business rule harus disertai pembaruan SpecModel dan estimasi ulang. TASKS.md tidak boleh menjadi sumber kontrak baru.
7. Dependensi eksternal yang tidak tersedia harus ditandai `blocked`; mock hanya boleh dipakai untuk test lokal, bukan untuk menutup gate rilis.

## 7. Open Questions

| ID | Pertanyaan | Dampak task | Keputusan yang dibutuhkan |
|---|---|---|---|
| OQ-1 | Zona waktu default laporan mingguan belum ditetapkan; usulan Asia/Jakarta. | `T-032`, `T-034` | Tetapkan zona waktu tunggal untuk seluruh tim sebelum M4 gate; implementasi harus memusatkan konversi periode. |
| OQ-2 | Apakah verifikasi email Supabase diaktifkan saat pendaftaran, atau akun langsung aktif setelah signup? | `T-005`, `T-006`, `T-010`, `T-012` | Putuskan sebelum M1 gate; jika verifikasi aktif, sesi setelah signup mengikuti alur Supabase Auth tanpa endpoint baru. |
| OQ-3 | Apakah komentar boleh diedit atau dihapus, atau bersifat permanen pada MVP? | `T-028`, `T-029` | MVP tidak menyediakan edit/hapus komentar karena tidak ada endpoint; perubahan memerlukan pembaruan SpecModel dan task baru. |
| OQ-4 | Bagaimana penanganan tugas yang masih ditugaskan ke mantan member setelah ia dikeluarkan? | `T-019`, `T-026`, `T-029` | Mengikuti `BR-004`: tugas tetap ada, nama penulis tetap tampil, dan tidak ada auto-unassign; owner wajib mengganti assignee. Perubahan perilaku memerlukan pembaruan SpecModel. |
| OQ-5 | SpecModel hanya memiliki `EP-004` untuk meminta tautan reset; tidak ada endpoint aplikasi untuk menyelesaikan reset. | `T-009` | Diusulkan penyelesaian memakai alur Supabase Auth di halaman callback tanpa menambah `EP-xxx`; konfirmasi diperlukan agar kontrak API tetap `EP-001`–`EP-015`. |