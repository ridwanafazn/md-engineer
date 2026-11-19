# SECURITY.md — KerjaTim

| Field | Nilai |
|---|---|
| Dokumen | SECURITY.md |
| Produk | KerjaTim |
| Sumber kebenaran | SpecModel proyek KerjaTim |
| Ruang lingkup | MVP web app: autentikasi email/password, proyek, anggota, tugas, komentar, laporan mingguan |
| Entity | `profiles`, `projects`, `project_members`, `tasks`, `comments` |
| Endpoint | `EP-001`–`EP-015` |
| Requirement | `REQ-001`–`REQ-017`, `BR-001`–`BR-006` |
| Role | `owner`, `member` per proyek |
| Dependensi | `ARCHITECTURE.md`, `API.md`, `DATABASE.md`, `REQUIREMENTS.md`, `BUSINESS_RULES.md` |

Dokumen ini menetapkan baseline keamanan MVP KerjaTim. Fokusnya adalah mencegah akses lintas proyek, eskalasi role, pencurian sesi, kebocoran kredensial, dan penyalahgunaan input. Dokumen ini tidak menambahkan entity, endpoint, role, atau aturan produk di luar SpecModel. Setiap kontrol dipetakan ke ID kanonik agar dapat diuji dan ditelusuri.

Prinsip yang mengikat:

1. **Server adalah satu-satunya enforcement point.** Role `owner` dan `member` tidak pernah dipercaya dari client (`REQ-015`, `BR-002`).
2. **Role bersifat per proyek.** Satu pengguna dapat menjadi `owner` di satu proyek dan `member` di proyek lain (`BR-002`).
3. **Sesi berupa cookie HttpOnly.** Token tidak disimpan di `localStorage` dan tidak dikembalikan di body response (`REQ-002`).
4. **Semua input divalidasi di server dengan Zod.** Validasi client hanya untuk UX (`REQ-001`, `REQ-006`, `REQ-010`, `REQ-013`).
5. **RLS Supabase adalah lapisan pertahanan tambahan.** Guard aplikasi di server tetap wajib.

## 1. Threat Model

### 1.1 Aset dan batas kepercayaan

| Aset | Lokasi | Dampak jika bocor atau dirusak |
|---|---|---|
| Kredensial akun | Supabase Auth | Account takeover; akses ke seluruh proyek pengguna |
| Sesi cookie | Browser dan server Next.js | Impersonation pengguna |
| `profiles.email` | PostgreSQL | Kebocoran PII, spam, enumerasi akun |
| `profiles.display_name` | PostgreSQL | Penyalahgunaan identitas tampilan pada komentar |
| `project_members.role` | PostgreSQL | Eskalasi privilege jika dapat diubah client |
| `projects`, `tasks`, `comments` | PostgreSQL | Kebocoran data proyek, kehilangan data, manipulasi laporan |
| Kredensial server | Vercel environment, Supabase, Resend | Kompromi total database, auth, dan email |

Batas kepercayaan utama berada di browser. Browser tidak dipercaya untuk menentukan `role`, `user_id` pelaku, `author_id`, atau `owner_id`. Next.js server dipercaya karena memegang kredensial server dan menjalankan validasi serta otorisasi. Supabase Auth dipercaya untuk identitas dan reset password. PostgreSQL menyimpan data aplikasi dengan RLS sebagai lapisan tambahan. Resend dipercaya untuk pengiriman email reset. Tidak ada API terpisah di luar Next.js dan tidak ada role global di luar `project_members`.

### 1.2 Aktor

| Aktor | Kemampuan | Batas akses |
|---|---|---|
| Anonim | Signup, login, meminta reset password | Tidak dapat membaca data proyek |
| Pengguna login non-anggota | Memiliki sesi, tetapi bukan anggota proyek tertentu | Ditolak `403` pada resource proyek tersebut |
| `member` | Melihat proyek, membuat tugas, mengubah status tugas miliknya, berkomentar, melihat laporan | Tidak dapat mengelola anggota atau menghapus tugas |
| `owner` | Mengelola proyek, anggota, seluruh field tugas, dan transfer kepemilikan | Hanya pada proyek tempat ia `owner` |
| Mantan member | Tidak lagi memiliki baris `project_members` | Kehilangan akses; data historis tetap ada (`BR-004`) |
| Penyerang dengan cookie curian | Dapat mencoba bertindak sebagai pengguna korban | Dibatasi oleh masa berlaku sesi dan kontrol cookie |

### 1.3 Daftar ancaman

| ID | Ancaman | Vektor | Dampak | Kontrol utama | Residual risk |
|---|---|---|---|---|---|
| T-01 | Akses lintas proyek atau IDOR | Mengganti `project_id` atau `task_id` pada `EP-007`, `EP-011`–`EP-015` | Baca atau ubah data proyek lain | Cek `project_members` di server; `project_id` diturunkan dari `task_id`; `403` untuk non-anggota (`REQ-015`, `BR-002`) | Bergantung pada konsistensi guard; RLS harus diuji |
| T-02 | Mass assignment dan injeksi role | Client mengirim `role`, `owner_id`, `author_id`, atau `user_id` pelaku | Eskalasi ke `owner` atau pemalsuan penulis | Field tersebut tidak diterima; role dibaca dari database; Zod membatasi field (`BR-002`) | Tidak ada selama allowlist field diterapkan |
| T-03 | Pengambilalihan kepemilikan | `new_owner_id` bukan anggota, dua owner, atau race condition | Pengambilalihan proyek | Validasi target sebagai member aktif; transaksi tepat satu owner; owner lama menjadi `member` (`BR-001`, `REQ-009`) | Perlu test transaksi dan kondisi gagal |
| T-04 | Member melampaui wewenang | Member mengubah `title`, `assignee_id`, atau menghapus tugas | Perusakan data dan manipulasi laporan | Member hanya boleh `is_completed` untuk tugas miliknya; `403` untuk aksi lain (`BR-003`, `REQ-011`, `EP-013`) | Tidak ada |
| T-05 | Mantan member tetap mengakses | Cookie lama setelah `EP-010` | Akses lanjutan ke proyek | Keanggotaan diperiksa setiap request; role tidak di-cache di sesi (`REQ-008`, `BR-004`, `REQ-015`) | Sesi tetap authenticated, tetapi harus `403` pada resource proyek |
| T-06 | Pencurian sesi | XSS, malware, atau eksfiltrasi cookie | Impersonation | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; token tidak di `localStorage` (`REQ-002`) | XSS di aplikasi; CSP belum ditetapkan |
| T-07 | CSRF | Permintaan lintas situs ke endpoint mutasi | Aksi atas nama korban | `SameSite=Lax`; mutasi tidak melalui `GET` | Token CSRF terpisah belum ditetapkan |
| T-08 | Serangan kredensial | Brute force atau credential stuffing pada `EP-002` | Account takeover | Supabase Auth; `401` tanpa sesi; password minimal 8 karakter (`REQ-001`, `REQ-002`) | Rate limiting belum ditetapkan |
| T-09 | Enumerasi akun | `EP-001` mengembalikan `409`; `EP-009` mengembalikan `404`/`409` | Kebocoran status email | `EP-004` selalu `202` netral; `EP-009` hanya untuk owner dan pencocokan persis (`BR-006`) | Owner dapat menguji email; rate limiting belum ditetapkan |
| T-10 | Penyalahgunaan reset password | Email bombing pada `EP-004` atau intersepsi tautan | Spam atau account takeover | Supabase Auth dan Resend; aplikasi tidak menyimpan token reset; HTTPS (`REQ-003`) | Rate limiting dan keamanan email pengguna |
| T-11 | Stored XSS | Komentar, `display_name`, nama proyek, atau deskripsi tugas berisi HTML | Pencurian sesi atau aksi atas nama korban | Output di-escape React; tidak merender HTML mentah (`REQ-013`) | Batas panjang input belum ditetapkan |
| T-12 | SQL injection | Input dipakai menyusun query | Kebocoran atau perusakan data | Query melalui Supabase client, bukan string SQL dari input; Zod (`REQ-001`) | Perlu code review jika ada raw SQL |
| T-13 | Kebocoran secret | Service role key atau Resend API key masuk client, repo, atau log | Kompromi total | Hanya di environment server; redaksi log; rotasi | Bergantung pada disiplin operasional |
| T-14 | DoS dan penyalahgunaan free tier | Banyak signup, login, reset, atau respons daftar besar | Layanan tidak tersedia | Tidak ada pagination pada API MVP; batas respons dan rate limiting belum ditetapkan | Terbuka; lihat Open Questions |
| T-15 | Aksi destruktif owner tanpa jejak audit | Owner menghapus tugas atau mengeluarkan member | Kehilangan data tanpa bukti forensik | Aksi dibatasi ke owner; log operasional | Tidak ada entity audit persisten di SpecModel |

### 1.4 Di luar cakupan

Pembayaran, notifikasi, lampiran file, integrasi pihak ketiga, undangan melalui email, multi-workspace, dan verifikasi email yang belum diputuskan tidak memiliki endpoint di SpecModel. Ancaman yang hanya muncul dari fitur tersebut tidak dianalisis sebagai kontrol produk. Jika fitur ditambahkan, threat model ini harus diperbarui.

## 2. Authentication

Autentikasi memakai Supabase Auth email/password. Aplikasi tidak menyimpan password. `profiles` hanya menyimpan `id`, `email`, `display_name`, dan `created_at`, dengan `profiles.id` sama dengan `auth.users.id`.

### 2.1 Registrasi — `EP-001`

- Request: `email`, `password`, `display_name`.
- `email` wajib valid dan unik; `password` minimal 8 karakter (`REQ-001`).
- Sukses menghasilkan `201`, akun Supabase Auth, dan baris `profiles`.
- Email duplikat menghasilkan `409` dan tidak membuat akun baru.
- Password tidak boleh dikembalikan di response, ditulis ke log, atau disimpan di tabel aplikasi.
- Pesan error tidak boleh membedakan penyebab internal yang tidak perlu, tetapi `409` untuk email duplikat memang ditetapkan kontrak. Ini membocorkan keberadaan email; mitigasinya ada pada rate limiting dan pemantauan.
- Status verifikasi email mengikuti keputusan di Open Questions. Jika verifikasi tidak diaktifkan, pendaftar dapat memakai email yang tidak ia miliki; ini berdampak pada `EP-009` yang mencocokkan email persis.

### 2.2 Login — `EP-002`

- Request: `email`, `password`.
- Kredensial benar menghasilkan `200`, user, dan `Set-Cookie` sesi.
- Kredensial salah menghasilkan `401` tanpa membuat sesi.
- Token sesi tidak dikembalikan di body dan tidak disimpan di `localStorage`.
- Cookie sesi wajib `HttpOnly`, `Secure`, dan `SameSite=Lax`.
- Cookie hanya membawa identitas sesi; role tidak diambil dari cookie. Role `owner`/`member` selalu dibaca dari `project_members` pada request terkait (`BR-002`).

### 2.3 Logout — `EP-003`

- Memerlukan sesi valid; sukses menghasilkan `204` dan cookie sesi dihapus.
- Setelah logout, endpoint terproteksi harus mengembalikan `401` dan halaman terproteksi mengarahkan pengguna ke login (`REQ-002`).
- Logout tidak boleh menghapus data proyek, tugas, atau komentar.

### 2.4 Lupa dan reset password — `EP-004`

- Request: `email`.
- Response selalu `202` dengan pesan netral, baik email terdaftar maupun tidak (`REQ-003`).
- Jika email terdaftar, Supabase Auth mengirim tautan reset melalui email; Resend dipakai untuk pengiriman.
- Aplikasi tidak menyimpan token reset. Penetapan password baru terjadi di alur Supabase Auth, bukan melalui endpoint aplikasi pada `EP-001`–`EP-015`.
- Tautan reset tidak boleh muncul di response, log, atau pesan error.
- Setelah reset berhasil, password lama tidak berlaku (`REQ-003`).

### 2.5 Masa berlaku dan pencabutan sesi

Masa berlaku sesi, idle timeout, dan pencabutan sesi setelah reset password tidak ditetapkan di SpecModel. Yang dapat diuji dari kontrak adalah: cookie memiliki flag wajib, logout menghapus cookie, dan request tanpa sesi valid menghasilkan `401`. Keputusan mengenai masa berlaku dan pencabutan dicatat di Open Questions.

### 2.6 Acceptance test autentikasi

| Test | Ekspektasi | Referensi |
|---|---|---|
| Signup email duplikat | `409`; tidak ada akun baru | `REQ-001`, `EP-001` |
| Signup password 7 karakter | `400` | `REQ-001` |
| Login password salah | `401`; tidak ada `Set-Cookie` | `REQ-002`, `EP-002` |
| Login benar | `200`; cookie `HttpOnly`, `Secure`, `SameSite=Lax` | `REQ-002` |
| Logout lalu akses `EP-005` | `204` lalu `401` | `REQ-002`, `EP-003` |
| Forgot password email tidak terdaftar | `202` dengan pesan netral | `REQ-003`, `EP-004` |
| Login dengan password lama setelah reset | `401` | `REQ-003` |

## 3. Authorization

### 3.1 Model otorisasi

- Role disimpan di `project_members.role` dengan nilai `owner` atau `member`.
- Setiap proyek memiliki tepat satu `owner` (`BR-001`).
- `owner` tidak disimpan sebagai `projects.owner_id`; kepemilikan adalah role di `project_members`.
- Satu pengguna dapat menjadi `owner` di satu proyek dan `member` di proyek lain (`BR-002`).
- Pembuat proyek otomatis menjadi `owner` pada `EP-006`.
- Kepemilikan dapat dialihkan melalui `EP-008`; owner lama menjadi `member` dan owner baru menjadi `owner` dalam satu transaksi (`REQ-009`).

### 3.2 Urutan pemeriksaan server

Setiap endpoint terproteksi mengikuti urutan berikut:

1. Ambil sesi dan `user_id`; jika tidak ada, `401`.
2. Validasi path, query, dan body dengan Zod; jika tidak valid, `400`.
3. Tentukan `project_id` dari path, atau turunkan dari `task_id` untuk endpoint tugas dan komentar.
4. Cek baris `project_members` untuk `(project_id, user_id)`; jika tidak ada, `403`.
5. Cek role untuk aksi yang diminta; jika tidak berwenang, `403`.
6. Untuk `EP-012`, jika pelaku `member`, hanya izinkan `is_completed` dan hanya untuk tugas dengan `assignee_id` sama dengan `user_id`; selain itu `403`.
7. Jalankan operasi. Resource yang tidak ada menghasilkan `404`; proyek yang ada tetapi tidak diikuti pengguna menghasilkan `403`.

UI boleh menyembunyikan tombol yang tidak diizinkan, tetapi penyembunyian tombol bukan otorisasi. Server tetap harus menolak aksi yang tidak berwenang.

### 3.3 Matriks endpoint

| EP | Method dan path | Auth | Role | Aturan keamanan |
|---|---|---|---|---|
| `EP-001` | `POST /api/auth/signup` | Tidak | Publik | Email valid dan unik; password minimal 8; membuat `profiles` |
| `EP-002` | `POST /api/auth/login` | Tidak | Publik | `401` jika kredensial salah; cookie sesi hanya pada sukses |
| `EP-003` | `POST /api/auth/logout` | Ya | Pengguna login | Menghapus cookie sesi; `204` |
| `EP-004` | `POST /api/auth/password/forgot` | Tidak | Publik | Selalu `202` netral; tidak menyimpan token reset |
| `EP-005` | `GET /api/projects` | Ya | Pengguna login | Hanya proyek tempat pengguna menjadi anggota |
| `EP-006` | `POST /api/projects` | Ya | Pengguna login | Pembuat otomatis menjadi `owner` |
| `EP-007` | `GET /api/projects/{project_id}` | Ya | `member` proyek | Non-anggota `403`; hanya data proyek tersebut |
| `EP-008` | `PATCH /api/projects/{project_id}` | Ya | `owner` | Ubah nama/deskripsi dan transfer kepemilikan; member `403` |
| `EP-009` | `POST /api/projects/{project_id}/members` | Ya | `owner` | Email dicocokkan persis; `404` tidak ditemukan; `409` sudah anggota |
| `EP-010` | `DELETE /api/projects/{project_id}/members/{user_id}` | Ya | `owner` | Owner tidak dapat mengeluarkan dirinya sendiri; data tugas/komentar tetap |
| `EP-011` | `POST /api/projects/{project_id}/tasks` | Ya | `member` proyek | `assignee_id` harus anggota proyek; `400` jika bukan |
| `EP-012` | `PATCH /api/tasks/{task_id}` | Ya | `owner` atau `member` | Owner semua field; member hanya `is_completed` untuk tugas miliknya |
| `EP-013` | `DELETE /api/tasks/{task_id}` | Ya | `owner` | Member dan non-anggota `403`; komentar terkait dihapus |
| `EP-014` | `POST /api/tasks/{task_id}/comments` | Ya | `member` proyek | `body` tidak boleh kosong; `author_id` dari sesi |
| `EP-015` | `GET /api/projects/{project_id}/reports/weekly` | Ya | `member` proyek | `week_start` hari Senin; non-anggota `403` |

### 3.4 Aksi khusus owner

Aksi berikut hanya boleh dilakukan `owner`:

- Mengubah `name` dan `description` proyek (`EP-008`, `REQ-006`).
- Menambahkan member berdasarkan email persis (`EP-009`, `REQ-007`, `BR-006`).
- Mengeluarkan member (`EP-010`, `REQ-008`).
- Mengalihkan kepemilikan (`EP-008`, `REQ-009`).
- Mengubah seluruh field tugas, termasuk `title`, `description`, `assignee_id`, dan `is_completed` (`EP-012`, `REQ-011`).
- Menghapus tugas (`EP-013`, `REQ-012`).

Transfer kepemilikan wajib memenuhi:

- `new_owner_id` adalah member aktif proyek.
- Setelah transaksi, tepat satu baris `project_members.role = 'owner'`.
- Owner lama menjadi `member`.
- Permintaan dari `member` untuk transfer menghasilkan `403`.
- Kondisi dua owner atau target bukan anggota ditolak dan tidak mengubah data.

`owner` tidak dapat mengeluarkan dirinya sendiri melalui `EP-010`; kepemilikan harus dialihkan terlebih dahulu (`REQ-008`). Mengeluarkan member menghapus baris `project_members`, tetapi `tasks` dan `comments` tetap ada. Nama penulis komentar tetap tampil dari `profiles.display_name` (`BR-004`).

### 3.5 Batas member

`member` hanya boleh mengubah `is_completed` pada tugas dengan `assignee_id` sama dengan `user_id` miliknya (`BR-003`, `REQ-011`). Member tidak boleh:

- Mengubah `title`, `description`, atau `assignee_id` tugas.
- Mengubah status tugas milik anggota lain.
- Menghapus tugas.
- Mengubah nama/deskripsi proyek.
- Menambah atau mengeluarkan member.
- Mengalihkan kepemilikan.

Member tetap boleh membuat tugas, berkomentar, melihat detail proyek, dan melihat laporan mingguan (`REQ-010`, `REQ-013`, `REQ-014`).

### 3.6 Non-anggota dan mantan member

- Pengguna tanpa sesi pada endpoint terproteksi mendapat `401` (`REQ-015`).
- Pengguna login yang bukan anggota proyek mendapat `403` pada `EP-007`, `EP-011`–`EP-015`.
- Proyek yang tidak ada menghasilkan `404`; proyek yang ada tetapi tidak diikuti pengguna menghasilkan `403`.
- Mantan member kehilangan akses pada request berikutnya karena keanggotaan diperiksa ulang, bukan diambil dari cache sesi (`BR-004`).
- Data historis tugas dan komentar tetap tersedia bagi anggota yang masih berhak, dengan nama penulis tetap tampil.

### 3.7 RLS sebagai lapisan tambahan

RLS Supabase digunakan sebagai pertahanan tambahan, bukan pengganti guard aplikasi. Kebijakan RLS harus konsisten dengan `project_members` dan tidak boleh membuka data proyek kepada non-anggota. Karena service role key dapat melewati RLS, kunci tersebut hanya boleh dipakai di server dan tidak boleh menjadi satu-satunya mekanisme otorisasi.

### 3.8 Acceptance test otorisasi

| Test | Ekspektasi | Referensi |
|---|---|---|
| Akses `EP-005` tanpa sesi | `401` | `REQ-015` |
| Non-anggota membuka `EP-007` | `403`; tidak ada data proyek | `REQ-005` |
| Member memanggil `EP-008` | `403` | `REQ-006` |
| Member memanggil `EP-009` | `403` | `REQ-007` |
| Owner mengeluarkan dirinya sendiri | Ditolak; keanggotaan tidak berubah | `REQ-008`, `EP-010` |
| Member mengubah `is_completed` tugas miliknya | `200` | `REQ-011` |
| Member mengubah `is_completed` tugas orang lain | `403` | `BR-003` |
| Member mengirim `title` pada `EP-012` | `403` | `REQ-011` |
| Member memanggil `EP-013` | `403` | `REQ-012` |
| Owner memanggil `EP-013` | `204`; komentar terkait hilang | `REQ-012` |
| `EP-011` dengan assignee non-anggota | `400` | `REQ-010` |
| Non-anggota membuka `EP-015` | `403` | `REQ-014` |
| Mantan member membuka `EP-007` | `403` | `REQ-008`, `BR-004` |
| Transfer ke non-anggota | Ditolak; tetap tepat satu owner | `REQ-009`, `BR-001` |

## 4. Data Protection

### 4.1 Inventaris dan klasifikasi data

| Data | Lokasi | Klasifikasi | Akses | Perlindungan |
|---|---|---|---|---|
| Password | Supabase Auth | Kritis | Supabase Auth | Tidak disimpan aplikasi; tidak di-log; reset melalui Supabase Auth |
| Sesi cookie | Browser dan server | Kritis | Pengguna sesi | `HttpOnly`, `Secure`, `SameSite=Lax`; bukan `localStorage` |
| `profiles.email` | PostgreSQL | PII | Login dan pencocokan member persis | Hanya untuk kebutuhan tersebut; tidak menampilkan daftar pengguna; log dibatasi |
| `profiles.display_name` | PostgreSQL | Internal | Anggota proyek pada komentar | Output di-escape |
| `projects.name`, `projects.description` | PostgreSQL | Rahasia proyek | Anggota proyek | Guard keanggotaan server |
| `project_members.role` | PostgreSQL | Metadata otorisasi | Server; owner mengelola anggota | Sumber kebenaran role; tidak diterima dari client |
| `tasks.title`, `tasks.description`, `tasks.assignee_id`, `tasks.is_completed` | PostgreSQL | Rahasia proyek | Anggota; owner edit/delete; member status miliknya | Guard, validasi assignee, audit melalui log |
| `comments.body`, `comments.author_id`, `comments.created_at` | PostgreSQL | Rahasia proyek | Anggota proyek | Output di-escape; `author_id` dari sesi; urutan kronologis |
| ID dan timestamp | Semua entity | Internal | Sesuai kebutuhan respons | UUID; timestamp UTC |

Tidak ada data pembayaran, lampiran file, atau notifikasi dalam cakupan MVP.

### 4.2 Kontrol akses data

- Semua pembacaan dan mutasi data proyek melewati Route Handlers/Server Actions yang memeriksa keanggotaan (`REQ-015`).
- `EP-005` hanya mengembalikan proyek tempat pengguna menjadi anggota.
- `EP-007` hanya mengembalikan anggota, tugas, dan komentar proyek yang diminta jika pengguna adalah anggota.
- `EP-011`–`EP-015` menurunkan `project_id` dari `task_id`, bukan dari body client.
- `author_id` komentar berasal dari sesi, bukan dari body (`EP-014`).
- `owner` dan `member` tidak pernah menjadi input yang dipercaya.
- Service role key hanya digunakan server-side dan tidak boleh dikirim ke client dalam props, JSON, atau bundle.

### 4.3 Transport dan penyimpanan

- Semua endpoint memakai HTTPS (`API.md`).
- Cookie sesi memakai `HttpOnly`, `Secure`, dan `SameSite=Lax`.
- Token sesi tidak disimpan di `localStorage` dan tidak dikembalikan di body response.
- Data disimpan di PostgreSQL Supabase. Enkripsi at-rest, backup, dan retensi adalah kontrol platform yang harus diverifikasi pada konfigurasi Supabase; SpecModel tidak menetapkan enkripsi kolom tambahan.
- RLS digunakan sebagai lapisan tambahan. Guard server tetap menjadi kontrol utama.

### 4.4 Siklus hidup data

- Mengeluarkan member menghapus baris `project_members`, tetapi `tasks` dan `comments` tetap ada; nama penulis tetap tampil (`BR-004`).
- Menghapus tugas menghapus tugas dan komentar terkait (`EP-013`, `REQ-012`).
- Laporan mingguan dihitung saat dibaca dari `tasks`; tidak ada tabel laporan terpisah (`BR-005`).
- Tidak ada endpoint penghapusan akun atau proyek di SpecModel. Kebijakan retensi dan penghapusan dicatat di Open Questions.

### 4.5 Pencegahan kebocoran

- Response error tidak boleh memuat stack trace, query SQL, token, daftar pengguna, atau data proyek lain (`API.md`).
- `EP-004` selalu memberi pesan netral untuk mencegah enumerasi akun.
- `EP-009` hanya mencocokkan email persis dan tidak menampilkan daftar pengguna (`BR-006`).
- `403` dan `404` mengikuti kontrak: resource tidak ada `404`; proyek ada tetapi bukan hak pengguna `403`.
- Log tidak boleh memuat password, cookie, token reset, service role key, atau isi komentar/tugas secara penuh.

### 4.6 Acceptance test perlindungan data

| Test | Ekspektasi | Referensi |
|---|---|---|
| Periksa `Set-Cookie` login | `HttpOnly`, `Secure`, `SameSite=Lax` | `REQ-002` |
| Periksa `localStorage` setelah login | Tidak ada token sesi | `REQ-002` |
| Non-anggota membuka `EP-007` | Tidak ada tugas atau komentar yang dikembalikan | `REQ-005`, `REQ-015` |
| Response error `403` | Tidak ada stack, SQL, token, atau data proyek lain | `API.md` |
| Mantan member membuka proyek | `403`; data historis tetap untuk anggota | `REQ-008`, `BR-004` |
| Hapus tugas | Komentar terkait tidak lagi tersedia | `REQ-012`, `EP-013` |
| Periksa bundle client | Tidak ada service role key atau Resend API key | Bagian 6 |

## 5. Input Validation

### 5.1 Prinsip validasi

- Validasi dilakukan di server dengan Zod untuk body, path, dan query (`REQ-001`, `REQ-006`, `REQ-010`, `REQ-013`).
- Validasi client hanya untuk UX dan tidak boleh menjadi satu-satunya kontrol.
- Path ID harus UUID; path yang bukan UUID ditolak `400`.
- Body `POST`/`PATCH` harus berupa JSON object. `GET` dan `DELETE` tidak membaca body.
- Field yang tidak didokumentasikan tidak diproses dan tidak boleh mengubah data.
- Server tidak menerima `role`, `author_id`, `user_id` pelaku, atau `owner_id` dari client.
- Boolean harus JSON `true`/`false`, bukan string.
- Timestamp response memakai ISO 8601 UTC; tanggal query memakai `YYYY-MM-DD`.

### 5.2 Aturan per endpoint

| EP | Input | Aturan validasi |
|---|---|---|
| `EP-001` | `email`, `password`, `display_name` | Email valid dan unik; password minimal 8 karakter; `display_name` wajib; `409` untuk email duplikat |
| `EP-002` | `email`, `password` | Email valid; password wajib; `401` jika tidak cocok |
| `EP-004` | `email` | Email valid; response selalu `202` netral |
| `EP-006` | `name`, `description` | `name` wajib dan tidak boleh kosong; `description` opsional dan boleh string kosong (`REQ-004`, `REQ-006`) |
| `EP-007` | `project_id`; query `q`, `status`, `assignee_id` | `project_id` UUID; `assignee_id` UUID jika ada; filter tidak boleh mengembalikan tugas proyek lain (`REQ-016`) |
| `EP-008` | `name?`, `description?`, `new_owner_id?` | `name` tidak boleh kosong jika dikirim; `new_owner_id` UUID dan member aktif; hanya owner |
| `EP-009` | `email` | Email valid; pencocokan persis; tidak ada pencarian sebagian (`BR-006`) |
| `EP-010` | `project_id`, `user_id` | Keduanya UUID; target harus member; owner tidak dapat mengeluarkan diri sendiri |
| `EP-011` | `title`, `description`, `assignee_id` | `title` wajib; `description` wajib dan boleh string kosong; `assignee_id` UUID dan anggota proyek (`REQ-010`) |
| `EP-012` | `title?`, `description?`, `assignee_id?`, `is_completed?` | `is_completed` boolean; `assignee_id` harus anggota proyek; member hanya boleh mengirim `is_completed` untuk tugas miliknya (`BR-003`) |
| `EP-013` | `task_id` | UUID; hanya owner |
| `EP-014` | `body` | Wajib dan tidak boleh kosong; `author_id` berasal dari sesi (`REQ-013`) |
| `EP-015` | `week_start` | Format `YYYY-MM-DD` dan harus hari Senin (`REQ-014`) |

### 5.3 Penanganan konten

- `comments.body`, `profiles.display_name`, `projects.name`, `projects.description`, `tasks.title`, dan `tasks.description` diperlakukan sebagai teks.
- Output di-escape oleh React. Jangan memakai `dangerouslySetInnerHTML` untuk field entity tersebut.
- Komentar tidak dirender sebagai HTML atau Markdown mentah pada MVP.
- Query database tidak boleh disusun dari string input. Gunakan Supabase client yang memparameterisasi query.
- Batas panjang `display_name`, `name`, `description`, `title`, dan `body` komentar belum ditetapkan; lihat Open Questions.

### 5.4 Acceptance test validasi

| Test | Ekspektasi | Referensi |
|---|---|---|
| `EP-007` dengan `project_id` bukan UUID | `400` | `API.md` |
| `EP-001` password kurang dari 8 karakter | `400` | `REQ-001` |
| `EP-006` `name` kosong | `400` | `REQ-006` |
| `EP-011` `assignee_id` bukan anggota | `400` | `REQ-010` |
| `EP-012` member mengirim `title` | `403` | `REQ-011` |
| `EP-012` `is_completed` berupa string | `400` | `API.md` |
| `EP-014` `body` kosong | `400` | `REQ-013` |
| `EP-015` `week_start` bukan Senin | `400` | `REQ-014` |
| `EP-008` mengirim field `role` | Field tidak diproses; role tidak berubah | `BR-002` |

## 6. Secrets Management

### 6.1 Inventaris secret

| Secret | Fungsi | Lokasi yang diizinkan | Aturan |
|---|---|---|---|
| Supabase service role key | Akses server ke database; dapat melewati RLS | Environment Vercel server | Hanya server; tidak boleh ke client, log, atau repo; rotasi jika bocor |
| Kredensial database Supabase | Koneksi PostgreSQL | Environment server/Supabase | Hanya server; akses terbatas |
| Resend API key | Pengiriman email reset | Environment Vercel server | Hanya server; tidak boleh ke client |
| Kredensial Supabase Auth | Pengelolaan identitas dan reset password | Supabase | Dikelola sebagai konfigurasi platform; akses terbatas |
| Konfigurasi publik Supabase | URL dan kunci publik jika dipakai client | Client | Bukan rahasia; bukan pengganti otorisasi; RLS dan guard server tetap wajib |

### 6.2 Aturan penanganan

- Secret hanya disimpan di environment Vercel dan konfigurasi Supabase, tidak di repository, tangkapan layar, tiket, atau dokumen.
- Hanya nilai yang memang publik yang boleh memakai prefix `NEXT_PUBLIC_`. Service role key dan Resend API key tidak boleh memakai prefix tersebut.
- Service role key tidak boleh dikirim ke browser, disematkan di Server Component props, atau ditulis ke response.
- Token reset password tidak disimpan aplikasi; aplikasi tidak menerima token tersebut melalui endpoint `EP-001`–`EP-015`.
- Log aplikasi tidak boleh mencetak secret, cookie, password, atau tautan reset.
- Akses ke dashboard Supabase dan Vercel dibatasi dan menggunakan autentikasi platform.

### 6.3 Jika secret bocor

1. Rotasi secret yang terdampak.
2. Audit log akses dan perubahan data.
3. Periksa build output dan bundle client untuk memastikan secret tidak terkirim.
4. Jika service role key bocor, anggap seluruh database berisiko; rotasi, tinjau perubahan data, dan batasi akses.
5. Perbarui environment dan lakukan redeploy.

### 6.4 Acceptance test secret

| Test | Ekspektasi |
|---|---|
| Cari service role key dan Resend key di bundle client | Tidak ditemukan |
| Cari secret di repository dan file `.env` yang tercommit | Tidak ditemukan |
| Periksa response error | Tidak memuat secret, token, atau credential |
| Periksa log login/reset | Tidak memuat password, cookie, atau tautan reset |
| Rotasi secret setelah simulasi kebocoran | Secret lama tidak berlaku |

## 7. Logging & Monitoring

### 7.1 Event yang wajib dicatat

| Event | Data minimum | Yang tidak boleh dicatat |
|---|---|---|
| Signup sukses/gagal | Status, `user_id` jika dibuat, request ID | Password |
| Login sukses/gagal | Status, `user_id` jika diketahui, IP/user-agent jika tersedia | Password, cookie, token |
| Logout | `user_id`, status | Cookie |
| Permintaan reset password | Status, email dalam bentuk terbatas atau `user_id` jika diketahui | Token, tautan reset |
| Akses ditolak `401`/`403` | `user_id` jika ada, `project_id`, EP, status, request ID | Body tugas/komentar, data proyek lain |
| Aksi owner | `user_id`, `project_id`, aksi, ID target, status | Isi konten lengkap |
| Perubahan status tugas oleh member | `user_id`, `task_id`, `project_id`, status | Isi konten lengkap |
| Error server `5xx` | EP, request ID, kode error | Stack trace di response; stack hanya di log server terbatas |
| Error laporan mingguan | `project_id`, `week_start`, status | Isi tugas |

### 7.2 Audit dan keterbatasan

SpecModel tidak memiliki entity audit log. Log aplikasi dan platform Vercel/Supabase adalah sumber yang tersedia, tetapi bukan bukti yang tamper-proof. Aksi destruktif owner, seperti menghapus tugas atau mengeluarkan member, harus tercatat minimal sebagai event log operasional. Kebutuhan audit log persisten, retensi, dan akses dibahas di Open Questions.

### 7.3 Alarm yang perlu dipantau

- Lonjakan `401` pada `EP-002` dan endpoint terproteksi: indikasi brute force atau sesi tidak valid.
- Lonjakan `403` pada `EP-007`–`EP-015`: indikasi percobaan akses lintas proyek atau eskalasi role.
- Lonjakan `409` pada `EP-001` dan `404`/`409` pada `EP-009`: indikasi enumerasi email.
- Lonjakan `202` pada `EP-004`: indikasi email bombing atau penyalahgunaan reset.
- Kenaikan `5xx`, kegagalan Supabase Auth, kegagalan Resend, dan error laporan mingguan.

Ambang alarm, retensi log, dan siapa yang boleh mengakses log belum ditetapkan; lihat Open Questions.

### 7.4 Acceptance test logging

| Test | Ekspektasi |
|---|---|
| Percobaan akses proyek lain pada `EP-007` | Tercatat `403` dengan `user_id`, `project_id`, EP; tanpa isi tugas/komentar |
| Login gagal | Tercatat `401`; tidak ada password atau cookie |
| Permintaan reset password | Tercatat `202`; tidak ada token atau tautan reset |
| Transfer kepemilikan | Tercatat aktor, proyek, owner lama/baru, status |
| Hapus tugas | Tercatat aktor, `task_id`, `project_id`, status |

## 8. Open Questions

1. **Verifikasi email:** Apakah verifikasi email Supabase diaktifkan saat pendaftaran? Jika tidak, pendaftar dapat memakai email yang tidak ia miliki; karena `EP-009` mencocokkan email persis, ini berdampak pada keamanan penambahan member.
2. **Rate limiting dan account takeover:** Apakah `EP-001`, `EP-002`, `EP-004`, dan `EP-009` memerlukan rate limiting, lockout, atau kontrol tambahan? Tanpa itu, brute force, email bombing, dan enumerasi email tidak terkendali.
3. **Masa berlaku sesi:** Berapa masa berlaku dan idle timeout cookie? Apakah sesi dicabut setelah reset password? Member yang dikeluarkan sudah kehilangan akses per request, tetapi sesinya tetap authenticated.
4. **CSRF:** Apakah `SameSite=Lax` cukup untuk `EP-006`, `EP-008`–`EP-014`, atau diperlukan token CSRF terpisah?
5. **Batas input dan ukuran respons:** Berapa batas panjang `display_name`, `name`, `description`, `title`, dan `body` komentar? API MVP tidak memakai pagination; bagaimana mencegah respons besar dan penyalahgunaan free tier?
6. **Penghapusan dan retensi:** Tidak ada endpoint penghapusan akun atau proyek. Berapa lama `profiles.email`, `projects`, `tasks`, dan `comments` disimpan? Bagaimana kebijakan backup dan penghapusan data setelah member dikeluarkan?
7. **Audit log:** Apakah log Vercel/Supabase cukup sebagai bukti audit? Berapa retensi log, siapa yang boleh mengakses, dan apakah diperlukan entity audit persisten?
8. **Security headers dan CSP:** Belum ditetapkan di SpecModel. Apakah perlu CSP dan header keamanan lain sebagai pertahanan tambahan terhadap XSS?
9. **Cakupan RLS:** Kebijakan RLS per tabel dan test negatif belum dirinci. Pastikan RLS tidak membocorkan data proyek dan service role key tidak dipakai di client.
10. **Edit/hapus komentar:** SpecModel belum memutuskan apakah komentar permanen atau dapat diedit/dihapus. Keputusan ini memengaruhi moderasi, audit, dan konsistensi data historis.
11. **Tugas milik mantan member:** Setelah member dikeluarkan, apakah tugas yang masih menunjuk `assignee_id` mantan member tetap terbuka sampai owner mengganti assignee, atau otomatis dilepas? Pastikan `assignee_id` baru selalu anggota proyek.
12. **Zona waktu laporan:** Zona waktu default laporan mingguan belum ditetapkan; usulan Asia/Jakarta perlu dikonfirmasi. Ini memengaruhi integritas periode laporan.
13. **Akses operasional:** Siapa yang memegang akses ke dashboard Supabase dan Vercel, bagaimana rotasi secret, dan bagaimana least privilege diterapkan untuk service role key?
14. **Enumerasi email:** `EP-001` mengembalikan `409` dan `EP-009` mengembalikan `404`/`409`, sehingga keberadaan email dapat diketahui. Apakah ini diterima dengan rate limiting dan pembatasan akses owner, atau pesan perlu diseragamkan?