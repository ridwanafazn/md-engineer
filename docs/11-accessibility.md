# Accessibility Checklist

Target: WCAG AA untuk alur utama, tanpa mengorbankan karakter neumorphism.

## Sudah diterapkan

- [x] Body text `#1f2937` di atas surface `#eef2f7` (kontras tinggi).
- [x] Muted text `#5b6472` untuk metadata; bukan untuk teks penting.
- [x] Focus ring 2 px accent pada input, tombol, dan link.
- [x] Semua tombol utama memiliki label teks.
- [x] Tombol ikon (kirim chat, brand) memiliki `aria-label`.
- [x] Modal memakai `role="dialog"`, `aria-modal`, dan `aria-labelledby`.
- [x] Error memakai `role="alert"`.
- [x] Progress memakai `role="status"`.
- [x] Chat list memakai `aria-live="polite"`.
- [x] `prefers-reduced-motion` menonaktifkan transisi/animasi.
- [x] Tabel Markdown bisa di-scroll horizontal.
- [x] Mermaid dibungkus container responsive.
- [x] Neumorphism hanya di shell/panel; area baca tetap kontras.

## Perlu verifikasi manual

- [ ] Tab order di wizard dan workspace.
- [ ] Modal focus trap (saat ini belum trap; browser tetap bisa tab ke belakang).
- [ ] Lighthouse accessibility score.
- [ ] Kontras aktual di semua kombinasi tombol accent/white.
- [ ] Zoom 200% pada workspace tiga panel.
- [ ] Screen reader: label dokumen dan status.

## Catatan

Neumorphism cenderung mengurangi kontras. Aturan proyek:

1. Shadow tidak boleh menjadi satu-satunya penanda state.
2. Selected item memakai inset + accent.
3. Teks body tidak pernah memakai warna muted.
4. Tombol disabled tetap terbaca (opacity 50% + cursor).
