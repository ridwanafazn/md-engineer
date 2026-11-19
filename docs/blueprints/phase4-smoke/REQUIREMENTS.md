# Requirements Document — KerjaTim

| Field | Nilai |
|---|---|
| Nama dokumen | REQUIREMENTS.md |
| Produk | KerjaTim |
| Versi | 1.0 |
| Status | Siap untuk review |
| Sumber kebenaran | SpecModel proyek KerjaTim |
| Platform | Web app; Next.js App Router + TypeScript + Tailwind/shadcn |
| Backend | Next.js Route Handlers/Server Actions (Node.js) + Zod |
| Database & Auth | PostgreSQL Supabase; Supabase Auth email/password; cookie SSR |
| Cakupan dokumen | Requirement MVP dan later yang dapat diuji |
| Prioritas | `mvp`, `later` |

Dokumen ini menjabarkan requirement KerjaTim yang dapat diuji. SpecModel adalah satu-satunya sumber kebenaran. Dokumen ini tidak menambahkan entity, endpoint, role, requirement, atau aturan bisnis baru di luar SpecModel. Jika terjadi konflik antara dokumen ini dan SpecModel, SpecModel menang.

## 1. Requirement Format

### 1.1 Struktur requirement

Setiap requirement memakai format berikut:

- **ID requirement:** `REQ-NNN`, unik dan tidak dipakai ulang.
- **Pernyataan:** satu perilaku yang dapat diuji, menggunakan aktor, aksi, dan objek dari SpecModel.
- **Priority:** hanya `mvp` atau `later`, sesuai SpecModel.
- **Aktor utama:** `Pengguna`, `Pengguna login`, `Owner`, `Member`, `Anggota proyek`, atau `Sistem`.
- **Endpoint:** ID `EP-NNN` dari SpecModel. Tidak ada endpoint baru dalam dokumen ini.
- **Entity:** nama kanonik `profiles`, `projects`, `project_members`, `tasks`, atau `comments`.
- **Business rule:** ID `BR-NNN` bila requirement terkait langsung dengan aturan tersebut.
- **Acceptance criteria:** ID `AC-REQ-NNN.x`, ditulis sebagai kondisi awal, aksi, dan hasil yang dapat diverifikasi.

Requirement tanpa acceptance criteria dianggap tidak lengkap. Acceptance criteria tidak boleh menambah perilaku yang tidak ada di SpecModel.

### 1.2 Terminologi kanonik

| Istilah | Definisi |
|---|---|
| `Owner` | Role per proyek pada `project_members.role = owner`; mengatur proyek, anggota, tugas, dan kepemilikan. |
| `Member` | Role per proyek pada `project_members.role = member`; mengerjakan tugas yang ditugaskan, mengubah status tugasnya sendiri, dan berkomentar. |
| `profiles` | Profil aplikasi dengan `id`, `email`, `display_name`, dan `created_at`; `id` sama dengan `auth.users.id`. |
| `projects` | Proyek dengan `id`, `name`, `description`, `created_at`, dan `updated_at`. |
| `project_members` | Relasi pengguna-proyek dengan `project_id`, `user_id`, `role`, dan `joined_at`; tepat satu owner per proyek. |
| `tasks` | Tugas dengan `title`, `description`, `assignee_id`, `is_completed`, `created_at`, dan `updated_at`. |
| `comments` | Komentar teks pada tugas dengan `author_id`, `body`, dan `created_at`; tidak boleh kosong. |
| Anggota proyek | Pengguna yang memiliki baris `project_members` pada proyek tersebut, baik owner maupun member. |
| Email persis | Pencocokan `profiles.email` secara persis saat owner menambahkan member; tidak ada pencarian sebagian atau daftar pengguna. |
| Laporan mingguan | Rekap `completed_tasks` dan `incomplete_tasks` untuk periode Senin–Minggu berdasarkan tugas yang `created_at` atau `updated_at` berada dalam periode tersebut, dengan `is_completed` terkini. |

### 1.3 Kode status dan perilaku server

Kode status berikut adalah kontrak endpoint yang dipakai dalam acceptance criteria:

| Kode | Makna |
|---|---|
| `200` | Permintaan berhasil dan data dikembalikan. |
| `201` | Resource baru dibuat. |
| `202` | Permintaan reset password diterima; respons netral. |
| `204` | Berhasil tanpa body, termasuk logout dan penghapusan keanggotaan/tugas. |
| `400` | Validasi input gagal. |
| `401` | Pengguna tidak memiliki sesi valid atau kredensial salah. |
| `403` | Pengguna terautentikasi tetapi tidak berwenang. |
| `404` | Resource yang dituju tidak ditemukan, termasuk email anggota yang tidak cocok. |
| `409` | Konflik data, termasuk email sudah terdaftar atau anggota sudah ada. |

Otorisasi dan validasi wajib diperiksa di server. Pemeriksaan di client tidak dianggap sebagai kontrol keamanan. Row Level Security Supabase adalah lapisan pertahanan tambahan, bukan pengganti pengecekan server.

### 1.4 Batasan lintas requirement

Batasan berikut berasal dari SpecModel dan mengikat implementasi seluruh requirement:

- Sesi menggunakan cookie `HttpOnly`, `Secure`, dan `SameSite=Lax`; token sensitif tidak disimpan di `localStorage`.
- Semua input divalidasi dengan Zod di server.
- Respons error memakai status `400`, `401`, `403`, `404`, atau `409` secara konsisten.
- Web app responsif untuk desktop dan mobile, dengan label form, kontras memadai, dan navigasi keyboard.
- MVP tidak mencakup pembayaran, notifikasi, lampiran file, integrasi pihak ketiga, atau multi-workspace.
- Role owner/member bersifat per proyek, bukan role global.

## 2. Functional Requirements

| ID | Pernyataan requirement | Priority | Aktor utama | Endpoint | Entity utama |
|---|---|---|---|---|---|
| `REQ-001` | Pengguna dapat mendaftar dengan email dan password. | `mvp` | Pengguna | `EP-001` | `profiles` |
| `REQ-002` | Pengguna dapat login dan logout dengan sesi cookie di server. | `mvp` | Pengguna | `EP-002`, `EP-003` | `profiles` |
| `REQ-003` | Pengguna dapat meminta tautan reset password melalui email. | `mvp` | Pengguna | `EP-004` | `profiles` |
| `REQ-004` | Pengguna login dapat membuat proyek baru dan otomatis menjadi owner. | `mvp` | Pengguna login | `EP-006` | `projects`, `project_members` |
| `REQ-005` | Anggota proyek dapat melihat daftar proyek yang diikuti dan detail proyeknya. | `mvp` | Anggota proyek | `EP-005`, `EP-007` | `projects`, `project_members`, `tasks`, `comments`, `profiles` |
| `REQ-006` | Owner dapat mengubah nama dan deskripsi proyek. | `mvp` | Owner | `EP-008` | `projects`, `project_members` |
| `REQ-007` | Owner dapat menambahkan member berdasarkan email persis. | `mvp` | Owner | `EP-009` | `profiles`, `project_members` |
| `REQ-008` | Owner dapat mengeluarkan member dari proyek. | `mvp` | Owner | `EP-010` | `project_members`, `profiles`, `tasks`, `comments` |
| `REQ-009` | Owner dapat mengalihkan kepemilikan proyek kepada member aktif. | `mvp` | Owner | `EP-008` | `projects`, `project_members` |
| `REQ-010` | Anggota proyek dapat membuat tugas dengan judul, deskripsi, dan penanggung jawab. | `mvp` | Anggota proyek | `EP-011` | `tasks`, `project_members`, `profiles` |
| `REQ-011` | Owner dapat mengubah seluruh field tugas; member hanya dapat mengubah status tugas yang ditugaskan kepadanya. | `mvp` | Owner; Member | `EP-012` | `tasks`, `project_members` |
| `REQ-012` | Hanya owner yang dapat menghapus tugas. | `mvp` | Owner | `EP-013` | `tasks`, `comments` |
| `REQ-013` | Anggota proyek dapat menambahkan komentar pada tugas. | `mvp` | Anggota proyek | `EP-014` | `comments`, `tasks`, `profiles`, `project_members` |
| `REQ-014` | Anggota proyek dapat melihat laporan mingguan proyek. | `mvp` | Anggota proyek | `EP-015` | `tasks`, `projects`, `project_members` |
| `REQ-015` | Sistem menegakkan kontrol akses berbasis role per proyek di server. | `mvp` | Sistem | `EP-003`, `EP-005`–`EP-015` | `projects`, `project_members`, `tasks`, `comments` |
| `REQ-016` | Pengguna dapat mencari dan memfilter tugas dalam proyek. | `later` | Anggota proyek | `EP-007` | `tasks`, `project_members` |
| `REQ-017` | Pengguna dapat melihat ringkasan tugas pribadi lintas proyek. | `later` | Pengguna login | Tidak ada endpoint khusus dalam `EP-001`–`EP-015` | `tasks`, `project_members` |

Catatan: `REQ-004` dapat dilakukan oleh pengguna login mana pun. Karena role bersifat per proyek, pengguna yang menjadi member di proyek A dapat membuat proyek B dan menjadi owner di proyek B (`BR-002`).

## 3. Acceptance Criteria

### REQ-001 — Registrasi email/password

- **AC-REQ-001.1** Diberikan email valid, password minimal 8 karakter, dan `display_name` terisi, ketika `EP-001` dipanggil, maka respons `201`, akun Supabase Auth dibuat, dan baris `profiles` dibuat dengan `email` serta `display_name` yang sama; `profiles.id` sama dengan `auth.users.id`.
- **AC-REQ-001.2** Diberikan email yang sudah terdaftar, ketika `EP-001` dipanggil, maka respons `409`, tidak ada akun atau profil baru, dan data lama tidak berubah.
- **AC-REQ-001.3** Diberikan email berformat tidak valid atau password kurang dari 8 karakter, ketika `EP-001` dipanggil, maka respons `400` dan tidak ada profil baru dibuat.

### REQ-002 — Login dan logout dengan sesi cookie

- **AC-REQ-002.1** Diberikan kredensial email/password yang benar, ketika `EP-002` dipanggil, maka respons `200`, cookie sesi dibuat di server, dan pengguna diarahkan ke halaman proyek.
- **AC-REQ-002.2** Diberikan kredensial yang salah, ketika `EP-002` dipanggil, maka respons `401` dan tidak ada sesi yang dibuat.
- **AC-REQ-002.3** Diberikan pengguna dengan sesi aktif, ketika `EP-003` dipanggil, maka respons `204`, cookie sesi dihapus, dan akses ke halaman terproteksi mengalihkan pengguna ke login.

### REQ-003 — Reset password melalui email

- **AC-REQ-003.1** Diberikan email terdaftar, ketika `EP-004` dipanggil, maka respons `202` dengan pesan netral dan tautan reset dikirim melalui email.
- **AC-REQ-003.2** Diberikan tautan reset yang valid, ketika pengguna menetapkan password baru, maka password baru dapat dipakai login dan password lama tidak berlaku.
- **AC-REQ-003.3** Diberikan email tidak terdaftar, ketika `EP-004` dipanggil, maka respons tetap `202` dengan pesan netral sehingga status akun tidak terungkap.

### REQ-004 — Membuat proyek dan menjadi owner

- **AC-REQ-004.1** Diberikan pengguna login, ketika `EP-006` dipanggil dengan `name` dan `description` yang valid, maka respons `201` dan baris `projects` dibuat; `name` wajib ada dan `description` boleh berupa string kosong.
- **AC-REQ-004.2** Diberikan proyek berhasil dibuat, maka baris `project_members` untuk pembuat dibuat dengan `role = owner`, dan proyek memiliki tepat satu owner.
- **AC-REQ-004.3** Diberikan proyek berhasil dibuat, ketika `EP-005` dipanggil oleh pembuat, maka proyek tersebut muncul dalam daftar proyek yang diikuti pembuat.

### REQ-005 — Melihat daftar dan detail proyek

- **AC-REQ-005.1** Diberikan pengguna login, ketika `EP-005` dipanggil, maka respons `200` hanya memuat proyek tempat pengguna memiliki baris `project_members`, beserta role pengguna dan `member_count`.
- **AC-REQ-005.2** Diberikan anggota proyek, ketika `EP-007` dipanggil, maka respons `200` memuat project, members, tasks, dan comments terkait; komentar ditampilkan secara kronologis.
- **AC-REQ-005.3** Diberikan pengguna yang bukan anggota proyek, ketika `EP-007` dipanggil, maka respons `403` dan tidak ada data proyek, tugas, atau komentar yang dikembalikan.

### REQ-006 — Owner mengubah proyek

- **AC-REQ-006.1** Diberikan owner proyek, ketika `EP-008` dipanggil dengan `name` dan/atau `description` baru, maka respons `200` dan field `projects` yang dikirim diperbarui.
- **AC-REQ-006.2** Diberikan member atau pengguna di luar proyek, ketika mencoba mengubah proyek melalui `EP-008`, maka respons `403` dan data proyek tidak berubah.
- **AC-REQ-006.3** Diberikan owner mengirim `name` kosong, ketika `EP-008` dipanggil, maka respons `400` dan nama proyek lama dipertahankan.

### REQ-007 — Menambahkan member berdasarkan email persis

- **AC-REQ-007.1** Diberikan owner memasukkan email lengkap yang cocok persis dengan `profiles.email` dan pengguna belum menjadi anggota, ketika `EP-009` dipanggil, maka respons `201` dan baris `project_members` dengan `role = member` dibuat.
- **AC-REQ-007.2** Diberikan email tidak ditemukan, ketika `EP-009` dipanggil, maka respons `404` dan tidak ada keanggotaan dibuat.
- **AC-REQ-007.3** Diberikan email milik pengguna yang sudah menjadi anggota proyek, ketika `EP-009` dipanggil, maka respons `409` dan tidak ada baris keanggotaan duplikat.
- **AC-REQ-007.4** Diberikan bukan owner, ketika mencoba menambahkan member melalui `EP-009`, maka respons `403`.
- **AC-REQ-007.5** Antarmuka penambahan member hanya menerima email persis dan tidak menampilkan daftar pengguna atau hasil pencarian sebagian.

### REQ-008 — Mengeluarkan member dari proyek

- **AC-REQ-008.1** Diberikan owner dan member target, ketika `EP-010` dipanggil, maka respons `204` dan baris `project_members` milik member target dihapus.
- **AC-REQ-008.2** Diberikan mantan member yang baru dikeluarkan, ketika mengakses proyek, tugas, komentar, atau laporan melalui endpoint terkait, maka akses ditolak dengan `403`.
- **AC-REQ-008.3** Diberikan member dikeluarkan, maka baris `tasks` dan `comments` historis tetap ada; komentar tetap menampilkan `display_name` penulis dari `profiles`.
- **AC-REQ-008.4** Diberikan owner mencoba mengeluarkan dirinya sendiri, maka permintaan ditolak dan keanggotaan owner tetap ada; kepemilikan harus dialihkan terlebih dahulu.

### REQ-009 — Mengalihkan kepemilikan proyek

- **AC-REQ-009.1** Diberikan owner memilih `new_owner_id` yang merupakan member aktif proyek, ketika `EP-008` dipanggil, maka respons `200`, owner lama menjadi `member`, owner baru menjadi `owner`, dan proyek tetap memiliki tepat satu owner.
- **AC-REQ-009.2** Transfer kepemilikan bersifat atomik: tidak boleh ada keadaan sementara dengan dua owner atau tanpa owner.
- **AC-REQ-009.3** Diberikan `new_owner_id` yang bukan anggota proyek, maka permintaan ditolak tanpa mengubah role apa pun.
- **AC-REQ-009.4** Diberikan member yang mencoba mengalihkan kepemilikan, ketika `EP-008` dipanggil, maka respons `403` dan kepemilikan tidak berubah.

### REQ-010 — Membuat tugas

- **AC-REQ-010.1** Diberikan anggota proyek, ketika `EP-011` dipanggil dengan `title`, `description`, dan `assignee_id`, maka respons `201`, `tasks` dibuat dengan `is_completed = false`, dan tugas muncul pada detail proyek.
- **AC-REQ-010.2** Diberikan `assignee_id` yang bukan anggota proyek, ketika `EP-011` dipanggil, maka respons `400` dan tidak ada tugas dibuat.
- **AC-REQ-010.3** Diberikan pengguna yang bukan anggota proyek, ketika `EP-011` dipanggil, maka respons `403` dan tidak ada tugas dibuat.

### REQ-011 — Mengubah tugas sesuai role

- **AC-REQ-011.1** Diberikan owner proyek, ketika `EP-012` dipanggil dengan `title`, `description`, `assignee_id`, dan/atau `is_completed`, maka respons `200` dan field `tasks` yang dikirim diperbarui.
- **AC-REQ-011.2** Diberikan member yang ditugaskan pada tugas, ketika `EP-012` dipanggil hanya dengan `is_completed`, maka respons `200`, status berubah, dan `updated_at` tugas diperbarui.
- **AC-REQ-011.3** Diberikan member yang mencoba mengubah `title`, `description`, atau `assignee_id`, maka respons `403` dan tugas tidak berubah.
- **AC-REQ-011.4** Diberikan member yang mencoba mengubah `is_completed` pada tugas dengan `assignee_id` milik pengguna lain, maka respons `403` dan status tugas tidak berubah.
- **AC-REQ-011.5** Diberikan pengguna yang bukan anggota proyek, ketika `EP-012` dipanggil, maka respons `403`.

### REQ-012 — Menghapus tugas

- **AC-REQ-012.1** Diberikan owner proyek, ketika `EP-013` dipanggil untuk tugas di proyeknya, maka respons `204`, tugas dihapus, dan komentar terkait tidak lagi ditampilkan.
- **AC-REQ-012.2** Diberikan member atau pengguna di luar proyek, ketika `EP-013` dipanggil, maka respons `403` dan tugas tetap ada.
- **AC-REQ-012.3** Setelah tugas dihapus, tugas tersebut tidak muncul lagi pada detail proyek atau laporan mingguan.

### REQ-013 — Berkomentar pada tugas

- **AC-REQ-013.1** Diberikan anggota proyek, ketika `EP-014` dipanggil dengan `body` tidak kosong, maka respons `201`, komentar menyimpan `author_id` dan `created_at`, serta ditampilkan kronologis dengan `display_name` penulis.
- **AC-REQ-013.2** Diberikan `body` kosong, ketika `EP-014` dipanggil, maka respons `400` dan tidak ada komentar dibuat.
- **AC-REQ-013.3** Diberikan pengguna yang bukan anggota proyek, ketika `EP-014` dipanggil, maka respons `403` dan tidak ada komentar dibuat.
- **AC-REQ-013.4** Owner dan member yang merupakan anggota proyek sama-sama dapat menambahkan komentar pada tugas di proyek tersebut.

### REQ-014 — Laporan mingguan

- **AC-REQ-014.1** Diberikan anggota proyek memilih `week_start` hari Senin, ketika `EP-015` dipanggil, maka respons `200` memuat `week_start`, `week_end`, `completed_tasks`, dan `incomplete_tasks`.
- **AC-REQ-014.2** Laporan memakai `is_completed` terkini dan memasukkan tugas yang `created_at` atau `updated_at` berada dalam periode Senin–Minggu; tugas yang dibuat dan diperbarui pada minggu yang sama dihitung satu kali.
- **AC-REQ-014.3** Tugas yang berada di luar periode tidak muncul dalam `completed_tasks` atau `incomplete_tasks`.
- **AC-REQ-014.4** Diberikan pengguna yang bukan anggota proyek, ketika `EP-015` dipanggil, maka respons `403`.

### REQ-015 — Kontrol akses berbasis role di server

- **AC-REQ-015.1** Diberikan pengguna tanpa sesi valid, ketika mengakses `EP-003` atau `EP-005`–`EP-015`, maka respons `401`.
- **AC-REQ-015.2** Diberikan pengguna terautentikasi yang bukan anggota proyek, ketika mengakses resource proyek, tugas, komentar, atau laporan, maka respons `403`.
- **AC-REQ-015.3** Diberikan member yang mencoba aksi khusus owner, termasuk mengubah proyek, mengelola anggota, mengalihkan kepemilikan, mengubah konten/assignee tugas, atau menghapus tugas, maka respons `403`.
- **AC-REQ-015.4** Pemeriksaan keanggotaan dan role tetap berlaku saat endpoint dipanggil langsung tanpa melalui UI.
- **AC-REQ-015.5** Row Level Security Supabase aktif sebagai lapisan tambahan, tetapi keputusan otorisasi utama tetap dilakukan di server aplikasi.

### REQ-016 — Pencarian dan filter tugas (`later`)

- **AC-REQ-016.1** Ketika `EP-007` dipanggil dengan query `q`, `status`, dan/atau `assignee_id`, maka `q` memfilter judul tugas, `status` memfilter `is_completed`, dan `assignee_id` memfilter penanggung jawab.
- **AC-REQ-016.2** Kombinasi beberapa filter hanya mengembalikan tugas yang memenuhi semua kriteria.
- **AC-REQ-016.3** Filter tidak pernah menampilkan tugas dari proyek yang tidak diikuti pengguna; non-anggota tetap mendapat `403`.
- **AC-REQ-016.4** Tanpa filter, perilaku daftar tugas tetap sesuai `REQ-005`.

### REQ-017 — Ringkasan tugas pribadi (`later`)

- **AC-REQ-017.1** Halaman ringkasan menampilkan tugas dengan `assignee_id` sama dengan pengguna login.
- **AC-REQ-017.2** Hanya tugas dari proyek tempat pengguna masih memiliki baris `project_members` yang ditampilkan.
- **AC-REQ-017.3** Tugas selesai dan belum selesai dapat dibedakan berdasarkan `is_completed`.
- **AC-REQ-017.4** Tugas dari proyek yang sudah tidak diikuti tidak muncul dalam ringkasan.

## 4. Priority Matrix

| Priority | Requirement | Jumlah | Release gate |
|---|---|---|---|
| `mvp` | `REQ-001`–`REQ-015` | 15 | Wajib lulus seluruh acceptance criteria sebelum MVP dinyatakan selesai. |
| `later` | `REQ-016`, `REQ-017` | 2 | Tidak menjadi blocker MVP; diuji saat requirement diaktifkan. |

| Area | Requirement MVP | Requirement `later` |
|---|---|---|
| Autentikasi dan sesi | `REQ-001`, `REQ-002`, `REQ-003` | — |
| Proyek, anggota, dan kepemilikan | `REQ-004`, `REQ-005`, `REQ-006`, `REQ-007`, `REQ-008`, `REQ-009` | — |
| Tugas dan komentar | `REQ-010`, `REQ-011`, `REQ-012`, `REQ-013` | `REQ-016` |
| Laporan mingguan | `REQ-014` | — |
| Kontrol akses | `REQ-015` | — |
| Ringkasan pribadi | — | `REQ-017` |

`REQ-015` bersifat lintas area dan harus diverifikasi bersama seluruh endpoint terproteksi, bukan sebagai pengujian terpisah di akhir.

## 5. Traceability

### 5.1 Requirement ke acceptance criteria, endpoint, entity, dan business rule

| Requirement | Acceptance Criteria | Endpoint | Entity | Business Rule |
|---|---|---|---|---|
| `REQ-001` | `AC-REQ-001.1`–`AC-REQ-001.3` | `EP-001` | `profiles` | — |
| `REQ-002` | `AC-REQ-002.1`–`AC-REQ-002.3` | `EP-002`, `EP-003` | `profiles` | — |
| `REQ-003` | `AC-REQ-003.1`–`AC-REQ-003.3` | `EP-004` | `profiles` | — |
| `REQ-004` | `AC-REQ-004.1`–`AC-REQ-004.3` | `EP-006`, `EP-005` | `projects`, `project_members` | `BR-001`, `BR-002` |
| `REQ-005` | `AC-REQ-005.1`–`AC-REQ-005.3` | `EP-005`, `EP-007` | `projects`, `project_members`, `tasks`, `comments`, `profiles` | `BR-002` |
| `REQ-006` | `AC-REQ-006.1`–`AC-REQ-006.3` | `EP-008` | `projects`, `project_members` | `BR-002` |
| `REQ-007` | `AC-REQ-007.1`–`AC-REQ-007.5` | `EP-009` | `profiles`, `project_members` | `BR-006`, `BR-002` |
| `REQ-008` | `AC-REQ-008.1`–`AC-REQ-008.4` | `EP-010` | `project_members`, `profiles`, `tasks`, `comments` | `BR-004`, `BR-002` |
| `REQ-009` | `AC-REQ-009.1`–`AC-REQ-009.4` | `EP-008` | `projects`, `project_members` | `BR-001`, `BR-002` |
| `REQ-010` | `AC-REQ-010.1`–`AC-REQ-010.3` | `EP-011` | `tasks`, `project_members`, `profiles` | `BR-002` |
| `REQ-011` | `AC-REQ-011.1`–`AC-REQ-011.5` | `EP-012` | `tasks`, `project_members` | `BR-003`, `BR-002` |
| `REQ-012` | `AC-REQ-012.1`–`AC-REQ-012.3` | `EP-013` | `tasks`, `comments`, `project_members` | `BR-003` |
| `REQ-013` | `AC-REQ-013.1`–`AC-REQ-013.4` | `EP-014` | `comments`, `tasks`, `profiles`, `project_members` | `BR-002` |
| `REQ-014` | `AC-REQ-014.1`–`AC-REQ-014.4` | `EP-015` | `tasks`, `projects`, `project_members` | `BR-005` |
| `REQ-015` | `AC-REQ-015.1`–`AC-REQ-015.5` | `EP-003`, `EP-005`–`EP-015` | `projects`, `project_members`, `tasks`, `comments` | `BR-002`, `BR-003`, `BR-004` |
| `REQ-016` | `AC-REQ-016.1`–`AC-REQ-016.4` | `EP-007` | `tasks`, `project_members` | `BR-002` |
| `REQ-017` | `AC-REQ-017.1`–`AC-REQ-017.4` | Tidak ada endpoint khusus di `EP-001`–`EP-015` | `tasks`, `project_members` | — |

Catatan traceability: `REQ-017` berstatus `later` dan tidak memiliki endpoint khusus dalam daftar `EP-001`–`EP-015`. Dokumen ini tidak menetapkan endpoint baru untuk requirement tersebut.

### 5.2 Cakupan endpoint

| Endpoint | Requirement terkait |
|---|---|
| `EP-001` | `REQ-001` |
| `EP-002` | `REQ-002` |
| `EP-003` | `REQ-002`, `REQ-015` |
| `EP-004` | `REQ-003` |
| `EP-005` | `REQ-004`, `REQ-005`, `REQ-015` |
| `EP-006` | `REQ-004` |
| `EP-007` | `REQ-005`, `REQ-015`, `REQ-016` |
| `EP-008` | `REQ-006`, `REQ-009`, `REQ-015` |
| `EP-009` | `REQ-007`, `REQ-015` |
| `EP-010` | `REQ-008`, `REQ-015` |
| `EP-011` | `REQ-010`, `REQ-015` |
| `EP-012` | `REQ-011`, `REQ-015` |
| `EP-013` | `REQ-012`, `REQ-015` |
| `EP-014` | `REQ-013`, `REQ-015` |
| `EP-015` | `REQ-014`, `REQ-015` |

Seluruh endpoint pada SpecModel tercakup oleh setidaknya satu requirement.

### 5.3 Cakupan business rule

| Business Rule | Requirement terkait |
|---|---|
| `BR-001` | `REQ-004`, `REQ-009` |
| `BR-002` | `REQ-004`, `REQ-005`, `REQ-006`, `REQ-007`, `REQ-008`, `REQ-009`, `REQ-010`, `REQ-011`, `REQ-013`, `REQ-015`, `REQ-016` |
| `BR-003` | `REQ-011`, `REQ-012`, `REQ-015` |
| `BR-004` | `REQ-008`, `REQ-015` |
| `BR-005` | `REQ-014` |
| `BR-006` | `REQ-007` |

## 6. Open Questions

Pertanyaan berikut belum diputuskan dalam SpecModel dan harus diselesaikan sebelum pengujian final requirement terkait.

| No | Pertanyaan | Dampak |
|---|---|---|
| 1 | Zona waktu default laporan mingguan belum ditetapkan; usulan `Asia/Jakarta` perlu dikonfirmasi. | `REQ-014`, `BR-005` |
| 2 | Apakah verifikasi email Supabase diaktifkan saat pendaftaran, atau akun langsung aktif setelah signup? | `REQ-001`, `REQ-002` |
| 3 | Apakah komentar boleh diedit atau dihapus, atau bersifat permanen pada MVP? | `REQ-013` |
| 4 | Bagaimana penanganan tugas yang masih ditugaskan ke mantan member setelah ia dikeluarkan: tetap terbuka sampai owner mengganti assignee, atau otomatis dilepas? | `REQ-008`, `REQ-010`, `REQ-011`, `BR-004` |