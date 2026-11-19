# Product Requirements Document — KerjaTim

| Field | Nilai |
|---|---|
| Nama produk | KerjaTim |
| Versi dokumen | 1.0 |
| Status | Siap untuk review |
| Sumber kebenaran | SpecModel proyek KerjaTim |
| Platform | Web app; Next.js App Router + TypeScript + Tailwind/shadcn |
| Backend | Next.js Route Handlers/Server Actions (Node.js) + Zod |
| Database & Auth | PostgreSQL Supabase; Supabase Auth email/password; cookie SSR |
| Deployment | Vercel Hobby + Supabase free tier + Resend free |
| Model komersial | Tanpa pembayaran |

Dokumen ini mendefinisikan produk, pengguna, scope, dan requirement tingkat tinggi. Jika terjadi konflik antara PRD ini dan SpecModel, SpecModel menang. PRD tidak menambahkan entity, endpoint, role, requirement, atau aturan baru di luar SpecModel.

## 1. Executive Summary & Product Vision

KerjaTim adalah aplikasi web manajemen tugas untuk tim kecil yang memusatkan proyek, tugas, komentar, dan laporan mingguan dalam satu tempat. Pengguna masuk dengan email dan password, lalu memiliki role `owner` atau `member` sesuai proyek. Owner mengelola proyek, anggota, dan kepemilikan; member mengerjakan tugas yang ditugaskan, mengubah status tugasnya sendiri, berdiskusi melalui komentar, dan melihat laporan mingguan. MVP tidak mencakup pembayaran, notifikasi, lampiran file, integrasi pihak ketiga, atau multi-workspace.

Visi produk adalah menjadi tempat kerja harian yang cukup sederhana bagi tim 2–10 orang: setiap pekerjaan terlihat, setiap tugas memiliki penanggung jawab, setiap diskusi melekat pada tugas, dan progres mingguan dapat dibaca tanpa rapat status tambahan.

Prinsip produk yang mengikat:

- **Role bersifat per proyek**, bukan role global. Satu pengguna dapat menjadi owner di satu proyek dan member di proyek lain (`BR-002`).
- **Tepat satu owner per proyek.** Kepemilikan disimpan sebagai `project_members.role = owner` dan transfer dilakukan secara atomik (`BR-001`).
- **Otorisasi ditegakkan di server.** Setiap endpoint proyek, tugas, komentar, dan laporan memeriksa keanggotaan dan role di server (`REQ-015`).
- **Histori tetap utuh.** Mengeluarkan member menghapus keanggotaan, tetapi tugas dan komentar historis tetap ada (`BR-004`).
- **MVP sempit dan dapat diuji.** Pencarian/filter tugas dan ringkasan tugas pribadi berstatus `later`, bukan komitmen MVP (`REQ-016`, `REQ-017`).

Keberhasilan produk diukur dari tim yang benar-benar membentuk proyek, menugaskan pekerjaan, menyelesaikan tugas, berdiskusi pada tugas, dan membaca laporan mingguan. Detail metrik ada di Bagian 10.

## 2. Problem Statement

Tim kecil kesulitan memantau pekerjaan proyek, pembagian tugas, diskusi, dan progres mingguan secara terpusat tanpa menggunakan alat yang terlalu kompleks. Informasi pekerjaan sering tersebar di percakapan, catatan pribadi, dan ingatan anggota tim. Akibatnya penanggung jawab tugas tidak selalu jelas, diskusi tidak melekat pada pekerjaan yang dibahas, dan progres mingguan baru diketahui setelah bertanya satu per satu.

Masalah utama yang diselesaikan KerjaTim:

- **Pekerjaan tidak terpusat.** Proyek, tugas, dan komentar tidak berada dalam satu ruang yang sama.
- **Kepemilikan tugas kabur.** Tidak ada catatan eksplisit tentang siapa penanggung jawab sebuah tugas.
- **Progres mingguan tidak terlihat.** Tidak ada rekap tugas selesai dan belum selesai untuk periode mingguan.
- **Hak akses tidak terkendali.** Anggota di luar proyek berpotensi melihat atau mengubah data yang bukan haknya.
- **Alat yang ada terlalu berat.** Tim kecil membutuhkan alur sederhana, bukan konfigurasi enterprise.

KerjaTim menjawab masalah tersebut dengan alur terbatas: autentikasi email/password, proyek dengan satu owner, anggota berdasarkan email persis, tugas dengan penanggung jawab dan status selesai/belum selesai, komentar kronologis, laporan mingguan, dan kontrol akses berbasis role per proyek.

## 3. Target Users & Personas

Segmen utama adalah tim kecil berukuran sekitar 2–10 orang yang mengelola pekerjaan proyek secara bersama-sama. Produk ditujukan untuk tim yang membutuhkan visibilitas tugas dan progres mingguan, bukan organisasi besar dengan kebutuhan multi-workspace.

### Persona 1 — Owner Proyek / Ketua Tim

- **Konteks:** Membuat proyek, mengatur anggota, dan memantau seluruh aktivitas proyek.
- **Kebutuhan:** Membuat proyek; mengubah nama dan deskripsi; menambahkan member berdasarkan email persis; mengeluarkan member; mengalihkan kepemilikan; membuat, mengubah, dan menghapus tugas; memberi komentar; melihat laporan mingguan.
- **Pain point:** Sulit memastikan anggota yang tepat masuk ke proyek, sulit menjaga kepemilikan proyek tetap jelas, dan sulit melihat progres mingguan tanpa rekap manual.
- **Sinyal sukses:** Proyek memiliki anggota yang relevan, tugas memiliki penanggung jawab, dan owner dapat membaca laporan mingguan.

### Persona 2 — Anggota Tim / Member

- **Konteks:** Anggota proyek yang mengerjakan tugas yang ditugaskan dan berkomunikasi melalui komentar.
- **Kebutuhan:** Melihat proyek yang diikuti; membuat tugas; mengubah status tugas yang ditugaskan kepadanya; memberi komentar; melihat laporan mingguan.
- **Pain point:** Tidak tahu tugas mana yang harus dikerjakan, status tugas tidak akurat, dan diskusi tidak tercatat pada tugas terkait.
- **Sinyal sukses:** Member dapat memperbarui status tugasnya sendiri dan berkomentar pada tugas tanpa mengubah data yang bukan haknya.

Di luar dua persona tersebut, tidak ada role lain dalam SpecModel. Role `owner` dan `member` berlaku per proyek (`BR-002`).

## 4. Roles & Permissions

### Owner

Owner adalah pembuat atau pengelola proyek yang mengatur anggota, tugas, dan kepemilikan proyek. Permission owner:

- membuat proyek;
- mengubah nama dan deskripsi proyek;
- menambahkan member berdasarkan email persis;
- mengeluarkan member proyek;
- mengalihkan kepemilikan proyek;
- membuat, mengubah, dan menghapus tugas;
- mengubah semua field tugas;
- memberi komentar pada tugas;
- melihat laporan mingguan proyek.

### Member

Member adalah anggota proyek yang mengerjakan tugas yang ditugaskan dan berkomunikasi melalui komentar. Permission member:

- melihat proyek yang diikuti;
- membuat tugas;
- mengubah status tugas yang ditugaskan kepadanya;
- memberi komentar pada tugas;
- melihat laporan mingguan proyek.

### Aturan akses kunci

- Setiap proyek memiliki tepat satu owner (`BR-001`). Transfer kepemilikan harus mengubah owner lama menjadi member dan owner baru menjadi owner dalam satu transaksi; kondisi dua owner ditolak.
- Role ditentukan per proyek (`BR-002`). Pengecekan otorisasi wajib menyertakan `project_id` dan `user_id` dari sesi, bukan role global.
- Member hanya boleh mengubah `is_completed` pada tugas dengan `assignee_id` miliknya. Mengubah konten, mengganti assignee, atau menghapus tugas hanya boleh dilakukan owner (`BR-003`, `REQ-011`, `REQ-012`).
- Mengeluarkan member menghapus baris `project_members`, tetapi tugas dan komentar tetap ada; nama penulis tetap diambil dari `profiles` (`BR-004`, `REQ-008`).
- Owner tidak dapat mengeluarkan dirinya sendiri; kepemilikan harus dialihkan terlebih dahulu (`REQ-008`).
- Non-anggota tidak dapat melihat tugas dan komentar proyek. Aksi khusus owner yang dilakukan member ditolak dengan `403`; pengguna tanpa sesi mendapat `401` (`REQ-015`).

Catatan: “membuat proyek” adalah aksi pengguna login yang menghasilkan role owner pada proyek baru (`REQ-004`). Karena role bersifat per proyek (`BR-002`), seorang member di proyek A dapat membuat proyek B dan menjadi owner di proyek B.

## 5. Scope

### 5.1 In Scope — MVP

| Kapabilitas | Requirement | Endpoint |
|---|---|---|
| Registrasi akun dengan email, password, dan `display_name` | `REQ-001` | `EP-001` |
| Login dan logout dengan sesi cookie di server | `REQ-002` | `EP-002`, `EP-003` |
| Permintaan tautan reset password melalui email | `REQ-003` | `EP-004` |
| Daftar proyek yang diikuti dan detail proyek | `REQ-005` | `EP-005`, `EP-007` |
| Membuat proyek; pembuat otomatis menjadi owner | `REQ-004` | `EP-006` |
| Mengubah nama dan deskripsi proyek | `REQ-006` | `EP-008` |
| Menambahkan member berdasarkan email persis | `REQ-007` | `EP-009` |
| Mengeluarkan member tanpa menghapus data historis | `REQ-008` | `EP-010` |
| Mengalihkan kepemilikan proyek | `REQ-009` | `EP-008` |
| Membuat tugas dengan judul, deskripsi, dan penanggung jawab | `REQ-010` | `EP-011` |
| Mengubah tugas sesuai batas owner/member | `REQ-011` | `EP-012` |
| Menghapus tugas beserta komentar terkait | `REQ-012` | `EP-013` |
| Menambahkan komentar kronologis pada tugas | `REQ-013` | `EP-014` |
| Melihat laporan mingguan proyek | `REQ-014` | `EP-015` |
| Kontrol akses berbasis role per proyek di server | `REQ-015` | `EP-005`–`EP-015` |

### 5.2 Later — Bukan MVP

| Kapabilitas | Requirement | Catatan |
|---|---|---|
| Pencarian dan filter tugas | `REQ-016` | Berstatus `later`. Kontrak `EP-007` mencantumkan query `q`, `status`, dan `assignee_id`, tetapi fitur ini tidak dihitung sebagai komitmen MVP. |
| Ringkasan tugas pribadi lintas proyek | `REQ-017` | Berstatus `later`. SpecModel belum memiliki endpoint khusus untuk requirement ini; endpoint harus ditambahkan melalui revisi SpecModel sebelum implementasi. |

### 5.3 Out of Scope

- Pembayaran, langganan, atau billing.
- Notifikasi, baik email maupun in-app.
- Lampiran file dan penyimpanan file.
- Integrasi pihak ketiga.
- Multi-workspace.
- Undangan melalui email; owner hanya menambahkan pengguna yang sudah memiliki akun.
- Pencarian sebagian email atau daftar pengguna; penambahan member hanya melalui email persis (`BR-006`).
- Tenggat waktu dan prioritas tugas.
- Role selain `owner` dan `member`.
- Klien native/non-web. Arsitektur melayani web app dengan sesi berbasis cookie di server.

Pencarian/filter dan ringkasan tugas pribadi tidak termasuk out of scope permanen; keduanya berada pada prioritas `later` sesuai SpecModel.

## 6. Key Features

| Fitur | Prioritas | Requirement | Endpoint |
|---|---|---|---|
| Autentikasi email dan password | MVP | `REQ-001`, `REQ-002`, `REQ-003` | `EP-001`–`EP-004` |
| Pembuatan dan pengelolaan proyek | MVP | `REQ-004`, `REQ-005`, `REQ-006` | `EP-005`–`EP-008` |
| Pengelolaan anggota proyek | MVP | `REQ-007`, `REQ-008`, `REQ-009` | `EP-009`, `EP-010`, `EP-008` |
| Manajemen tugas | MVP | `REQ-010`, `REQ-011`, `REQ-012` | `EP-011`–`EP-013` |
| Daftar tugas per proyek | MVP | `REQ-005`, `REQ-010` | `EP-007` |
| Komentar pada tugas | MVP | `REQ-013` | `EP-014` |
| Laporan mingguan proyek | MVP | `REQ-014` | `EP-015` |
| Kontrol akses berbasis peran | MVP | `REQ-015` | `EP-005`–`EP-015` |
| Pencarian dan filter tugas | Later | `REQ-016` | `EP-007` |
| Ringkasan tugas pribadi | Later | `REQ-017` | Tidak ada endpoint khusus di SpecModel |

Entitas kanonik yang terlibat:

| Entity | Peran dalam produk |
|---|---|
| `profiles` | Profil pengguna; menyimpan email untuk pencocokan anggota dan `display_name` untuk komentar. |
| `projects` | Proyek yang menaungi tugas, komentar, anggota, dan laporan mingguan. |
| `project_members` | Relasi pengguna dengan proyek beserta role `owner` atau `member`. |
| `tasks` | Tugas dalam proyek dengan judul, deskripsi, penanggung jawab, dan status selesai/belum selesai. |
| `comments` | Komentar teks kronologis pada tugas beserta penulisnya. |

Detail field, index, dan constraint tidak diulang di PRD ini; PRD hanya merujuk nama entity sesuai SpecModel.

## 7. User Stories

| ID | User story | Requirement | Prioritas |
|---|---|---|---|
| US-01 | Sebagai pengguna baru, saya ingin mendaftar dengan email, password, dan `display_name` agar dapat mulai menggunakan KerjaTim. | `REQ-001` | MVP |
| US-02 | Sebagai pengguna, saya ingin login dan logout dengan email/password agar sesi saya aman dan dapat diakhiri. | `REQ-002` | MVP |
| US-03 | Sebagai pengguna yang lupa password, saya ingin meminta tautan reset melalui email agar dapat menetapkan password baru. | `REQ-003` | MVP |
| US-04 | Sebagai pengguna login, saya ingin membuat proyek dengan nama dan deskripsi agar pekerjaan tim memiliki ruang terpusat; saya otomatis menjadi owner. | `REQ-004` | MVP |
| US-05 | Sebagai anggota, saya ingin melihat daftar proyek yang saya ikuti dan detailnya agar saya tahu konteks pekerjaan. | `REQ-005` | MVP |
| US-06 | Sebagai owner, saya ingin mengubah nama dan deskripsi proyek agar informasi proyek tetap akurat. | `REQ-006` | MVP |
| US-07 | Sebagai owner, saya ingin menambahkan member berdasarkan email persis agar hanya orang yang tepat yang bergabung. | `REQ-007` | MVP |
| US-08 | Sebagai owner, saya ingin mengeluarkan member agar akses proyek terkendali tanpa menghapus histori. | `REQ-008` | MVP |
| US-09 | Sebagai owner, saya ingin mengalihkan kepemilikan kepada member aktif agar proyek tetap memiliki tepat satu owner. | `REQ-009` | MVP |
| US-10 | Sebagai anggota proyek, saya ingin membuat tugas dengan judul, deskripsi, dan penanggung jawab agar pekerjaan jelas. | `REQ-010` | MVP |
| US-11 | Sebagai owner, saya ingin mengubah semua field tugas; sebagai member, saya ingin mengubah status tugas saya sendiri agar progres akurat. | `REQ-011` | MVP |
| US-12 | Sebagai owner, saya ingin menghapus tugas beserta komentarnya agar daftar tugas tetap relevan. | `REQ-012` | MVP |
| US-13 | Sebagai anggota proyek, saya ingin berkomentar secara kronologis pada tugas agar diskusi tercatat pada pekerjaan terkait. | `REQ-013` | MVP |
| US-14 | Sebagai anggota proyek, saya ingin melihat laporan mingguan Senin–Minggu agar saya tahu tugas selesai dan belum selesai. | `REQ-014` | MVP |
| US-15 | Sebagai anggota proyek, saya ingin sistem menolak akses non-anggota dan aksi member yang khusus owner agar data proyek aman. | `REQ-015` | MVP |
| US-16 | Sebagai anggota proyek, saya ingin mencari dan memfilter tugas agar daftar tugas lebih mudah ditelusuri. | `REQ-016` | Later |
| US-17 | Sebagai pengguna, saya ingin melihat ringkasan tugas yang ditugaskan kepada saya lintas proyek agar saya tahu beban kerja saya. | `REQ-017` | Later |

Acceptance criteria rinci untuk setiap user story mengikuti requirement terkait di Bagian 8.

## 8. Functional Requirements

Semua requirement di bawah menggunakan ID kanonik SpecModel. Acceptance criteria adalah dasar pengujian dan tidak boleh dilonggarkan tanpa revisi SpecModel.

### REQ-001 — Pendaftaran akun

**Prioritas:** MVP · **Endpoint:** `EP-001`

- Email wajib berformat valid dan unik; password minimal 8 karakter.
- Signup sukses membuat akun Supabase Auth dan profil aplikasi dengan email serta `display_name`.
- Email duplikat menghasilkan `409` dan tidak membuat akun baru.

### REQ-002 — Login dan logout

**Prioritas:** MVP · **Endpoint:** `EP-002`, `EP-003`

- Kredensial benar membuat sesi cookie dan mengarahkan pengguna ke halaman proyek.
- Kredensial salah menghasilkan `401` tanpa membuat sesi.
- Logout menghapus cookie sesi dan halaman terproteksi mengalihkan pengguna ke login.

### REQ-003 — Reset password

**Prioritas:** MVP · **Endpoint:** `EP-004`

- Permintaan reset dengan email terdaftar memicu pengiriman tautan melalui email.
- Tautan valid memungkinkan penetapan password baru dan password lama tidak berlaku.
- Email tidak terdaftar tetap menghasilkan pesan netral agar tidak membocorkan status akun.

### REQ-004 — Membuat proyek

**Prioritas:** MVP · **Endpoint:** `EP-006`

- Proyek dapat dibuat dengan `name` wajib dan `description` opsional.
- Pembuat tercatat di `project_members` dengan role `owner`.
- Proyek baru muncul pada daftar proyek milik pembuat.

### REQ-005 — Melihat daftar dan detail proyek

**Prioritas:** MVP · **Endpoint:** `EP-005`, `EP-007`

- Daftar proyek hanya berisi proyek tempat pengguna menjadi anggota.
- Detail proyek hanya dapat diakses anggota; non-anggota mendapat `403` atau `404`.
- Detail proyek menampilkan anggota, tugas, dan komentar terkait.

### REQ-006 — Mengubah nama dan deskripsi proyek

**Prioritas:** MVP · **Endpoint:** `EP-008`

- Owner dapat memperbarui `name` dan `description` proyek.
- Member atau non-anggota yang mencoba mengubah proyek mendapat `403`.
- `name` kosong ditolak dengan `400`.

### REQ-007 — Menambahkan member berdasarkan email persis

**Prioritas:** MVP · **Endpoint:** `EP-009`

- Owner memasukkan email lengkap dan sistem hanya mencocokkan persis tanpa menampilkan daftar pengguna.
- Jika akun ditemukan dan belum menjadi anggota, baris `project_members` dengan role `member` dibuat.
- Email tidak ditemukan menghasilkan `404`; pengguna yang sudah menjadi anggota menghasilkan `409`.

### REQ-008 — Mengeluarkan member

**Prioritas:** MVP · **Endpoint:** `EP-010`

- Owner dapat menghapus baris keanggotaan member.
- Mantan member kehilangan akses ke proyek, tugas, dan komentar.
- Tugas dan komentar tetap ada; nama penulis komentar tetap tampil.
- Owner tidak dapat mengeluarkan dirinya sendiri; kepemilikan harus dialihkan terlebih dahulu.

### REQ-009 — Mengalihkan kepemilikan proyek

**Prioritas:** MVP · **Endpoint:** `EP-008`

- Owner memilih `new_owner_id` dari anggota proyek.
- Setelah transaksi, tepat satu owner tercatat; owner lama menjadi member dan owner baru menjadi owner.
- `new_owner_id` yang bukan anggota ditolak; member yang mencoba transfer mendapat `403`.

### REQ-010 — Membuat tugas

**Prioritas:** MVP · **Endpoint:** `EP-011`

- Anggota proyek dapat membuat tugas dengan `title`, `description`, dan `assignee_id`.
- `assignee_id` harus anggota proyek; jika tidak, permintaan ditolak `400`.
- Tugas baru memiliki `is_completed = false` dan muncul di detail proyek.

### REQ-011 — Mengubah tugas

**Prioritas:** MVP · **Endpoint:** `EP-012`

- Owner dapat mengubah `title`, `description`, `assignee_id`, dan `is_completed`.
- Member hanya dapat mengirim `is_completed` untuk tugas dengan `assignee_id` sama dengan user login; perubahan lain mendapat `403`.
- Perubahan `is_completed` memperbarui `updated_at` tugas.

### REQ-012 — Menghapus tugas

**Prioritas:** MVP · **Endpoint:** `EP-013`

- Owner dapat menghapus tugas dari proyeknya.
- Member atau non-anggota yang mencoba menghapus tugas mendapat `403`.
- Tugas dan komentar terkait tidak lagi ditampilkan setelah penghapusan.

### REQ-013 — Menambahkan komentar pada tugas

**Prioritas:** MVP · **Endpoint:** `EP-014`

- Anggota proyek dapat menambahkan komentar `body` non-kosong pada tugas.
- Komentar menyimpan `author_id` dan `created_at` serta ditampilkan kronologis dengan `display_name`.
- Non-anggota yang mencoba berkomentar mendapat `403`.

### REQ-014 — Melihat laporan mingguan proyek

**Prioritas:** MVP · **Endpoint:** `EP-015`

- Anggota dapat memilih `week_start` hari Senin dan melihat `completed_tasks` serta `incomplete_tasks`.
- Laporan memakai `is_completed` terkini untuk tugas yang `created_at` atau `updated_at` berada dalam periode Senin–Minggu.
- Tugas di luar periode tidak muncul; non-anggota mendapat `403`.

### REQ-015 — Kontrol akses berbasis role per proyek

**Prioritas:** MVP · **Endpoint:** `EP-005`–`EP-015`

- Setiap endpoint proyek, tugas, komentar, dan laporan memeriksa keanggotaan pengguna di server.
- Aksi khusus owner yang dilakukan member ditolak dengan `403`.
- Pengguna tanpa sesi yang mengakses endpoint terproteksi mendapat `401`.

### REQ-016 — Pencarian dan filter tugas

**Prioritas:** Later · **Endpoint:** `EP-007`

- Detail proyek mendukung query `q` untuk judul, `status` untuk `is_completed`, dan `assignee_id`.
- Filter tidak pernah menampilkan tugas dari proyek yang tidak diikuti pengguna.
- Kombinasi filter hanya mengembalikan tugas yang memenuhi semua kriteria.

### REQ-017 — Ringkasan tugas pribadi lintas proyek

**Prioritas:** Later · **Endpoint:** Tidak ada endpoint khusus di SpecModel

- Ringkasan menampilkan tugas dengan `assignee_id` sama dengan pengguna login.
- Hanya tugas dari proyek tempat pengguna masih menjadi anggota yang ditampilkan.
- Tugas selesai dan belum selesai dapat dibedakan.

Requirement ini tidak termasuk MVP. Sebelum implementasi, endpoint perlu ditambahkan ke SpecModel; PRD tidak menetapkan endpoint baru.

### 8.18 Business Rules yang Wajib Dipatuhi

| ID | Aturan | Konsekuensi | Requirement terkait |
|---|---|---|---|
| `BR-001` | Setiap proyek memiliki tepat satu owner yang disimpan sebagai `project_members.role = owner`. | Transfer kepemilikan harus mengubah owner lama menjadi member dan owner baru menjadi owner dalam satu transaksi; kondisi dua owner ditolak. | `REQ-004`, `REQ-009`, `REQ-015` |
| `BR-002` | Role ditentukan per proyek, sehingga satu pengguna dapat menjadi owner di satu proyek dan member di proyek lain. | Setiap pengecekan otorisasi wajib menyertakan `project_id` dan `user_id` dari sesi, bukan role global. | `REQ-015` |
| `BR-003` | Member hanya boleh mengubah `is_completed` pada tugas dengan `assignee_id` miliknya; mengubah konten, assignee, atau menghapus tugas hanya boleh dilakukan owner. | Permintaan member di luar batas tersebut ditolak `403`, termasuk mengubah status tugas milik anggota lain. | `REQ-011`, `REQ-012` |
| `BR-004` | Mengeluarkan member menghapus baris `project_members`, tetapi tugas dan komentar tetap ada; nama penulis diambil dari `profiles`. | Mantan member kehilangan akses, namun data historis dan nama penulis tetap tampil; owner perlu menetapkan ulang penanggung jawab tugas yang masih menunjuk mantan member. | `REQ-008` |
| `BR-005` | Laporan mingguan memakai status tugas terkini dan memasukkan tugas yang `created_at` atau `updated_at` berada dalam periode Senin–Minggu pada zona waktu yang disepakati. | Tugas yang dibuat dan diperbarui pada minggu yang sama dihitung sekali; daftar selesai dan belum selesai mengikuti `is_completed` terbaru. | `REQ-014` |
| `BR-006` | Penambahan member hanya melalui email persis dan sistem tidak menampilkan daftar pengguna. | Email yang tidak cocok menghasilkan `404`; pencarian sebagian atau pemilihan dari daftar pengguna tidak didukung pada MVP. | `REQ-007` |

## 9. Non-Functional Requirements

| ID | Kategori | Requirement | Verifikasi |
|---|---|---|---|
| NFR-01 | Keamanan otorisasi | Otorisasi owner/member diperiksa di server pada setiap endpoint; Row Level Security Supabase digunakan sebagai lapisan pertahanan tambahan. | Uji matriks owner/member/non-member untuk `EP-005`–`EP-015`; non-anggota mendapat `403`/`404`, tanpa sesi mendapat `401`. |
| NFR-02 | Keamanan sesi | Sesi menggunakan cookie `HttpOnly`, `Secure`, dan `SameSite=Lax`; token sensitif tidak disimpan di `localStorage`. Reset password memakai Supabase Auth dan aplikasi tidak menyimpan token reset sendiri. | Periksa atribut `Set-Cookie` dan storage browser; logout menghapus cookie; tautan reset berasal dari email. |
| NFR-03 | Validasi dan konsistensi error | Semua input divalidasi dengan Zod di server; respons error memakai status `400`, `401`, `403`, `404`, atau `409` secara konsisten. | Uji kontrak setiap endpoint; input tidak valid tidak menghasilkan `500`. |
| NFR-04 | UI dan aksesibilitas | Web app responsif untuk desktop dan mobile dengan aksesibilitas dasar: label form, kontras memadai, dan navigasi keyboard. | Checklist manual desktop/mobile dan pengujian navigasi keyboard. |
| NFR-05 | Operasional dan deployment | Aplikasi dapat dideploy pada Next.js App Router/Vercel Hobby, PostgreSQL Supabase free tier, dan Resend free untuk email reset; tidak ada storage atau payment. | Smoke test signup, login, reset, proyek, tugas, komentar, dan laporan di environment deploy. |

SpecModel tidak menetapkan target latency atau throughput kuantitatif. PRD tidak menciptakan SLA baru; kebutuhan performa dan batas free tier dicatat di Open Questions.

## 10. Success Metrics

Target berikut adalah target validasi produk, bukan acceptance criteria fungsional. Pengukuran menggunakan data aplikasi dan log server; tidak memerlukan fitur analytics baru.

| Metrik | Definisi | Target awal | Sumber |
|---|---|---|---|
| Signup completion | Persentase percobaan signup yang menghasilkan profil. | ≥ 90% | `EP-001`, `profiles` |
| Activation 7 hari | Persentase profil baru yang membuat minimal satu proyek dalam 7 hari. | ≥ 70% | `projects`, `project_members` |
| Team formation | Persentase proyek dengan minimal dua anggota dalam 14 hari. | ≥ 60% | `project_members` |
| Task completion | Persentase tugas kohort 30 hari dengan `is_completed = true` pada hari ke-30. | ≥ 50% | `tasks` |
| Collaboration | Persentase proyek aktif dengan minimal satu komentar dalam 7 hari. | ≥ 40% | `comments` |
| Weekly report usage | Persentase anggota aktif yang memanggil `EP-015` minimal sekali per minggu. | ≥ 30% | Log akses `EP-015` |
| Auth reliability | Persentase respons non-`5xx` untuk `EP-002` dengan kredensial valid. | ≥ 99% | Log `EP-002` |
| Authorization guardrail | Jumlah akses lintas proyek yang lolos tanpa hak. | 0 insiden | Uji otorisasi dan audit log |

Target ditinjau setelah 4 minggu pilot. Jika target tidak tercapai, tim harus mengevaluasi hambatan adopsi tanpa menambah fitur di luar SpecModel.

## 11. Risks & Mitigations

| Risiko | Dampak | Mitigasi | Terkait |
|---|---|---|---|
| Definisi laporan mingguan belum final, termasuk periode, metrik, dan zona waktu. | Ekspektasi owner dan member berbeda terhadap angka laporan. | Tetapkan periode Senin–Minggu dan tampilkan `week_start`/`week_end`; gunakan `BR-005`; uji batas awal/akhir minggu; konfirmasi zona waktu di Open Questions. | `REQ-014`, `BR-005` |
| Kesalahan otorisasi membuat member melihat atau mengubah data proyek yang bukan haknya. | Kebocoran data dan hilangnya kepercayaan. | Periksa keanggotaan dan role di server pada setiap endpoint; aktifkan RLS; uji matriks owner/member/non-member; kembalikan `401`/`403`; jangan menyimpan role di client. | `REQ-015` |
| Pemulihan akun belum lengkap: verifikasi email belum diputuskan dan email reset bergantung pada deliverability. | Pengguna berisiko terkunci atau tidak menerima tautan reset. | Gunakan `REQ-003`/`EP-004`; kirim melalui Resend; beri pesan netral; uji tautan reset; pantau bounce; konfirmasi verifikasi email di Open Questions. | `REQ-003` |
| Scope creep ke notifikasi, lampiran file, atau integrasi pihak ketiga. | MVP terlambat dan kompleksitas meningkat. | Pertahankan daftar out of scope; status `later` untuk `REQ-016`/`REQ-017`; perubahan harus melalui revisi SpecModel; jangan menambah endpoint tanpa persetujuan. | Scope |
| Adopsi terhambat karena anggota tidak menerima notifikasi tugas baru. | Tugas lambat dikerjakan dan laporan mingguan tidak akurat. | Andalkan daftar tugas proyek dan laporan mingguan; biasakan ritual tim membuka proyek; notifikasi tetap out of scope. | `REQ-005`, `REQ-014` |
| Batas free tier dan lock-in layanan. | Layanan melambat atau memerlukan migrasi mendadak. | Pantau kuota Vercel/Supabase/Resend; gunakan skema PostgreSQL standar; pertahankan otorisasi di server; siapkan rencana upgrade. | NFR-05 |
| Tugas tetap menunjuk mantan member setelah member dikeluarkan. | Penanggung jawab tidak lagi memiliki akses dan status tugas membingungkan. | Terapkan `BR-004`; owner harus menetapkan ulang penanggung jawab; uji skenario removal; catat keputusan di Open Questions. | `REQ-008`, `BR-004` |
| Email persis tidak cocok karena typo atau perbedaan kapitalisasi. | Owner gagal menambahkan member yang valid. | Terapkan `BR-006`; minta email lengkap; kembalikan `404` yang jelas; konfirmasi sensitivitas kapitalisasi di Open Questions. | `REQ-007`, `BR-006` |
| Transfer kepemilikan tidak atomik sehingga muncul dua owner. | Melanggar `BR-001` dan membingungkan otorisasi. | Jalankan transfer dalam satu transaksi; ubah owner lama menjadi member dan owner baru menjadi owner; uji kondisi dua owner ditolak. | `REQ-009`, `BR-001` |

## 12. Assumptions

1. Role `owner` dan `member` berlaku per proyek; satu pengguna dapat menjadi owner di satu proyek dan member di proyek lain.
2. Owner menambahkan member yang sudah memiliki akun; tidak ada undangan melalui email pada MVP.
3. Tugas minimal memiliki judul, deskripsi, penanggung jawab, dan status selesai/belum selesai; tenggat waktu dan prioritas tidak termasuk MVP.
4. Laporan mingguan menggunakan periode Senin–Minggu dan zona waktu yang sama untuk seluruh tim; detail zona waktu perlu dikonfirmasi.
5. MVP tidak mencakup pembayaran, notifikasi, lampiran file, integrasi pihak ketiga, dan multi-workspace.
6. Klien yang dilayani adalah web app dengan sesi berbasis cookie di server; tidak ada klien native pada MVP.
7. Setiap proyek memiliki tepat satu owner; transfer kepemilikan dilakukan secara atomik.
8. Penambahan member hanya melalui pencocokan email persis; tidak ada daftar pengguna atau pencarian sebagian.
9. Reset password menggunakan Supabase Auth dan Resend; aplikasi tidak menyimpan token reset sendiri.
10. Batas free tier Supabase, Vercel, dan Resend memadai untuk skala tim kecil pada MVP.
11. Pencarian/filter tugas dan ringkasan tugas pribadi adalah fitur `later`, bukan bagian dari komitmen MVP.

## 13. Open Questions

1. Zona waktu default laporan mingguan belum ditetapkan; usulan Asia/Jakarta perlu dikonfirmasi. Dampaknya: batas `created_at`/`updated_at` dan tampilan `week_start`/`week_end`.
2. Apakah verifikasi email Supabase diaktifkan saat pendaftaran, atau akun langsung aktif setelah signup? Dampaknya: alur onboarding dan status akun.
3. Apakah komentar boleh diedit atau dihapus, atau bersifat permanen pada MVP? Dampaknya: kebutuhan endpoint dan audit histori.
4. Bagaimana penanganan tugas yang masih ditugaskan ke mantan member setelah ia dikeluarkan: tetap terbuka sampai owner mengganti assignee, atau otomatis dilepas? Dampaknya: konsistensi `assignee_id` dan laporan mingguan.
5. Apakah pencocokan email persis pada `EP-009`/`REQ-007` bersifat case-sensitive atau case-insensitive? SpecModel belum menetapkan normalisasi email.
6. `REQ-017` belum memiliki endpoint di SpecModel. Endpoint apa yang akan ditambahkan sebelum implementasi ringkasan tugas pribadi?
7. Apakah MVP memerlukan target performa/SLA kuantitatif, mengingat keterbatasan free tier Supabase dan Vercel? SpecModel belum menetapkan angka latency atau throughput.