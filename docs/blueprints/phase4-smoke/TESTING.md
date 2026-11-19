# TESTING.md — KerjaTim

| Field | Nilai |
|---|---|
| Nama dokumen | TESTING.md |
| Produk | KerjaTim |
| Versi | 1.0 |
| Status | Siap untuk review |
| Sumber kebenaran | SpecModel proyek KerjaTim |
| Cakupan | `REQ-001`–`REQ-017`, `BR-001`–`BR-006`, `EP-001`–`EP-015` |
| Stack pengujian | Vitest untuk unit/integration, Playwright untuk E2E, Supabase local PostgreSQL/Auth, email catcher untuk reset password |
| Dokumen dependensi | `REQUIREMENTS.md`, `API.md` |
| Platform | Web app Next.js App Router dengan sesi cookie SSR |

Dokumen ini menetapkan strategi, cakupan, dan peta pengujian KerjaTim. SpecModel adalah satu-satunya sumber kebenaran. Dokumen ini tidak menambahkan entity, endpoint, role, requirement, atau aturan bisnis baru. Jika terjadi konflik antara dokumen ini dan SpecModel, SpecModel menang.

## 1. Test Strategy

### 1.1 Prinsip

- Setiap test harus dapat ditelusuri ke `REQ-xxx`, `BR-xxx`, atau `EP-xxx`. Test yang tidak memiliki traceability dihapus atau diperbaiki.
- Fokus utama adalah risiko otorisasi per proyek, karena role `owner`/`member` berlaku per proyek dan tidak boleh dipercaya dari client.
- Negative test adalah first-class: `401`, `403`, `404`, `409`, dan `400` diuji sejelas happy path.
- Integration test memakai database dan Auth sungguhan. Otorisasi tidak boleh dimock pada integration test.
- E2E membuktikan alur pengguna, bukan menggantikan integration test. Menyembunyikan tombol di UI bukan kontrol keamanan.
- Data test deterministik, terisolasi, dan tidak bergantung pada urutan eksekusi.
- Setiap bug produksi yang diperbaiki harus mendapat regression test dengan ID requirement terkait.

### 1.2 Lapisan pengujian

| Lapisan | Tool | Cakupan | Database/Auth | Dijalankan |
|---|---|---|---|---|
| Unit | Vitest | Zod schema, permission matrix, exact email matcher, week range, grouping report, cookie options | Tidak ada database; Supabase dimock hanya untuk unit murni | Setiap pull request |
| Integration | Vitest + HTTP request + Supabase local | `EP-001`–`EP-015`, status code, body, cookie, persistensi, RLS | PostgreSQL dan Supabase Auth nyata; cookie jar nyata | Setiap pull request |
| E2E | Playwright | Alur signup/login/reset, proyek, anggota, tugas, komentar, laporan, transfer, removal | App Next.js nyata + Supabase local/staging | Smoke di PR; full nightly dan release |
| Accessibility/responsive | Playwright + axe | Halaman login, daftar proyek, detail proyek, detail tugas, laporan | App nyata | Nightly dan release |

Tidak ada layer performance/load pada MVP karena SpecModel tidak menetapkan target performa. Jika target ditambahkan, test load harus menjadi gate tersendiri.

### 1.3 Lingkungan

- **Local:** Supabase local dengan migration dan seed; email reset ditangkap email catcher lokal. Test tidak memakai email asli.
- **CI:** database ephemeral per pipeline; seed dijalankan sebelum integration/E2E; service role hanya dipakai untuk seeding, bukan untuk melewati otorisasi aplikasi.
- **Staging/preview:** Supabase project terpisah dari produksi; pengiriman email memakai alamat uji atau email catcher. Test tidak pernah menunjuk ke produksi.
- **Produksi:** tidak dijadikan target test otomatis. Smoke test produksi hanya membaca halaman publik dan login dengan akun uji khusus jika diperlukan.

### 1.4 Isolasi data

- Integration test memakai transaksi rollback per test atau schema/database terpisah per worker. Jika Auth tidak dapat rollback, gunakan project dan email unik per test lalu cleanup.
- E2E memakai seed baseline dan membuat data unik per test, misalnya nama proyek dengan sufiks waktu. Test tidak boleh bergantung pada sisa data test sebelumnya.
- Setiap test yang mengubah status, membership, atau ownership harus memulai dari seed baru.
- Assertion keamanan selalu memeriksa bahwa data proyek lain tidak muncul, bukan hanya status code.

### 1.5 Gerbang kualitas

- **Pull request:** typecheck, lint, unit test, integration test, dan E2E smoke untuk alur autentikasi, proyek, tugas, komentar, dan laporan.
- **Nightly:** full E2E, RLS test, accessibility scan, dan responsive check.
- **Release:** seluruh `REQ` MVP memiliki test otomatis yang lulus; seluruh `BR-001`–`BR-006` tercakup; seluruh `EP-001`–`EP-015` memiliki integration test; tidak ada defect critical/high terbuka.
- **Flaky test:** retry maksimal satu kali hanya untuk kegagalan infrastruktur E2E. Flaky test tidak boleh diabaikan atau dihapus tanpa analisis.
- **Cakupan requirement:** target 100% untuk `REQ` MVP. Line coverage bukan gate utama; cakupan perilaku dan otorisasi lebih penting.

### 1.6 Risiko dan fokus pengujian

| Risiko | Respons pengujian | Trace |
|---|---|---|
| Member melihat atau mengubah data proyek lain | Matriks non-member pada semua endpoint proyek/tugas/komentar/laporan; RLS test | `REQ-015`, `BR-002`, `EP-007`, `EP-011`–`EP-015` |
| Member melakukan aksi owner | Negative test owner-only: ubah proyek, tambah/keluarkan member, hapus tugas | `REQ-006`, `REQ-007`, `REQ-008`, `REQ-012`, `BR-003` |
| Member mengubah konten atau status tugas orang lain | Guard `is_completed` hanya untuk `assignee_id` sendiri; mixed payload ditolak utuh | `REQ-011`, `BR-003`, `EP-012` |
| Transfer kepemilikan menghasilkan dua owner atau nol owner | Assertion tepat satu owner, role lama menjadi member, role baru menjadi owner | `REQ-009`, `BR-001`, `EP-008` |
| Removal menghapus data historis | Setelah removal, tugas dan komentar tetap ada; `display_name` penulis tetap tampil | `REQ-008`, `BR-004`, `EP-010` |
| Laporan mingguan salah periode atau salah grouping | Uji `created_at` OR `updated_at`, status terkini, deduplikasi, batas Senin–Minggu | `REQ-014`, `BR-005`, `EP-015` |
| Pencocokan email membocorkan daftar pengguna | Exact match, partial email 404, respons tanpa daftar pengguna | `REQ-007`, `BR-006`, `EP-009` |
| Reset password membocorkan status akun | Respons netral untuk email terdaftar dan tidak terdaftar | `REQ-003`, `EP-004` |
| Cookie sesi salah konfigurasi | Assert `HttpOnly`, `Secure`, `SameSite=Lax`; logout menghapus sesi | `REQ-002`, nonFunctional |
| Mass assignment role/owner/author | Kirim field terlarang; pastikan diabaikan dan data tidak berubah | `REQ-015`, `BR-002`, `EP-006`, `EP-011`, `EP-014` |
| Fitur `later` masuk tanpa test | Test `REQ-016` dan `REQ-017` sudah dirancang; diaktifkan bersama implementasi | `REQ-016`, `REQ-017` |

### 1.7 Di luar cakupan

Test berikut tidak dibuat karena tidak ada di SpecModel: pembayaran, notifikasi, lampiran file, integrasi pihak ketiga, multi-workspace, undangan melalui email, tenggat waktu tugas, prioritas tugas, edit/hapus komentar, dan rate limiting. Fitur `later` `REQ-016` dan `REQ-017` tidak menjadi gate MVP, tetapi test-nya tetap dipetakan agar tidak hilang.

### 1.8 Konvensi ID test

- `UT-*` untuk unit test.
- `IT-*` untuk integration test.
- `E2E-*` untuk end-to-end test.
- ID test stabil dan tidak dipakai ulang. Setiap test mencantumkan `REQ`/`BR`/`EP` yang diverifikasi.

## 2. Unit Tests

Unit test berjalan tanpa network dan database. Fokusnya adalah logika yang mudah salah dan mahal jika hanya diuji di E2E: validasi Zod, permission matrix, exact email match, periode mingguan, grouping laporan, dan opsi cookie.

| ID | Unit yang diuji | Skenario dan ekspektasi | Trace |
|---|---|---|---|
| `UT-AUTH-01` | Signup schema | Email valid, password minimal 8 karakter, `display_name` terisi → valid. Email invalid, password 7 karakter, atau `display_name` kosong → error validasi. | `REQ-001`, `EP-001` |
| `UT-AUTH-02` | Login schema | Email/password valid → valid. Field hilang → error. Field `role` dari client tidak diterima sebagai input. | `REQ-002`, `EP-002` |
| `UT-AUTH-03` | Forgot password schema dan pesan netral | Email valid → valid; email invalid → error. Builder respons selalu menghasilkan pesan netral yang sama. | `REQ-003`, `EP-004` |
| `UT-SESSION-01` | Opsi cookie sesi | Cookie memiliki `HttpOnly=true`, `Secure=true`, `SameSite=Lax`; serializer user tidak memuat token sesi. | `REQ-002`, nonFunctional |
| `UT-PROJ-01` | Create project schema dan payload owner | `name` wajib non-kosong; `description` opsional dan boleh string kosong. Payload keanggotaan pembuat memakai `role=owner`. | `REQ-004`, `EP-006`, `BR-001` |
| `UT-PROJ-02` | Update project schema | `name` jika dikirim tidak boleh kosong; `description` opsional; `new_owner_id` harus UUID. Name kosong → error. | `REQ-006`, `REQ-009`, `EP-008` |
| `UT-MEMBER-01` | Exact email matcher | `member.satu@kerjatim.test` cocok dengan string yang sama; `member.satu@kerjatim` dan domain lain tidak cocok. Tidak ada pencarian sebagian. | `REQ-007`, `BR-006`, `EP-009` |
| `UT-MEMBER-02` | Removal guard | Owner menghapus member lain → diizinkan. Owner menghapus dirinya sendiri → ditolak. Actor member → ditolak. | `REQ-008`, `EP-010` |
| `UT-MEMBER-03` | Ownership transfer planner | Target member aktif → owner lama menjadi member, target menjadi owner, tepat satu owner. Target bukan anggota → ditolak. Actor member → ditolak. | `REQ-009`, `BR-001`, `EP-008` |
| `UT-TASK-01` | Create task schema dan assignee validator | `title` wajib; `description` opsional; `assignee_id` harus anggota proyek. `is_completed` dari client diabaikan dan task baru selalu `false`. | `REQ-010`, `EP-011` |
| `UT-TASK-02` | Update task permission | Owner boleh `title`, `description`, `assignee_id`, `is_completed`. Member hanya boleh `is_completed` jika `assignee_id` sama dengan user login. Field lain atau assignee lain → ditolak. | `REQ-011`, `BR-003`, `EP-012` |
| `UT-COMMENT-01` | Comment schema | `body` di-trim dan tidak boleh kosong; whitespace-only ditolak. `author_id` selalu dari sesi, bukan body. | `REQ-013`, `EP-014` |
| `UT-REPORT-01` | Week range | `week_start=2025-04-07` menghasilkan `week_end=2025-04-13`. Format tanggal salah → error. Tidak ada pergeseran tanggal akibat parsing timezone. | `REQ-014`, `EP-015` |
| `UT-REPORT-02` | Report inclusion dan grouping | Task masuk jika `created_at` atau `updated_at` berada dalam periode. Grouping memakai `is_completed` terkini. Task yang dibuat dan diperbarui pada minggu yang sama dihitung sekali. | `REQ-014`, `BR-005`, `EP-015` |
| `UT-AUTHZ-01` | Permission matrix | Owner hanya untuk aksi owner; member untuk aksi member; outsider tidak mendapat akses. Role di-resolve dari `project_members` per `project_id`, bukan role global. | `REQ-015`, `BR-002` |
| `UT-AUTHZ-02` | Member task guard | Member boleh mengubah status tugas sendiri; menolak status tugas orang lain dan seluruh perubahan konten/assignee. | `REQ-011`, `BR-003` |
| `UT-FILTER-01` | Filter composition | `q`, `status`, dan `assignee_id` digabung dengan AND; tidak pernah mengembalikan task dari proyek lain. | `REQ-016`, `EP-007` |
| `UT-MYTASKS-01` | Personal summary predicate | Task masuk jika `assignee_id` sama dengan user login dan user masih memiliki baris `project_members` pada proyek tersebut. Status selesai/belum selesai dipisahkan. | `REQ-017` |
| `UT-VALID-01` | Path dan error mapping | Path bukan UUID → `400`; error mapping menghasilkan `400`, `401`, `403`, `404`, atau `409` sesuai kontrak. Field tidak terdokumentasi diabaikan. | `REQ-015`, `EP-001`–`EP-015` |

Aturan unit test:

- Gunakan table-driven test untuk permission matrix dan status code.
- Freeze clock hanya untuk `UT-REPORT-01`; test lain memakai timestamp fixture eksplisit.
- Jangan menguji pesan error spesifik yang tidak stabil; uji kode error dan status.
- Jangan memakai database atau Supabase client nyata di unit test.

## 3. Integration Tests

Integration test memanggil endpoint `EP-001`–`EP-015` melalui HTTP dengan cookie jar nyata. Database, Supabase Auth, dan RLS aktif. Seeding memakai service role, tetapi request test memakai sesi pengguna biasa. Setiap test memeriksa status, body, dan state database yang relevan.

### 3.1 Autentikasi

| ID | Endpoint | Skenario dan ekspektasi | Trace |
|---|---|---|---|
| `IT-AUTH-01` | `EP-001` | Signup valid → `201`, `profiles` dibuat dengan `email` dan `display_name`, `id` sama dengan auth user, password tidak muncul di response. | `REQ-001` |
| `IT-AUTH-02` | `EP-001` | Email invalid, password 7 karakter, atau `display_name` kosong → `400`; tidak ada profil baru. | `REQ-001` |
| `IT-AUTH-03` | `EP-001` | Email duplikat → `409`; jumlah auth user dan `profiles` tidak bertambah. | `REQ-001` |
| `IT-AUTH-04` | `EP-002` | Login valid → `200`, `Set-Cookie` memiliki `HttpOnly`, `Secure`, `SameSite=Lax`; token tidak ada di body. Request berikutnya ke `EP-005` dengan cookie → `200`. | `REQ-002` |
| `IT-AUTH-05` | `EP-002` | Password salah dan email tidak dikenal → `401`, tanpa `Set-Cookie`; bentuk respons tidak membedakan status akun. | `REQ-002` |
| `IT-AUTH-06` | `EP-003` | Logout → `204`, body kosong, cookie sesi dihapus; `EP-005` berikutnya → `401`. | `REQ-002` |
| `IT-AUTH-07` | `EP-004` | Email terdaftar → `202` netral; email catcher menerima tautan reset; password baru dapat dipakai login, password lama → `401`. | `REQ-003` |
| `IT-AUTH-08` | `EP-004` | Email tidak terdaftar → `202` dengan pesan yang sama; tidak ada email terkirim dan tidak ada akun dibuat. | `REQ-003` |

### 3.2 Proyek

| ID | Endpoint | Skenario dan ekspektasi | Trace |
|---|---|---|---|
| `IT-PROJ-01` | `EP-005` | U1 melihat P1 sebagai `owner` dan P2 sebagai `member`; P3 tidak muncul. `member_count` P1 = 3 dan P2 = 2. Tidak ada data proyek lain. | `REQ-005`, `BR-002` |
| `IT-PROJ-02` | `EP-006` | U1 membuat proyek → `201`, proyek tersimpan, baris `project_members` pembuat `role=owner`, proyek muncul di `EP-005`. U2 yang merupakan member P1 juga dapat membuat proyek dan menjadi owner proyek baru. | `REQ-004`, `BR-002` |
| `IT-PROJ-03` | `EP-006` | `name` kosong atau hilang → `400`; tidak ada proyek atau membership yang dibuat. | `REQ-004` |
| `IT-PROJ-04` | `EP-007` | U2 member P1 → `200`; response memuat proyek, 3 anggota, task P1, dan komentar kronologis. Komentar T1 berurutan C1 lalu C2. Tidak ada data P2/P3. | `REQ-005`, `REQ-013` |
| `IT-PROJ-05` | `EP-007` | U4 non-member membuka P1 → `403`, body tidak memuat proyek, anggota, task, atau komentar. U1 membuka P3 → `403`. | `REQ-005`, `REQ-015` |
| `IT-PROJ-06` | `EP-008` | U1 owner P1 mengubah `name` dan `description` → `200`; `updated_at` berubah; `EP-007` menampilkan nilai baru. | `REQ-006` |
| `IT-PROJ-07` | `EP-008` | U2 member P1 mengubah proyek → `403`; data proyek tidak berubah. | `REQ-006`, `REQ-015` |
| `IT-PROJ-08` | `EP-008` | U1 mentransfer P1 ke U2 → `200`; tepat satu owner, U2 owner, U1 member, U1 PATCH proyek → `403`, U2 PATCH proyek → `200`. | `REQ-009`, `BR-001` |
| `IT-PROJ-09` | `EP-008` | Transfer ke U4 non-member → ditolak `4xx`; tidak ada role yang berubah. U2 member P1 mencoba transfer → `403`. Tetap tepat satu owner. | `REQ-009`, `BR-001` |
| `IT-PROJ-10` | `EP-007` | Filter `q=catatan`, `status=false`, `assignee_id=U2`, dan kombinasinya hanya mengembalikan task yang memenuhi semua kriteria; tidak ada task dari proyek lain. Test diaktifkan saat fitur `later` dirilis. | `REQ-016` |

### 3.3 Anggota proyek

| ID | Endpoint | Skenario dan ekspektasi | Trace |
|---|---|---|---|
| `IT-MEMBER-01` | `EP-009` | U1 menambahkan `member.baru@kerjatim.test` (U5) dengan email persis → `201`, baris `project_members` `role=member`, `joined_at` terisi; U5 dapat membuka `EP-007` P1. | `REQ-007`, `BR-006` |
| `IT-MEMBER-02` | `EP-009` | Email parsial `member.baru@kerjatim` dan email U6 yang tidak terdaftar → `404`; response tidak memuat daftar pengguna; tidak ada membership baru. | `REQ-007`, `BR-006` |
| `IT-MEMBER-03` | `EP-009` | Menambahkan U2 yang sudah member → `409`; tidak ada baris duplikat dan role U2 tidak berubah. | `REQ-007` |
| `IT-MEMBER-04` | `EP-009` | U2 member P1 mencoba menambahkan U5 → `403`; U5 tidak menjadi anggota. | `REQ-007`, `REQ-015` |
| `IT-MEMBER-05` | `EP-010` | U1 mengeluarkan U3 → `204`, body kosong; U3 membuka `EP-007` P1 → `403`; `member_count` P1 turun menjadi 2. | `REQ-008` |
| `IT-MEMBER-06` | `EP-010` | Setelah U3 dikeluarkan, task T2/T4 dan komentar C3 tetap ada; C3 tetap menampilkan `display_name` `Member Dua` kepada U1/U2. Test tidak mengasumsikan perubahan `assignee_id`. | `REQ-008`, `BR-004` |
| `IT-MEMBER-07` | `EP-010` | U1 mencoba mengeluarkan dirinya sendiri → ditolak `4xx`; U1 tetap owner dan tepat satu owner tetap ada. | `REQ-008`, `BR-001` |
| `IT-MEMBER-08` | `EP-010` | U2 member P1 mencoba mengeluarkan U3 → `403`; U3 tetap member. | `REQ-008`, `REQ-015` |

### 3.4 Tugas

| ID | Endpoint | Skenario dan ekspektasi | Trace |
|---|---|---|---|
| `IT-TASK-01` | `EP-011` | U2 member P1 membuat task `title`, `description`, `assignee_id=U1` → `201`, `is_completed=false`, task muncul di `EP-007` dengan assignee U1. | `REQ-010` |
| `IT-TASK-02` | `EP-011` | `assignee_id=U4` non-member → `400`; U4 non-member membuat task → `403`; tidak ada task baru. | `REQ-010`, `REQ-015` |
| `IT-TASK-03` | `EP-012` | U1 owner mengubah `title`, `description`, `assignee_id`, dan `is_completed` T1 → `200`; semua field berubah, `updated_at` berubah, `EP-007` menampilkan nilai baru. | `REQ-011` |
| `IT-TASK-04` | `EP-012` | U2 member mengubah `is_completed` T1 yang `assignee_id=U2` → `200`; status berubah dan `updated_at` bertambah. | `REQ-011`, `BR-003` |
| `IT-TASK-05` | `EP-012` | U2 mengubah status T2 milik U3 → `403`; mengubah `title` T1 → `403`; mengganti `assignee_id` T1 → `403`; mengirim `is_completed` bersama `title` → `403` dan T1 tidak berubah sebagian. | `REQ-011`, `BR-003` |
| `IT-TASK-06` | `EP-012` | U4 non-member mengubah T1 → `403`; U3 member P1 mengubah T8 milik P2 → `403`; tidak ada data yang berubah. | `REQ-015` |
| `IT-TASK-07` | `EP-013` | U1 menghapus T2 yang memiliki komentar C3 → `204`, body kosong; T2 dan C3 tidak lagi muncul di `EP-007`. | `REQ-012` |
| `IT-TASK-08` | `EP-013` | U2 member P1 menghapus T1 → `403`; U4 non-member menghapus T1 → `403`; T1 tetap ada. | `REQ-012`, `REQ-015` |

### 3.5 Komentar

| ID | Endpoint | Skenario dan ekspektasi | Trace |
|---|---|---|---|
| `IT-COMMENT-01` | `EP-014` | U2 menambahkan komentar valid pada T1 → `201`, `author_id=U2`, `display_name=Member Satu`, `created_at` terisi. U1 membalas; `EP-007` menampilkan komentar kronologis C1, C2, lalu komentar baru. | `REQ-013` |
| `IT-COMMENT-02` | `EP-014` | `body` kosong dan whitespace-only → `400`; tidak ada komentar. `author_id` yang dikirim client diabaikan dan author tetap dari sesi. | `REQ-013` |
| `IT-COMMENT-03` | `EP-014` | U4 non-member berkomentar pada T1 → `403`; U3 member P1 berkomentar pada T8 milik P2 → `403`; tidak ada komentar baru. | `REQ-013`, `REQ-015` |

### 3.6 Laporan mingguan

| ID | Endpoint | Skenario dan ekspektasi | Trace |
|---|---|---|---|
| `IT-REPORT-01` | `EP-015` | U2 meminta laporan P1 `week_start=2025-04-07` → `200`, `week_end=2025-04-13`, `completed_tasks` = T2, T3, T7; `incomplete_tasks` = T1, T4. T5, T6, T8, T9 tidak muncul. T2 hanya muncul sekali. | `REQ-014`, `BR-005` |
| `IT-REPORT-02` | `EP-015` | U2 meminta laporan P1 `week_start=2025-03-31` → `completed_tasks` = T3; `incomplete_tasks` = T5. T3 masuk karena `created_at`, T5 masuk karena `updated_at`; task minggu lain tidak muncul. T3 boleh muncul di dua laporan berbeda karena dibuat di minggu pertama dan diperbarui di minggu kedua. | `REQ-014`, `BR-005` |
| `IT-REPORT-03` | `EP-015` | U4 non-member meminta laporan P1 → `403`; U3 member P1 meminta laporan P2 → `403`; U1 owner dan U2 member P1 → `200`. | `REQ-014`, `REQ-015` |

### 3.7 Otorisasi dan keamanan

| ID | Cakupan | Skenario dan ekspektasi | Trace |
|---|---|---|---|
| `IT-AUTHZ-01` | Owner-only endpoints | U2 member P1 memanggil `EP-008` PATCH, `EP-009`, `EP-010`, dan `EP-013` → `403`; semua state tetap. | `REQ-015`, `BR-003` |
| `IT-AUTHZ-02` | Non-member matrix | U4 memanggil `EP-007`, `EP-011`, `EP-012`, `EP-014`, `EP-015` pada P1 → `403`; U3 yang bukan member P2 memanggil endpoint proyek/task/komentar/laporan P2 → `403`; tidak ada data yang bocor. | `REQ-015` |
| `IT-AUTHZ-03` | Tanpa sesi | `EP-003` dan `EP-005`–`EP-015` tanpa cookie → `401`; `EP-001`, `EP-002`, dan `EP-004` tetap publik. | `REQ-015` |
| `IT-SEC-01` | Mass assignment | Body `EP-006` dengan `role`/`owner_id` tidak mengubah role; `EP-011` dengan `is_completed=true` tetap menghasilkan task `false`; `EP-014` dengan `author_id` palsu tetap memakai author sesi; `EP-012` member dengan field terlarang tidak mengubah data. | `REQ-015`, `BR-002` |
| `IT-SEC-02` | RLS sebagai lapisan tambahan | Dengan JWT U4, SELECT P1 dan INSERT komentar ke T1 ditolak; dengan JWT U3, SELECT P2 ditolak; dengan JWT U2, SELECT P1 diizinkan tetapi UPDATE `projects` P1 ditolak; dengan JWT U1, SELECT P3 ditolak. | `REQ-015`, nonFunctional |
| `IT-SEC-03` | Error hygiene | Respons `401`, `403`, `404` tidak memuat stack trace, SQL, token, daftar pengguna, atau data proyek lain. Respons login salah dan reset email tidak membedakan status akun. | `REQ-003`, `REQ-007`, `REQ-015` |

## 4. End-to-End Tests

E2E memakai Playwright, app Next.js nyata, Supabase local/staging, dan email catcher. Setiap test memakai data unik dan memeriksa UI serta efek server. E2E tidak boleh hanya memeriksa tombol tersembunyi; integration test tetap menjadi bukti kontrol akses.

| ID | Alur | Langkah dan ekspektasi | Trace |
|---|---|---|---|
| `E2E-AUTH-01` | Signup, login, logout | Pengguna baru signup dengan email unik, login, melihat daftar proyek kosong, lalu logout dan kembali ke halaman login. Tidak ada error console. | `REQ-001`, `REQ-002` |
| `E2E-AUTH-02` | Sesi dan proteksi halaman | U1 login, membuka P1, logout, lalu membuka URL proyek terproteksi secara langsung; pengguna diarahkan ke login dan data proyek tidak tampil. | `REQ-002` |
| `E2E-AUTH-03` | Reset password | U5 meminta reset, email catcher menerima tautan, U5 menetapkan password baru; login dengan password lama gagal, password baru berhasil. | `REQ-003` |
| `E2E-PROJ-01` | Buat dan ubah proyek | U1 membuat proyek dengan nama dan deskripsi, otomatis menjadi owner, mengubah nama/deskripsi, dan melihat perubahan di daftar proyek. | `REQ-004`, `REQ-006` |
| `E2E-PROJ-02` | Detail proyek dan akses | U2 member membuka P1 dan melihat anggota, tugas, serta komentar. U4 membuka URL P1 langsung dan tidak melihat data proyek. | `REQ-005`, `REQ-015` |
| `E2E-MEMBER-01` | Tambah member exact email | U1 menambahkan U5 dengan email persis, U5 muncul di daftar anggota dan dapat membuka P1. Email parsial menampilkan error tanpa daftar pengguna; email U2 yang sudah member menghasilkan error duplikat. | `REQ-007`, `BR-006` |
| `E2E-TASK-01` | Buat tugas | U2 member membuat tugas dengan judul, deskripsi, dan assignee U1; tugas muncul dengan status belum selesai dan nama assignee. | `REQ-010` |
| `E2E-TASK-02` | Member mengerjakan tugas sendiri | U2 membuka T1 miliknya, mengubah status menjadi selesai; status terlihat di daftar dan laporan. U2 tidak melihat kontrol edit konten/hapus, dan percobaan paksa ditolak server. | `REQ-011`, `REQ-012`, `BR-003` |
| `E2E-TASK-03` | Owner mengelola tugas | U1 mengubah seluruh field T1, lalu menghapus T2 yang memiliki komentar; T2 dan komentarnya hilang dari UI. | `REQ-011`, `REQ-012` |
| `E2E-COMMENT-01` | Komentar kronologis | U2 menambahkan komentar pada T1, melihat `display_name` dan waktu; U1 membalas; urutan kronologis benar. Komentar kosong tidak dapat dikirim. | `REQ-013` |
| `E2E-REPORT-01` | Laporan mingguan | U2 membuka laporan P1, memilih minggu `2025-04-07`, melihat completed T2/T3/T7 dan incomplete T1/T4; mengganti ke `2025-03-31`, melihat completed T3 dan incomplete T5; tidak melihat data proyek lain. | `REQ-014` |
| `E2E-TRANSFER-01` | Transfer kepemilikan | U1 mentransfer P1 ke U2; UI menampilkan U2 owner dan U1 member; kontrol owner U1 hilang; U2 dapat mengubah proyek; tepat satu owner. | `REQ-009`, `BR-001` |
| `E2E-REMOVE-01` | Removal dan retensi data | U1 mengeluarkan U3; U3 tidak lagi melihat P1; U1 dan U2 masih melihat T2 serta komentar C3 dengan nama `Member Dua`. | `REQ-008`, `BR-004` |
| `E2E-AUTHZ-01` | Batas role per proyek | U2 member P1 tidak melihat kontrol owner di P1; membuka URL pengaturan anggota P1 tidak menampilkan form yang dapat dipakai. U3 member P1 tidak dapat membuka P2. | `REQ-015`, `BR-002` |
| `E2E-FILTER-01` | Pencarian/filter `later` | U2 mencari `catatan`, memfilter status selesai, dan memfilter assignee U3; kombinasi hanya menampilkan T2; tidak ada task dari proyek lain. Diaktifkan saat fitur dirilis. | `REQ-016` |
| `E2E-MYTASKS-01` | Ringkasan pribadi `later` | U2 membuka ringkasan tugas pribadi dan melihat T1 (belum selesai, P1), T3 (selesai, P1), dan T10 (selesai, P2). Setelah U2 dikeluarkan dari P1 pada seed terpisah, T1/T3 tidak lagi muncul. Tidak ada endpoint baru; test memakai UI yang tersedia. | `REQ-017` |
| `E2E-A11Y-01` | Aksesibilitas dasar | Axe scan pada login, daftar proyek, detail proyek, detail tugas, dan laporan tidak menemukan violation critical/serious. Form memiliki label; navigasi keyboard mencapai kontrol utama. | nonFunctional |
| `E2E-RESP-01` | Responsif | Viewport 375×667: halaman proyek, tugas, dan laporan tidak memiliki horizontal scroll; tombol utama dapat dijangkau dan form dapat diselesaikan. | nonFunctional |

## 5. Requirement Coverage

### 5.1 Requirement traceability

| Requirement | Priority | Fokus acceptance | Unit | Integration | E2E |
|---|---|---|---|---|---|
| `REQ-001` | `mvp` | Signup `201`, profil dibuat, invalid `400`, duplikat `409` | `UT-AUTH-01` | `IT-AUTH-01`, `IT-AUTH-02`, `IT-AUTH-03` | `E2E-AUTH-01` |
| `REQ-002` | `mvp` | Login cookie, salah `401`, logout `204` | `UT-AUTH-02`, `UT-SESSION-01` | `IT-AUTH-04`, `IT-AUTH-05`, `IT-AUTH-06` | `E2E-AUTH-01`, `E2E-AUTH-02` |
| `REQ-003` | `mvp` | Reset `202` netral, tautan valid, password lama gagal | `UT-AUTH-03` | `IT-AUTH-07`, `IT-AUTH-08` | `E2E-AUTH-03` |
| `REQ-004` | `mvp` | Proyek baru + owner, name wajib | `UT-PROJ-01` | `IT-PROJ-02`, `IT-PROJ-03` | `E2E-PROJ-01` |
| `REQ-005` | `mvp` | Daftar hanya membership, detail anggota, non-member `403` | `UT-AUTHZ-01` | `IT-PROJ-01`, `IT-PROJ-04`, `IT-PROJ-05` | `E2E-PROJ-02` |
| `REQ-006` | `mvp` | Owner ubah proyek, member `403`, name kosong `400` | `UT-PROJ-02` | `IT-PROJ-06`, `IT-PROJ-07` | `E2E-PROJ-01` |
| `REQ-007` | `mvp` | Exact email `201`, tidak ditemukan `404`, duplikat `409` | `UT-MEMBER-01` | `IT-MEMBER-01`, `IT-MEMBER-02`, `IT-MEMBER-03`, `IT-MEMBER-04` | `E2E-MEMBER-01` |
| `REQ-008` | `mvp` | Removal `204`, akses hilang, data tetap, self-removal ditolak | `UT-MEMBER-02` | `IT-MEMBER-05`, `IT-MEMBER-06`, `IT-MEMBER-07`, `IT-MEMBER-08` | `E2E-REMOVE-01` |
| `REQ-009` | `mvp` | Tepat satu owner, owner lama member, target non-member ditolak | `UT-MEMBER-03` | `IT-PROJ-08`, `IT-PROJ-09` | `E2E-TRANSFER-01` |
| `REQ-010` | `mvp` | Task baru `false`, assignee harus member, non-member `403` | `UT-TASK-01` | `IT-TASK-01`, `IT-TASK-02` | `E2E-TASK-01` |
| `REQ-011` | `mvp` | Owner semua field, member hanya status sendiri, mixed payload ditolak | `UT-TASK-02`, `UT-AUTHZ-02` | `IT-TASK-03`, `IT-TASK-04`, `IT-TASK-05`, `IT-TASK-06` | `E2E-TASK-02`, `E2E-TASK-03` |
| `REQ-012` | `mvp` | Owner hapus `204`, member/non-member `403`, komentar ikut hilang | `UT-AUTHZ-01` | `IT-TASK-07`, `IT-TASK-08` | `E2E-TASK-03` |
| `REQ-013` | `mvp` | Komentar `201`, body kosong `400`, non-member `403`, kronologis | `UT-COMMENT-01` | `IT-COMMENT-01`, `IT-COMMENT-02`, `IT-COMMENT-03` | `E2E-COMMENT-01` |
| `REQ-014` | `mvp` | Laporan periode Senin–Minggu, status terkini, created/updated OR, non-member `403` | `UT-REPORT-01`, `UT-REPORT-02` | `IT-REPORT-01`, `IT-REPORT-02`, `IT-REPORT-03` | `E2E-REPORT-01` |
| `REQ-015` | `mvp` | `401` tanpa sesi, `403` non-member/member escalation, RLS | `UT-AUTHZ-01`, `UT-VALID-01` | `IT-AUTHZ-01`, `IT-AUTHZ-02`, `IT-AUTHZ-03`, `IT-SEC-01`, `IT-SEC-02`, `IT-SEC-03` | `E2E-AUTHZ-01` |
| `REQ-016` | `later` | Filter `q`/`status`/`assignee_id` AND, tidak lintas proyek | `UT-FILTER-01` | `IT-PROJ-10` | `E2E-FILTER-01` |
| `REQ-017` | `later` | Assignee = user, hanya proyek yang masih diikuti, status terpisah | `UT-MYTASKS-01` | Tidak ada endpoint khusus di `EP-001`–`EP-015` | `E2E-MYTASKS-01` |

### 5.2 Business rule coverage

| Business rule | Assertion utama | Test |
|---|---|---|
| `BR-001` | Tepat satu owner; transfer mengubah owner lama menjadi member dan owner baru menjadi owner dalam satu transaksi | `UT-MEMBER-03`, `IT-PROJ-08`, `IT-PROJ-09`, `IT-MEMBER-07`, `E2E-TRANSFER-01` |
| `BR-002` | Role per proyek, bukan global; pengecekan memakai `project_id` + `user_id` sesi | `UT-AUTHZ-01`, `IT-PROJ-01`, `IT-PROJ-02`, `IT-SEC-01`, `E2E-AUTHZ-01` |
| `BR-003` | Member hanya `is_completed` pada task miliknya; konten/assignee/hapus hanya owner | `UT-AUTHZ-02`, `UT-TASK-02`, `IT-TASK-04`, `IT-TASK-05`, `E2E-TASK-02` |
| `BR-004` | Removal menghapus membership, tetapi task dan komentar tetap ada; nama penulis tetap tampil | `IT-MEMBER-05`, `IT-MEMBER-06`, `E2E-REMOVE-01` |
| `BR-005` | Laporan memakai status terkini, memasukkan task yang dibuat atau diperbarui dalam periode, tanpa duplikasi | `UT-REPORT-01`, `UT-REPORT-02`, `IT-REPORT-01`, `IT-REPORT-02`, `E2E-REPORT-01` |
| `BR-006` | Penambahan member hanya exact email; tidak ada daftar pengguna atau pencarian sebagian | `UT-MEMBER-01`, `IT-MEMBER-01`, `IT-MEMBER-02`, `E2E-MEMBER-01` |

### 5.3 Endpoint coverage

| Endpoint | Integration test | Status utama |
|---|---|---|
| `EP-001` `POST /api/auth/signup` | `IT-AUTH-01`, `IT-AUTH-02`, `IT-AUTH-03` | `201`, `400`, `409` |
| `EP-002` `POST /api/auth/login` | `IT-AUTH-04`, `IT-AUTH-05` | `200`, `401` |
| `EP-003` `POST /api/auth/logout` | `IT-AUTH-06`, `IT-AUTHZ-03` | `204`, `401` |
| `EP-004` `POST /api/auth/password/forgot` | `IT-AUTH-07`, `IT-AUTH-08`, `IT-SEC-03` | `202` |
| `EP-005` `GET /api/projects` | `IT-PROJ-01`, `IT-AUTHZ-03` | `200`, `401` |
| `EP-006` `POST /api/projects` | `IT-PROJ-02`, `IT-PROJ-03`, `IT-SEC-01` | `201`, `400`, `401` |
| `EP-007` `GET /api/projects/{project_id}` | `IT-PROJ-04`, `IT-PROJ-05`, `IT-PROJ-10`, `IT-AUTHZ-02`, `IT-AUTHZ-03` | `200`, `403`, `401` |
| `EP-008` `PATCH /api/projects/{project_id}` | `IT-PROJ-06`, `IT-PROJ-07`, `IT-PROJ-08`, `IT-PROJ-09`, `IT-AUTHZ-01`, `IT-AUTHZ-03` | `200`, `403`, `400`, `401` |
| `EP-009` `POST /api/projects/{project_id}/members` | `IT-MEMBER-01`–`IT-MEMBER-04`, `IT-AUTHZ-01`, `IT-AUTHZ-03` | `201`, `404`, `409`, `403`, `401` |
| `EP-010` `DELETE /api/projects/{project_id}/members/{user_id}` | `IT-MEMBER-05`–`IT-MEMBER-08`, `IT-AUTHZ-01`, `IT-AUTHZ-03` | `204`, `403`, `4xx` self-removal, `401` |
| `EP-011` `POST /api/projects/{project_id}/tasks` | `IT-TASK-01`, `IT-TASK-02`, `IT-AUTHZ-02`, `IT-AUTHZ-03`, `IT-SEC-01` | `201`, `400`, `403`, `401` |
| `EP-012` `PATCH /api/tasks/{task_id}` | `IT-TASK-03`–`IT-TASK-06`, `IT-AUTHZ-02`, `IT-AUTHZ-03` | `200`, `403`, `401` |
| `EP-013` `DELETE /api/tasks/{task_id}` | `IT-TASK-07`, `IT-TASK-08`, `IT-AUTHZ-01`, `IT-AUTHZ-03` | `204`, `403`, `401` |
| `EP-014` `POST /api/tasks/{task_id}/comments` | `IT-COMMENT-01`–`IT-COMMENT-03`, `IT-AUTHZ-02`, `IT-AUTHZ-03`, `IT-SEC-01` | `201`, `400`, `403`, `401` |
| `EP-015` `GET /api/projects/{project_id}/reports/weekly` | `IT-REPORT-01`–`IT-REPORT-03`, `IT-AUTHZ-02`, `IT-AUTHZ-03` | `200`, `403`, `401` |

## 6. Test Data

Semua email memakai domain `.test` dan bukan alamat nyata. Password test hanya untuk environment test. Seed dijalankan ulang per test atau per worker.

### 6.1 Akun

| Key | Email | Display name | Password | Membership |
|---|---|---|---|---|
| U1 | `owner.utama@kerjatim.test` | `Owner Utama` | `TestPass123!` | owner P1; member P2 |
| U2 | `member.satu@kerjatim.test` | `Member Satu` | `TestPass123!` | member P1; owner P2 |
| U3 | `member.dua@kerjatim.test` | `Member Dua` | `TestPass123!` | member P1; owner P3 |
| U4 | `outsider@kerjatim.test` | `Outsider` | `TestPass123!` | tidak ada |
| U5 | `member.baru@kerjatim.test` | `Member Baru` | `TestPass123!` | tidak ada; target add member dan reset password |
| U6 | `tidak.terdaftar@kerjatim.test` | — | — | tidak memiliki akun; dipakai untuk `404` dan respons reset netral |

### 6.2 Proyek

| Key | Name | Owner | Members | Description |
|---|---|---|---|---|
| P1 | `Peluncuran Beta` | U1 | U1, U2, U3 | `Rilis beta untuk tim internal` |
| P2 | `Pemeliharaan Internal` | U2 | U1, U2 | string kosong, menguji `description` opsional |
| P3 | `Proyek Privat` | U3 | U3 | `Hanya owner`; U1, U2, U4 bukan anggota |

### 6.3 Tugas

| Key | Project | Title | Assignee | `is_completed` | `created_at` | `updated_at` |
|---|---|---|---|---|---|---|
| T1 | P1 | `Siapkan checklist rilis` | U2 | `false` | `2025-04-07T12:00:00Z` | `2025-04-08T12:00:00Z` |
| T2 | P1 | `Tulis catatan rilis` | U3 | `true` | `2025-04-08T12:00:00Z` | `2025-04-10T12:00:00Z` |
| T3 | P1 | `Perbaiki bug login` | U2 | `true` | `2025-03-31T12:00:00Z` | `2025-04-09T12:00:00Z` |
| T4 | P1 | `Tinjau desain` | U3 | `false` | `2025-04-10T12:00:00Z` | `2025-04-20T12:00:00Z` |
| T5 | P1 | `Arsipkan dokumen` | U1 | `false` | `2025-03-25T12:00:00Z` | `2025-04-01T12:00:00Z` |
| T6 | P1 | `Rencana minggu depan` | U1 | `false` | `2025-04-14T12:00:00Z` | `2025-04-14T12:00:00Z` |
| T7 | P1 | `Demo internal` | U3 | `true` | `2025-04-13T12:00:00Z` | `2025-04-13T12:00:00Z` |
| T8 | P2 | `Cek backup` | U1 | `false` | `2025-04-08T12:00:00Z` | `2025-04-08T12:00:00Z` |
| T9 | P3 | `Data sensitif` | U3 | `false` | `2025-04-08T12:00:00Z` | `2025-04-08T12:00:00Z` |
| T10 | P2 | `Tutup tiket dukungan` | U2 | `true` | `2025-04-09T12:00:00Z` | `2025-04-09T12:00:00Z` |

### 6.4 Komentar

| Key | Task | Author | Body | `created_at` |
|---|---|---|---|---|
| C1 | T1 | U2 | `Checklist sudah saya mulai.` | `2025-04-08T13:00:00Z` |
| C2 | T1 | U1 | `Tambahkan item rollback.` | `2025-04-08T14:00:00Z` |
| C3 | T2 | U3 | `Catatan rilis selesai.` | `2025-04-10T13:00:00Z` |

### 6.5 Ekspektasi laporan P1

| `week_start` | `week_end` | `completed_tasks` | `incomplete_tasks` | Excluded |
|---|---|---|---|---|
| `2025-04-07` | `2025-04-13` | T2, T3, T7 | T1, T4 | T5, T6, T8, T9 |
| `2025-03-31` | `2025-04-06` | T3 | T5 | T1, T2, T4, T6, T7, T8, T9 |

T3 muncul di dua laporan karena dibuat pada minggu pertama dan diperbarui pada minggu kedua. Ini konsekuensi `BR-005`; dalam satu laporan, task tetap dihitung sekali.

### 6.6 Aturan data test

- Timestamp fixture memakai tengah hari UTC (`12:00`–`14:00Z`) agar tidak berada di batas hari. Keputusan zona waktu produksi dicatat di Open Questions.
- Setiap test integration/E2E memakai seed baru; perubahan membership atau status tidak boleh memengaruhi test lain.
- Service role hanya dipakai untuk seeding dan cleanup, tidak untuk request test.
- Test report tidak boleh dijalankan setelah T1/T2 diubah tanpa reset seed.
- Assertion `updated_at` memakai perbandingan sebelum/sesudah, bukan nilai clock absolut.
- Test removal tidak mengasumsikan `assignee_id` task berubah; perilaku tersebut dicatat di Open Questions.

## 7. Open Questions

| ID | Pertanyaan | Dampak pada test |
|---|---|---|
| `OQ-01` | Zona waktu default laporan mingguan belum ditetapkan; usulan `Asia/Jakarta` perlu dikonfirmasi. | Test saat ini memakai timestamp tengah hari UTC. Test batas tengah malam dan `week_end` perlu disesuaikan setelah zona waktu ditetapkan. |
| `OQ-02` | Apakah verifikasi email Supabase diaktifkan saat signup, atau akun langsung aktif? | `E2E-AUTH-01` mengikuti flow SpecModel: signup lalu login. Jika verifikasi aktif, test harus menambah langkah konfirmasi email. |
| `OQ-03` | Apakah komentar boleh diedit atau dihapus pada MVP? | Belum ada test edit/delete komentar. Jika fitur ditambahkan, perlu requirement dan test otorisasi baru. |
| `OQ-04` | Tugas yang masih ditugaskan ke mantan member: tetap terbuka sampai owner mengganti assignee, atau otomatis dilepas? | `IT-MEMBER-06` hanya memastikan task dan komentar tetap ada. Assertion `assignee_id` setelah removal ditunda sampai keputusan ditetapkan. |
| `OQ-05` | Apakah `week_start` yang bukan hari Senin harus ditolak `400` atau dinormalkan ke Senin terdekat? | Test hanya memakai `week_start` Senin valid dan format tanggal salah. Kasus non-Senin belum diuji. |
| `OQ-06` | Apakah pencocokan email persis bersifat case-sensitive? | Fixture memakai email lowercase. Test varian huruf besar/besar-kecil belum ditetapkan; hal ini memengaruhi `404` vs `409` pada `EP-009`. |
| `OQ-07` | Status code pasti untuk owner yang mengeluarkan dirinya sendiri dan transfer ke target non-member belum ditetapkan. | Test memakai rejection `4xx` dan memastikan state tidak berubah. Kontrak API perlu menetapkan `400`, `403`, atau `409`. |
| `OQ-08` | `REQ-005` menerima `403` atau `404` untuk non-anggota, sedangkan `API.md` menetapkan `403` untuk proyek yang ada tetapi tidak diikuti. | Test integration memakai `403` sesuai kontrak API. Perlu konfirmasi apakah `404` boleh dipakai untuk menyembunyikan keberadaan proyek. |
| `OQ-09` | `REQ-017` tidak memiliki endpoint khusus di `EP-001`–`EP-015`; bagaimana UI ringkasan tugas pribadi mengambil data? | `E2E-MYTASKS-01` bergantung pada halaman/UI yang tersedia. Tidak boleh membuat endpoint baru tanpa pembaruan SpecModel. |
| `OQ-10` | Apakah ada target performa/load yang menjadi gate rilis? | Belum ada load test. Jika target ditambahkan, perlu skenario dan environment terpisah. |