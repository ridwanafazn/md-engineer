# BUSINESS_RULES.md — KerjaTim

| Field | Nilai |
|---|---|
| Nama dokumen | BUSINESS_RULES.md |
| Produk | KerjaTim |
| Versi | 1.0 |
| Status | Siap untuk review |
| Sumber kebenaran | SpecModel proyek KerjaTim |
| Cakupan | Format aturan, business rules, validation rules, authorization rules, exception handling |
| Dokumen terkait | REQUIREMENTS.md, USER_FLOW.md |
| Entity kanonik | `profiles`, `projects`, `project_members`, `tasks`, `comments` |
| ID kanonik | `REQ-001`–`REQ-017`, `EP-001`–`EP-015`, `BR-001`–`BR-006` |

Dokumen ini mendokumentasikan aturan bisnis, validasi, otorisasi, dan konsekuensi kegagalan pada produk KerjaTim. SpecModel adalah satu-satunya sumber kebenaran. Dokumen ini tidak menambahkan entity, endpoint, role, requirement, atau business rule baru. Seluruh business rule merujuk pada `BR-001`–`BR-006` yang sudah ada di SpecModel; uraian di bawah adalah penjabaran operasional dan kriteria verifikasi, bukan aturan tambahan. Jika terjadi konflik antara dokumen ini dan SpecModel, SpecModel menang.

## 1. Rule Format

### 1.1 Struktur penulisan aturan

Setiap aturan ditulis dalam format berikut:

- **Pernyataan:** satu kalimat normatif yang dapat diuji, memakai aktor dan entity kanonik.
- **Cakupan:** entity, endpoint (`EP-NNN`), dan requirement (`REQ-NNN`) yang terpengaruh.
- **Pemicu:** aksi atau kondisi yang menyebabkan aturan dievaluasi.
- **Verifikasi:** cara menguji bahwa aturan ditegakkan, termasuk status HTTP yang diharapkan.
- **Konsekuensi:** efek yang harus terjadi pada data dan akses ketika aturan dilanggar atau dipenuhi.
- **Rujukan:** ID kanonik asal aturan.

### 1.2 Penomoran

| Jenis ID | Bentuk | Sumber | Contoh |
|---|---|---|---|
| Business rule | `BR-NNN` | SpecModel | `BR-003` |
| Requirement | `REQ-NNN` | SpecModel | `REQ-011` |
| Endpoint | `EP-NNN` | SpecModel | `EP-012` |
| Validasi | `VR-NNN` | **Lokal dokumen ini** | `VR-012` |

`VR-NNN` adalah pengenal lokal untuk memetakan validasi ke requirement dan endpoint kanonik. `VR-NNN` bukan requirement baru, bukan business rule baru, dan tidak boleh dipakai sebagai referensi di dokumen lain.

### 1.3 Urutan evaluasi aturan

Setiap permintaan ke endpoint terproteksi dievaluasi berurutan dan berhenti pada kegagalan pertama:

1. **Sesi** — apakah ada cookie sesi valid; jika tidak, `401` (`REQ-015`).
2. **Validasi skema** — Zod memeriksa tipe, field wajib, dan format pada body/query/path; jika gagal, `400`.
3. **Keberadaan resource** — apakah `project_id`, `task_id`, atau `user_id` yang dituju ada; jika tidak, `404`.
4. **Keanggotaan** — apakah pengguna memiliki baris `project_members` pada proyek terkait; jika tidak, `403` (`REQ-015`).
5. **Role dan batas aksi** — apakah role `owner`/`member` mengizinkan aksi tersebut (`BR-002`, `BR-003`).
6. **Aturan domain** — invarian data, misalnya tepat satu owner (`BR-001`) atau assignee harus anggota proyek (`REQ-010`).
7. **Efek samping** — penyimpanan data, pembaruan `updated_at`, atau pengiriman email reset.

Pemeriksaan pada client tidak dihitung sebagai kontrol keamanan. Role yang dikirim dari client diabaikan; role selalu dibaca dari `project_members` di server.

### 1.4 Kode status kontrak

| Kode | Makna | Konsekuensi state |
|---|---|---|
| `200` | Berhasil, data dikembalikan | Tidak ada perubahan state |
| `201` | Resource dibuat | Satu baris baru tersimpan |
| `202` | Permintaan reset diterima | Email dikirim bila email terdaftar |
| `204` | Berhasil tanpa body | Baris dihapus atau cookie sesi dihapus |
| `400` | Validasi input gagal | Tidak ada perubahan state |
| `401` | Tanpa sesi valid atau kredensial salah | Tidak ada sesi dibuat |
| `403` | Terautentikasi tetapi tidak berwenang | Tidak ada perubahan state |
| `404` | Resource/email tujuan tidak ditemukan | Tidak ada perubahan state |
| `409` | Konflik data | Tidak ada duplikasi dibuat |

## 2. Business Rules

### BR-001 — Tepat satu owner per proyek

- **Pernyataan:** Setiap proyek memiliki tepat satu owner yang disimpan sebagai `project_members.role = owner`.
- **Cakupan:** `projects`, `project_members`; `EP-006`, `EP-008`, `EP-010`; `REQ-004`, `REQ-008`, `REQ-009`.
- **Pemicu:** pembuatan proyek, transfer kepemilikan, pengeluaran member.
- **Verifikasi:** setelah `EP-006`, jumlah baris `project_members` dengan `role = owner` untuk proyek tersebut harus tepat 1. Setelah `EP-008` dengan `new_owner_id` valid, jumlah owner tetap 1, owner lama berubah menjadi `member`, owner baru menjadi `owner`, dan tidak ada kondisi dua owner di antara kedua langkah.
- **Konsekuensi:** transfer kepemilikan wajib atomik. Permintaan yang akan menghasilkan dua owner atau nol owner ditolak dan tidak boleh meninggalkan state setengah jadi. Karena hanya ada satu owner, `EP-010` terhadap baris owner hanya mungkin mengenai diri sendiri dan selalu ditolak (`REQ-008`).

### BR-002 — Role bersifat per proyek

- **Pernyataan:** Role ditentukan per proyek; satu pengguna dapat menjadi `owner` di satu proyek dan `member` di proyek lain.
- **Cakupan:** `project_members`; seluruh `EP-005`–`EP-015`; `REQ-015`.
- **Pemicu:** setiap pengecekan otorisasi.
- **Verifikasi:** pengguna yang menjadi `member` di proyek A dapat membuat proyek B melalui `EP-006` dan menjadi `owner` di B (`REQ-004`). Permintaan ke `EP-008` pada proyek A harus `403`, sedangkan pada proyek B harus berhasil.
- **Konsekuensi:** setiap pemeriksaan wajib menyertakan pasangan `project_id` + `user_id` dari sesi. Tidak ada role global. `EP-005` hanya mengembalikan proyek tempat pengguna memiliki baris `project_members`.

### BR-003 — Batas kewenangan member pada tugas

- **Pernyataan:** Member hanya boleh mengubah `is_completed` pada tugas dengan `assignee_id` miliknya; mengubah konten, mengganti `assignee_id`, atau menghapus tugas hanya boleh dilakukan owner.
- **Cakupan:** `tasks`; `EP-012`, `EP-013`; `REQ-011`, `REQ-012`.
- **Pemicu:** `PATCH /api/tasks/{task_id}` dan `DELETE /api/tasks/{task_id}`.
- **Verifikasi:** empat kasus wajib lulus: (a) member mengirim hanya `is_completed` untuk tugas miliknya → `200`; (b) member mengirim `is_completed` untuk tugas dengan `assignee_id` orang lain → `403`; (c) member mengirim `title`, `description`, atau `assignee_id` → `403` walaupun tugas itu miliknya; (d) member memanggil `EP-013` → `403`. Owner pada keempat kasus berhasil.
- **Konsekuensi:** payload member yang memuat field terlarang ditolak seluruhnya; tidak ada penerapan sebagian. Perubahan `is_completed` yang diterima memperbarui `tasks.updated_at` (`REQ-011`) sehingga memengaruhi `BR-005`.

### BR-004 — Mengeluarkan member tidak menghapus data historis

- **Pernyataan:** Mengeluarkan member menghapus baris `project_members`, tetapi `tasks` dan `comments` tetap ada; nama penulis diambil dari `profiles`.
- **Cakupan:** `project_members`, `tasks`, `comments`, `profiles`; `EP-010`; `REQ-008`.
- **Pemicu:** `DELETE /api/projects/{project_id}/members/{user_id}` oleh owner.
- **Verifikasi:** setelah `204`, mantan member mendapat `403` saat memanggil `EP-007`–`EP-015`; daftar komentar pada tugas terkait tetap menampilkan `display_name` penulis; jumlah baris `comments` dan `tasks` tidak berubah.
- **Konsekuensi:** hanya satu baris `project_members` yang dihapus. Tugas yang masih menunjuk `assignee_id` mantan member tetap ada dan tetap menampilkan penanggung jawab tersebut; owner perlu menetapkan ulang penanggung jawab. Penanganan lanjutan tugas tersebut dicatat pada Open Questions.

### BR-005 — Laporan mingguan memakai status terkini

- **Pernyataan:** Laporan mingguan memakai `is_completed` terkini dan memasukkan tugas yang `created_at` **atau** `updated_at` berada dalam periode Senin–Minggu pada zona waktu yang disepakati.
- **Cakupan:** `tasks`, `projects`, `project_members`; `EP-015`; `REQ-014`.
- **Pemicu:** `GET /api/projects/{project_id}/reports/weekly?week_start=YYYY-MM-DD`.
- **Verifikasi:** tugas yang dibuat dan diperbarui pada minggu yang sama muncul tepat satu kali. Tugas yang dibuat minggu lalu tetapi statusnya diubah minggu ini muncul di minggu ini dan dikelompokkan menurut `is_completed` terbaru. Tugas di luar periode tidak muncul. Respons memuat `week_start`, `week_end`, `completed_tasks`, `incomplete_tasks`.
- **Konsekuensi:** tidak ada snapshot status historis; laporan dapat berubah bila status tugas berubah. `week_end` adalah `week_start + 6 hari`. Non-anggota mendapat `403`.

### BR-006 — Penambahan member hanya melalui email persis

- **Pernyataan:** Penambahan member hanya melalui pencocokan `profiles.email` secara persis dan sistem tidak menampilkan daftar pengguna.
- **Cakupan:** `profiles`, `project_members`; `EP-009`; `REQ-007`.
- **Pemicu:** `POST /api/projects/{project_id}/members` dengan body `email`.
- **Verifikasi:** email yang tidak cocok menghasilkan `404`; email yang cocok dan belum menjadi anggota menghasilkan `201` dengan `role = member`; email yang sudah menjadi anggota menghasilkan `409`. Tidak ada endpoint atau UI pemilihan dari daftar pengguna.
- **Konsekuensi:** pencarian sebagian (substring) dan autocomplete pengguna tidak didukung pada MVP. Pesan `404` tidak boleh mengungkap data profil lain di luar status ketidakcocokan.

### 2.1 Perilaku turunan langsung dari requirement

| Perilaku | Sumber | Konsekuensi bila dilanggar |
|---|---|---|
| Pembuat proyek otomatis menjadi `owner` pada `project_members` | `REQ-004`, `EP-006` | Proyek tanpa owner melanggar `BR-001` |
| Tugas baru selalu `is_completed = false` | `REQ-010`, `EP-011` | Status awal tidak konsisten dengan kontrak endpoint |
| `assignee_id` harus anggota proyek | `REQ-010` | `400` dan tugas tidak dibuat |
| `author_id` komentar berasal dari sesi, bukan body (`EP-014` hanya menerima `body`) | `REQ-013`, `EP-014` | Komentar dengan penulis palsu |
| Komentar ditampilkan kronologis dengan `display_name` | `REQ-013` | Urutan dan atribusi salah |
| Transfer kepemilikan hanya kepada member aktif | `REQ-009` | `new_owner_id` non-anggota ditolak |
| Owner tidak dapat mengeluarkan dirinya sendiri | `REQ-008` | `403`; kepemilikan harus dialihkan lebih dulu |
| Menghapus tugas menghapus komentar terkait | `EP-013`, `REQ-012` | Komentar yatim tidak boleh tersisa |

## 3. Validation Rules

Semua validasi dijalankan di server dengan Zod. Kegagalan validasi selalu `400` dan tidak mengubah state. Field wajib mengikuti entity SpecModel.

| ID | Field / input | Aturan | Error | Rujukan |
|---|---|---|---|---|
| `VR-001` | `email` (signup) | Wajib, format email valid | `400` | `REQ-001`, `EP-001` |
| `VR-002` | `password` (signup) | Wajib, minimal 8 karakter | `400` | `REQ-001`, `EP-001` |
| `VR-003` | `display_name` | Wajib terisi, bukan string kosong | `400` | `REQ-001`, `EP-001` |
| `VR-004` | `email` (signup) | Harus unik di `profiles`/Supabase Auth | `409` | `REQ-001`, `EP-001` |
| `VR-005` | `email` + `password` (login) | Wajib; kredensial diverifikasi ke Supabase Auth | `400` bila kosong, `401` bila salah | `REQ-002`, `EP-002` |
| `VR-006` | `email` (forgot) | Format valid; email tidak terdaftar tetap `202` netral | `400` untuk format salah, `202` untuk kasus lain | `REQ-003`, `EP-004` |
| `VR-007` | `projects.name` | Wajib, tidak boleh string kosong | `400` | `REQ-006`, `EP-006`, `EP-008` |
| `VR-008` | `projects.description` | Wajib berupa string; string kosong valid | `400` bila bukan string | entity `projects` |
| `VR-009` | `email` (tambah member) | Wajib, dicocokkan persis ke `profiles.email` | `400` format, `404` tidak cocok | `BR-006`, `EP-009` |
| `VR-010` | Keanggotaan ganda | Pengguna yang sudah ada di `project_members` tidak boleh ditambah lagi | `409` | `REQ-007`, `EP-009` |
| `VR-011` | `tasks.title` | Wajib, tidak boleh string kosong | `400` | `REQ-010`, `EP-011` |
| `VR-012` | `tasks.description` | Wajib berupa string; string kosong valid | `400` bila bukan string | entity `tasks` |
| `VR-013` | `tasks.assignee_id` | Wajib, UUID valid, dan merupakan anggota proyek | `400` | `REQ-010`, `EP-011` |
| `VR-014` | `tasks.is_completed` | Boolean; hanya `true`/`false` | `400` | `REQ-011`, `EP-012` |
| `VR-015` | `comments.body` | Wajib, tidak boleh kosong setelah trim | `400` | `REQ-013`, `EP-014` |
| `VR-016` | `week_start` | Format `YYYY-MM-DD` dan harus hari Senin | `400` | `REQ-014`, `EP-015` |
| `VR-017` | Query `q`, `status`, `assignee_id` | `status` boolean; `assignee_id` UUID anggota proyek; kombinasi filter bersifat AND | `400` | `REQ-016`, `EP-007` |
| `VR-018` | Path param `project_id`, `task_id`, `user_id` | Harus UUID valid | `400` | `EP-007`–`EP-015` |

Catatan: `projects.description` dan `tasks.description` wajib ada sebagai field tetapi boleh berisi string kosong, sesuai entity SpecModel. `EP-008` dan `EP-012` menerima field opsional; field yang tidak dikirim tidak diubah.

## 4. Authorization Rules

### 4.1 Matriks akses per endpoint

| Endpoint | Tanpa sesi | Anggota proyek (`owner`/`member`) | Non-anggota |
|---|---|---|---|
| `EP-001` POST `/api/auth/signup` | Diizinkan | Diizinkan | Diizinkan |
| `EP-002` POST `/api/auth/login` | Diizinkan | Diizinkan | Diizinkan |
| `EP-003` POST `/api/auth/logout` | `401` | Diizinkan | Diizinkan (tanpa proyek) |
| `EP-004` POST `/api/auth/password/forgot` | Diizinkan, `202` netral | Diizinkan | Diizinkan |
| `EP-005` GET `/api/projects` | `401` | Hanya proyek yang diikuti | `200` dengan daftar proyeknya sendiri |
| `EP-006` POST `/api/projects` | `401` | Diizinkan; pelaku menjadi `owner` proyek baru | Diizinkan |
| `EP-007` GET `/api/projects/{project_id}` | `401` | Diizinkan | `403` |
| `EP-008` PATCH `/api/projects/{project_id}` | `401` | Hanya `owner`; `member` → `403` | `403` |
| `EP-009` POST `/api/projects/{project_id}/members` | `401` | Hanya `owner` | `403` |
| `EP-010` DELETE `/api/projects/{project_id}/members/{user_id}` | `401` | Hanya `owner`; target harus `member`; diri sendiri → `403` | `403` |
| `EP-011` POST `/api/projects/{project_id}/tasks` | `401` | Diizinkan (`owner` dan `member`) | `403` |
| `EP-012` PATCH `/api/tasks/{task_id}` | `401` | `owner` semua field; `member` hanya `is_completed` miliknya | `403` |
| `EP-013` DELETE `/api/tasks/{task_id}` | `401` | Hanya `owner` | `403` |
| `EP-014` POST `/api/tasks/{task_id}/comments` | `401` | Diizinkan | `403` |
| `EP-015` GET `/api/projects/{project_id}/reports/weekly` | `401` | Diizinkan | `403` |

### 4.2 Aturan otorisasi operasional

- **AR-01 — Sesi adalah sumber identitas.** `user_id` selalu diambil dari sesi cookie, tidak pernah dari body atau query. Cookie bersifat `HttpOnly`, `Secure`, `SameSite=Lax`; token sensitif tidak disimpan di `localStorage`.
- **AR-02 — Keanggotaan menentukan akses proyek.** Satu baris `project_members` yang cocok membuka akses `EP-007`–`EP-016` sesuai role. Tidak ada akses berbasis kepemilikan proyek di luar `project_members` (`BR-002`).
- **AR-03 — Aksi khusus owner.** Mengubah proyek, mentransfer kepemilikan, mengelola anggota, mengubah konten tugas, dan menghapus tugas hanya untuk `owner` (`REQ-006`–`REQ-009`, `REQ-011`, `REQ-012`).
- **AR-04 — Aksi khusus member.** `member` hanya memiliki tambahan kewenangan mengubah `is_completed` pada tugas dengan `assignee_id` dirinya (`BR-003`). Semua anggota proyek boleh membuat tugas dan komentar.
- **AR-05 — Kepemilikan tidak dapat dilepas tanpa pengganti.** Owner tidak dapat mengeluarkan dirinya sendiri; kepemilikan harus dialihkan ke member aktif melalui `EP-008` (`REQ-008`, `REQ-009`).
- **AR-06 — Pertahanan berlapis.** Row Level Security Supabase diterapkan sebagai lapisan tambahan; RLS tidak menggantikan pemeriksaan `project_members` di server (`REQ-015`).

## 5. Exception Handling

### 5.1 Pemetaan kondisi ke respons

| Kondisi | Status | Respons dan efek state |
|---|---|---|
| Body/query tidak lolos skema Zod | `400` | Pesan validasi per field; tidak ada baris dibuat/diubah |
| `project_id`/`task_id`/`user_id` tidak ada | `404` | Tidak ada perubahan state |
| Tanpa cookie sesi valid pada endpoint terproteksi | `401` | Tidak ada sesi dibuat; pengguna diarahkan ke login |
| Kredensial login salah | `401` | Tidak ada cookie sesi |
| Terautentikasi tetapi bukan anggota proyek | `403` | Data proyek tidak dikembalikan |
| `member` melakukan aksi khusus owner | `403` | Payload tidak diterapkan sebagian |
| `member` mengubah field terlarang pada tugas | `403` | Tidak ada field yang berubah, termasuk `is_completed` |
| Email member tidak ditemukan | `404` | Tidak ada baris `project_members` dibuat |
| Email member sudah terdaftar / sudah anggota | `409` | Tidak ada duplikasi |
| Email signup sudah terdaftar | `409` | Tidak ada akun baru |
| Reset password untuk email apa pun | `202` | Pesan netral; tidak membocorkan status akun |

### 5.2 Atomisitas dan integritas

- **Transfer kepemilikan (`BR-001`):** perubahan owner lama menjadi `member` dan owner baru menjadi `owner` harus berada dalam satu transaksi. Kegagalan di tengah proses harus rollback; state dengan dua owner atau nol owner tidak boleh tersimpan.
- **Hapus tugas (`EP-013`):** tugas dan komentar terkait dihapus bersama; setelah `204`, komentar tidak boleh lagi tampil atau dapat diakses.
- **Keluarkan member (`BR-004`):** hanya baris `project_members` yang dihapus. `tasks` dan `comments` tidak boleh ikut terhapus, dan `display_name` penulis tetap tampil dari `profiles`.
- **Pembuatan proyek (`EP-006`):** baris `projects` dan baris `project_members` role `owner` harus dibuat bersama; proyek tanpa owner melanggar `BR-001`.
- **Perubahan `is_completed` (`REQ-011`):** pembaruan status wajib menyertakan pembaruan `tasks.updated_at`, karena nilai ini menentukan keanggotaan tugas pada laporan mingguan (`BR-005`).

### 5.3 Prinsip kebocoran informasi

- Respons `403` dan `404` tidak boleh memuat data proyek, tugas, komentar, atau profil yang tidak berhak diakses pemanggil.
- `EP-004` selalu `202` dengan pesan netral untuk email valid, terdaftar maupun tidak (`REQ-003`).
- `EP-009` tidak boleh mengembalikan daftar pengguna atau saran email; hanya status ketidakcocokan (`BR-006`).

### 5.4 Batas cakupan penanganan error

MVP tidak mencakup notifikasi, lampiran file, integrasi pihak ketiga, pembayaran, dan multi-workspace. Kondisi kegagalan di luar cakupan tersebut tidak dialihkan menjadi fitur baru dalam dokumen ini.

## 6. Open Questions

1. Zona waktu default laporan mingguan belum ditetapkan; usulan `Asia/Jakarta` perlu dikonfirmasi sebelum `BR-005` diuji dengan data lintas zona waktu.
2. Apakah verifikasi email Supabase diaktifkan saat pendaftaran, atau akun langsung aktif setelah `EP-001`?
3. Apakah komentar boleh diedit atau dihapus, atau bersifat permanen pada MVP? Saat ini `comments` hanya memiliki operasi tambah (`EP-014`).
4. Bagaimana penanganan tugas yang masih menunjuk mantan member setelah `EP-010`: dibiarkan sampai owner mengganti `assignee_id`, atau otomatis dilepas? `BR-004` menetapkan data tetap ada, tetapi tidak menetapkan perilaku assignee.
5. Untuk non-anggota, `REQ-005` mengizinkan `403` **atau** `404`. Perlu ditetapkan satu pilihan konsisten agar pengujian otorisasi tidak ambigu.
6. Pencocokan email pada `EP-009` disebut "persis"; apakah perbedaan huruf besar/kecil (case) dianggap cocok atau tidak?
7. Jika akun Supabase Auth berhasil dibuat tetapi penyimpanan `profiles` gagal pada `EP-001`, mekanisme kompensasi belum ditetapkan (rollback akun atau pembuatan profil ulang).