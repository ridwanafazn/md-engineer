# mdzs

**Personal spec compiler** — mengubah ide produk menjadi 15 dokumen Markdown yang saling konsisten, tanpa kuota produk, tanpa layanan berbayar selain OpenCode Go.

- **Frontend:** React 19 + Vite + Tailwind CSS + shadcn/ui (neumorphism)
- **API:** Hono di Cloudflare Workers
- **Database:** Neon Postgres + Drizzle ORM
- **AI:** OpenCode Go (`deepseek-v4.1-flash`, reasoning `max`)
- **Deploy:** `workers.dev` (Cloudflare Free)
- **Auth:** passcode tunggal

## Prinsip

1. Tidak ada kuota produk: tanpa tier, tanpa lock, tanpa batas jumlah proyek/dokumen.
2. Browser-heavy: prompt, lint, diff, ZIP, dan render dilakukan di browser.
3. Worker tipis: auth, AI proxy, dan CRUD database.
4. Semua 15 dokumen selalu full length.
5. Clean-room: parity fungsi, bukan salinan aset/prompt/UI SpecKit.

## 15 Dokumen

`PRD`, `DESIGN`, `REQUIREMENTS`, `FEATURES`, `USER_FLOW`, `DATABASE`, `API`, `BUSINESS_RULES`, `ARCHITECTURE`, `SECURITY`, `TESTING`, `ROADMAP`, `DECISIONS`, `TASKS`, `README`.

## Struktur

```
docs/                 riset, spec, ADR, data model
src/worker/           Hono API
src/client/           React SPA
src/shared/           tipe & schema Zod
src/db/               Drizzle schema
drizzle/              migrasi SQL
scripts/              benchmark & utilitas
```

## Live

https://mdzs.ridwanafzn.workers.dev

Fase 0 selesai: passcode auth, Neon, CRUD proyek/dokumen, dan AI aktif via OpenCode Go.
Fase 1 selesai: intake → analysis → adaptive interview → stack → PRD full length.
Fase 2 selesai: SpecModel + 15 dokumen, lint, Mermaid, diff, dan version snapshot.
Fase 3 selesai: chat assistant, impact analysis, diff sebelum apply, apply multi-dokumen, dan restore versi.
Fase 4 selesai: export ZIP, commit GitHub per-request, shared read-only link, dan revoke.
Fase 5 selesai: eval 5/5 ide skor 100, prompt polish, aksesibilitas, dan benchmark Free tier < 10 ms pada jalur baca normal.

## Local Development

```bash
npm install
cp .dev.vars.example .dev.vars
# isi OPENCODE_API_KEY dan DATABASE_URL
npm run dev
```

## Secrets

Jangan commit `.dev.vars`. Untuk production:

```bash
npx wrangler secret put MDZS_PASSCODE
npx wrangler secret put OPENCODE_API_KEY
npx wrangler secret put DATABASE_URL
```

## Status

Fondasi dan dokumen arsitektur. Vertical slice menyusul.
