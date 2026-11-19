# Deployment

## URL

https://mdzs.ridwanafzn.workers.dev

## Status Fase 0

- Worker aktif.
- Passcode auth aktif.
- Neon terhubung.
- CRUD proyek/dokumen berfungsi.
- AI proxy siap, menunggu `OPENCODE_API_KEY`.

## Secrets Production

Sudah dipasang:

- `MDZS_PASSCODE`
- `MDZS_SESSION_SECRET`
- `DATABASE_URL`

Belum dipasang:

- `OPENCODE_API_KEY`

Setelah mengisi `OPENCODE_API_KEY` di `.dev.vars`:

```powershell
$key = (Get-Content .dev.vars | Where-Object { $_ -match '^OPENCODE_API_KEY=' }) -replace '^OPENCODE_API_KEY=',''
$key | npx wrangler secret put OPENCODE_API_KEY
```

Lalu cek:

```powershell
curl.exe https://mdzs.ridwanafzn.workers.dev/api/health
```

Harus menampilkan `"ai":true`.

## Passcode

Passcode disimpan lokal di `.dev.vars` (tidak di-commit). Untuk mengganti:

1. Ubah `MDZS_PASSCODE` di `.dev.vars`.
2. Jalankan:

```powershell
$pass = (Get-Content .dev.vars | Where-Object { $_ -match '^MDZS_PASSCODE=' }) -replace '^MDZS_PASSCODE=',''
$pass | npx wrangler secret put MDZS_PASSCODE
```

## Deploy Ulang

```bash
npm run deploy
```

Script akan:
1. Build worker + client.
2. Menghapus `.dev.vars` dari bundle deploy.
3. Upload ke Cloudflare.

## Catatan

- `workers.dev` aktif.
- Preview URL dinonaktifkan.
- Tidak ada domain kustom.
- Tidak ada layanan paid selain OpenCode Go.
