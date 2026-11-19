# Reverse Engineering: Panduan Pemahaman Menyeluruh

> Dokumen kerja untuk memahami *reverse engineering* (RE) dari dua sisi: **nilai non-teknis** (mengapa ini penting dan kapan mendesak) dan **disiplin teknis** (apa yang sebenarnya dikerjakan, dengan alat apa, dan bagaimana hasilnya divalidasi).

---

## 0. Definisi Kerja

**Reverse engineering adalah proses menyimpulkan struktur, perilaku, dan spesifikasi sebuah sistem dari artefaknya — ketika sumber asli, dokumentasi, atau pembuatnya tidak tersedia, tidak lengkap, atau tidak dapat dipercaya.**

Artefak bisa berupa:

- binary aplikasi (`.exe`, ELF, Mach-O), firmware, atau library;
- protokol jaringan, format file, API, atau database schema;
- aplikasi web / JavaScript bundle / WebAssembly;
- aplikasi mobile (APK/IPA);
- rangkaian elektronik dan chip;
- model machine learning;
- bahkan proses bisnis, kontrak, atau produk kompetitor (RE non-perangkat lunak).

Keluarannya bukan selalu "salinan". Keluaran yang sehat biasanya salah satu dari:

1. **Model mental** — cara menjelaskan sistem kepada orang lain.
2. **Spesifikasi** — format, protokol, state machine, aturan bisnis.
3. **Lapisan kompatibilitas** — driver, emulator, klien alternatif.
4. **Patch / mitigasi** — perbaikan pada sistem lama.
5. **Laporan risiko** — apa yang benar-benar dilakukan sebuah perangkat lunak.
6. **Signature deteksi** — untuk security operation.
7. **Keputusan** — bangun ulang, beli, migrasi, atau hentikan.

> RE bukan identik dengan *cracking* atau pembajakan. Secara epistemik, RE adalah **ilmu merekonstruksi spesifikasi di bawah ketidakpastian**, dengan disiplin bukti yang mirip forensik.

---

# BAGIAN A — Pandangan Non-Teknis: Urgensi dan Fungsi

## A.1 Analogi Sederhana

- Membongkar jam tangan untuk memahami cara geraknya, lalu bisa memperbaikinya.
- Mencicipi masakan lalu menyimpulkan resep dan teknik memasaknya.
- Memetakan jalur angkot tanpa pernah melihat peta resminya.
- Menerjemahkan kontrak berbahasa asing untuk tahu kewajiban yang sebenarnya.

Semua contoh itu adalah RE: **benda jadi → pengamatan → model → keputusan**.

## A.2 Kapan Urgensinya Muncul

| Skenario | Yang diberikan RE | Risiko jika tidak dilakukan |
|---|---|---|
| Vendor aplikasi tutup / produk EOL | Pemahaman internal untuk memelihara atau menggantinya | Sistem mati total saat rusak, tidak ada yang bisa memperbaiki |
| Integrasi dengan sistem tertutup | Spesifikasi protokol/format yang tidak didokumentasikan | Proyek integrasi gagal, biaya konsultan membengkak |
| Insiden keamanan / malware | Perilaku aktual, indikator kompromi, akar masalah | Respons hanya menebak, serangan berulang |
| Akuisisi / due diligence | Verifikasi klaim teknis dan risiko tersembunyi | Membeli kotak hitam berisi utang teknis |
| Audit, regulasi, sengketa | Bukti perilaku sistem, bukan asumsi | Denda, kehilangan lisensi, kalah sengketa |
| Negosiasi lisensi / biaya | Tahu seberapa sulit sistem itu sebenarnya dibangun | Lock-in, harga sepihak, ketergantungan permanen |
| Benchmarking kompetitor (legal) | Pemahaman desain dan standar industri | Keputusan produk berbasis asumsi |
| Data recovery / sistem warisan | Cara data disimpan dan dienkode | Data hilang permanen |
| Riset & pendidikan | Pemahaman mendalam yang tidak diajarkan dokumentasi | Inovasi terhambat, kesalahan berulang |

## A.3 "Urgensi Fungsi" dalam Bahasa Manajemen

RE paling mudah dijual sebagai tiga hal:

1. **Mengurangi ketidakpastian.** Mengubah "katanya sistem ini begini" menjadi "kami sudah membuktikan sistem ini begini."
2. **Membeli opsi.** Selama sistem masih kotak hitam, organisasi hanya punya satu pilihan: bergantung pada vendor. Setelah dipahami, muncul opsi: maintain sendiri, migrasi, interoperasi, atau ganti.
3. **Asuransi kontinuitas.** Dokumentasi bisa hilang, vendor bisa hilang, kunci bisa hilang. RE adalah cara memastikan organisasi tidak kehilangan kendali atas aset yang sudah dimilikinya.

## A.4 Siapa yang Membutuhkan, dan Apa yang Mereka Cari

| Stakeholder | Pertanyaan utama | Keluaran RE yang relevan |
|---|---|---|
| Eksekutif / manajemen | "Berapa risikonya, berapa biayanya, apa opsinya?" | Ringkasan risiko, estimasi effort, rekomendasi |
| Legal / compliance | "Apakah ini boleh? Apakah sistem mematuhi aturan?" | Catatan otorisasi, bukti perilaku, analisis lisensi |
| Security | "Apa yang sebenarnya dilakukan sistem ini?" | IOC, perilaku jaringan, temuan kerentanan |
| Engineering | "Bagaimana cara kerjanya dan bagaimana mengintegrasikannya?" | Spesifikasi protokol/format, diagram arsitektur |
| Product | "Apa yang bisa kami pelajari dan bangun?" | Analisis fitur, benchmark, peluang diferensiasi |

## A.5 Batas Etika dan Legal (Ringkas)

RE yang sah biasanya memiliki tiga ciri:

- **Ada otorisasi** — pemilik sistem, kontrak, atau dasar hukum yang jelas.
- **Tujuan terbatas** — interoperabilitas, keamanan, riset, pemeliharaan, audit.
- **Tidak melanggar hak** — tidak menyalin kode berhak cipta, tidak menembus proteksi yang dilarang, tidak mencuri rahasia dagang.

Yang sering menjadi jebakan: EULA yang melarang dekompilasi, aturan anti-circumvention, hak cipta atas kode, rahasia dagang, dan data pribadi. Yurisdiksi berbeda-beda; di Indonesia relevan UU Hak Cipta, UU ITE, dan ketentuan kontrak. **Ini bukan nasihat hukum** — untuk kasus nyata, libatkan penasihat hukum sejak awal, bukan setelah analisis selesai.

Konsep penting: **clean-room reverse engineering** — satu tim menulis spesifikasi dari hasil observasi, tim lain mengimplementasikan hanya dari spesifikasi itu, tanpa melihat artefak asli. Ini mengurangi risiko kontaminasi hak cipta.

---

# BAGIAN B — Teknis: Pengenalan dan Pemahaman Mendalam

## B.1 Tiga Pertanyaan Inti

Setiap pekerjaan RE, apa pun artefaknya, selalu menjawab:

1. **Apa ini?** (identifikasi, arsitektur, dependensi, versi, proteksi)
2. **Bagaimana ia bekerja?** (fungsi, data, alur, state, interaksi)
3. **Apa yang bisa dilakukan dengan pemahaman itu?** (reimplementasi, interoperasi, patch, deteksi, keputusan)

## B.2 Spektrum Metode

| Dimensi | Ujung kiri | Ujung kanan |
|---|---|---|
| Akses | **Black box** — hanya input/output | **White box** — source, simbol, dokumentasi |
| Waktu analisis | **Static** — artefak diam | **Dynamic** — artefak berjalan |
| Level | **Behavioral** — apa yang terlihat | **Semantic** — mengapa dan bagaimana |
| Tujuan | **Comprehension** — paham saja | **Reconstruction** — membangun ulang |

Praktik nyata hampir selalu **hybrid (grey box)**: static memandu dynamic, dynamic mengonfirmasi static.

### Static vs Dynamic

| Aspek | Static Analysis | Dynamic Analysis |
|---|---|---|
| Objek | File, binary, format, kode | Proses yang berjalan |
| Kekuatan | Cakupan penuh, tidak perlu mengeksekusi | Melihat perilaku nyata, melewati obfuscation |
| Kelemahan | Buta terhadap runtime, packing, self-modifying code | Tidak lengkap, tergantung input dan environment |
| Alat khas | Disassembler, decompiler, hex editor, parser | Debugger, tracer, sandbox, hooking |
| Risiko | Salah tafsir (decompiler bukan source) | Deteksi anti-analysis, efek samping |

## B.3 Model Mental: Loop Ilmiah

```
Artefak
  │
  ▼
Observasi ──► Model awal ──► Hipotesis ──► Eksperimen
  ▲                                            │
  └──────────── konfirmasi / revisi ◄──────────┘
                    │
                    ▼
              Spesifikasi + bukti
                    │
                    ▼
      Reimplementasi / interoperasi / keputusan
```

Prinsipnya: **jangan pernah menjadikan satu observasi sebagai kesimpulan**. Setiap klaim harus punya bukti, dan setiap bukti harus bisa direproduksi.

## B.4 Lapisan yang Biasanya Direkonstruksi

| Lapisan | Pertanyaan khas | Artefak yang diperiksa |
|---|---|---|
| Packaging | Apa ini file apa? Di-pack? | Header, entropy, signature, section |
| Arsitektur | ISA, ABI, compiler, versi | Disassembly, idiom compiler |
| Kode | Fungsi ini melakukan apa? | CFG, call graph, decompiler |
| Data | Struct, enum, array, vtable | Cross-reference, pola akses memori |
| Interface | Format file / protokol / API | Capture, parser, eksperimen input |
| Runtime | State machine, error path, timing | Trace, log, observasi |
| Dependensi | Library, service, hardware | Import table, syscall, network |
| Proteksi | Packing, obfuscation, anti-debug | Deteksi dan countermeasure |

## B.5 Anatomi Binary (Contoh Utama)

Untuk binary native (PE/ELF/Mach-O), yang biasanya dipelajari:

- **Header & metadata** — target ISA, entry point, subsystem, timestamp, compiler fingerprint.
- **Section/segment** — `.text` (kode), `.data` (data terinisialisasi), `.bss` (nol), `.rdata` (konstanta), resource.
- **Import/Export** — fungsi dari library lain; memberi petunjuk besar tentang kemampuan program.
- **Relocation & dynamic linking** — bagaimana alamat diselesaikan saat runtime (PLT/GOT pada ELF, IAT pada PE).
- **Strings & konstanta** — pesan error, URL, nama field, kunci kripto yang salah pakai.
- **Symbol & debug info** — jika tidak di-strip, ini jalan pintas besar.
- **Protections** — packer, ASLR/DEP/CFG, anti-debug, integrity check.

### Konsep yang Wajib Dipahami

- **Calling convention & ABI** — siapa meletakkan argumen di mana (register/stack), siapa membersihkan stack. x86-64 System V vs Windows x64 vs ARM64 AAPCS berbeda.
- **Stack frame** — prologue/epilogue, local variable, saved register.
- **Compiler idioms** — loop, switch, inlined function, optimized tail call, C++ vtable/RTTI, name mangling.
- **Type recovery** — menyimpulkan tipe dari ukuran akses, operasi, dan pola pemakaian.
- **Data structure recovery** — field offset, padding, union, array of struct, linked list, hash table.
- **Control flow vs data flow** — siapa memanggil siapa, dan data mengalir ke mana.
- **Concurrency & timing** — thread, lock, race, timeout; sering menjadi sumber bug yang tidak terlihat di static analysis.

## B.6 Komponen Tooling

### Identifikasi & Triase

`file`, `strings`, `xxd`, Detect It Easy, PE-bear, CFF Explorer, `readelf`, `objdump`, `nm`, `ldd`, Binwalk, signature/YARA, hash (SHA-256) untuk chain of custody.

### Disassembly & Decompilation

IDA Pro (+ Hex-Rays), Ghidra, Binary Ninja, radare2/rizin + Cutter, RetDec, Hopper (macOS/iOS). Decompiler menghasilkan **pseudocode**, bukan source asli — selalu validasi.

### Debugging & Tracing

x64dbg, WinDbg, GDB, LLDB, `strace`/`ltrace`, Process Monitor, API Monitor, ETW, eBPF, Intel PIN, DynamoRIO.

### Instrumentation & Hooking

Frida (fungsi-level hook, mobile & desktop), Microsoft Detours, PLT/GOT hooking, LD_PRELOAD, DBI frameworks. Berguna untuk melihat argumen fungsi tanpa membongkar semuanya.

### Emulasi & Symbolic Execution

QEMU (system/user), Unicorn, angr, Triton, Miasm. Cocok untuk firmware, unpacking, dan eksplorasi path tanpa risiko eksekusi nyata.

### Network & Protocol

Wireshark, tcpdump, mitmproxy, Burp Suite, Fiddler, Charles. Untuk TLS: proxy dengan CA kustom; jika ada certificate pinning, perlu instrumentasi (mis. Frida) — hanya pada sistem yang Anda berwenang uji.

### Web & API

Browser DevTools, source map, beautifier/deobfuscator berbasis AST (Babel), Postman, GraphQL introspection, pemetaan endpoint dan parameter.

### Mobile

apktool, jadx, Ghidra/IDA untuk native library, Frida, objection, MobSF, class-dump, Hopper. Perhatikan root/jailbreak detection dan pinning.

### Format Data

Kaitai Struct, 010 Editor template, protobuf tooling, parser kustom, differential fuzzing.

### Hardware & Firmware

Logic analyzer, JTAG/SWD, UART/I2C/SPI, flash dump (mis. CH341A), Binwalk, ekstraksi SquashFS/JFFS2/UBI, Ghidra processor module, side-channel tooling (ChipWhisperer) untuk riset lanjutan.

### Machine Learning

Netron untuk inspeksi model, ONNX tooling, probing input/output, surrogate model, differential testing. Untuk model black-box, RE lebih dekat ke **experimental inference** daripada disassembly.

## B.7 Cara Kerja: Metodologi Tujuh Fase

### Fase 0 — Scoping, Otorisasi, dan Aturan Main

- Tentukan artefak, batas sistem, dan pertanyaan yang harus dijawab.
- Pastikan otorisasi tertulis dan batas legal.
- Sepakati *rules of engagement*: boleh/tidak boleh menyentuh produksi, data siapa yang boleh dilihat, bagaimana bukti disimpan.
- Definisikan kriteria sukses: cukup paham untuk apa? Kapan berhenti?

**Keluaran:** piagam proyek, daftar artefak, matriks risiko, rencana.

### Fase 1 — Triase dan Reconnaissance

- Identifikasi tipe file, arsitektur, compiler, versi, dependensi.
- Cari simbol, string, metadata, signature, dan indikator proteksi.
- Petakan permukaan: entry point, fitur utama, input yang diterima.

**Keluaran:** inventaris artefak, peta awal, daftar pertanyaan prioritas.

### Fase 2 — Observasi Dinamis Baseline

- Jalankan di lingkungan terisolasi (VM, snapshot, jaringan tersegmentasi).
- Catat perilaku: file, registry, proses, network, waktu, error.
- Bandingkan dengan ekspektasi dokumentasi (jika ada).

**Keluaran:** baseline perilaku, daftar hipotesis awal.

### Fase 3 — Analisis Statis Mendalam

- Mulai dari entry point dan fungsi yang relevan dengan pertanyaan.
- Bangun call graph dan CFG; beri nama fungsi dan variabel secara bermakna.
- Rekonstruksi struct, enum, dan konstanta.
- Tangani packing/obfuscation lebih dulu jika menghalangi.

**Keluaran:** peta kode, daftar fungsi kunci, model data.

### Fase 4 — Hipotesis dan Eksperimen

- Uji hipotesis dengan input yang dirancang khusus.
- Patch instruksi, hook fungsi, atau ubah konfigurasi untuk melihat efek.
- Lakukan **differential analysis**: bandingkan perilaku dengan implementasi lain yang diketahui.
- Fuzzing untuk menemukan batas dan edge case.

**Keluaran:** bukti konfirmasi, koreksi model, daftar perilaku tak terdokumentasi.

### Fase 5 — Rekonstruksi Spesifikasi

- Tulis format/protokol/state machine secara eksplisit.
- Sertakan: field, tipe, urutan, constraint, error code, timing, dan perilaku tepi.
- Pisahkan **fakta terverifikasi** dari **inferensi** dan beri tingkat keyakinan.

**Keluaran:** spesifikasi yang bisa dibaca engineer lain.

### Fase 6 — Validasi

- **Conformance test**: implementasi baru diuji terhadap spesifikasi.
- **Differential test**: bandingkan output implementasi baru vs asli pada input yang sama.
- **Coverage analysis**: seberapa banyak jalur/perilaku yang sudah dijelaskan?
- Ulangi sampai ambang keyakinan terpenuhi.

**Keluaran:** test suite, laporan cakupan, daftar deviasi yang diketahui.

### Fase 7 — Deliverable dan Handover

- Dokumentasi arsitektur, spesifikasi antarmuka, matriks perilaku.
- Laporan risiko dan rekomendasi.
- Reproducibility log: versi alat, hash artefak, langkah eksperimen.
- Jika ada reimplementasi: catatan clean-room dan provenance.

**Keluaran:** paket pengetahuan yang bisa dipakai organisasi tanpa harus mengulang seluruh analisis.

## B.8 Teknik Kunci dan Kapan Dipakai

| Teknik | Inti | Cocok untuk |
|---|---|---|
| Disassembly | Membaca instruksi mesin | Semua binary native |
| Decompilation | Merekonstruksi pseudocode | Mempercepat pemahaman fungsi |
| Debugging | Kontrol eksekusi, inspeksi state | Memahami alur runtime |
| Tracing | Rekam kejadian tanpa henti | Perilaku luas, API call |
| Hooking | Intersepsi fungsi | Argumen, bypass, observasi |
| Emulation | Jalankan kode di lingkungan sintetis | Firmware, unpacking |
| Symbolic execution | Jelajahi path secara matematis | Bug, constraint, kunci |
| Fuzzing | Injeksi input masif | Batas format/protokol |
| Differential analysis | Bandingkan dua sistem | Validasi dan inferensi |
| Unpacking | Lepas lapisan proteksi | Binary terproteksi |

## B.9 Anti-Analysis dan Perlawanannya

**Teknik penghambat:** packing/compression, encryption, control-flow flattening, junk code, string encryption, anti-debug (ptrace check, timing, hardware breakpoint detection), anti-VM, anti-dump, self-modifying code, VM-based protector.

**Pendekatan:** identifikasi proteksi lebih dulu; unpack di memori; dump dan rebuild; deobfuscate dengan script; gunakan emulasi untuk menghindari anti-debug; symbolic execution untuk memotong jalan; instrumentasi di level API; dan selalu catat asumsi karena perlawanan bisa berubah-ubah.

## B.10 Protokol, Format, dan API

Pola umum:

1. **Capture** — kumpulkan sampel lalu lintas atau file sebanyak mungkin.
2. **Segmentasi** — temukan framing (magic, length, delimiter, checksum).
3. **Inferensi field** — korelasi antara input dan byte yang berubah.
4. **State machine** — urutan pesan, sesi, handshake, error.
5. **Semantik** — arti nilai, enum, flag, satuan.
6. **Validasi** — implementasi parser/klien lalu uji diferensial.
7. **Dokumentasi** — skema formal (mis. Kaitai untuk format file).

### Format File

Mulai dari magic bytes, header, ukuran, offset, endianness, lalu chunk/section. Gunakan file corpus dan bandingkan file yang mirip. Untuk format kompleks, tulis parser bertahap dan uji pada corpus.

### Protokol Jaringan

Bedakan transport vs aplikasi. Cari handshake, versi, panjang pesan, encoding, kompresi, dan enkripsi. Jika ada TLS, pahami dulu lapisan aplikasinya; jangan berasumsi isi terenkripsi bisa "dibaca" tanpa kunci.

### API

Petakan endpoint, autentikasi, parameter, pagination, error code, rate limit, dan perilaku versi. Dokumentasi resmi sering tidak lengkap; observasi adalah sumber kebenaran.

## B.11 Firmware, Hardware, dan Mobile (Ringkas)

- **Firmware:** ekstraksi image (Binwalk), identifikasi filesystem, cari bootloader dan service, analisis binary dengan arsitektur yang sesuai (MIPS/ARM), lalu emulasi bila memungkinkan.
- **Hardware:** identifikasi chip, baca datasheet, probe bus (UART/JTAG/SPI/I2C), dump flash, analisis sinyal. Selalu sadari risiko merusak perangkat.
- **Mobile:** dekompilasi DEX/APK, inspeksi native library, hook runtime, pahami penyimpanan lokal dan komunikasi jaringan. Perhatikan proteksi dan batas hukum.

## B.12 Konsep Mendalam yang Membedakan Pemula dan Mahir

1. **Evidence discipline** — setiap klaim punya bukti dan tingkat keyakinan.
2. **Coverage awareness** — tahu apa yang *belum* dianalisis, bukan hanya yang sudah.
3. **Compiler & ABI fluency** — membaca idiom, bukan instruksi satu per satu.
4. **Type and data reconstruction** — dari akses memori ke model data.
5. **Differential thinking** — bandingkan dengan sistem lain untuk memisahkan esensi dari kebetulan.
6. **Adversarial awareness** — sadar bahwa artefak bisa menipu analis.
7. **Reproducibility** — hasil bisa diulang oleh orang lain.
8. **Communication** — spesifikasi yang berguna bagi engineer, bukan catatan pribadi.

## B.13 Jebakan Umum

- Menganggap output decompiler sebagai source asli.
- Overfitting pada satu sampel atau satu lingkungan.
- Confirmation bias: mencari bukti yang mendukung hipotesis awal.
- Tidak mencatat asumsi dan versi alat.
- Melewatkan error path dan edge case karena fokus pada happy path.
- Tool tunnel vision: sibuk dengan alat, lupa pertanyaan.
- Analysis paralysis: terus menganalisis tanpa pernah menghasilkan deliverable.
- Legal overreach: menganggap "bisa" sama dengan "boleh".

## B.14 Deliverable yang Baik

| Artefak | Isi |
|---|---|
| RE Plan | Tujuan, ruang lingkup, otorisasi, kriteria sukses |
| Evidence Log | Hash, waktu, alat, langkah, hasil, tingkat keyakinan |
| Architecture Map | Komponen, dependensi, aliran data |
| Interface Spec | Format/protokol/API, field, constraint, error |
| Behavior Matrix | Input → output → efek samping → kondisi |
| Risk Register | Temuan, dampak, probabilitas, rekomendasi |
| Conformance Suite | Tes yang membuktikan implementasi sesuai spesifikasi |
| Handover Notes | Hal yang belum terjawab, asumsi, langkah berikutnya |

## B.15 Roadmap Belajar

**Fondasi (4–8 minggu):** C, assembly x86-64/ARM64, OS & memory model, file formats, dasar jaringan.

**Praktik (8–12 minggu):** crackmes.one, pwn.college, ROP Emporium, CTF reversing, Ghidra/IDA tutorials.

**Spesialisasi (pilih satu):** malware analysis, embedded/firmware, mobile, protocol/format, web/JS, atau ML.

**Referensi:** *Reverse Engineering for Beginners* (Dennis Yurichev), *Practical Malware Analysis*, dokumentasi Ghidra/IDA, OST2, dan write-up CTF.

**Kebiasaan:** selalu tulis laporan singkat setelah setiap latihan — apa pertanyaannya, buktinya, kesimpulannya, dan apa yang belum terjawab.

---

## C. Ringkasan Satu Halaman

- **Non-teknis:** RE adalah cara mengurangi ketidakpastian dan membeli opsi atas sistem yang tidak lagi transparan. Urgensinya muncul saat vendor hilang, integrasi macet, insiden keamanan, audit, atau biaya lock-in membengkak.
- **Teknis:** RE adalah rekonstruksi spesifikasi dari artefak melalui loop observasi–hipotesis–eksperimen–validasi. Static dan dynamic saling melengkapi.
- **Komponen:** binary, kode, data, interface, runtime, dependensi, proteksi.
- **Cara kerja:** scoping → triase → observasi → analisis statis → eksperimen → spesifikasi → validasi → handover.
- **Kunci keberhasilan:** disiplin bukti, kesadaran cakupan, pemahaman ABI/compiler, dan dokumentasi yang bisa dipakai orang lain.
- **Batas:** otorisasi, tujuan terbatas, dan kepatuhan hukum bukan formalitas — itu bagian dari metode.
