# API.md — KerjaTim

| Field | Nilai |
|---|---|
| Dokumen | API.md |
| Produk | KerjaTim |
| Sumber kebenaran | SpecModel proyek KerjaTim |
| Base path | `/api` |
| Auth | Supabase Auth email/password; sesi cookie SSR (`@supabase/ssr`) |
| Entity | `profiles`, `projects`, `project_members`, `tasks`, `comments` |
| Role | `owner`, `member`, per proyek |
| Endpoint | `EP-001`–`EP-015` |
| Requirement terkait | `REQ-001`–`REQ-017`, `BR-001`–`BR-006` |
| Format | JSON UTF-8 |
| Dependensi | `DATABASE.md`, `REQUIREMENTS.md`, `BUSINESS_RULES.md` |

Dokumen ini menetapkan kontrak HTTP untuk web app KerjaTim. API melayani aplikasi Next.js dan tidak menambahkan endpoint, entity, role, atau aturan produk di luar SpecModel. Jika terjadi perbedaan antara dokumen ini dan SpecModel, SpecModel adalah sumber kebenaran.

Kontrak ini mencakup autentikasi email/password, proyek, anggota proyek, tugas, komentar, dan laporan mingguan. Pembayaran, notifikasi, lampiran file, undangan email, multi-workspace, dan integrasi pihak ketiga tidak termasuk MVP dan tidak memiliki endpoint.

## 1. API Conventions

### 1.1 Transport, format, dan penamaan

- Semua endpoint memakai HTTPS dan base path `/api`.
- Request dan response memakai `application/json; charset=utf-8`. Request body wajib berupa JSON object untuk `POST` dan `PATCH` yang memiliki body. `GET` dan `DELETE` tidak membaca body.
- Nama field memakai `snake_case` dan sama dengan nama field entity di SpecModel. Contoh: `project_id`, `assignee_id`, `is_completed`, `display_name`.
- ID resource memakai UUID. Path parameter yang bukan UUID ditolak dengan `400`.
- Timestamp response memakai ISO 8601 UTC dengan sufiks `Z`, contoh `2025-04-07T09:15:00Z`.
- Tanggal query memakai `YYYY-MM-DD`, contoh `week_start=2025-04-07`.
- Boolean memakai JSON `true` atau `false`, bukan string. `tasks.is_completed` adalah satu-satunya field boolean pada kontrak ini.
- Field opsional dihilangkan dari body, bukan dikirim sebagai `null`. Field wajib yang bernilai `null` ditolak. `description` boleh berupa string kosong `""`.
- Field body yang tidak didokumentasikan tidak diproses dan tidak boleh mengubah data. Server tidak menerima `role`, `author_id`, `user_id` pelaku, atau `owner_id` dari client.
- Parameter query yang tidak didokumentasikan tidak diproses.
- Tidak ada pagination pada kontrak MVP. Endpoint daftar mengembalikan seluruh data yang memenuhi filter. Batas ukuran respons belum ditetapkan; lihat Open Questions.
- Urutan `tasks` tidak dijamin kecuali dinyatakan lain. Komentar selalu kronologis menurut `created_at`, lalu `id` sebagai tie-breaker.
- Tidak ada version segment pada path. Kontrak berlaku untuk MVP `/api`.

### 1.2 Respons sukses

- `200` untuk pembacaan, login, dan pembaruan yang berhasil.
- `201` untuk pembuatan resource: signup, proyek, member, tugas, dan komentar.
- `202` untuk permintaan reset password yang diterima dengan pesan netral.
- `204` untuk logout dan penghapusan member/tugas; body harus kosong.
- Respons sukses mengembalikan objek resource atau array resource secara langsung, tanpa envelope `data`. Pengecualian hanya `EP-006` yang mengembalikan representasi proyek beserta `role` pembuat.
- Cookie sesi hanya ditetapkan oleh `EP-002`; login mengembalikan user dan header `Set-Cookie`. Token sesi tidak dikembalikan di body.

### 1.3 Format error

Semua error dari endpoint mengembalikan bentuk berikut:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Hanya owner proyek yang dapat melakukan aksi ini.",
    "details": {}
  }
}
```

- `error.code` adalah kode stabil yang dipakai klien untuk percabangan.
- `error.message` adalah pesan manusiawi dan boleh berubah.
- `error.details` opsional. Bila ada, bentuknya object; contoh `{"field":"assignee_id"}`.
- Respons error tidak boleh memuat stack trace, query SQL, token, daftar pengguna, atau data proyek lain.
- Status HTTP tetap menjadi kontrak utama. Kode error dirinci di Section 5.

### 1.4 Validasi dan pemeriksaan akses

- Semua input divalidasi di server dengan Zod. Validasi berlaku untuk body, path parameter, query, dan tipe data.
- Untuk endpoint `auth: true`, server memeriksa sesi lebih dahulu. Tanpa sesi valid, respons `401`; body dan role tidak dievaluasi lebih lanjut.
- Untuk resource proyek, server memuat `project_members` berdasarkan `project_id` dan `user_id` dari sesi. Bukan anggota proyek menghasilkan `403`, bukan `200` dengan data kosong.
- `404` dipakai ketika resource yang diminta tidak ada. Project yang ada tetapi tidak diikuti pengguna menghasilkan `403` sesuai endpoint proyek.
- untuk endpoint tugas dan komentar, `project_id` diturunkan dari `task_id`; server tidak menerima `project_id` dari body.
- `owner` dan `member` adalah role per proyek (`BR-002`), bukan role global. Role dari client tidak pernah dipercaya.

## 2. Authentication & Authorization

### 2.1 Sesi autentikasi

KerjaTim memakai Supabase Auth dengan email dan password. Login membuat sesi cookie yang disimpan di server dan dikirim melalui cookie.

Ketentuan sesi:

- Cookie sesi wajib `HttpOnly`, `Secure`, dan `SameSite=Lax`.
- Token sesi tidak disimpan di `localStorage` dan tidak dikirim melalui body response.
- Logout menghapus cookie sesi. Setelah logout, halaman terproteksi mengarahkan pengguna ke login dan endpoint terproteksi mengembalikan `401`.
- Endpoint `auth: true` membutuhkan sesi valid. Endpoint `auth: false` tidak membutuhkan sesi.
- `EP-001` mendaftarkan akun melalui Supabase Auth dan membuat baris `profiles` dengan `id` yang sama dengan `auth.users.id`.
- `EP-004` meminta Supabase Auth mengirim tautan reset password. Aplikasi tidak menyimpan token reset sendiri. Penetapan password baru terjadi di alur Supabase Auth, bukan endpoint aplikasi pada `EP-001`–`EP-015`.
- Status verifikasi email belum ditetapkan di SpecModel; lihat Open Questions.

### 2.2 Role per proyek

Role disimpan di `project_members` dan berlaku per proyek:

- `owner`: pembuat proyek atau penerima transfer kepemilikan. Tepat satu owner per proyek (`BR-001`).
- `member`: anggota proyek yang mengerjakan tugas yang ditugaskan dan berkomentar.

Pembuat proyek otomatis menjadi owner pada `EP-006`. Kepemilikan dapat dialihkan melalui `EP-008`; owner lama menjadi `member` dan owner baru menjadi `owner` dalam satu transaksi. Role tidak disimpan di `projects.owner_id` dan tidak boleh dikirim client.

Mengeluarkan member melalui `EP-010` menghapus baris `project_members`, tetapi `tasks` dan `comments` tetap ada. Nama penulis tetap tampil dari `profiles.display_name` (`BR-004`). Tugas yang masih menunjuk mantan member tetap tersimpan sampai owner mengganti `assignee_id`; perilaku ini dicatat di Open Questions.

### 2.3 Matriks izin

| Aksi | Owner | Member |
|---|---|---|
| Melihat daftar proyek yang diikuti | Ya | Ya |
| Melihat detail proyek, anggota, tugas, komentar | Ya | Ya |
| Mengubah nama/deskripsi proyek | Ya | Tidak |
| Menambahkan member berdasarkan email persis | Ya | Tidak |
| Mengeluarkan member | Ya | Tidak |
| Mengalihkan kepemilikan proyek | Ya | Tidak |
| Membuat tugas | Ya | Ya |
| Mengubah semua field tugas | Ya | Tidak |
| Mengubah status tugas yang ditugaskan kepadanya | Ya, semua tugas | Ya, hanya tugas dengan `assignee_id` dirinya |
| Menghapus tugas | Ya | Tidak |
| Menambahkan komentar | Ya | Ya |
| Melihat laporan mingguan | Ya | Ya |
| Mencari/filter tugas pada detail proyek | Ya | Ya |

Owner juga dapat melakukan aksi yang diizinkan untuk member. Member tidak dapat melakukan aksi owner meskipun ia pembuat tugas atau penulis komentar.

### 2.4 Urutan pemeriksaan server

Setiap endpoint terproteksi mengikuti urutan berikut:

1. Ambil sesi dan `user_id`; jika tidak ada, `401`.
2. Validasi path, query, dan body; jika tidak valid, `400`.
3. Tentukan `project_id` dari path atau dari `task_id`.
4. Cek baris `project_members` untuk `(project_id, user_id)`; jika tidak ada, `403`.
5. Cek role owner/member sesuai aksi; jika tidak berwenang, `403`.
6. Untuk `EP-012`, jika pelaku member, pastikan body hanya berisi `is_completed` dan `tasks.assignee_id` sama dengan `user_id`; jika tidak, `403`.
7. Jalankan perubahan dalam transaksi bila melibatkan lebih dari satu baris, terutama transfer kepemilikan (`EP-008`).

Row Level Security Supabase dipakai sebagai lapisan pertahanan tambahan, bukan pengganti pemeriksaan server. Setiap endpoint tetap memeriksa keanggotaan dan role di server (`REQ-015`).

## 3. Endpoints

Semua endpoint di bawah berasal dari SpecModel. Endpoint `auth: true` dapat mengembalikan `401` bila cookie sesi tidak ada atau tidak valid; kondisi ini tidak diulang pada setiap butir endpoint.

Aturan error umum:

- Bukan anggota proyek: `403`, sesuai respons `EP-007` dan `EP-015`.
- Resource tidak ditemukan: `404`.
- Aksi khusus owner oleh member: `403`.
- Payload tidak valid: `400`.
- Konflik data: `409`.

### 3.1 Ringkasan endpoint

| ID | Method | Path | Auth | Akses | Ringkasan |
|---|---|---|---|---|---|
| `EP-001` | `POST` | `/api/auth/signup` | Tidak | Publik | Mendaftarkan akun Supabase Auth dan membuat profil |
| `EP-002` | `POST` | `/api/auth/login` | Tidak | Publik | Login email/password dan membuat cookie sesi |
| `EP-003` | `POST` | `/api/auth/logout` | Ya | Sesi valid | Menghapus cookie sesi |
| `EP-004` | `POST` | `/api/auth/password/forgot` | Tidak | Publik | Meminta tautan reset password via email |
| `EP-005` | `GET` | `/api/projects` | Ya | Pengguna login | Daftar proyek yang diikuti |
| `EP-006` | `POST` | `/api/projects` | Ya | Pengguna login | Membuat proyek; pembuat menjadi owner |
| `EP-007` | `GET` | `/api/projects/{project_id}` | Ya | Anggota proyek | Detail proyek, anggota, tugas, komentar, filter |
| `EP-008` | `PATCH` | `/api/projects/{project_id}` | Ya | Owner | Mengubah proyek dan/atau transfer kepemilikan |
| `EP-009` | `POST` | `/api/projects/{project_id}/members` | Ya | Owner | Menambah member berdasarkan email persis |
| `EP-010` | `DELETE` | `/api/projects/{project_id}/members/{user_id}` | Ya | Owner | Mengeluarkan member |
| `EP-011` | `POST` | `/api/projects/{project_id}/tasks` | Ya | Anggota proyek | Membuat tugas |
| `EP-012` | `PATCH` | `/api/tasks/{task_id}` | Ya | Owner semua field; member status sendiri | Mengubah tugas |
| `EP-013` | `DELETE` | `/api/tasks/{task_id}` | Ya | Owner | Menghapus tugas dan komentar terkait |
| `EP-014` | `POST` | `/api/tasks/{task_id}/comments` | Ya | Anggota proyek | Menambah komentar |
| `EP-015` | `GET` | `/api/projects/{project_id}/reports/weekly` | Ya | Anggota proyek | Laporan mingguan proyek |

### 3.2 Bentuk resource

`ProjectSummary`:

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "role": "owner",
  "member_count": 2
}
```

`Member`:

```json
{
  "id": "uuid",
  "project_id": "uuid",
  "user_id": "uuid",
  "display_name": "string",
  "role": "member",
  "joined_at": "2025-04-07T10:05:00Z"
}
```

`Task`:

```json
{
  "id": "uuid",
  "project_id": "uuid",
  "title": "string",
  "description": "string",
  "assignee_id": "uuid",
  "is_completed": false,
  "created_at": "2025-04-07T10:30:00Z",
  "updated_at": "2025-04-07T10:30:00Z"
}
```

`Comment`:

```json
{
  "id": "uuid",
  "task_id": "uuid",
  "author_id": "uuid",
  "display_name": "string",
  "body": "string",
  "created_at": "2025-04-07T11:00:00Z"
}
```

`ProjectDetail`:

```json
{
  "project": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "created_at": "2025-04-07T09:20:00Z",
    "updated_at": "2025-04-07T09:20:00Z"
  },
  "members": [],
  "tasks": []
}
```

Setiap item `tasks` pada `ProjectDetail` memakai bentuk `Task` ditambah `comments` berisi array `Comment`.

### 3.3 Detail endpoint

#### EP-001 — `POST /api/auth/signup`

- **Auth:** publik.
- **Request body:** `email` string valid dan unik; `password` string minimal 8 karakter; `display_name` string tidak kosong setelah trim.
- **Response 201:** object berisi `id`, `email`, `display_name`. Profil `profiles` dibuat dengan `id` yang sama dengan user Supabase Auth.
- **Error:** `400 VALIDATION_ERROR` untuk email tidak valid, password kurang dari 8 karakter, atau `display_name` kosong; `409 CONFLICT` bila email sudah terdaftar.

#### EP-002 — `POST /api/auth/login`

- **Auth:** publik.
- **Request body:** `email`, `password`.
- **Response 200:** object `id`, `email`, `display_name`, dan header `Set-Cookie` berisi cookie sesi.
- **Error:** `400 VALIDATION_ERROR` untuk payload tidak lengkap; `401 INVALID_CREDENTIALS` untuk email/password salah. Login gagal tidak membuat sesi.

#### EP-003 — `POST /api/auth/logout`

- **Auth:** sesi valid.
- **Request:** tanpa body.
- **Response 204:** cookie sesi dihapus; body kosong.
- **Error:** `401 UNAUTHENTICATED` bila tidak ada sesi valid.

#### EP-004 — `POST /api/auth/password/forgot`

- **Auth:** publik.
- **Request body:** `email`.
- **Response 202:** pesan netral, misalnya `{"message":"Jika email terdaftar, tautan reset telah dikirim."}`. Tautan hanya dikirim bila email terdaftar.
- **Error:** `400 VALIDATION_ERROR` untuk email tidak valid. Endpoint tidak mengembalikan `404` untuk email tidak terdaftar agar tidak membocorkan status akun.

#### EP-005 — `GET /api/projects`

- **Auth:** pengguna login.
- **Request:** tanpa body. Sesi cookie.
- **Response 200:** array `ProjectSummary`. Hanya proyek tempat pengguna memiliki baris `project_members`. `role` adalah role pengguna pada proyek tersebut; `member_count` menghitung seluruh baris `project_members`, termasuk owner.
- **Error:** `401 UNAUTHENTICATED`.
- **Catatan:** pengguna tanpa proyek menerima array kosong `[]`.

#### EP-006 — `POST /api/projects`

- **Auth:** pengguna login.
- **Request body:** `name` wajib string tidak kosong setelah trim; `description` opsional, default `""`.
- **Response 201:** `ProjectSummary` dengan `role` `owner` dan `member_count` `1`. Proyek dan baris `project_members` role owner dibuat secara atomik (`REQ-004`).
- **Error:** `400 VALIDATION_ERROR` bila nama kosong atau field bertipe salah; `401 UNAUTHENTICATED`.

#### EP-007 — `GET /api/projects/{project_id}`

- **Auth:** anggota proyek.
- **Request path:** `project_id` UUID.
- **Request query opsional:** `q` untuk substring case-insensitive pada `tasks.title`; `status` dengan nilai `completed` atau `incomplete` yang memetakan ke `tasks.is_completed`; `assignee_id` UUID. Semua filter digabung dengan logika AND. Filter `assignee_id` tidak mewajibkan assignee masih menjadi anggota karena tugas historis dapat menunjuk mantan member.
- **Response 200:** `ProjectDetail`. `members` berisi owner dan member; `tasks` hanya berisi tugas proyek yang cocok dengan filter; setiap task menyertakan komentar kronologisnya. Komentar diurutkan menurut `created_at` lalu `id`.
- **Error:** `400 VALIDATION_ERROR` untuk `project_id`/`assignee_id` bukan UUID atau nilai `status` tidak dikenal; `401 UNAUTHENTICATED`; `403 FORBIDDEN` bila pengguna bukan anggota proyek; `404 NOT_FOUND` bila proyek tidak ada.
- **Catatan:** query pencarian/filter berasal dari `REQ-016` yang berprioritas later, tetapi kontrak endpoint sudah mencantumkannya.

#### EP-008 — `PATCH /api/projects/{project_id}`

- **Auth:** owner proyek.
- **Request body:** minimal satu dari `name`, `description`, `new_owner_id`. `name` bila dikirim tidak boleh kosong. `description` boleh string kosong. `new_owner_id` adalah UUID anggota proyek saat ini.
- **Response 200:** `ProjectSummary` setelah perubahan. Bila terjadi transfer, `role` dalam respons mencerminkan role pengguna yang meminta setelah operasi; owner lama menjadi `member`.
- **Perilaku transfer:** owner baru harus anggota proyek saat ini. Owner lama diubah menjadi `member`, owner baru menjadi `owner`, dan tepat satu owner dipertahankan (`BR-001`, `REQ-009`). Perubahan nama/deskripsi dan transfer dijalankan dalam satu transaksi.
- **Error:** `400 VALIDATION_ERROR` untuk body kosong, nama kosong, atau `new_owner_id` bukan anggota proyek; `401 UNAUTHENTICATED`; `403 FORBIDDEN` bila pengguna bukan owner; `404 NOT_FOUND` bila proyek tidak ada.
- **Catatan:** status `new_owner_id` non-anggota yang dipakai adalah `400`; alternatif `409` dicatat di Open Questions.

#### EP-009 — `POST /api/projects/{project_id}/members`

- **Auth:** owner proyek.
- **Request body:** `email` string valid. Pencocokan dilakukan persis terhadap `profiles.email`; tidak ada daftar pengguna, autocomplete, atau pencarian sebagian (`BR-006`).
- **Response 201:** `Member` dengan `role` `member` dan `joined_at` diisi server.
- **Error:** `400 VALIDATION_ERROR` untuk email tidak valid; `401 UNAUTHENTICATED`; `403 FORBIDDEN` bila pengguna bukan owner; `404 NOT_FOUND` bila email tidak ditemukan; `409 CONFLICT` bila pengguna sudah menjadi anggota proyek.
- **Catatan:** normalisasi kapitalisasi email belum ditetapkan; lihat Open Questions.

#### EP-010 — `DELETE /api/projects/{project_id}/members/{user_id}`

- **Auth:** owner proyek.
- **Request path:** `project_id`, `user_id` UUID.
- **Response 204:** baris `project_members` target dihapus; body kosong. Tugas dan komentar historis tetap ada; nama penulis tetap tampil dari `profiles.display_name` (`BR-004`).
- **Error:** `400 VALIDATION_ERROR` bila owner mencoba mengeluarkan dirinya sendiri; `401 UNAUTHENTICATED`; `403 FORBIDDEN` bila pengguna bukan owner; `404 NOT_FOUND` bila target bukan anggota proyek.
- **Catatan:** owner yang ingin keluar harus mengalihkan kepemilikan terlebih dahulu. Tugas yang masih ditugaskan ke member yang dikeluarkan tetap tersimpan sampai owner mengganti assignee.

#### EP-011 — `POST /api/projects/{project_id}/tasks`

- **Auth:** anggota proyek, owner maupun member.
- **Request body:** `title` wajib tidak kosong setelah trim; `description` wajib berupa string dan boleh kosong; `assignee_id` wajib UUID anggota proyek saat ini.
- **Response 201:** `Task` dengan `is_completed` `false`, `created_at` dan `updated_at` diisi server.
- **Error:** `400 VALIDATION_ERROR` untuk title kosong, field bertipe salah, atau assignee bukan anggota proyek; `401 UNAUTHENTICATED`; `403 FORBIDDEN` bila pengguna bukan anggota proyek; `404 NOT_FOUND` bila proyek tidak ada.
- **Catatan:** member boleh membuat tugas untuk dirinya sendiri atau anggota proyek lain; SpecModel tidak membatasi assignee hanya ke pembuat tugas.

#### EP-012 — `PATCH /api/tasks/{task_id}`

- **Auth:** anggota proyek. Owner dapat mengubah semua field; member hanya dapat mengubah `is_completed` pada tugas dengan `assignee_id` miliknya.
- **Request body:** minimal satu dari `title`, `description`, `assignee_id`, `is_completed`. `title` bila dikirim tidak boleh kosong; `assignee_id` harus anggota proyek saat ini.
- **Response 200:** `Task` terbarui. `updated_at` diperbarui saat terjadi perubahan, termasuk perubahan `is_completed`.
- **Aturan member:** body hanya boleh berisi `is_completed`; jika member mengirim `title`, `description`, atau `assignee_id`, respons `403`. Member yang mengubah status tugas milik anggota lain juga mendapat `403` (`BR-003`).
- **Error:** `400 VALIDATION_ERROR` untuk body kosong, title kosong, atau assignee bukan anggota; `401 UNAUTHENTICATED`; `403 FORBIDDEN` untuk pelanggaran role/assignee; `404 NOT_FOUND` bila task tidak ada atau proyeknya tidak diikuti.
- **Catatan:** member yang membuat tugas tidak otomatis boleh mengubah kontennya; hak mengubah konten tetap milik owner.

#### EP-013 — `DELETE /api/tasks/{task_id}`

- **Auth:** owner proyek.
- **Request:** tanpa body.
- **Response 204:** tugas dihapus; komentar terkait ikut terhapus melalui relasi cascade. Body kosong.
- **Error:** `401 UNAUTHENTICATED`; `403 FORBIDDEN` bila pengguna bukan owner atau bukan anggota; `404 NOT_FOUND` bila task tidak ada.
- **Catatan:** member tidak dapat menghapus tugas meskipun tugas tersebut ditugaskan kepadanya (`REQ-012`).

#### EP-014 — `POST /api/tasks/{task_id}/comments`

- **Auth:** anggota proyek.
- **Request body:** `body` wajib string tidak kosong setelah trim.
- **Response 201:** `Comment` dengan `author_id` dari sesi, `display_name` penulis, `created_at` dari server, dan `task_id`.
- **Error:** `400 VALIDATION_ERROR` bila body kosong atau hanya whitespace; `401 UNAUTHENTICATED`; `403 FORBIDDEN` bila bukan anggota proyek; `404 NOT_FOUND` bila task tidak ada.
- **Catatan:** komentar tidak boleh menyertakan `author_id` dari client. Tidak ada endpoint edit/hapus komentar pada `EP-001`–`EP-015`.

#### EP-015 — `GET /api/projects/{project_id}/reports/weekly`

- **Auth:** anggota proyek.
- **Request path:** `project_id` UUID.
- **Request query wajib:** `week_start` dengan format `YYYY-MM-DD` dan harus hari Senin.
- **Response 200:** object `week_start`, `week_end`, `completed_tasks`, `incomplete_tasks`. `week_end` adalah `week_start` ditambah 6 hari. Kedua array berisi `Task` dan dikelompokkan berdasarkan nilai `is_completed` terkini.
- **Perhitungan:** tugas dimasukkan bila `created_at` atau `updated_at` berada dalam periode Senin–Minggu yang dipilih. Tugas yang dibuat dan diperbarui pada minggu yang sama dihitung sekali. Laporan tidak menyimpan snapshot historis; jika status tugas berubah setelah periode, laporan untuk periode tersebut ikut menampilkan status terkini (`BR-005`, `REQ-014`).
- **Error:** `400 VALIDATION_ERROR` bila `week_start` tidak ada, bukan tanggal valid, atau bukan hari Senin; `401 UNAUTHENTICATED`; `403 FORBIDDEN` bila bukan anggota proyek; `404 NOT_FOUND` bila proyek tidak ada.
- **Catatan:** zona waktu perhitungan belum ditetapkan; lihat Open Questions.

### 3.4 Pemetaan endpoint ke requirement

| Endpoint | Requirement |
|---|---|
| `EP-001` | `REQ-001` |
| `EP-002` | `REQ-002` |
| `EP-003` | `REQ-002` |
| `EP-004` | `REQ-003` |
| `EP-005` | `REQ-005` |
| `EP-006` | `REQ-004` |
| `EP-007` | `REQ-005`, `REQ-016` |
| `EP-008` | `REQ-006`, `REQ-009` |
| `EP-009` | `REQ-007` |
| `EP-010` | `REQ-008` |
| `EP-011` | `REQ-010` |
| `EP-012` | `REQ-011` |
| `EP-013` | `REQ-012` |
| `EP-014` | `REQ-013` |
| `EP-015` | `REQ-014` |
| Semua endpoint terproteksi | `REQ-015` |

`REQ-017` belum memiliki endpoint pada SpecModel. API ini tidak menambahkan endpoint ringkasan tugas pribadi; lihat Open Questions.

## 4. Request & Response Examples

Contoh memakai ID fiktif yang konsisten. Cookie sesi disamarkan.

### 4.1 Signup

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "rina@example.com",
  "password": "rahasia123",
  "display_name": "Rina"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "3f1c9a2e-7b4d-4c1a-9f0e-2d6b8a1c5e70",
  "email": "rina@example.com",
  "display_name": "Rina"
}
```

### 4.2 Login dan cookie sesi

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "rina@example.com",
  "password": "rahasia123"
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
Set-Cookie: sb-session=<token-sesi-terenkripsi>; Path=/; HttpOnly; Secure; SameSite=Lax

{
  "id": "3f1c9a2e-7b4d-4c1a-9f0e-2d6b8a1c5e70",
  "email": "rina@example.com",
  "display_name": "Rina"
}
```

### 4.3 Membuat proyek

```http
POST /api/projects
Content-Type: application/json

{
  "name": "Peluncuran Website",
  "description": "Proyek kecil untuk situs company profile."
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30",
  "name": "Peluncuran Website",
  "description": "Proyek kecil untuk situs company profile.",
  "role": "owner",
  "member_count": 1
}
```

### 4.4 Menambah member dengan email persis

```http
POST /api/projects/b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30/members
Content-Type: application/json

{
  "email": "budi@example.com"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "f3a7d9c2-4b8e-4a1f-9c6d-2e5b8a7f1d40",
  "project_id": "b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30",
  "user_id": "a8d2e4f1-6c3b-4a9d-8e2f-1b7c5d9a3f40",
  "display_name": "Budi",
  "role": "member",
  "joined_at": "2025-04-07T10:05:00Z"
}
```

### 4.5 Detail proyek dengan filter tugas

```http
GET /api/projects/b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30?status=incomplete&assignee_id=a8d2e4f1-6c3b-4a9d-8e2f-1b7c5d9a3f40
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "project": {
    "id": "b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30",
    "name": "Peluncuran Website",
    "description": "Proyek kecil untuk situs company profile.",
    "created_at": "2025-04-07T09:20:00Z",
    "updated_at": "2025-04-07T09:20:00Z"
  },
  "members": [
    {
      "id": "e2b5c8a1-3d7f-4a9c-8b6e-1f2d5a7c9e80",
      "project_id": "b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30",
      "user_id": "3f1c9a2e-7b4d-4c1a-9f0e-2d6b8a1c5e70",
      "display_name": "Rina",
      "role": "owner",
      "joined_at": "2025-04-07T09:20:00Z"
    },
    {
      "id": "f3a7d9c2-4b8e-4a1f-9c6d-2e5b8a7f1d40",
      "project_id": "b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30",
      "user_id": "a8d2e4f1-6c3b-4a9d-8e2f-1b7c5d9a3f40",
      "display_name": "Budi",
      "role": "member",
      "joined_at": "2025-04-07T10:05:00Z"
    }
  ],
  "tasks": [
    {
      "id": "c1a9f4e2-8b7d-4c3a-9e1f-6d2b5a8c0e20",
      "project_id": "b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30",
      "title": "Susun copywriting halaman utama",
      "description": "Naskah singkat untuk hero dan CTA.",
      "assignee_id": "a8d2e4f1-6c3b-4a9d-8e2f-1b7c5d9a3f40",
      "is_completed": false,
      "created_at": "2025-04-07T10:30:00Z",
      "updated_at": "2025-04-07T10:30:00Z",
      "comments": [
        {
          "id": "d4e8b1a7-2c6f-4a9e-b3d5-7f1c9e2a8b60",
          "task_id": "c1a9f4e2-8b7d-4c3a-9e1f-6d2b5a8c0e20",
          "author_id": "a8d2e4f1-6c3b-4a9d-8e2f-1b7c5d9a3f40",
          "display_name": "Budi",
          "body": "Saya mulai dari struktur hero.",
          "created_at": "2025-04-07T11:00:00Z"
        }
      ]
    }
  ]
}
```

### 4.6 Member mengubah status tugas miliknya

```http
PATCH /api/tasks/c1a9f4e2-8b7d-4c3a-9e1f-6d2b5a8c0e20
Content-Type: application/json

{
  "is_completed": true
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "c1a9f4e2-8b7d-4c3a-9e1f-6d2b5a8c0e20",
  "project_id": "b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30",
  "title": "Susun copywriting halaman utama",
  "description": "Naskah singkat untuk hero dan CTA.",
  "assignee_id": "a8d2e4f1-6c3b-4a9d-8e2f-1b7c5d9a3f40",
  "is_completed": true,
  "created_at": "2025-04-07T10:30:00Z",
  "updated_at": "2025-04-09T08:30:00Z"
}
```

### 4.7 Menambah komentar

```http
POST /api/tasks/c1a9f4e2-8b7d-4c3a-9e1f-6d2b5a8c0e20/comments
Content-Type: application/json

{
  "body": "Copywriting versi 2 sudah siap."
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "d9c3a7f1-5b2e-4d8a-9c6f-1e4b7a2d5c90",
  "task_id": "c1a9f4e2-8b7d-4c3a-9e1f-6d2b5a8c0e20",
  "author_id": "a8d2e4f1-6c3b-4a9d-8e2f-1b7c5d9a3f40",
  "display_name": "Budi",
  "body": "Copywriting versi 2 sudah siap.",
  "created_at": "2025-04-09T09:00:00Z"
}
```

### 4.8 Laporan mingguan

```http
GET /api/projects/b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30/reports/weekly?week_start=2025-04-07
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "week_start": "2025-04-07",
  "week_end": "2025-04-13",
  "completed_tasks": [
    {
      "id": "c1a9f4e2-8b7d-4c3a-9e1f-6d2b5a8c0e20",
      "project_id": "b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30",
      "title": "Susun copywriting halaman utama",
      "description": "Naskah singkat untuk hero dan CTA.",
      "assignee_id": "a8d2e4f1-6c3b-4a9d-8e2f-1b7c5d9a3f40",
      "is_completed": true,
      "created_at": "2025-04-07T10:30:00Z",
      "updated_at": "2025-04-09T08:30:00Z"
    }
  ],
  "incomplete_tasks": []
}
```

### 4.9 Error contoh

Member mencoba mengubah proyek:

```http
PATCH /api/projects/b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30
Content-Type: application/json

{
  "name": "Nama Baru"
}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": {
    "code": "FORBIDDEN",
    "message": "Hanya owner proyek yang dapat mengubah proyek.",
    "details": {}
  }
}
```

Menambahkan pengguna yang sudah menjadi member:

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": {
    "code": "CONFLICT",
    "message": "Pengguna sudah menjadi anggota proyek.",
    "details": {
      "project_id": "b7e4c2a1-9d3f-4e8a-8c6b-5a1f2d7e9c30",
      "user_id": "a8d2e4f1-6c3b-4a9d-8e2f-1b7c5d9a3f40"
    }
  }
}
```

## 5. Error Codes

| HTTP | `error.code` | Kapan dipakai |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Body/query/path tidak valid; field wajib hilang; `name`/`title` kosong; komentar kosong; `assignee_id` bukan anggota proyek; `week_start` bukan Senin; owner mencoba mengeluarkan dirinya sendiri; `new_owner_id` bukan anggota |
| `401` | `UNAUTHENTICATED` | Endpoint `auth: true` diakses tanpa sesi valid atau dengan cookie kedaluwarsa |
| `401` | `INVALID_CREDENTIALS` | Login dengan email/password salah |
| `403` | `FORBIDDEN` | Bukan anggota proyek; member melakukan aksi owner; member mengubah field selain `is_completed`; member mengubah status tugas milik anggota lain; non-owner menghapus tugas |
| `404` | `NOT_FOUND` | Proyek/task tidak ditemukan; email pada `EP-009` tidak cocok dengan akun mana pun; target `EP-010` bukan anggota proyek |
| `409` | `CONFLICT` | Email signup sudah terdaftar; pengguna pada `EP-009` sudah menjadi anggota proyek |

Ketentuan tambahan:

- `401` diperiksa sebelum `403`. Pengguna tanpa sesi tidak boleh mendapatkan informasi role.
- `403` dipakai untuk proyek yang ada tetapi tidak diikuti pengguna. Jangan menggantinya dengan `200` berisi data kosong atau `404` yang membocorkan keberadaan proyek.
- `EP-009` secara eksplisit memakai `404` untuk email yang tidak ditemukan karena owner membutuhkan umpan balik pencocokan email. Ini merupakan pengecualian yang ditetapkan SpecModel, bukan pola umum untuk endpoint proyek.
- `400` tidak boleh dipakai untuk masalah otorisasi. Aksi member yang melampaui izin tetap `403`.
- Tidak ada `422`; validasi memakai `400`. Tidak ada `429` dalam kontrak saat ini karena rate limit belum ditetapkan.
- `message` tidak boleh memuat data sensitif atau data proyek tempat pengguna tidak memiliki akses.

## 6. Rate Limits

SpecModel tidak menetapkan rate limit untuk KerjaTim. Oleh karena itu:

- Tidak ada angka threshold, header `X-RateLimit-*`, atau status `429` yang menjadi bagian kontrak API saat ini.
- Pengujian tidak boleh mengharapkan `429` atau bergantung pada header rate limit.
- Rate limit tidak boleh menjadi pengganti otorisasi. Setiap endpoint tetap wajib memeriksa sesi, keanggotaan proyek, dan role di server.
- Platform deployment dapat memiliki batas trafik operasional di luar kontrak produk. Batas tersebut tidak mengubah status, body, atau aturan akses pada dokumen ini.
- Endpoint autentikasi (`EP-001`, `EP-002`, `EP-004`) adalah kandidat utama untuk pembatasan operasional karena berhubungan dengan pembuatan akun, percobaan login, dan pengiriman email reset. Namun nilai batas dan cakupannya belum diputuskan.
- Jika rate limit diberlakukan sebagai kontrak, dokumen ini harus menetapkan cakupan (per IP, per akun, atau per endpoint), threshold, response `429`, dan header `Retry-After`. Keputusan tersebut dicatat di Open Questions.

## 7. Open Questions

1. **Zona waktu laporan mingguan:** `week_start` dan `week_end` adalah tanggal kalender, tetapi zona waktu untuk menentukan batas `created_at`/`updated_at` belum ditetapkan. Usulan Asia/Jakarta di SpecModel perlu dikonfirmasi.
2. **Verifikasi email saat signup:** apakah Supabase Auth mewajibkan konfirmasi email sebelum login, atau akun langsung aktif setelah `EP-001`?
3. **Sesi setelah signup:** apakah `EP-001` langsung membuat sesi cookie, atau pengguna harus memanggil `EP-002` untuk login? Kontrak ini tidak menjanjikan sesi dari signup.
4. **Edit/hapus komentar:** SpecModel belum menetapkan apakah komentar boleh diedit atau dihapus langsung. Saat ini hanya ada `EP-014` untuk menambah komentar.
5. **Tugas milik mantan member:** setelah member dikeluarkan, tugas yang masih memakai `assignee_id` mantan member tetap ada. Apakah tugas tetap terbuka sampai owner mengganti assignee, atau `assignee_id` otomatis dilepas? SpecModel belum memutuskan.
6. **Normalisasi email pada `EP-009`:** SpecModel menyebut pencocokan persis. Belum ditetapkan apakah email dinormalisasi menjadi lowercase dan trim sebelum dicocokkan. Dokumen ini tidak menetapkan normalisasi tambahan.
7. **Nilai filter `EP-007`:** dokumen ini menetapkan `status=completed|incomplete` dan `q` sebagai substring case-insensitive pada `title`. Perlu konfirmasi apakah nilai dan semantik tersebut diinginkan.
8. **Status code alternatif:** dokumen ini memakai `400` untuk `new_owner_id` bukan anggota dan owner mengeluarkan dirinya sendiri. Perlu konfirmasi apakah produk menghendaki `409` atau `403` untuk kondisi tersebut.
9. **Urutan dan pagination:** urutan default `tasks` pada `EP-007` dan laporan mingguan belum ditetapkan. Batas jumlah proyek, tugas, komentar, atau ukuran respons juga belum ditetapkan.
10. **Rate limit:** perlu keputusan apakah MVP memerlukan rate limit, pada endpoint mana, dengan threshold berapa, dan apakah response `429` beserta header `Retry-After` akan masuk kontrak.
11. **Email pada daftar anggota:** `EP-007` saat ini tidak mengembalikan email anggota. Perlu konfirmasi apakah owner atau seluruh anggota boleh melihat email anggota lain.
12. **Endpoint `REQ-017`:** ringkasan tugas pribadi lintas proyek belum memiliki endpoint di SpecModel. API ini tidak menambahkannya; endpoint baru perlu diputuskan jika fitur later tersebut diaktifkan.