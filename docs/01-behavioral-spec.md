# Behavioral Spec — SpecKit Reference (Clean-Room)

> Sumber: halaman publik SpecKit, changelog, dokumentasi, dan screenshot workspace milik pengguna.
> Tidak ada akses ke source code, prompt, database, atau akun internal SpecKit.
> Label **[Observed]** = terlihat langsung; **[Inferred]** = rekonstruksi perilaku.

## 1. Alur Pengguna

**[Observed]** Berdasarkan landing page, docs, dan screenshot:

1. Pengguna memasukkan ide (teks atau upload).
2. AI menganalisis produk: roles, fitur, model bisnis, kompleksitas.
3. AI interview adaptif 3–8 pertanyaan.
4. Rekomendasi tech stack; pengguna bisa mengganti.
5. Pemilihan bundle dokumen.
6. Generasi blueprint dengan progress.
7. Workspace tiga panel.
8. Chat assistant untuk revisi.
9. Impact analysis sebelum menerapkan perubahan.
10. Version history dan rollback.
11. Export ZIP.

## 2. 15 Dokumen

**[Observed]** Dari sidebar workspace:

1. `PRD.md`
2. `DESIGN.md`
3. `REQUIREMENTS.md`
4. `FEATURES.md`
5. `USER_FLOW.md`
6. `DATABASE.md`
7. `API.md`
8. `BUSINESS_RULES.md`
9. `ARCHITECTURE.md`
10. `SECURITY.md`
11. `TESTING.md`
12. `ROADMAP.md`
13. `DECISIONS.md`
14. `TASKS.md`
15. `README.md`

## 3. Anatomi Workspace

**[Observed]**

- **Header:** brand, nama proyek, badge plan, jumlah blueprint tersisa, dashboard, avatar.
- **Panel kiri:** daftar 15 dokumen dengan nomor dan ikon status; sebagian terkunci di Free.
- **Panel tengah:**
  - judul dokumen + versi (`PRD.md v1`);
  - tab `Rich Preview`, `Raw Markdown`, `Diff Compare`;
  - status `VERIFIED BLUEPRINT`;
  - metadata author/status/format;
  - isi Markdown;
  - banner peringatan draft ringkas untuk Free.
- **Panel kanan:** AI Assistant, kuota chat, pesan sambutan, input.
- **Footer panel kiri:** `Download`, `Export All Blueprints`.

## 4. Status Dokumen

**[Inferred]** Status yang masuk akal:

| Status | Arti |
|---|---|
| `draft` | Baru dibuat, belum lolos validasi |
| `generating` | Sedang diproses |
| `verified` | Lolos lint dan review |
| `stale` | Model berubah, dokumen perlu diperbarui |

## 5. Gating yang Harus Dihilangkan di mdzs

**[Observed]**

- `Free Trial`, `Blueprints: 1 left`.
- `4/4 chats left`.
- Dokumen terkunci dengan ikon gembok.
- Banner `Draf Ringkas Paket Free (Batas ~1000 kata)`.
- Pembatasan dokumen per tier.

**mdzs:** tidak ada gating, tidak ada kuota produk, semua dokumen full length.

## 6. Pipeline AI

**[Inferred]** Berdasarkan fitur dan changelog:

```
ide
 → analisis terstruktur
 → interview adaptif
 → rekomendasi stack
 → doc plan
 → generasi dokumen per batch/urutan
 → validasi konsistensi
 → workspace review
 → chat + impact analysis
 → version snapshot
 → export
```

Prinsip:

- Analisis dan interview menghasilkan **struktur**, bukan langsung dokumen.
- Setiap dokumen punya prompt dan batas token sendiri.
- Dokumen teknis mengikuti kosakata stack yang dipilih.
- Arsitektur wajib memuat Mermaid `graph TD` dan `sequenceDiagram`.
- Ada guardrail agar dokumen tidak membahas isi dokumen lain.

## 7. Perbedaan yang Disengaja di mdzs

| Area | SpecKit | mdzs |
|---|---|---|
| Kuota | Ya | Tidak ada |
| Panjang | Free dibatasi | Full length |
| Data | Cloud mereka | Neon milik sendiri |
| Export | ZIP | ZIP + commit GitHub |
| Shared review | Tidak ada | Read-only link (fase 2) |
| UI | Default | Neumorphism |
| Orkestrasi | Server-heavy | Browser-heavy |
| Provider | Multi-provider | OpenCode Go |
| Deploy | VPS | Cloudflare Free |

## 8. Hal yang Tidak Ditiru

- Aset, logo, copywriting, dan prompt SpecKit.
- Struktur internal server.
- Mekanisme billing/kuota.
- UI pixel-perfect; kita hanya meniru pola tiga panel dan alur.
