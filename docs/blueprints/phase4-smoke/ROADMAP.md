# ROADMAP.md — KerjaTim

| Field | Nilai |
|---|---|
| Nama dokumen | ROADMAP.md |
| Produk | KerjaTim |
| Versi | 1.0 |
| Status | Siap untuk review |
| Sumber kebenaran | SpecModel proyek KerjaTim |
| Cakupan | Milestone, urutan pengiriman MVP, growth, scale, dependensi, dan risiko |
| Acuan dependensi | FEATURES.md dan dokumen dependensi lain |

Dokumen ini mengatur **kapan dan dalam urutan apa** capability KerjaTim dikirim. Roadmap tidak mendefinisikan ulang produk. SpecModel tetap menjadi satu-satunya sumber kebenaran untuk entity, endpoint, requirement, role, dan aturan bisnis. Jika ada konflik antara dokumen ini dan SpecModel, SpecModel menang.

Roadmap ini memakai FEATURES.md sebagai konteks urutan increment, tetapi tidak menyalin tabel fitur secara mentah. Fokus dokumen ini adalah gate pengiriman, urutan dependensi, dan kriteria keluar yang dapat diuji.

## Aturan interpretasi

1. **MVP hanya berisi requirement `mvp`.** `REQ-001` sampai `REQ-015` adalah batas rilis MVP. `REQ-016` dan `REQ-017` tidak boleh menjadi blocker MVP.
2. **Setiap milestone harus menghasilkan capability yang dapat didemokan dan diuji.** Kode yang sudah di-merge tetapi belum lulus acceptance criteria belum dianggap selesai.
3. **Otorisasi diperiksa di server.** `REQ-015` bersifat lintas-potong dan harus menyertai `EP-003`, `EP-005` sampai `EP-015`, bukan ditunda ke akhir.
4. **Role bersifat per proyek.** `owner` dan `member` disimpan pada `project_members`; tidak ada role global di luar model tersebut (`BR-002`).
5. **Fase Growth hanya mengerjakan requirement `later` yang sudah ada.** Fase Scale adalah kesiapan teknis dan operasional, bukan penambahan fitur produk.
6. **Estimasi bersifat indikatif.** Estimasi di bawah diasumsikan untuk 1–2 engineer full-stack dan bukan komitmen kontrak.

## 1. Milestones

| Milestone | Increment acuan | Fokus | Requirement | Endpoint utama | Entity utama | Kriteria keluar | Estimasi indikatif |
|---|---|---|---|---|---|---|---|
| M1 | Inc-1 | Akun dan fondasi otorisasi | `REQ-001`, `REQ-002`, `REQ-003`; fondasi `REQ-015` | `EP-001`, `EP-002`, `EP-003`, `EP-004` | `profiles` | Signup, login, logout, dan permintaan reset password berfungsi; sesi cookie terbentuk; profil aplikasi tersimpan; endpoint terproteksi menolak pengguna tanpa sesi dengan `401`; email duplikat menghasilkan `409`; kredensial salah menghasilkan `401`. | 1–2 minggu |
| M2 | Inc-2 | Proyek dan keanggotaan | `REQ-004`, `REQ-005`, `REQ-006`, `REQ-007`, `REQ-008`, `REQ-009`; lanjutan `REQ-015` | `EP-005`, `EP-006`, `EP-007`, `EP-008`, `EP-009`, `EP-010` | `projects`, `project_members`, `profiles` | Pengguna dapat membuat proyek dan tercatat sebagai `owner`; daftar proyek hanya berisi proyek yang diikuti; detail proyek dapat diakses anggota; owner dapat mengubah proyek, menambah member dengan email persis, mengeluarkan member, dan mengalihkan kepemilikan dengan tepat satu owner; aksi member pada operasi owner menghasilkan `403`. | 2 minggu |
| M3 | Inc-3 | Tugas dan komentar | `REQ-010`, `REQ-011`, `REQ-012`, `REQ-013`; lanjutan `REQ-015` | `EP-011`, `EP-012`, `EP-013`, `EP-014` | `tasks`, `comments`, `project_members`, `profiles` | Anggota proyek dapat membuat tugas dengan assignee dari anggota proyek; member hanya dapat mengubah `is_completed` untuk tugas miliknya; owner dapat mengubah seluruh field dan menghapus tugas; komentar non-kosong tampil kronologis dengan `display_name`; akses non-anggota menghasilkan `403`. | 2–3 minggu |
| M4 | Inc-4 | Laporan mingguan dan rilis MVP | `REQ-014`; penutupan `REQ-015` | `EP-015` | `tasks`, `projects`, `project_members` | Laporan mingguan menerima `week_start` hari Senin, menghitung tugas yang `created_at` atau `updated_at` berada dalam periode Senin–Minggu, mengelompokkan berdasarkan `is_completed` terkini, dan menampilkan `completed_tasks` serta `incomplete_tasks`; seluruh acceptance `REQ-001`–`REQ-015` lulus; rilis MVP disetujui. | 1–2 minggu |
| M5 | Inc-5 | Growth | `REQ-016`, `REQ-017` | `EP-007` untuk `REQ-016`; `REQ-017` belum memiliki endpoint khusus dalam `EP-001`–`EP-015` | `tasks`, `project_members` | Pencarian/filter tugas berfungsi pada `EP-007`; ringkasan tugas pribadi hanya dikerjakan setelah kontrak endpoint ditambahkan ke SpecModel; tidak ada regresi pada `REQ-001`–`REQ-015`. | 2–3 minggu |
| M6 | — | Scale readiness | Tidak ada requirement produk baru | Seluruh endpoint MVP dan Growth yang telah disetujui | Tidak ada entity baru | Uji beban pada jalur baca utama lulus tanpa error kapasitas; backup/restore terverifikasi; audit RLS dan otorisasi hijau; ambang kuota layanan terpantau; tidak ada perubahan kontrak API. | 2–4 minggu, kondisional |

**Jalur kritis:** M1 → M2 → M3 → M4 → rilis MVP → M5 → M6. M5 tidak boleh memblokir M4. M6 boleh dimulai setelah MVP stabil, dan pekerjaan observability atau backup boleh berjalan paralel dengan M5 selama tidak mengubah kontrak.

## 2. Phase 1 — MVP

### 2.1 Tujuan fase

Mengirim seluruh requirement `mvp` (`REQ-001`–`REQ-015`) melalui endpoint kanonik `EP-001`–`EP-015`, dengan otorisasi server yang konsisten dan tanpa menunggu fitur `later`. Pada akhir fase, tim kecil berukuran 2–10 orang dapat membuat proyek, mengelola anggota, membuat tugas, berkomentar, dan membaca laporan mingguan.

### 2.2 Urutan pengiriman MVP

| Urutan | Increment | Pekerjaan utama | Gate |
|---|---|---|---|
| 1 | M1 | `EP-001` signup, `EP-002` login, `EP-003` logout, `EP-004` forgot password; pembuatan `profiles`; fondasi pemeriksaan sesi dan role di server. | Pengguna dapat membuat akun, login, logout, dan meminta reset password; cookie sesi memakai `HttpOnly`, `Secure`, dan `SameSite=Lax`; endpoint terproteksi mengembalikan `401` tanpa sesi. |
| 2 | M2 | `EP-005` daftar proyek, `EP-006` buat proyek, `EP-007` detail proyek, `EP-008` ubah proyek/transfer kepemilikan, `EP-009` tambah member, `EP-010` keluarkan member. | Pembuat proyek menjadi `owner`; `project_members` menyimpan role per proyek; pencocokan email persis menghasilkan `201`, `404`, atau `409`; transfer kepemilikan menghasilkan tepat satu owner; data tugas dan komentar tidak dihapus saat member dikeluarkan. |
| 3 | M3 | `EP-011` buat tugas, `EP-012` ubah tugas, `EP-013` hapus tugas, `EP-014` komentar. | Assignee wajib anggota proyek; member hanya dapat mengubah `is_completed` pada tugas dengan `assignee_id` miliknya; owner dapat mengubah seluruh field dan menghapus tugas; komentar tersusun kronologis. |
| 4 | M4 | `EP-015` laporan mingguan; audit akhir `REQ-015`; regresi; UAT; rilis MVP. | Laporan mingguan sesuai periode Senin–Minggu dan status terkini; seluruh acceptance MVP lulus; tidak ada open question yang memblokir rilis. |

### 2.3 Rincian gate M1

M1 selesai hanya jika:

- `EP-001` mengembalikan `201` untuk email valid dan unik, `400` untuk validasi gagal, dan `409` untuk email sudah terdaftar.
- `EP-002` mengembalikan `200` dengan cookie sesi untuk kredensial benar, dan `401` tanpa membuat sesi untuk kredensial salah.
- `EP-003` mengembalikan `204` dan menghapus cookie sesi.
- `EP-004` mengembalikan `202` dengan pesan netral, termasuk saat email tidak terdaftar.
- Baris `profiles` memiliki `id`, `email`, `display_name`, dan `created_at` sesuai SpecModel.
- Halaman atau route terproteksi mengalihkan pengguna tanpa sesi ke login, dan endpoint terproteksi mengembalikan `401`.

### 2.4 Rincian gate M2

M2 selesai hanya jika:

- `EP-006` membuat `projects` dan baris `project_members` dengan role `owner` untuk pembuat.
- `EP-005` hanya mengembalikan proyek tempat pengguna menjadi anggota, beserta role dan `member_count`.
- `EP-007` hanya dapat diakses anggota proyek; non-anggota mendapat `403` atau `404`.
- `EP-009` mencocokkan email persis tanpa menampilkan daftar pengguna; email tidak ditemukan menghasilkan `404`; pengguna yang sudah menjadi anggota menghasilkan `409`.
- `EP-010` mengeluarkan member, menghapus baris `project_members`, tetapi mempertahankan `tasks` dan `comments`; owner tidak dapat mengeluarkan dirinya sendiri.
- `EP-008` dengan `new_owner_id` menjalankan transfer secara atomik: owner lama menjadi `member`, owner baru menjadi `owner`, dan tidak pernah ada dua owner atau nol owner (`BR-001`).

### 2.5 Rincian gate M3

M3 selesai hanya jika:

- `EP-011` membuat `tasks` dengan `is_completed=false`; `assignee_id` yang bukan anggota proyek ditolak `400`.
- `EP-012` mengizinkan owner mengubah `title`, `description`, `assignee_id`, dan `is_completed`.
- `EP-012` menolak member yang mengubah field selain `is_completed`, atau mengubah status tugas yang bukan miliknya, dengan `403` (`BR-003`).
- `EP-013` hanya dapat dilakukan owner; penghapusan tugas juga menghapus komentar terkait.
- `EP-014` menerima `body` non-kosong; komentar baru menampilkan `author_id`, `display_name`, dan `created_at` secara kronologis.
- Non-anggota yang mencoba membuat tugas, mengubah tugas, menghapus tugas, atau berkomentar mendapat `403`.

### 2.6 Rincian gate M4

M4 selesai hanya jika:

- `EP-015` memvalidasi `week_start` sebagai hari Senin.
- Laporan menghitung tugas yang `created_at` atau `updated_at` berada dalam periode Senin–Minggu.
- Tugas yang dibuat dan diperbarui pada minggu yang sama dihitung sekali, bukan duplikat. Pengelompokan memakai `is_completed` terkini (`BR-005`).
- Respons berisi `week_start`, `week_end`, `completed_tasks`, dan `incomplete_tasks`.
- Non-anggota mendapat `403`.
- Audit akhir `REQ-015` mencakup seluruh endpoint MVP dan membuktikan tidak ada akses lintas proyek.

### 2.7 Kriteria rilis MVP

MVP boleh dirilis hanya jika seluruh kondisi berikut terpenuhi:

- [ ] `REQ-001`–`REQ-015` lulus acceptance criteria.
- [ ] `EP-001`–`EP-015` diimplementasikan dengan method, path, auth, request, response, dan error sesuai SpecModel.
- [ ] Setiap endpoint terproteksi memeriksa sesi dan keanggotaan proyek di server.
- [ ] Member tidak dapat melakukan aksi khusus owner, termasuk mengubah anggota, menghapus tugas, atau mengubah konten tugas orang lain.
- [ ] Row Level Security Supabase aktif sebagai lapisan pertahanan tambahan dan diuji terhadap skenario negatif.
- [ ] Validasi input memakai Zod di server; status `400`, `401`, `403`, `404`, dan `409` konsisten.
- [ ] Cookie sesi memakai `HttpOnly`, `Secure`, dan `SameSite=Lax`; token sensitif tidak disimpan di `localStorage`.
- [ ] Open Questions yang memblokir M4 sudah diputuskan dan dicatat pada SpecModel.
- [ ] Tidak ada fitur `later` yang menjadi ketergantungan rilis.

### 2.8 Di luar cakupan MVP

Notifikasi, lampiran file, integrasi pihak ketiga, multi-workspace, dan pembayaran tidak termasuk MVP. Fitur-fitur tersebut tidak boleh ditambahkan ke Phase 1 tanpa perubahan SpecModel.

## 3. Phase 2 — Growth

### 3.1 Tujuan fase

Mengirim dua requirement `later` yang sudah ada, yaitu `REQ-016` dan `REQ-017`, setelah MVP stabil. Growth bukan alasan untuk menambah entity, endpoint, role, atau aturan bisnis baru di luar SpecModel.

### 3.2 Urutan pengiriman Growth

1. **Stabilisasi pasca-MVP.** Perbaiki bug hasil UAT, tinjau kualitas query `EP-007` dan `EP-015`, dan kumpulkan umpan balik pengguna. Tidak ada fitur baru pada langkah ini.
2. **`REQ-016` — pencarian dan filter tugas.** Implementasikan query `q`, `status`, dan `assignee_id` pada `EP-007`. Pemeriksaan keanggotaan proyek harus dilakukan sebelum filter diterapkan, sehingga filter tidak pernah membocorkan tugas dari proyek lain. Uji kombinasi filter, filter kosong, dan pengguna non-anggota.
3. **Keputusan kontrak `REQ-017`.** `REQ-017` belum memiliki endpoint khusus dalam `EP-001`–`EP-015`. Kontrak endpoint harus ditambahkan ke SpecModel terlebih dahulu. Roadmap ini tidak menetapkan path atau method baru.
4. **`REQ-017` — ringkasan tugas pribadi.** Setelah kontrak disetujui, implementasikan ringkasan tugas dengan `assignee_id` milik pengguna login, hanya dari proyek tempat pengguna masih menjadi anggota, dan bedakan tugas selesai serta belum selesai.
5. **Review keputusan terbuka.** Jika keputusan tentang komentar permanen atau tugas mantan member menghasilkan perubahan perilaku, perubahan harus masuk ke SpecModel dan dijadwalkan sebagai pekerjaan terpisah. Jangan mengimplementasikannya diam-diam di Growth.

### 3.3 Kriteria keluar Growth

- `REQ-016` dan `REQ-017` lulus acceptance criteria masing-masing.
- `EP-007` tetap menghormati keanggotaan proyek pada semua kombinasi filter.
- Tidak ada regresi pada `REQ-001`–`REQ-015`.
- SpecModel diperbarui untuk kontrak `REQ-017` dan keputusan terbuka yang diambil.
- Tidak ada endpoint baru yang dibuat tanpa tercatat di SpecModel.

## 4. Phase 3 — Scale

### 4.1 Tujuan fase

Menyiapkan KerjaTim untuk pertumbuhan beban dan operasi jangka panjang tanpa mengubah kontrak produk. Fase ini **tidak mengirim fitur produk baru**. Pemicu masuknya adalah salah satu dari: kuota free tier Supabase, Vercel, atau Resend mendekati batas; query `EP-007` atau `EP-015` melambat; kebutuhan audit keamanan; atau kebutuhan backup dan pemulihan yang terdokumentasi.

### 4.2 Workstream Scale

| Workstream | Pekerjaan | Kriteria keberhasilan |
|---|---|---|
| Kapasitas database | Tinjau query plan untuk `EP-007` dan `EP-015`; evaluasi index pada kolom yang benar-benar dipakai filter dan laporan; hindari perubahan skema tanpa memperbarui SpecModel dan dokumen DATABASE. | Query laporan dan detail proyek tetap responsif pada volume data yang disepakati; tidak ada full scan yang tidak disengaja pada jalur baca utama. |
| Keamanan | Audit RLS dan pemeriksaan otorisasi aplikasi; tinjau cookie sesi; perbarui dependensi; ulangi uji negatif untuk `REQ-015`. | Tidak ada akses lintas proyek pada uji negatif; kebijakan RLS konsisten dengan pemeriksaan server. |
| Keandalan | Backup dan restore drill; monitoring error; alert kuota; runbook insiden. | Restore terverifikasi; alert kuota aktif; runbook diuji pada simulasi insiden. |
| Performa | Uji beban pada `EP-005`, `EP-007`, dan `EP-015`; ukur waktu respons dan error rate. | Tidak ada error `5xx` akibat kapasitas pada skenario uji yang disepakati; waktu respons jalur baca utama stabil. |
| Biaya dan operasi | Pantau pemakaian Supabase, Vercel, dan Resend; putuskan kapan perlu upgrade paket; jaga agar biaya awal tetap terkendali. | Keputusan upgrade berbasis data pemakaian, bukan asumsi; tidak ada layanan baru yang menambah kompleksitas tanpa kebutuhan. |
| Release engineering | Disiplin migrasi, staging, dan rollback; dokumentasi operasi. | Setiap perubahan skema dapat di-rollback; rilis tidak bergantung pada langkah manual yang tidak terdokumentasi. |

### 4.3 Di luar cakupan Scale

Notifikasi, lampiran file, integrasi pihak ketiga, multi-workspace, dan pembayaran tetap di luar cakupan sampai SpecModel diubah. Phase 3 tidak boleh dipakai sebagai pintu masuk untuk fitur-fitur tersebut.

## 5. Dependencies

| ID | Dependensi | Prasyarat | Terdampak | Gate |
|---|---|---|---|---|
| DEP-01 | Supabase Auth email/password dan cookie SSR `@supabase/ssr` | Konfigurasi Supabase dan environment server | `REQ-001`, `REQ-002`, `REQ-003`; seluruh endpoint terproteksi | M1 |
| DEP-02 | `profiles` | Signup berhasil dan `auth.users.id` tersedia | `REQ-001`, `REQ-007`, `REQ-013`; tampilan `display_name` pada komentar dan anggota | M1–M3 |
| DEP-03 | `projects` dan `project_members` | M1 selesai; user login tersedia | `REQ-004`–`REQ-009`; dasar `REQ-010`–`REQ-014` | M2 |
| DEP-04 | `tasks` | `project_members` dan assignee valid | `REQ-010`–`REQ-014`; `EP-011`–`EP-015` | M3–M4 |
| DEP-05 | `comments` | `tasks` tersedia | `REQ-013`; `EP-014`; tampilan kronologis pada `EP-007` | M3 |
| DEP-06 | `REQ-015` kontrol akses | Pemeriksaan sesi dan role di server | Seluruh `EP-003`, `EP-005`–`EP-015` | M1–M4 |
| DEP-07 | Resend untuk email reset password | Konfigurasi pengiriman email | `REQ-003`; `EP-004` | M1 |
| DEP-08 | Keputusan zona waktu laporan | SpecModel open question | `REQ-014`; `BR-005`; `EP-015` | M4 |
| DEP-09 | Keputusan verifikasi email | SpecModel open question | `REQ-001`; `EP-001` | M1 |
| DEP-10 | Keputusan komentar permanen | SpecModel open question | `REQ-013`; `EP-014` | M3 |
| DEP-11 | Keputusan tugas mantan member | SpecModel open question; `BR-004` | `REQ-008`, `REQ-011`, `REQ-014` | M3 |
| DEP-12 | Query `EP-007` | `EP-007` sudah tersedia | `REQ-016` | M5 |
| DEP-13 | Kontrak endpoint `REQ-017` | Belum ada endpoint khusus dalam `EP-001`–`EP-015`; harus ditambahkan ke SpecModel | `REQ-017` | M5 |
| DEP-14 | Deployment Vercel, Supabase, Resend | Environment produksi dan staging | Seluruh rilis | M4 |

**Urutan dependensi yang tidak boleh dilanggar:** `profiles` sebelum keanggotaan proyek; `projects` dan `project_members` sebelum `tasks`; `tasks` sebelum `comments` dan laporan mingguan; `REQ-015` diperiksa bersamaan dengan setiap endpoint, bukan setelah semua fitur selesai. Komentar (`EP-014`) dapat dikerjakan paralel dengan `EP-012` dan `EP-013` setelah `EP-011` stabil, tetapi tidak boleh mendahului fondasi `tasks`.

## 6. Risks

| ID | Risiko | Dampak | Mitigasi | Sinyal awal |
|---|---|---|---|---|
| R-01 | Periode dan zona waktu laporan mingguan belum disepakati | Laporan berbeda dengan ekspektasi pengguna; sengketa angka | Putuskan sebelum gate M4; gunakan satu zona waktu untuk seluruh tim; uji batas Senin 00:00 dan Minggu 23:59; catat keputusan di SpecModel | Open question masih terbuka saat M4 dimulai |
| R-02 | Kesalahan otorisasi lintas proyek | Member melihat atau mengubah data proyek lain | Periksa `project_members` di server pada setiap endpoint; aktifkan RLS; uji negatif untuk non-anggota dan member yang mencoba aksi owner | Ada respons `200` untuk pengguna non-anggota |
| R-03 | Transfer kepemilikan tidak atomik | Dua owner atau nol owner dalam satu proyek | Jalankan transfer dalam satu transaksi; uji kondisi tepat satu owner; uji owner tidak dapat mengeluarkan diri sendiri | Terdapat dua baris `project_members.role='owner'` pada proyek yang sama |
| R-04 | Tugas tetap ditugaskan ke mantan member | Pekerjaan menggantung; status tidak dapat diperbarui oleh pemilik tugas | Putuskan penanganannya sebelum M3; owner dapat mengganti `assignee_id`; jangan menghapus tugas atau komentar secara otomatis | Member dikeluarkan saat masih memiliki tugas terbuka |
| R-05 | Email reset password tidak terkirim | Pengguna kehilangan akses akun | Konfigurasi Resend dan uji pengiriman; pertahankan respons netral `202`; pantau bounce | Permintaan `202` tetapi email tidak diterima |
| R-06 | Scope creep ke notifikasi, lampiran, atau integrasi | MVP mundur; kompleksitas dan biaya naik | Gunakan SpecModel sebagai kontrol perubahan; hanya `REQ-016` dan `REQ-017` yang masuk Growth | Ada permintaan fitur di luar `REQ-001`–`REQ-017` |
| R-07 | Adopsi rendah karena tidak ada notifikasi | Anggota tidak menyadari tugas baru | Nyatakan batasan ini sejak awal; andalkan daftar tugas proyek dan laporan mingguan; ringkasan pribadi masuk Growth melalui `REQ-017` | Anggota tidak membuka proyek setelah tugas dibuat |
| R-08 | Batas free tier Supabase, Vercel, atau Resend | Layanan terhenti atau lambat saat pemakaian naik | Pantau kuota; optimalkan query `EP-007` dan `EP-015`; siapkan keputusan upgrade paket | Peringatan kuota atau peningkatan latensi |
| R-09 | Verifikasi email belum diputuskan | Alur signup tidak konsisten dengan ekspektasi keamanan | Putuskan sebelum M1 selesai; selaraskan dengan acceptance `REQ-001`; perbarui SpecModel jika alur berubah | Akun dengan email tidak valid atau spam signup |
| R-10 | Komentar permanen belum diputuskan | Pengguna meminta edit/hapus di luar cakupan | Putuskan sebelum M3; jika edit/hapus ditambahkan, ubah SpecModel terlebih dahulu | Permintaan edit atau hapus komentar dari pengguna |
| R-11 | `REQ-017` belum memiliki endpoint | Implementasi terhenti atau endpoint dibuat tanpa kontrak | Tambahkan kontrak ke SpecModel sebelum M5; jika belum disetujui, tunda `REQ-017` dan kirim `REQ-016` lebih dulu | M5 dimulai tanpa kontrak endpoint |
| R-12 | Tugas dihitung ganda dalam laporan | Angka laporan membesar | Gunakan `distinct` berdasarkan ID tugas; uji tugas yang dibuat dan diperbarui pada minggu yang sama | Tugas yang sama muncul dua kali pada `completed_tasks` atau `incomplete_tasks` |
| R-13 | Penghapusan tugas menghapus komentar | Kehilangan diskusi historis | Batasi `EP-013` hanya untuk owner; tampilkan konfirmasi sebelum hapus; uji penghapusan tugas beserta komentar terkait | Owner menghapus tugas yang memiliki komentar penting |
| R-14 | RLS dan otorisasi aplikasi tidak konsisten | Celah akses yang tidak terdeteksi pengujian aplikasi | Uji RLS dengan skenario yang sama seperti uji endpoint; tinjau kebijakan setiap kali skema berubah | Kebijakan RLS mengizinkan baris yang ditolak aplikasi, atau sebaliknya |

## 7. Open Questions

| Pertanyaan | Dampak pada roadmap | Keputusan dibutuhkan sebelum |
|---|---|---|
| Zona waktu default laporan mingguan belum ditetapkan; usulan Asia/Jakarta perlu dikonfirmasi. | Menentukan batas `created_at` dan `updated_at` pada `EP-015`; memengaruhi `REQ-014` dan `BR-005`. | Gate M4 |
| Apakah verifikasi email Supabase diaktifkan saat pendaftaran, atau akun langsung aktif setelah signup? | Memengaruhi alur `EP-001` dan acceptance `REQ-001`; dapat mengubah pengalaman pertama pengguna. | Gate M1 |
| Apakah komentar boleh diedit atau dihapus, atau bersifat permanen pada MVP? | Memengaruhi cakupan `EP-014` dan `REQ-013`; jika berubah, SpecModel harus diperbarui. | Gate M3 |
| Bagaimana penanganan tugas yang masih ditugaskan ke mantan member setelah ia dikeluarkan? | Memengaruhi `BR-004`, `REQ-008`, `REQ-011`, dan tampilan laporan; menentukan apakah owner wajib mengganti assignee. | Gate M3 |
| Kontrak endpoint untuk `REQ-017` belum ada dalam `EP-001`–`EP-015`. | Menentukan apakah ringkasan tugas pribadi dapat dikirim pada M5 atau harus ditunda. | Gate M5 |