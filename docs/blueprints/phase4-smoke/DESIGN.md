# DESIGN.md — KerjaTim

| Field | Nilai |
|---|---|
| Nama dokumen | DESIGN.md |
| Produk | KerjaTim |
| Versi | 1.0 |
| Status | Siap untuk review |
| Sumber kebenaran | SpecModel proyek KerjaTim |
| Cakupan | Prinsip UX, information architecture, layar, komponen, interaction patterns, accessibility, responsive behavior |
| Platform | Web app; Next.js App Router + TypeScript + Tailwind/shadcn |
| Role | `owner` dan `member` per proyek |

Dokumen ini menerjemahkan SpecModel menjadi keputusan desain UX. SpecModel adalah satu-satunya sumber kebenaran. Dokumen ini tidak menambahkan entity, endpoint, requirement, role, atau aturan bisnis baru. Jika terjadi konflik, SpecModel menang. Path UI yang disebut di dokumen ini adalah rute halaman, bukan kontrak API; kontrak data tetap mengacu pada `EP-001`–`EP-015`.

## 1. Design Principles

Prinsip berikut adalah konsekuensi desain dari SpecModel, bukan requirement baru. Setiap prinsip memiliki implikasi yang dapat diuji.

1. **Server adalah sumber otorisasi; UI hanya mencerminkan hak akses.**
   UI menyembunyikan atau menonaktifkan aksi yang tidak boleh dilakukan berdasarkan role pengguna pada proyek (`BR-002`, `REQ-015`). Namun setiap mutasi tetap dikirim ke server dan dapat ditolak `403`. UI tidak boleh menganggap penyembunyian tombol sebagai kontrol keamanan.
   Uji: member tidak melihat tombol hapus tugas; jika request dipaksa, server menolak `403` dan UI menampilkan pesan akses ditolak tanpa mengubah state lokal secara permanen.

2. **Satu proyek adalah satu ruang kerja.**
   Tugas, komentar, anggota, dan laporan mingguan selalu berada dalam konteks proyek (`REQ-005`, `EP-007`). Tidak ada inbox tugas global pada MVP; ringkasan tugas pribadi adalah fitur `later` (`REQ-017`) dan tidak masuk navigasi MVP.
   Uji: semua aksi tugas dan komentar dapat ditelusuri kembali ke proyek asal.

3. **Status harus terbaca tanpa mengandalkan warna.**
   `is_completed` ditampilkan sebagai teks “Selesai” atau “Belum selesai” disertai ikon atau bentuk pembeda. Warna hanya aksesori.
   Uji: tampilan tetap dapat dipahami pada mode grayscale atau bagi pengguna dengan buta warna.

4. **Aksi destruktif dan perubahan keanggotaan harus eksplisit.**
   Menghapus tugas, mengeluarkan member, dan mengalihkan kepemilikan memerlukan dialog konfirmasi yang menjelaskan konsekuensinya (`REQ-008`, `REQ-009`, `REQ-012`, `BR-001`, `BR-004`).
   Uji: tidak ada penghapusan atau transfer kepemilikan yang terjadi hanya karena satu klik tanpa konfirmasi.

5. **Histori tetap terlihat saat keanggotaan berubah.**
   Mengeluarkan member menghapus baris `project_members`, tetapi tugas dan komentar tetap ada; nama penulis diambil dari `profiles.display_name` (`BR-004`).
   Uji: setelah member dikeluarkan, komentar lama tetap menampilkan nama penulis dan tidak berubah menjadi “pengguna tidak dikenal”.

6. **Pencocokan tepat, pesan sesuai konteks.**
   Penambahan member hanya melalui email persis tanpa menampilkan daftar pengguna (`BR-006`, `REQ-007`). Permintaan reset password selalu memberi pesan netral agar tidak membocorkan status akun (`REQ-003`).
   Uji: form tambah member tidak memiliki autocomplete pengguna; email tidak ditemukan menghasilkan `404`; reset password untuk email tidak terdaftar tetap menampilkan pesan netral.

7. **MVP rendah ceremony.**
   Form hanya memuat field yang ada di SpecModel: proyek (`name`, `description`), tugas (`title`, `description`, `assignee_id`, `is_completed`), komentar (`body`), dan anggota (`email`). Tidak ada due date, priority, lampiran, notifikasi, pembayaran, atau multi-workspace.
   Uji: tidak ada field atau kontrol di UI yang tidak dapat dipetakan ke entity atau endpoint kanonik.

8. **Aksesibilitas dan responsivitas adalah baseline.**
   Label form, kontras memadai, navigasi keyboard, dan tata letak desktop/mobile termasuk dalam nonFunctional SpecModel. Keduanya diuji sejak komponen pertama, bukan sebagai pekerjaan akhir.

## 2. Information Architecture

### 2.1 Lapisan informasi

| Lapisan | Layar | Aktor | Data utama | Endpoint |
|---|---|---|---|---|
| Publik | Signup | Pengguna | `email`, `password`, `display_name` | `EP-001` |
| Publik | Login | Pengguna | `email`, `password` | `EP-002` |
| Publik | Lupa password | Pengguna | `email` | `EP-004` |
| Publik | Atur password baru | Pengguna dengan tautan reset | `password` baru | Alur Supabase Auth; tidak menambah endpoint aplikasi |
| Terautentikasi | Daftar proyek | Pengguna login | `name`, `description`, `role`, `member_count` | `EP-005`, `EP-006` |
| Proyek | Detail proyek — tab Tugas | Anggota proyek | `projects`, `tasks`, `comments` | `EP-007`, `EP-011`–`EP-014` |
| Proyek | Detail proyek — tab Laporan | Anggota proyek | `week_start`, `week_end`, `completed_tasks`, `incomplete_tasks` | `EP-015` |
| Proyek | Detail proyek — tab Anggota | Anggota proyek; kontrol owner | `project_members`, `profiles.display_name`, `role` | `EP-007`, `EP-009`, `EP-010`, `EP-008` |
| Proyek | Panel detail tugas | Anggota proyek | `tasks`, `comments`, `profiles.display_name` | Data dari `EP-007`; mutasi `EP-012`–`EP-014` |

Panel detail tugas bukan layar dengan endpoint sendiri. Datanya berasal dari `EP-007`; komentar dan mutasi tugas memakai endpoint yang sudah ada. Tidak ada endpoint `GET` tugas terpisah dalam SpecModel.

### 2.2 Navigasi global

- **Header aplikasi** menampilkan nama produk, tautan “Proyek” menuju daftar proyek, dan menu pengguna berisi `display_name` serta aksi “Keluar” (`EP-003`).
- **Daftar proyek** adalah halaman awal setelah login.
- **Detail proyek** memiliki tiga tab: **Tugas**, **Laporan**, **Anggota**. Tab Tugas adalah tampilan default.
- **Owner** melihat kontrol tambahan: tombol “Edit proyek” di header proyek, form tambah member, aksi keluarkan member, dan transfer kepemilikan di tab Anggota.
- **Member** melihat daftar anggota dan laporan, dapat membuat tugas dan komentar, tetapi tidak melihat kontrol pengelolaan proyek atau anggota.
- Tidak ada navigasi untuk notifikasi, lampiran file, pembayaran, pencarian global, atau ringkasan tugas pribadi. Pencarian/filter tugas (`REQ-016`) dan ringkasan tugas pribadi (`REQ-017`) berstatus `later` dan tidak dirancang sebagai kontrol MVP.

### 2.3 Peta rute UI

Rute berikut adalah rute halaman yang diusulkan untuk implementasi Next.js, bukan endpoint API baru.

| Rute UI | Layar | Endpoint/data | Akses |
|---|---|---|---|
| `/signup` | Signup | `EP-001` | Publik |
| `/login` | Login | `EP-002` | Publik |
| `/forgot-password` | Lupa password | `EP-004` | Publik |
| `/reset-password` | Atur password baru | Supabase Auth | Publik melalui tautan email |
| `/projects` | Daftar proyek | `EP-005`, `EP-006` | Login |
| `/projects/[project_id]?tab=tasks` | Detail proyek — Tugas | `EP-007`, `EP-011`–`EP-014` | Anggota proyek |
| `/projects/[project_id]?tab=reports&week_start=YYYY-MM-DD` | Detail proyek — Laporan | `EP-015` | Anggota proyek |
| `/projects/[project_id]?tab=members` | Detail proyek — Anggota | `EP-007`, `EP-009`, `EP-010`, `EP-008` | Anggota proyek; kontrol owner |

### 2.4 Visibilitas berdasarkan role

| Area | Owner | Member |
|---|---|---|
| Daftar proyek yang diikuti | Ya | Ya |
| Detail proyek, daftar tugas, komentar | Ya | Ya |
| Membuat tugas | Ya | Ya |
| Mengubah seluruh field tugas | Ya | Tidak |
| Mengubah `is_completed` tugas milik sendiri | Ya, sebagai bagian dari edit | Ya, hanya untuk `assignee_id` miliknya |
| Menghapus tugas | Ya | Tidak |
| Menambah/mengeluarkan member | Ya | Tidak |
| Mengalihkan kepemilikan | Ya | Tidak |
| Mengubah nama/deskripsi proyek | Ya | Tidak |
| Melihat laporan mingguan | Ya | Ya |
| Menambah komentar | Ya | Ya |

## 3. Key Screens

### 3.1 Signup

**Tujuan:** membuat akun dengan email, password, dan `display_name` (`REQ-001`, `EP-001`).  
**Aktor:** pengguna publik.  
**Layout:** kartu terpusat berisi field `email`, `password`, `display_name`, tombol utama “Daftar”, dan tautan ke Login.

Perilaku:

- Validasi awal: email berformat valid; password minimal 8 karakter; `display_name` wajib.
- Submit mengirim `POST /api/auth/signup` (`EP-001`). Tombol dinonaktifkan selama request.
- `201`: tampilkan pesan sukses dan arahkan ke Login. Alur SpecModel menyatakan pengguna kemudian login; aplikasi tidak melakukan auto-login.
- `409`: tampilkan error inline “Email sudah terdaftar” pada field email.
- `400`: tampilkan error per field dan fokuskan field pertama yang tidak valid.
- Status verifikasi email Supabase belum diputuskan; pesan setelah signup mengikuti keputusan pada Open Questions.

### 3.2 Login dan Logout

**Tujuan:** membuat sesi cookie melalui email/password (`REQ-002`, `EP-002`) dan mengakhiri sesi (`EP-003`).  
**Aktor:** pengguna publik dan pengguna login.

Perilaku:

- Field `email` dan `password`; tautan “Lupa password?” dan “Daftar”.
- `200`: arahkan ke `/projects`.
- `401`: tampilkan pesan generik “Email atau password salah”; jangan membedakan email tidak terdaftar dan password salah.
- “Keluar” di menu pengguna mengirim `POST /api/auth/logout`; `204` menghapus cookie dan mengarahkan ke Login.
- Jika endpoint terproteksi mengembalikan `401` karena sesi berakhir, arahkan ke Login dengan pesan “Sesi berakhir. Silakan masuk kembali.”

### 3.3 Lupa Password dan Atur Password Baru

**Tujuan:** meminta tautan reset (`REQ-003`, `EP-004`) dan menetapkan password baru melalui alur Supabase Auth.  
**Aktor:** pengguna publik.

Perilaku:

- Form lupa password hanya meminta `email`.
- `202`: selalu tampilkan pesan netral “Jika email terdaftar, tautan reset password telah dikirim.” Pesan yang sama ditampilkan untuk email tidak terdaftar.
- Layar atur password baru menerima tautan dari email, meminta password baru dan konfirmasi, lalu memvalidasi minimal 8 karakter. Aplikasi tidak menyimpan token reset sendiri; tidak ada endpoint aplikasi baru.
- Setelah password baru berhasil ditetapkan, arahkan ke Login. Password lama tidak boleh lagi berlaku.

### 3.4 Daftar Proyek

**Tujuan:** menampilkan proyek tempat pengguna menjadi anggota (`REQ-005`, `EP-005`) dan membuat proyek baru (`REQ-004`, `EP-006`).  
**Aktor:** pengguna login.

Layout:

- Header aplikasi.
- Judul “Proyek” dan tombol utama “Buat proyek”.
- Grid kartu proyek: `name`, `description`, badge role pengguna (`owner`/`member`), dan `member_count`.
- Jika `description` kosong, tampilkan teks sekunder “Tidak ada deskripsi” sebagai empty state, bukan field baru.

Perilaku:

- `EP-005` hanya mengembalikan proyek yang diikuti; UI tidak menampilkan proyek lain.
- “Buat proyek” membuka dialog dengan field `name` wajib dan `description` opsional.
- Submit mengirim `EP-006`; `201` menutup dialog dan membuka detail proyek baru. Pembuat otomatis menjadi `owner`; UI menampilkan badge owner.
- `400` karena `name` kosong ditampilkan inline.
- Empty state: “Belum ada proyek. Buat proyek pertama Anda.”
- Tidak ada kontrol pencarian/filter proyek pada MVP.

### 3.5 Detail Proyek — Tab Tugas

**Tujuan:** menjadi pusat pekerjaan proyek: daftar tugas, status, penanggung jawab, dan akses ke komentar (`REQ-005`, `REQ-010`–`REQ-013`, `EP-007`).  
**Aktor:** anggota proyek.

Layout:

- **Project header:** `name`, `description`, badge role pengguna. Owner melihat tombol “Edit proyek”; member tidak.
- **Tab navigation:** Tugas, Laporan, Anggota.
- **Toolbar tugas:** tombol “Tugas baru” untuk semua anggota.
- **Daftar tugas:** setiap baris menampilkan `title`, `assignee` (`profiles.display_name`), label status `Selesai`/`Belum selesai`, dan waktu pembaruan bila tersedia dari respons. Deskripsi dapat ditampilkan terpotong.
- **Aksi baris:** owner melihat “Edit” dan “Hapus”; member melihat toggle status hanya jika `assignee_id` sama dengan pengguna login. Member tidak melihat aksi edit konten atau hapus.
- Mengklik baris membuka panel detail tugas.

State:

- `403`/`404` untuk non-anggota: tampilkan halaman “Proyek tidak ditemukan atau Anda tidak memiliki akses” tanpa membocorkan data tugas.
- Empty state: “Belum ada tugas. Buat tugas pertama untuk proyek ini.”
- Loading: skeleton daftar tugas; project header tetap ditampilkan bila data proyek sudah tersedia.
- Tidak ada kontrol pencarian, filter status, atau filter assignee pada MVP; fitur tersebut `later` (`REQ-016`).

### 3.6 Panel Detail Tugas dan Komentar

**Tujuan:** menampilkan detail tugas dan diskusi kronologis, serta menyediakan mutasi sesuai role (`REQ-011`–`REQ-013`, `EP-012`–`EP-014`).  
**Aktor:** anggota proyek.

Isi panel:

- `title`, `description`, `assignee` (`display_name`), status `is_completed`.
- Daftar komentar kronologis: `body`, `display_name` penulis, dan `created_at`.
- Composer komentar untuk semua anggota.

Perilaku:

- **Owner:** dapat membuka form edit untuk `title`, `description`, `assignee_id`, dan `is_completed` (`EP-012`); dapat menghapus tugas melalui dialog konfirmasi (`EP-013`). Penghapusan tugas juga menghapus komentar terkait dari tampilan.
- **Member:** hanya melihat toggle status jika tugas ditugaskan kepadanya. Request hanya mengirim `is_completed`; mencoba mengubah field lain ditolak `403` (`BR-003`).
- **Komentar:** semua anggota dapat mengirim `body` non-kosong (`EP-014`). Tombol kirim nonaktif jika `body` kosong atau hanya whitespace. `201` menambahkan komentar pada urutan kronologis; draft dibersihkan; fokus tetap di area komentar.
- `400` body kosong ditampilkan inline. `403` ditampilkan sebagai pesan akses ditolak; panel tidak menampilkan komentar baru.
- Tidak ada aksi edit/hapus komentar pada MVP; status tersebut ada di Open Questions.
- Panel bukan rute terpisah. Pada desktop dapat berupa panel samping; pada mobile menjadi sheet layar penuh.

### 3.7 Detail Proyek — Tab Laporan Mingguan

**Tujuan:** menampilkan rekap tugas selesai dan belum selesai untuk minggu yang dipilih (`REQ-014`, `EP-015`).  
**Aktor:** anggota proyek.

Layout:

- Pemilih minggu (`week_start`) yang hanya menghasilkan hari Senin.
- Setelah request, tampilkan `week_start` dan `week_end` dari respons.
- Dua kelompok: **Selesai** (`completed_tasks`) dan **Belum selesai** (`incomplete_tasks`).
- Setiap item menampilkan data tugas yang tersedia pada respons; minimal judul dan status kelompok. Tidak ada grafik, persentase, atau metrik turunan baru.

Perilaku:

- Perubahan minggu mengirim `GET /api/projects/{project_id}/reports/weekly?week_start=YYYY-MM-DD`.
- Laporan memakai status terkini; UI tidak menawarkan filter “dibuat” vs “diperbarui” karena perhitungan tersebut dilakukan server (`BR-005`).
- `403` untuk non-anggota ditampilkan sebagai akses ditolak tanpa data.
- Empty state per kelompok: “Tidak ada tugas selesai pada minggu ini” atau “Tidak ada tugas belum selesai pada minggu ini.”
- Zona waktu dan default minggu mengikuti keputusan Open Questions; UI tidak menebak zona waktu dan menampilkan rentang dari respons.

### 3.8 Detail Proyek — Tab Anggota

**Tujuan:** menampilkan anggota proyek dan menyediakan pengelolaan anggota serta kepemilikan bagi owner (`REQ-007`–`REQ-009`, `EP-007`–`EP-010`).  
**Aktor:** anggota proyek; kontrol pengelolaan hanya owner.

Layout:

- Daftar anggota: `display_name` dan badge role. `joined_at` dapat ditampilkan sebagai informasi sekunder.
- **Owner-only:** form “Tambah member” dengan field email; aksi “Keluarkan” pada baris member; kontrol “Alihkan kepemilikan”.
- **Member:** hanya melihat daftar anggota tanpa kontrol.

Perilaku:

- **Tambah member:** owner memasukkan email lengkap. Tidak ada autocomplete, daftar pengguna, atau pencarian sebagian (`BR-006`). `201` menambahkan baris role `member`. `404` menampilkan “Akun dengan email tersebut tidak ditemukan”; `409` menampilkan “Pengguna sudah menjadi anggota”; `403` menampilkan akses ditolak.
- **Keluarkan member:** dialog konfirmasi menjelaskan bahwa member kehilangan akses, tetapi tugas dan komentar tetap ada (`BR-004`). `204` menghapus baris dari daftar. Owner tidak dapat mengeluarkan dirinya sendiri; tombol untuk baris owner dinonaktifkan dengan penjelasan “Alihkan kepemilikan terlebih dahulu.”
- **Transfer kepemilikan:** owner memilih `new_owner_id` dari member aktif, melihat konfirmasi, lalu mengirim `EP-008`. Setelah `200`, owner lama menjadi member dan kontrol owner hilang dari UI; owner baru melihat kontrol owner. Target yang bukan anggota ditolak `400`; non-owner mendapat `403`.
- **Edit proyek:** tombol “Edit proyek” di header membuka dialog `name` dan `description` (`EP-008`). `name` kosong ditolak `400`. Hanya owner yang melihat tombol ini (`REQ-006`).

## 4. Component Inventory

| Komponen | Fungsi | Sumber data / endpoint | Perilaku dan state | Aksesibilitas |
|---|---|---|---|---|
| `AppShell` | Kerangka halaman: header, main, skip link | Sesi pengguna | Menampilkan header hanya untuk area login; tidak membocorkan data sebelum sesi valid | Landmark `header`, `main`, `nav`; skip link ke konten |
| `AppHeader` | Navigasi global dan menu pengguna | `profiles.display_name`; `EP-003` | Tautan Proyek; menu Keluar; state pending saat logout | Tombol memiliki label jelas; fokus terlihat |
| `UserMenu` | Menampilkan nama dan aksi keluar | `display_name` | Menu dapat ditutup dengan Escape | `aria-expanded`, `aria-controls`, keyboard navigable |
| `AuthForm` | Form signup/login/lupa password | `EP-001`, `EP-002`, `EP-004` | Submit pending; error inline; pesan netral untuk reset | Label eksplisit; error `aria-describedby`; `aria-invalid` |
| `FormField` | Pembungkus label, input, helper, error | Semua form | Menampilkan required indicator dan error | Label `for`/`id`; error terhubung ke input |
| `InlineAlert` | Pesan sukses/error/kontekstual | Respons `EP-xxx` | Varian info, error, success; tidak menjadi notifikasi lintas pengguna | `role="status"` atau `role="alert"` sesuai konteks |
| `RoleBadge` | Menampilkan `owner`/`member` | `project_members.role` | Teks selalu ada; warna bukan satu-satunya pembeda | Teks terbaca screen reader |
| `ProjectCard` | Ringkasan proyek di daftar | `EP-005` | `name`, `description`, role, `member_count`; klik membuka detail | Seluruh kartu dapat difokuskan atau memiliki tautan utama |
| `CreateProjectDialog` | Membuat proyek | `EP-006` | Field `name` wajib, `description` opsional; pending; error inline | Dialog memiliki judul; fokus trap; Escape menutup |
| `ProjectHeader` | Menampilkan identitas proyek | `EP-007` | Nama, deskripsi, role; tombol edit hanya owner | Heading hierarkis; tombol edit berlabel |
| `EditProjectDialog` | Mengubah nama/deskripsi | `EP-008` | Hanya owner; `name` kosong ditolak | Dialog berlabel; error field terhubung |
| `TabNav` | Navigasi Tugas/Laporan/Anggota | State UI | Tab aktif jelas; tidak memuat data proyek lain | `role="tablist"` atau tautan dengan `aria-current`; keyboard arrow/tab |
| `TaskList` | Daftar tugas proyek | `EP-007` | Empty/loading/error; urutan mengikuti respons | Daftar semantik; item memiliki heading atau label |
| `TaskRow` | Ringkasan satu tugas | `EP-007` | `title`, assignee, status; aksi sesuai role | Aksi memiliki nama unik, mis. “Hapus tugas {title}” |
| `StatusBadge` | Menampilkan status tugas | `tasks.is_completed` | “Selesai”/“Belum selesai” + ikon | Tidak hanya warna; teks terbaca |
| `TaskStatusToggle` | Mengubah status tugas | `EP-012` | Member hanya untuk tugas sendiri; pending; revert saat `403` | `aria-pressed` atau checkbox berlabel; status diumumkan |
| `TaskFormDialog` | Membuat/mengedit tugas | `EP-011`, `EP-012` | Create: `title`, `description`, `assignee_id`; status default false. Edit owner: semua field | Dialog berlabel; assignee select berlabel; error inline |
| `AssigneeSelect` | Memilih penanggung jawab | Anggota proyek dari `EP-007` | Hanya anggota proyek; tidak menerima user di luar proyek | Combobox/select berlabel; opsi menampilkan `display_name` |
| `TaskDetailPanel` | Detail tugas dan komentar | `EP-007`, `EP-012`–`EP-014` | Desktop panel samping; mobile sheet; tutup mengembalikan fokus | Dialog/sheet berlabel; fokus trap; Escape menutup |
| `DeleteTaskDialog` | Konfirmasi hapus tugas | `EP-013` | Hanya owner; menjelaskan komentar terkait ikut hilang dari tampilan | Dialog konfirmasi dengan nama tugas |
| `CommentList` | Daftar komentar kronologis | `EP-007`, `EP-014` | Empty state; urutan kronologis; nama dan waktu | Daftar semantik; waktu memakai `time` |
| `CommentComposer` | Menambah komentar | `EP-014` | Submit nonaktif saat kosong; pending; draft dipertahankan saat error | Textarea berlabel; error `400` terhubung |
| `MemberList` | Daftar anggota proyek | `EP-007` | Menampilkan `display_name`, role, `joined_at` bila tersedia | Daftar semantik; role sebagai teks |
| `AddMemberForm` | Menambah member via email persis | `EP-009` | Owner-only; tanpa autocomplete; `404`/`409`/`403` inline | Input email berlabel; error spesifik |
| `RemoveMemberDialog` | Konfirmasi keluarkan member | `EP-010` | Owner-only; owner sendiri tidak dapat dikeluarkan | Dialog menjelaskan konsekuensi histori |
| `TransferOwnershipDialog` | Mengalihkan kepemilikan | `EP-008` | Owner-only; pilih member aktif; konfirmasi; setelah sukses role berubah | Select berlabel; konfirmasi eksplisit |
| `WeekPicker` | Memilih `week_start` Senin | State UI; `EP-015` | Hanya Senin; menampilkan rentang minggu; request saat berubah | Input berlabel; navigasi keyboard; error validasi |
| `WeeklyReport` | Menampilkan dua kelompok laporan | `EP-015` | `week_start`, `week_end`, `completed_tasks`, `incomplete_tasks`; loading/empty/error | Heading per kelompok; tidak hanya warna |
| `ReportTaskGroup` | Satu kelompok tugas laporan | `EP-015` | Empty state per kelompok | Daftar semantik; status grup sebagai heading |
| `ConfirmDialog` | Dialog konfirmasi umum | Aksi destruktif | Tombol batal dan konfirmasi; fokus awal pada batal | `role="dialog"`, `aria-modal`, fokus trap |
| `EmptyState` | Pesan saat data kosong | State UI | Tidak menampilkan aksi yang tidak relevan | Teks jelas; aksi opsional berlabel |
| `LoadingSkeleton` | Placeholder saat memuat | State UI | Tidak mengumumkan konten palsu ke screen reader | `aria-busy` pada area terkait |

Tidak ada komponen untuk pencarian/filter tugas, notifikasi, lampiran file, pembayaran, atau ringkasan tugas pribadi pada MVP. Fitur `later` tidak boleh muncul sebagai kontrol setengah jadi.

## 5. Interaction Patterns

### 5.1 Sesi dan rute terproteksi

- Halaman terproteksi memeriksa sesi di server. Tanpa sesi, pengguna diarahkan ke Login.
- Setelah login berhasil, pengguna diarahkan ke Daftar Proyek.
- Jika endpoint mengembalikan `401` di tengah interaksi, hentikan aksi, tampilkan pesan “Sesi berakhir”, dan arahkan ke Login.
- Logout menghapus cookie melalui `EP-003`; UI tidak menyimpan token sensitif di `localStorage`.

### 5.2 Membuat proyek

1. Pengguna membuka dialog “Buat proyek”.
2. Mengisi `name` wajib dan `description` opsional.
3. Submit mengirim `EP-006`; tombol pending dan tidak dapat diklik ganda.
4. `201`: dialog ditutup, pengguna diarahkan ke detail proyek baru, badge owner tampil.
5. `400`: error inline pada `name`; fokus kembali ke field.

### 5.3 Menambah member dengan email persis

- Form hanya tersedia untuk owner.
- Tidak ada autocomplete, dropdown pengguna, atau pencarian sebagian.
- `201`: baris member baru muncul dengan role `member`; field email dibersihkan.
- `404`: “Akun dengan email tersebut tidak ditemukan.”
- `409`: “Pengguna sudah menjadi anggota proyek ini.”
- `403`: akses ditolak; UI menyegarkan data proyek untuk memastikan role terbaru.

### 5.4 Mengeluarkan member

- Owner menekan “Keluarkan” pada baris member.
- Dialog menjelaskan: member kehilangan akses; tugas dan komentar tetap ada; nama penulis tetap tampil.
- `204`: baris hilang; tampilkan pesan sukses dan pengingat bahwa owner dapat mengganti penanggung jawab tugas yang masih menunjuk member tersebut.
- Owner tidak dapat mengeluarkan dirinya sendiri; tombol dinonaktifkan dan alasannya terlihat.
- Keputusan apakah tugas otomatis dilepas atau tetap terbuka sampai diganti ada di Open Questions; UI tidak melakukan pelepasan otomatis.

### 5.5 Mengalihkan kepemilikan

- Owner memilih member aktif pada dialog transfer.
- Dialog menampilkan konsekuensi: owner lama menjadi member; owner baru mendapat kontrol owner.
- Submit mengirim `EP-008` dengan `new_owner_id`.
- `200`: refresh data proyek dan anggota; kontrol owner lama hilang; owner baru terlihat sebagai owner.
- `400`/`403`: error inline; tidak ada perubahan role di UI.

### 5.6 Membuat tugas

- Semua anggota proyek dapat menekan “Tugas baru”.
- Form membuat tugas berisi `title`, `description`, dan `assignee_id`; status baru selalu `false`.
- `assignee_id` hanya dapat dipilih dari anggota proyek.
- `201`: tugas muncul di daftar dengan status “Belum selesai”; dialog ditutup.
- `400` karena assignee bukan anggota: error pada field assignee; form tetap terbuka.

### 5.7 Mengubah status tugas

- Member melihat toggle status hanya pada tugas dengan `assignee_id` miliknya.
- Owner dapat mengubah status melalui form edit atau toggle.
- Request member hanya mengirim `is_completed`. Jika UI mencoba mengirim field lain, server menolak `403`.
- Selama pending, toggle dinonaktifkan. UI tidak melakukan optimistically update yang tidak dapat dikembalikan; setelah `200`, label status diperbarui.
- `403`: kembalikan tampilan ke status sebelumnya dan tampilkan alert akses ditolak.

### 5.8 Mengedit dan menghapus tugas

- Hanya owner yang melihat aksi edit konten dan hapus.
- Edit mengirim field yang diizinkan ke `EP-012`; validasi dan error ditampilkan inline.
- Hapus membuka dialog konfirmasi yang menyebut judul tugas dan menjelaskan komentar terkait tidak lagi ditampilkan.
- `204`: tugas dihapus dari daftar; panel detail ditutup; fokus kembali ke daftar.
- `403`: alert akses ditolak; data di-refresh.

### 5.9 Berkomentar

- Semua anggota dapat menulis komentar pada tugas.
- Tombol kirim nonaktif jika `body` kosong atau hanya whitespace.
- `201`: komentar ditambahkan pada urutan kronologis dengan `display_name` dan `created_at`; composer dibersihkan; fokus tetap di composer.
- `400`: error inline “Komentar tidak boleh kosong.”
- `403`: komentar tidak ditambahkan; tampilkan akses ditolak.
- Tidak ada edit/hapus komentar pada MVP; aksi tersebut tidak ditampilkan.

### 5.10 Memilih minggu laporan

- Pengguna membuka tab Laporan dan memilih minggu.
- `WeekPicker` hanya mengizinkan `week_start` hari Senin.
- Perubahan minggu memicu `EP-015`; selama loading, kelompok sebelumnya tidak ditampilkan sebagai data baru.
- `200`: tampilkan `week_start`, `week_end`, dan dua kelompok tugas.
- `400`: tampilkan error validasi tanggal; pengguna dapat memilih ulang.
- `403`: tampilkan akses ditolak tanpa data laporan.

### 5.11 Penanganan error dan konflik

| Status | Perilaku UI |
|---|---|
| `400` | Error inline pada field atau form; fokus ke field pertama yang invalid |
| `401` | Hentikan aksi; arahkan ke Login; tampilkan pesan sesi berakhir |
| `403` | Tampilkan akses ditolak; jangan menampilkan data yang diminta; refresh data role bila perlu |
| `404` | Tampilkan “Tidak ditemukan” sesuai konteks, mis. email member tidak ditemukan atau proyek tidak tersedia |
| `409` | Tampilkan konflik spesifik, mis. email sudah terdaftar atau sudah menjadi anggota |
| Error jaringan | Pertahankan input; tampilkan pesan “Gagal terhubung. Coba lagi.”; sediakan aksi coba lagi |

UI boleh menyembunyikan aksi yang tidak berhak, tetapi tidak boleh mengubah `403` menjadi sukses lokal. Jika state role sudah usang, UI harus menyegarkan data proyek setelah `403`.

### 5.12 Loading, empty, dan konfirmasi

- Gunakan skeleton untuk daftar proyek, daftar tugas, dan laporan; jangan menampilkan angka atau data palsu.
- Empty state selalu menjelaskan kondisi dan aksi berikutnya yang relevan.
- Dialog konfirmasi digunakan untuk hapus tugas, keluarkan member, dan transfer kepemilikan.
- Tombol submit dinonaktifkan selama pending untuk mencegah duplikasi.
- Setelah dialog ditutup, fokus kembali ke elemen pemicu.

## 6. Accessibility

Kriteria desain ini mengacu pada WCAG 2.1 AA untuk area yang tercakup nonFunctional SpecModel: label form, kontras memadai, dan navigasi keyboard. Ini bukan penambahan requirement produk baru; ini cara memenuhi baseline aksesibilitas.

### 6.1 Struktur dan semantik

- Setiap halaman memakai `lang="id"`, satu `h1`, heading hierarkis, landmark `header`, `nav`, `main`, dan `footer` bila ada.
- Gunakan elemen semantik: `form`, `label`, `button`, `ul`/`li`, `table` hanya jika data benar-benar tabular. Untuk daftar tugas dan komentar, gunakan daftar semantik.
- Skip link “Lewati ke konten utama” tersedia di awal halaman.
- Ikon dekoratif diberi `aria-hidden="true"`; ikon yang bermakna memiliki teks alternatif.

### 6.2 Form

- Setiap input memiliki label terlihat, bukan hanya placeholder.
- Required indicator jelas; error text terhubung melalui `aria-describedby` dan input diberi `aria-invalid="true"` saat error.
- Saat submit gagal, fokus berpindah ke field pertama yang invalid.
- Password memiliki label yang jelas; tidak ada instruksi yang hanya disampaikan lewat warna.
- Form tambah member menjelaskan bahwa email harus persis dan tidak ada daftar pengguna.
- Form laporan menjelaskan bahwa `week_start` harus hari Senin.

### 6.3 Keyboard dan fokus

- Semua aksi dapat dicapai dengan keyboard: tab, shift+tab, enter, space, escape.
- Fokus terlihat jelas dengan outline kontras minimal 3:1 terhadap latar.
- Dialog menahan fokus di dalamnya, menutup dengan Escape, dan mengembalikan fokus ke pemicu.
- Tab navigation dapat dioperasikan dengan keyboard; tidak ada hover-only action.
- Tabel/daftar dengan aksi baris memiliki tombol berlabel unik, misalnya “Hapus tugas Desain landing page”, bukan sekadar “Hapus”.

### 6.4 Screen reader dan status

- Pesan sukses menggunakan `role="status"`; pesan error menggunakan `role="alert"` bila perlu segera diumumkan.
- Status tugas selalu berupa teks “Selesai”/“Belum selesai”, tidak hanya warna atau ikon.
- Role badge `owner`/`member` memiliki teks yang terbaca.
- Komentar memakai `time datetime` untuk `created_at`; nama penulis dan isi komentar berada dalam satu item daftar.
- Perubahan status tugas diumumkan melalui live region, misalnya “Status tugas diperbarui menjadi Selesai.”
- Loading state menggunakan `aria-busy="true"` pada area yang dimuat.

### 6.5 Visual

- Kontras teks normal minimal 4.5:1; teks besar dan komponen UI minimal 3:1.
- Fokus keyboard tidak boleh dihilangkan tanpa pengganti.
- Target sentuh minimal 44×44 CSS px untuk tombol dan kontrol.
- Jangan menggunakan warna saja untuk membedakan status, role, atau error.
- Layout harus tetap dapat digunakan pada zoom 200% dan lebar 320 CSS px tanpa kehilangan konten atau horizontal scroll halaman.
- Hormati `prefers-reduced-motion`; animasi bukan satu-satunya penyampai perubahan state.

### 6.6 Pengujian aksesibilitas

- Uji keyboard-only untuk signup, login, membuat proyek, membuat tugas, mengubah status, berkomentar, dan memilih minggu laporan.
- Uji screen reader minimal satu kombinasi (NVDA/Firefox atau VoiceOver/Safari) untuk form error, dialog, dan status tugas.
- Uji zoom 200% dan viewport 320 px.
- Uji bahwa `403`, `404`, dan `409` dapat dipahami tanpa melihat warna atau posisi visual saja.

## 7. Responsive Behavior

### 7.1 Breakpoint dan prinsip layout

| Rentang | Perilaku utama |
|---|---|
| < 640 px | Mobile: satu kolom; header ringkas; dialog menjadi sheet layar penuh; task row menjadi kartu |
| 640–1023 px | Tablet: satu kolom konten dengan grid proyek dua kolom; panel tugas dapat menjadi overlay lebar |
| ≥ 1024 px | Desktop: konten maksimal sekitar 1200 px; daftar tugas dan panel detail dapat berdampingan; laporan dua kolom |

Prinsip:

- Mobile-first; tidak ada fitur yang hanya tersedia di desktop.
- Tidak ada horizontal scroll pada level halaman. Scroll horizontal hanya boleh terjadi di dalam tab bar jika diperlukan, dengan kontrol keyboard.
- Aksi utama selalu terlihat, bukan hanya saat hover.

### 7.2 Header dan navigasi

- Mobile: nama produk dan menu pengguna dalam satu baris; menu pengguna dapat berupa dropdown yang menampilkan `display_name` dan “Keluar”.
- Desktop: tautan “Proyek” dan menu pengguna sejajar.
- Tab proyek dapat digulir horizontal di layar sempit; tab aktif tetap terlihat dan dapat difokuskan.
- Tidak ada sidebar tersembunyi yang menyembunyikan aksi utama.

### 7.3 Daftar proyek

- Mobile: kartu proyek satu kolom; `name`, `description`, role, dan `member_count` ditumpuk.
- Tablet: dua kolom.
- Desktop: tiga kolom bila ruang cukup.
- Tombol “Buat proyek” tetap terlihat di atas daftar; dialog membuat proyek menjadi sheet penuh pada mobile.

### 7.4 Daftar tugas dan panel detail

- Mobile: setiap tugas menjadi kartu dengan label “Penanggung jawab” dan “Status”; aksi owner/member ditampilkan sebagai tombol berlabel.
- Desktop: baris tugas dapat menampilkan kolom judul, assignee, status, dan aksi.
- Panel detail tugas:
  - Desktop ≥1024 px: panel samping di sebelah daftar; daftar tetap terlihat.
  - Tablet: panel overlay lebar.
  - Mobile: sheet layar penuh dengan tombol tutup dan fokus trap.
- Komentar dan composer tetap dapat digunakan pada lebar 320 px; textarea melebar penuh.

### 7.5 Form dan dialog

- Form selalu satu kolom; label di atas input.
- Dialog create/edit/confirm pada mobile menggunakan lebar penuh dengan area aksi lengket di bawah.
- Tombol konfirmasi dan batal memiliki target sentuh minimal 44×44 px.
- Error inline tidak boleh mendorong tombol utama keluar dari layar tanpa scroll yang wajar.

### 7.6 Laporan mingguan

- Mobile: pemilih minggu, ringkasan `week_start`/`week_end`, lalu kelompok Selesai dan Belum selesai ditumpuk.
- Desktop ≥1024 px: dua kelompok dapat ditampilkan berdampingan.
- Setiap item tugas membungkus teks panjang; tidak memotong nama assignee atau judul secara permanen.
- Empty state per kelompok tetap terlihat tanpa memerlukan scroll horizontal.

### 7.7 Tabel anggota

- Mobile: daftar anggota berbentuk kartu dengan `display_name`, role, dan aksi owner bila ada.
- Desktop: baris anggota dapat menampilkan nama, role, `joined_at`, dan aksi.
- Aksi “Keluarkan” dan kontrol transfer kepemilikan tidak boleh tersembunyi di balik hover; selalu tersedia bagi owner.
- Baris owner sendiri menampilkan tombol keluarkan dalam keadaan nonaktif dengan alasan yang terbaca.

### 7.8 Matriks pengujian responsif

- 320 px: signup, login, daftar proyek, daftar tugas, komentar, laporan, anggota.
- 768 px: perpindahan kartu/baris, panel tugas, dialog.
- 1024 px dan 1440 px: panel samping, laporan dua kolom, grid proyek.
- Zoom 200%: tidak ada konten terpotong atau horizontal scroll halaman.
- Orientasi landscape pada mobile: header dan dialog tetap dapat digunakan.

## 8. Open Questions

Pertanyaan berikut memengaruhi detail desain dan belum diputuskan dalam SpecModel. Tidak ada keputusan final yang boleh dianggap tersirat dari dokumen ini.

1. **Zona waktu default laporan mingguan belum ditetapkan.** Usulan Asia/Jakarta perlu dikonfirmasi. Dampak desain: label zona waktu, default `week_start`, dan cara menampilkan `week_end`.
2. **Apakah verifikasi email Supabase diaktifkan saat pendaftaran, atau akun langsung aktif setelah signup?** Dampak desain: pesan setelah `EP-001` dan apakah pengguna dapat langsung login.
3. **Apakah komentar boleh diedit atau dihapus, atau bersifat permanen pada MVP?** Dampak desain: aksi pada `CommentItem`. Saat ini UI MVP tidak menampilkan edit/hapus komentar.
4. **Bagaimana penanganan tugas yang masih ditugaskan ke mantan member setelah ia dikeluarkan: tetap terbuka sampai owner mengganti assignee, atau otomatis dilepas?** Dampak desain: tampilan assignee, peringatan di tab Anggota, dan ketersediaan toggle status. UI saat ini tidak melepas assignee secara otomatis dan membiarkan owner mengganti melalui `EP-012`.