# Status Implementasi PRD KITMOTION v3.0

Audit ini mencocokkan `prd.md` dengan implementasi aplikasi saat ini.

| Area PRD | Status | Implementasi utama |
|---|---|---|
| Autentikasi dan role | Terimplementasi | Registrasi siswa/guru, login, logout, reset password, role tersimpan di database, route protection, dan role tidak dapat diubah dari client. |
| Profil | Terimplementasi | Nama, sekolah, kelas, avatar opsional berbasis preset, serta proteksi role. |
| Dashboard | Terimplementasi | XP, level, streak, total sesi, rekomendasi latihan, challenge aktif, badge, formula skor, serta progres XP ke level berikutnya. |
| Tutorial wajib | Terimplementasi | Posisi awal, tahapan, kesalahan umum, keselamatan, contoh visual, posisi kamera, dan gerbang tutorial sebelum route kamera. |
| Kamera dan pose | Terimplementasi | Izin kamera, readiness, panduan posisi, MediaPipe lazy-load, landmark overlay, confidence check, dan cleanup stream/model. |
| Exercise engine | Terimplementasi | Enam engine terpisah: squat, jumping jack, push-up, sit-up (punggung/dada-lutut), pull-up (dagu/palang/lengan lurus), dan chinning-up dengan timer pose valid; gerakan dangkal/tracking hilang tidak dihitung. |
| Sesi latihan | Terimplementasi | Timer, repetisi, feedback real-time, pause scoring ketika tracking hilang, target, finalisasi idempoten, dan penyimpanan ringkasan. |
| Penilaian | Terimplementasi | Form, range, consistency, tempo, stability, skor 0–100, grade, dan validasi server. |
| Gamifikasi dan milestone | Terimplementasi | Target/toleransi mengikuti level, XP idempoten, level terkunci pada kelipatan 10, challenge tervalidasi server, percobaan tersimpan, dan reward satu kali. |
| Kelas dan persetujuan | Terimplementasi | Guru membuat kelas/kode; siswa melihat identitas guru/kelas dan menyetujui; keluar/dikeluarkan mencabut akses laporan berikutnya. |
| Dashboard dan laporan guru | Terimplementasi | Filter siswa, latihan, tanggal/rentang; total sesi/hasil valid, skor, durasi, level, XP, challenge, tren mingguan, kesalahan umum, serta export PDF profesional sesuai filter aktif. |
| Riwayat | Terimplementasi | Daftar, filter latihan, detail sesi, repetisi, feedback, sub-score, dan tren sederhana dengan RLS. |
| Lari GPS | Terimplementasi | Tracker aktif/jeda/lanjut, filter noise, peta, jarak, pace, split, elevasi, estimasi kalori, penyimpanan rute, dan XP idempoten. |
| AI coach | Terimplementasi opsional | Session coach, rekomendasi harian, insight kelas, output terstruktur, cache, fallback deterministik, provider failover, dan kredensial terenkripsi server-side. |
| Admin minimum | Terimplementasi | CRUD latihan/config, badge, challenge, daftar sesi, server-side admin guard, dan audit log. |
| PWA | Terimplementasi | Manifest, service-worker registration, icon 512×512, metadata, dan standalone display. |
| UI states | Terimplementasi | Loading, empty, success, form error, global error, not-found, dan disabled/submitting state. |
| Responsivitas | Terimplementasi | Marketing nav, app nav, admin nav, auth shell, grid konten, tabel scroll, safe-area mobile, tablet, laptop, dan desktop. |
| Aksesibilitas | Terimplementasi | Label form, focus-visible, semantic nav/status, tap target, reduced motion, dan status yang tidak hanya bergantung pada warna. |
| Privasi | Terimplementasi | RLS guru mensyaratkan membership aktif, consent, dan waktu sesi setelah consent; laporan hanya merangkum data latihan yang sudah ada. |
| Fondasi IoT pasif | Terimplementasi | `SensorProvider`, `NoopSensorProvider`, feature flag nonaktif, optional sensor summary, tanpa UI/endpoint/tabel telemetry aktif. |

Catatan validasi perangkat: kualitas FPS pose detection dan izin kamera tetap perlu diuji pada perangkat Android/iPhone fisik karena hasilnya bergantung pada hardware, browser, dan pencahayaan.

Catatan database: migration harus diterapkan berurutan sampai `0017_sit_up_pull_up_chinning_up.sql`. Validasi database lokal memerlukan Docker/Podman.
