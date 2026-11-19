# FEATURES.md — KerjaTim

| Field | Nilai |
|---|---|
| Nama dokumen | FEATURES.md |
| Produk | KerjaTim |
| Versi | 1.0 |
| Status | Siap untuk review |
| Sumber kebenaran | SpecModel proyek KerjaTim |
| Cakupan | Pemecahan fitur MVP dan later, dependensi, dan out of scope |
| Prioritas | `mvp`, `later` |

Dokumen ini memecah fitur KerjaTim menjadi increment yang jelas dan berprioritas. SpecModel adalah satu-satunya sumber kebenaran. Dokumen ini tidak menambahkan entity, endpoint, requirement, role, atau aturan bisnis baru di luar SpecModel. Jika terjadi konflik antara dokumen ini dan SpecModel, SpecModel menang.

## 1. Feature Overview

### 1.1 Prinsip pemecahan fitur

Pemecahan fitur mengikuti aturan berikut:

1. **Setiap fitur dapat dilacak ke requirement dan endpoint kanonik.** Fitur tidak boleh menjadi requirement baru. ID yang dipakai adalah `REQ-xxx`, `EP-xxx`, dan `BR-xxx` dari SpecModel.
2. **Prioritas hanya `mvp` atau `later`.** Fitur `mvp` wajib selesai untuk rilis MVP. Fitur `later` tidak boleh menjadi blocker MVP.
3. **Role bersifat per proyek.** `Owner` dan `member` disimpan pada `project_members` dan diperiksa di server, bukan di client (`BR-002`, `REQ-015`).
4. **Increment harus dapat didemokan dan diuji.** Setiap increment menghasilkan kemampuan pengguna yang terlihat, bukan hanya perubahan teknis.
5. **Kontrol akses bukan fitur opsional.** `REQ-015` bersifat lintas-potong dan harus diterapkan bersamaan dengan fitur proyek, tugas, komentar, dan laporan.

### 1.2 Peta fitur

| ID fitur | Nama fitur | Priority | Requirement | Endpoint | Entity utama | Increment |
|---|---|---|---|---|---|---|
| F-01 | Autentikasi email dan password | `mvp` | `REQ-001`, `REQ-002`, `REQ-003` | `EP-001`–`EP-004` | `profiles` | Inc-1 |
| F-02 | Pembuatan dan pengelolaan proyek | `mvp` | `REQ-004`, `REQ-005`, `REQ-006` | `EP-005`, `EP-006`, `EP-007`, `EP-008` | `projects`, `project_members` | Inc-2 |
| F-03 | Pengelolaan anggota proyek | `mvp` | `REQ-007`, `REQ-008`, `REQ-009` | `EP-009`, `EP-010`, `EP-008` | `project_members`, `profiles` | Inc-2 |
| F-04 | Manajemen tugas | `mvp` | `REQ-010`, `REQ-011`, `REQ-012` | `EP-011`, `EP-012`, `EP-013` | `tasks`, `project_members` | Inc-3 |
| F-05 | Daftar tugas per proyek | `mvp` | `REQ-005` | `EP-007` | `tasks`, `profiles` | Inc-3 |
| F-06 | Komentar pada tugas | `mvp` | `REQ-013` | `EP-014` | `comments`, `profiles`, `tasks` | Inc-3 |
| F-07 | Laporan mingguan proyek | `mvp` | `REQ-014` | `EP-015` | `tasks`, `projects`, `project_members` | Inc-4 |
| F-08 | Kontrol akses berbasis peran | `mvp` | `REQ-015`; `BR-001`–`BR-004` | `EP-003`, `EP-005`–`EP-015` | `project_members`, `projects`, `tasks`, `comments` | Inc-1 s.d. Inc-4 |
| F-09 | Pencarian dan filter tugas | `later` | `REQ-016` | `EP-007` | `tasks`, `project_members` | Inc-5 |
| F-10 | Ringkasan tugas pribadi | `later` | `REQ-017` | Tidak ada endpoint khusus dalam `EP-001`–`EP-015` | `tasks`, `project_members` | Inc-5 |

### 1.3 Definisi increment

| Increment | Nama increment | Fitur | Hasil yang dapat diamati |
|---|---|---|---|
| Inc-1 | Akun dan fondasi otorisasi | F-01, fondasi F-08 | Pengguna dapat mendaftar, login, logout, dan meminta reset password; sesi cookie terbentuk; profil aplikasi tersedia; fondasi pemeriksaan sesi dan role disiapkan di server. |
| Inc-2 | Proyek dan keanggotaan | F-02, F-03, lanjutan F-08 | Pengguna dapat membuat proyek dan menjadi owner; anggota dapat melihat proyek yang diikuti; owner dapat menambah/mengeluarkan member dan mengalihkan kepemilikan. |
| Inc-3 | Eksekusi tugas dan diskusi | F-04, F-05, F-06, lanjutan F-08 | Anggota proyek dapat membuat tugas, melihat daftar tugas, mengubah status sesuai role, dan berkomentar secara kronologis. |
| Inc-4 | Visibilitas mingguan | F-07, penyelesaian F-08 untuk endpoint MVP | Anggota proyek dapat membaca laporan mingguan berisi tugas selesai dan belum selesai untuk minggu yang dipilih. |
| Inc-5 | Later | F-09, F-10 | Pencarian/filter tugas dan ringkasan tugas pribadi direncanakan setelah MVP; tidak menjadi blocker rilis MVP. |

### 1.4 Definition of done per fitur

Sebuah fitur dianggap selesai jika:

- endpoint kanonik terkait telah diimplementasikan dengan method, path, auth, request, response, dan error sesuai SpecModel;
- otorisasi `owner`/`member` diperiksa di server untuk setiap aksi (`REQ-015`);
- input divalidasi dengan Zod di server dan status error konsisten;
- UI web menampilkan hasil yang dapat diamati pengguna;
- pengujian memetakan perilaku ke `REQ-xxx` dan `BR-xxx` terkait;
- tidak ada perilaku di luar cakupan SpecModel yang ditambahkan.

## 2. MVP Features

Seluruh fitur F-01 sampai F-08 wajib untuk MVP. Tidak ada fitur MVP yang bergantung pada F-09 atau F-10.

| ID | Fitur MVP | Requirement | Endpoint | Aktor | Hasil yang dapat diamati |
|---|---|---|---|---|---|
| F-01 | Autentikasi email dan password | `REQ-001`, `REQ-002`, `REQ-003` | `EP-001`–`EP-004` | Pengguna | Akun dibuat dengan email, password, dan `display_name`; login menghasilkan sesi cookie; logout menghapus sesi; reset password mengirim tautan email dan memungkinkan password baru. |
| F-02 | Pembuatan dan pengelolaan proyek | `REQ-004`, `REQ-005`, `REQ-006` | `EP-005`, `EP-006`, `EP-007`, `EP-008` | Pengguna login, anggota proyek, owner | Pengguna login dapat membuat proyek dan otomatis menjadi owner; daftar proyek hanya berisi proyek yang diikuti; detail proyek dapat diakses anggota; owner dapat mengubah nama dan deskripsi. |
| F-03 | Pengelolaan anggota proyek | `REQ-007`, `REQ-008`, `REQ-009` | `EP-009`, `EP-010`, `EP-008` | Owner | Owner dapat menambahkan member berdasarkan email persis, mengeluarkan member, dan mengalihkan kepemilikan kepada member aktif dengan tepat satu owner per proyek. |
| F-04 | Manajemen tugas | `REQ-010`, `REQ-011`, `REQ-012` | `EP-011`, `EP-012`, `EP-013` | Owner, member | Anggota proyek dapat membuat tugas dengan penanggung jawab; owner dapat mengubah semua field dan menghapus tugas; member hanya dapat mengubah status tugas yang ditugaskan kepadanya. |
| F-05 | Daftar tugas per proyek | `REQ-005` | `EP-007` | Anggota proyek | Detail proyek menampilkan daftar tugas beserta status dan penanggung jawab terbaru. |
| F-06 | Komentar pada tugas | `REQ-013` | `EP-014` | Anggota proyek | Anggota proyek dapat menambahkan komentar teks non-kosong; komentar tampil kronologis dengan nama penulis dan waktu. |
| F-07 | Laporan mingguan proyek | `REQ-014` | `EP-015` | Anggota proyek | Anggota proyek dapat memilih `week_start` hari Senin dan melihat `completed_tasks` serta `incomplete_tasks` berdasarkan status terkini. |
| F-08 | Kontrol akses berbasis peran | `REQ-015`; `BR-001`–`BR-004` | `EP-003`, `EP-005`–`EP-015` | Sistem | Endpoint terproteksi menolak pengguna tanpa sesi dengan `401` dan menolak aksi tanpa hak dengan `403`; role diperiksa dari `project_members` di server. |

Batas rilis MVP: F-01 sampai F-08 harus tersedia dan teruji. F-09 dan F-10 tidak termasuk kriteria rilis MVP.

## 3. Later Features

| ID | Fitur later | Requirement | Endpoint | Aktor | Hasil yang dapat diamati |
|---|---|---|---|---|---|
| F-09 | Pencarian dan filter tugas | `REQ-016` | `EP-007` | Anggota proyek | Anggota proyek dapat mencari tugas berdasarkan judul dan memfilter berdasarkan status atau penanggung jawab dalam proyek yang diikuti. |
| F-10 | Ringkasan tugas pribadi | `REQ-017` | Tidak ada endpoint khusus dalam `EP-001`–`EP-015` | Pengguna login | Pengguna melihat tugas yang ditugaskan kepadanya lintas proyek, hanya dari proyek tempat ia masih menjadi anggota, dengan pembeda selesai dan belum selesai. |

Fitur `later` tidak boleh mengubah kontrak MVP. F-09 memanfaatkan `EP-007` yang telah mencantumkan query `q`, `status`, dan `assignee_id`; implementasi perilaku pencarian/filter diprioritaskan setelah MVP. F-10 belum memiliki endpoint khusus dalam SpecModel, sehingga bentuk implementasinya dicatat pada Open Questions dan tidak boleh mengarang endpoint baru di dokumen ini.

## 4. Feature Detail

### 4.1 F-01 — Autentikasi email dan password

**Tujuan.** Menyediakan akun pengguna dan sesi web yang aman sehingga pengguna dapat mengakses proyek sesuai keanggotaannya.

**Requirement dan endpoint.** `REQ-001`, `REQ-002`, `REQ-003`; `EP-001` signup, `EP-002` login, `EP-003` logout, `EP-004` permintaan reset password.

**Entity.** `profiles`. `profiles.id` sama dengan `auth.users.id` Supabase Auth; `profiles.email` unik dan dipakai untuk login serta pencocokan anggota.

**Aktor.** Pengguna belum login untuk signup/login/reset; pengguna login untuk logout.

**Perilaku.**

1. Signup melalui `EP-001` meminta `email`, `password`, dan `display_name`. Email wajib valid dan unik; password minimal 8 karakter. Respons sukses `201` membuat akun Supabase Auth dan baris `profiles`. Email duplikat menghasilkan `409`; input tidak valid menghasilkan `400`.
2. Login melalui `EP-002` meminta `email` dan `password`. Kredensial benar menghasilkan `200`, sesi cookie, dan pengarahan ke halaman proyek. Kredensial salah menghasilkan `401` tanpa sesi.
3. Logout melalui `EP-003` membutuhkan sesi, tidak memakai body, dan menghasilkan `204` dengan cookie sesi dihapus. Halaman terproteksi setelah logout mengalihkan pengguna ke login.
4. Permintaan reset password melalui `EP-004` meminta `email` dan menghasilkan `202` dengan pesan netral. Jika email terdaftar, tautan reset dikirim melalui email; jika tidak terdaftar, respons tetap netral agar status akun tidak terbocorkan. Tautan valid memungkinkan penetapan password baru dan password lama tidak berlaku.
5. Sesi memakai cookie `HttpOnly`, `Secure`, dan `SameSite=Lax`; token sensitif tidak disimpan di `localStorage`.

**Kriteria uji.**

- Signup dengan email valid, password minimal 8 karakter, dan `display_name` terisi menghasilkan `201`, akun Auth, dan baris `profiles`.
- Signup dengan email duplikat menghasilkan `409` dan tidak membuat akun baru.
- Login dengan kredensial benar menghasilkan `200` dan cookie sesi; kredensial salah menghasilkan `401`.
- Logout menghasilkan `204`, cookie sesi hilang, dan endpoint terproteksi berikutnya menghasilkan `401`.
- Permintaan reset untuk email terdaftar dan tidak terdaftar sama-sama menghasilkan `202` dengan pesan netral.

### 4.2 F-02 — Pembuatan dan pengelolaan proyek

**Tujuan.** Memungkinkan pengguna login membuat proyek, melihat proyek yang diikuti, membuka detail proyek, dan mengubah metadata proyek sebagai owner.

**Requirement dan endpoint.** `REQ-004`, `REQ-005`, `REQ-006`; `EP-005` daftar proyek, `EP-006` buat proyek, `EP-007` detail proyek, `EP-008` ubah nama/deskripsi.

**Entity.** `projects`, `project_members`; detail proyek membaca `tasks`, `comments`, dan `profiles`.

**Aktor.** Pengguna login dapat membuat proyek; anggota proyek dapat melihat daftar dan detail; owner dapat mengubah nama dan deskripsi.

**Perilaku.**

1. `EP-005` hanya mengembalikan proyek tempat pengguna login memiliki baris `project_members`. Respons memuat `id`, `name`, `description`, role pengguna, dan `member_count`.
2. `EP-006` membuat proyek dengan `name` wajib dan `description` yang boleh berupa string kosong. Pembuat otomatis dicatat pada `project_members` dengan role `owner`. Pengguna login mana pun dapat membuat proyek; seorang member di proyek A dapat membuat proyek B dan menjadi owner di proyek B (`BR-002`).
3. `EP-007` hanya dapat diakses anggota proyek. Respons memuat `project`, `members`, `tasks`, dan komentar kronologis. Non-anggota mendapat `403` atau `404`. Parameter `q`, `status`, dan `assignee_id` pada endpoint ini merupakan bagian F-09 `later`; MVP tidak menjadikannya kriteria rilis.
4. `EP-008` dengan `name` dan/atau `description` hanya boleh dilakukan owner. Member atau non-anggota mendapat `403`. `name` kosong ditolak `400`. Transfer kepemilikan melalui field `new_owner_id` dibahas pada F-03, bukan F-02.
5. Setiap proyek memiliki tepat satu owner pada `project_members.role` (`BR-001`). Pembuatan proyek harus menghasilkan kondisi tersebut dalam satu transaksi.

**Kriteria uji.**

- Pengguna membuat proyek dengan `name` valid; respons `201`; baris `project_members` role `owner` terbentuk; proyek muncul di `EP-005` milik pembuat.
- Pengguna lain yang bukan anggota tidak melihat proyek tersebut di `EP-005` dan mendapat `403`/`404` saat membuka `EP-007`.
- Owner mengubah `name`/`description` berhasil `200`; member mencoba mengubah mendapat `403`; `name` kosong mendapat `400`.
- Detail proyek menampilkan anggota, tugas, dan komentar terkait.

### 4.3 F-03 — Pengelolaan anggota proyek

**Tujuan.** Memungkinkan owner mengatur keanggotaan proyek dan menjaga kepemilikan proyek tetap tepat satu owner.

**Requirement dan endpoint.** `REQ-007`, `REQ-008`, `REQ-009`; `EP-009` tambah member, `EP-010` keluarkan member, `EP-008` transfer kepemilikan melalui `new_owner_id`.

**Entity.** `project_members`, `profiles`, `projects`; dampak retensi menyentuh `tasks` dan `comments`.

**Aktor.** Owner.

**Perilaku.**

1. Owner menambahkan member melalui `EP-009` dengan `email` lengkap. Sistem hanya mencocokkan `profiles.email` secara persis, tanpa menampilkan daftar pengguna atau pencarian sebagian (`BR-006`). Jika akun ditemukan dan belum menjadi anggota, sistem membuat baris `project_members` role `member` dan merespons `201`. Email tidak ditemukan menghasilkan `404`; pengguna yang sudah menjadi anggota menghasilkan `409`; non-owner menghasilkan `403`.
2. Owner mengeluarkan member melalui `EP-010`. Respons sukses `204`; baris `project_members` dihapus; mantan member kehilangan akses ke proyek, tugas, dan komentar. Tugas dan komentar tetap ada, dan nama penulis komentar tetap tampil dari `profiles` (`BR-004`).
3. Owner tidak dapat mengeluarkan dirinya sendiri. Kepemilikan harus dialihkan terlebih dahulu melalui `EP-008`.
4. Owner mengalihkan kepemilikan melalui `EP-008` dengan `new_owner_id` yang merupakan member aktif proyek. Dalam satu transaksi, owner lama menjadi `member` dan owner baru menjadi `owner`; kondisi dua owner ditolak (`BR-001`, `REQ-009`). `new_owner_id` yang bukan anggota ditolak; member yang mencoba transfer mendapat `403`.
5. Tugas yang masih ditugaskan kepada mantan member tetap tersimpan. Perilaku apakah tugas tersebut tetap terbuka sampai owner mengganti assignee atau otomatis dilepas dicatat pada Open Questions.

**Kriteria uji.**

- Owner menambahkan email terdaftar yang belum menjadi anggota; respons `201`; member baru dapat membuka proyek.
- Email tidak ditemukan menghasilkan `404`; email yang sudah menjadi anggota menghasilkan `409`; member yang mencoba menambah anggota menghasilkan `403`.
- Owner mengeluarkan member; respons `204`; mantan member mendapat `403`/`404` saat mengakses proyek; komentar historis tetap menampilkan nama penulis.
- Owner tidak dapat mengeluarkan dirinya sendiri; percobaan ditolak.
- Transfer kepemilikan menghasilkan tepat satu owner; owner lama menjadi member; owner baru dapat melakukan aksi owner; member yang mencoba transfer mendapat `403`.

### 4.4 F-04 — Manajemen tugas

**Tujuan.** Memungkinkan anggota proyek membuat tugas dengan penanggung jawab, memperbarui status sesuai role, dan menghapus tugas sebagai owner.

**Requirement dan endpoint.** `REQ-010`, `REQ-011`, `REQ-012`; `EP-011` buat tugas, `EP-012` ubah tugas, `EP-013` hapus tugas.

**Entity.** `tasks`, `project_members`; penghapusan tugas juga menghapus `comments` terkait.

**Aktor.** Owner dan member untuk membuat tugas; owner untuk mengubah semua field dan menghapus; member untuk mengubah status tugas miliknya.

**Perilaku.**

1. Anggota proyek dapat membuat tugas melalui `EP-011` dengan `title`, `description`, dan `assignee_id`. `assignee_id` harus merupakan anggota proyek; jika bukan, respons `400`. Tugas baru memiliki `is_completed=false` dan muncul pada detail proyek. Non-anggota mendapat `403`.
2. Owner dapat mengubah `title`, `description`, `assignee_id`, dan `is_completed` melalui `EP-012`. Assignee baru harus anggota proyek. Member hanya boleh mengirim `is_completed` untuk tugas dengan `assignee_id` sama dengan user login. Member yang mengubah field lain, mengubah status tugas anggota lain, atau mengirim payload campuran yang memuat field selain `is_completed` mendapat `403` (`BR-003`).
3. Perubahan `is_completed` memperbarui `updated_at` tugas. Perubahan field lain oleh owner juga memperbarui `updated_at`.
4. Hanya owner yang dapat menghapus tugas melalui `EP-013`. Respons sukses `204`; tugas dan komentar terkait tidak lagi ditampilkan. Member atau non-anggota yang mencoba menghapus mendapat `403` (`REQ-012`).
5. Tenggat waktu dan prioritas tidak termasuk cakupan tugas pada MVP.

**Kriteria uji.**

- Member proyek membuat tugas dengan assignee anggota proyek; respons `201`; `is_completed=false`; tugas muncul di detail proyek.
- Pembuatan tugas dengan assignee bukan anggota proyek menghasilkan `400`; non-anggota menghasilkan `403`.
- Member mengubah status tugas yang ditugaskan kepadanya; respons `200`; `updated_at` berubah.
- Member mengubah status tugas anggota lain, judul, deskripsi, atau assignee; respons `403`.
- Owner mengubah seluruh field tugas; respons `200`. Owner menghapus tugas; respons `204`; komentar terkait hilang. Member menghapus tugas; respons `403`.

### 4.5 F-05 — Daftar tugas per proyek

**Tujuan.** Menampilkan pekerjaan proyek secara terpusat sehingga anggota dapat melihat tugas, status, dan penanggung jawab terbaru.

**Requirement dan endpoint.** `REQ-005`; `EP-007`.

**Entity.** `tasks`, `profiles`, `project_members`.

**Aktor.** Anggota proyek.

**Perilaku.**

1. Halaman detail proyek menampilkan daftar tugas proyek beserta status `is_completed` dan penanggung jawab.
2. Daftar hanya dapat dilihat anggota proyek. Non-anggota mendapat `403` atau `404`.
3. Tugas yang baru dibuat muncul pada daftar. Perubahan status atau assignee oleh pihak berwenang tercermin pada tampilan berikutnya.
4. Daftar tidak menampilkan tugas dari proyek lain.
5. Pencarian dan filter tugas bukan bagian MVP; perilaku tersebut berada pada F-09 `later`.

**Kriteria uji.**

- Anggota proyek membuka detail proyek dan melihat seluruh tugas proyek tersebut dengan status dan assignee.
- Non-anggota tidak dapat melihat daftar tugas proyek.
- Setelah status tugas diubah, daftar menampilkan status terbaru.
- Tugas dari proyek lain tidak muncul pada daftar proyek yang sedang dibuka.

### 4.6 F-06 — Komentar pada tugas

**Tujuan.** Menyatukan diskusi dengan pekerjaan sehingga komentar melekat pada tugas dan tersusun kronologis.

**Requirement dan endpoint.** `REQ-013`; `EP-014`.

**Entity.** `comments`, `tasks`, `profiles`, `project_members`.

**Aktor.** Anggota proyek, baik owner maupun member.

**Perilaku.**

1. Anggota proyek menambahkan komentar melalui `EP-014` dengan `body` non-kosong. Respons sukses `201` memuat `author_id`, `display_name`, dan `created_at`. `body` kosong menghasilkan `400`; non-anggota menghasilkan `403`.
2. Komentar ditampilkan secara kronologis beserta nama penulis dan waktu.
3. Komentar baru langsung tampil pada urutan kronologis tugas.
4. Penghapusan tugas oleh owner menghapus komentar terkait sesuai `EP-013`.
5. Perilaku edit atau hapus komentar tidak didefinisikan pada SpecModel dan dicatat pada Open Questions.

**Kriteria uji.**

- Anggota proyek mengirim komentar non-kosong; respons `201`; komentar tampil dengan `display_name` dan waktu.
- Komentar kosong menghasilkan `400`; non-anggota menghasilkan `403`.
- Dua komentar tampil berurutan sesuai `created_at`.
- Setelah tugas dihapus owner, komentar terkait tidak lagi ditampilkan.

### 4.7 F-07 — Laporan mingguan proyek

**Tujuan.** Memberikan rekap mingguan tugas selesai dan belum selesai per proyek tanpa rekap manual.

**Requirement dan endpoint.** `REQ-014`; `EP-015`.

**Entity.** `tasks`, `projects`, `project_members`.

**Aktor.** Anggota proyek, baik owner maupun member.

**Perilaku.**

1. Anggota proyek membuka laporan mingguan dan memilih `week_start` yang merupakan hari Senin dengan format `YYYY-MM-DD`.
2. Sistem mengambil tugas yang `created_at` atau `updated_at` berada dalam periode Senin–Minggu tersebut, lalu mengelompokkannya berdasarkan `is_completed` terkini (`BR-005`).
3. Respons `200` memuat `week_start`, `week_end`, `completed_tasks`, dan `incomplete_tasks`. Non-anggota mendapat `403`.
4. Tugas yang dibuat dan diperbarui pada minggu yang sama dihitung sekali. Laporan tidak memakai snapshot historis; status yang ditampilkan adalah status terkini.
5. Zona waktu yang dipakai bersama untuk seluruh tim belum ditetapkan dan dicatat pada Open Questions.

**Kriteria uji.**

- Anggota memilih `week_start` Senin dan melihat dua kelompok tugas: selesai dan belum selesai.
- Tugas yang dibuat atau diperbarui di dalam periode muncul; tugas di luar periode tidak muncul.
- Tugas yang statusnya diubah pada minggu tersebut muncul dengan status terkini.
- Tugas yang dibuat dan diperbarui pada minggu yang sama hanya muncul sekali.
- Non-anggota mendapat `403`.

### 4.8 F-08 — Kontrol akses berbasis peran

**Tujuan.** Menegakkan batas akses owner/member per proyek di server sehingga data proyek tidak dapat diakses atau diubah oleh pihak yang tidak berhak.

**Requirement dan endpoint.** `REQ-015`; `BR-001`, `BR-002`, `BR-003`, `BR-004`; berlaku pada `EP-003` dan `EP-005`–`EP-015`.

**Entity.** `project_members`, `projects`, `tasks`, `comments`.

**Aktor.** Sistem.

**Perilaku.**

1. Setiap endpoint terproteksi memeriksa sesi cookie. Pengguna tanpa sesi valid mendapat `401`.
2. Setiap akses ke proyek, tugas, komentar, dan laporan memeriksa baris `project_members` untuk `project_id` dan `user_id` dari sesi. Non-anggota mendapat `403` atau `404`.
3. Role diambil dari `project_members.role` di server, bukan dari input client. Aksi khusus owner yang dilakukan member ditolak `403`.
4. Aksi khusus owner mencakup mengubah nama/deskripsi proyek (`REQ-006`), menambah/mengeluarkan member (`REQ-007`, `REQ-008`), mengalihkan kepemilikan (`REQ-009`), mengubah seluruh field tugas (`REQ-011`), dan menghapus tugas (`REQ-012`).
5. Member tetap dapat membuat tugas (`REQ-010`), mengubah status tugas yang ditugaskan kepadanya (`REQ-011`), memberi komentar (`REQ-013`), dan melihat laporan mingguan (`REQ-014`).
6. Tepat satu owner per proyek (`BR-001`), role per proyek (`BR-002`), batas member pada tugas (`BR-003`), dan retensi data setelah member dikeluarkan (`BR-004`) harus konsisten pada semua endpoint.
7. Row Level Security Supabase digunakan sebagai lapisan pertahanan tambahan, bukan pengganti pemeriksaan server.

**Kriteria uji.**

- Endpoint terproteksi tanpa sesi menghasilkan `401`.
- Member memanggil aksi owner menghasilkan `403`.
- Non-anggota membuka detail proyek, tugas, komentar, atau laporan menghasilkan `403`/`404`.
- Pengguna yang owner di proyek A dan member di proyek B tidak dapat melakukan aksi owner di proyek B.
- Member mengubah status tugas miliknya berhasil; mengubah status tugas anggota lain menghasilkan `403`.
- Role yang dimanipulasi di client tidak menambah akses karena keputusan otorisasi diambil di server.

### 4.9 F-09 — Pencarian dan filter tugas

**Tujuan.** Memungkinkan anggota proyek menemukan tugas tertentu dengan cepat di dalam proyek yang diikuti.

**Requirement dan endpoint.** `REQ-016`; `EP-007` dengan query `q`, `status`, dan `assignee_id`.

**Entity.** `tasks`, `project_members`.

**Aktor.** Anggota proyek.

**Perilaku.**

1. `q` mencari tugas berdasarkan judul.
2. `status` memfilter berdasarkan `is_completed`.
3. `assignee_id` memfilter berdasarkan penanggung jawab.
4. Kombinasi filter hanya mengembalikan tugas yang memenuhi semua kriteria.
5. Filter tidak pernah menampilkan tugas dari proyek yang tidak diikuti pengguna.

**Kriteria uji.**

- `q` mengembalikan tugas yang judulnya cocok dan tidak mengembalikan yang tidak cocok.
- `status` memisahkan tugas selesai dan belum selesai.
- `assignee_id` hanya mengembalikan tugas milik assignee tersebut.
- Kombinasi `q`, `status`, dan `assignee_id` menerapkan semua kriteria sekaligus.
- Non-anggota tidak dapat memperoleh data tugas melalui filter.

### 4.10 F-10 — Ringkasan tugas pribadi

**Tujuan.** Memberikan satu halaman ringkasan tugas yang ditugaskan kepada pengguna lintas proyek.

**Requirement dan endpoint.** `REQ-017`; tidak ada endpoint khusus dalam `EP-001`–`EP-015`.

**Entity.** `tasks`, `project_members`.

**Aktor.** Pengguna login.

**Perilaku.**

1. Ringkasan menampilkan tugas dengan `assignee_id` sama dengan pengguna login.
2. Hanya tugas dari proyek tempat pengguna masih menjadi anggota yang ditampilkan.
3. Tugas selesai dan belum selesai dapat dibedakan.
4. Karena SpecModel tidak menetapkan endpoint khusus, bentuk query atau endpoint untuk fitur ini dicatat pada Open Questions dan tidak boleh dianggap bagian dari kontrak MVP.

**Kriteria uji.**

- Pengguna melihat tugas yang ditugaskan kepadanya dari proyek yang masih diikuti.
- Tugas dari proyek yang sudah tidak diikuti tidak muncul.
- Tugas selesai dan belum selesai dapat dibedakan.

## 5. Dependencies

### 5.1 Dependensi antar fitur

| Fitur | Bergantung pada | Dependensi data/endpoint | Alasan |
|---|---|---|---|
| F-01 | — | `profiles`; `EP-001`–`EP-004`; Supabase Auth; cookie SSR | Fondasi akun dan sesi untuk seluruh fitur terproteksi. |
| F-02 | F-01 | `projects`, `project_members`; `EP-005`–`EP-008` | Proyek membutuhkan pengguna login dan baris owner. |
| F-03 | F-01, F-02 | `profiles`, `project_members`; `EP-008`–`EP-010` | Penambahan member membutuhkan proyek, owner, dan profil pengguna. |
| F-04 | F-01, F-02, F-03 | `tasks`, `project_members`; `EP-011`–`EP-013` | Assignee tugas harus anggota proyek; role menentukan batas ubah/hapus. |
| F-05 | F-02, F-04 | `tasks`, `profiles`; `EP-007` | Daftar tugas membutuhkan tugas yang sudah dibuat dan proyek yang dapat diakses. |
| F-06 | F-02, F-04 | `comments`, `tasks`, `profiles`; `EP-014` | Komentar membutuhkan tugas dan keanggotaan proyek. |
| F-07 | F-02, F-04 | `tasks`, `project_members`; `EP-015` | Laporan membutuhkan tugas dengan `created_at`, `updated_at`, dan `is_completed`. |
| F-08 | F-01 | `project_members`; `EP-003`, `EP-005`–`EP-015` | Pemeriksaan sesi dan role harus diterapkan pada setiap endpoint; F-08 bersifat lintas-potong. |
| F-09 | F-05 | `tasks`, `project_members`; `EP-007` | Pencarian/filter memperluas daftar tugas yang sudah ada; status later. |
| F-10 | F-03, F-04, F-05 | `tasks`, `project_members` | Ringkasan pribadi membutuhkan tugas, assignee, dan keanggotaan aktif; status later. |

### 5.2 Urutan implementasi

1. **Inc-1 — F-01 dan fondasi F-08.** Siapkan `profiles`, alur signup/login/logout/reset, sesi cookie, dan utilitas pemeriksaan sesi/role di server.
2. **Inc-2 — F-02 lalu F-03.** Siapkan `projects` dan `project_members`; buat proyek dengan owner otomatis; lanjutkan penambahan/pengeluaran member dan transfer kepemilikan.
3. **Inc-3 — F-04, F-05, F-06.** Implementasikan pembuatan/ubah/hapus tugas dengan batas role; tampilkan daftar tugas; tambahkan komentar kronologis.
4. **Inc-4 — F-07.** Implementasikan laporan mingguan berdasarkan `created_at` atau `updated_at` dan `is_completed` terkini.
5. **Inc-5 — F-09 dan F-10.** Direncanakan setelah MVP; F-09 memanfaatkan `EP-007`, F-10 memerlukan penetapan implementasi karena tidak ada endpoint khusus.

F-08 tidak boleh ditunda ke akhir. Pemeriksaan otorisasi harus ditambahkan bersamaan dengan setiap endpoint pada Inc-2 sampai Inc-4.

### 5.3 Critical path

Jalur dependensi utama MVP:

`F-01 → F-02 → F-03 → F-04 → F-06 → F-07`

Jalur pendukung:

- `F-04 → F-05` untuk daftar tugas.
- `F-05 → F-09` untuk pencarian/filter later.
- `F-04 + F-05 → F-10` untuk ringkasan pribadi later.

### 5.4 Dependensi data

- `profiles` harus tersedia sebelum `project_members` dan `comments` karena `user_id` dan `author_id` merujuk ke `profiles.id`.
- `projects` harus tersedia sebelum `project_members` dan `tasks` karena keduanya merujuk ke `project_id`.
- `project_members` harus tersedia sebelum `tasks` karena `assignee_id` harus merupakan anggota proyek.
- `tasks` harus tersedia sebelum `comments` karena `task_id` merujuk ke tugas.
- `tasks` harus tersedia sebelum laporan mingguan karena laporan membaca `created_at`, `updated_at`, dan `is_completed`.
- `project_members` harus tersedia sebelum F-09 dan F-10 karena keduanya wajib membatasi data pada proyek yang masih diikuti.

### 5.5 Dependensi teknis

- Supabase Auth dan cookie SSR untuk F-01 dan F-08.
- Resend untuk pengiriman email reset password pada `EP-004`.
- PostgreSQL Supabase untuk `profiles`, `projects`, `project_members`, `tasks`, dan `comments`.
- Zod di server untuk validasi input dan konsistensi status `400`, `401`, `403`, `404`, `409`.
- Next.js App Router, TypeScript, Tailwind/shadcn untuk UI web responsif.

## 6. Out of Scope

Hal-hal berikut tidak termasuk cakupan produk atau tidak dimodelkan dalam SpecModel:

- **Pembayaran, billing, subscription, dan invoice.** Produk tidak memiliki model komersial atau endpoint pembayaran.
- **Notifikasi.** Tidak ada notifikasi email atau in-app untuk tugas baru, komentar, atau perubahan status.
- **Lampiran file dan storage.** Tugas dan komentar hanya berisi teks.
- **Integrasi pihak ketiga.** Tidak ada integrasi Slack, kalender, atau layanan eksternal lain.
- **Multi-workspace atau hierarki organisasi.** Role hanya `owner` dan `member` per proyek.
- **Role tambahan di luar owner dan member.** Tidak ada super admin, guest, atau role global.
- **Undangan email untuk pengguna yang belum terdaftar.** Owner hanya menambahkan akun yang sudah ada melalui pencocokan email persis (`BR-006`).
- **Pencarian sebagian email atau direktori pengguna.** Sistem tidak menampilkan daftar pengguna untuk dipilih.
- **Tenggat waktu, prioritas, label, dan subtask.** Tidak dimodelkan pada `tasks`; tenggat waktu dan prioritas juga tidak termasuk MVP.
- **Aplikasi mobile native.** Klien yang dilayani adalah web app.
- **Snapshot historis status tugas untuk laporan mingguan.** Laporan memakai `is_completed` terkini (`BR-005`), bukan status pada akhir minggu.

F-09 dan F-10 **bukan** out of scope produk. Keduanya berstatus `later` dan tidak termasuk kriteria rilis MVP. Perilaku edit/hapus komentar dan verifikasi email tidak dimasukkan ke out of scope karena masih tercatat sebagai Open Questions.

## 7. Open Questions

1. **Zona waktu laporan mingguan.** `BR-005` menyebut “zona waktu yang disepakati”, tetapi zona waktu default belum ditetapkan. Usulan `Asia/Jakarta` perlu dikonfirmasi karena memengaruhi batas `week_start` dan `week_end`.
2. **Verifikasi email saat signup.** Belum ditetapkan apakah Supabase Auth mewajibkan verifikasi email sebelum akun aktif atau akun langsung aktif setelah signup.
3. **Edit atau hapus komentar.** SpecModel hanya mendefinisikan pembuatan dan pembacaan komentar. Belum ditetapkan apakah komentar bersifat permanen pada MVP atau boleh diedit/dihapus.
4. **Tugas yang masih ditugaskan ke mantan member.** Setelah member dikeluarkan, `tasks.assignee_id` dapat tetap menunjuk ke pengguna tersebut. Belum ditetapkan apakah tugas tetap terbuka sampai owner mengganti assignee atau otomatis dilepas.
5. **Implementasi F-10.** `REQ-017` menyatakan tidak ada endpoint khusus dalam `EP-001`–`EP-015`. Bentuk query atau endpoint untuk ringkasan tugas pribadi belum ditetapkan dan tidak boleh dianggap bagian dari kontrak MVP.
6. **Urutan default daftar tugas.** SpecModel tidak menetapkan urutan tampilan daftar tugas pada `EP-007`; kebutuhan urutan default perlu dikonfirmasi sebelum implementasi UI daftar tugas.