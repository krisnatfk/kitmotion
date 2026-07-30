# KITMOTION — Application-First MVP

Aplikasi pembelajaran olahraga berbasis web (PWA) untuk siswa dan guru. Kamera + MediaPipe membaca pose, menghitung repetisi, memberi koreksi teknik, dan menyimpan ringkasan progres. Guru dapat memantau siswa hanya setelah siswa menyetujui keanggotaan kelas.

> **Status IoT:** Future-ready, **tidak aktif**. Tidak ada perangkat/pairing/telemetri/endpoint IoT. Lihat [docs/iot-integration-contract.md](docs/iot-integration-contract.md).

---

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict
- Tailwind CSS 3.4 (design tokens dari `design.md`, gaya editorial Nike)
- Supabase (Auth + PostgreSQL + RLS)
- MediaPipe Tasks Vision `PoseLandmarker` (inference lokal di browser, hanya di `/workout`)
- Leaflet + OpenStreetMap (peta lari; tidak membutuhkan API key untuk pengujian)
- React Hook Form + Zod · Vitest · Playwright · PWA (manifest + service worker)

## Prasyarat

- Node 18.18+ (dibangun & diuji di Node 24)
- Supabase project (cloud) **atau** Supabase CLI lokal (`supabase start` butuh Docker)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Salin env dan isi:
   ```bash
   cp .env.example .env
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari Project Settings > API.
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — jangan terekspos ke client).
   - AI coach opsional memakai `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, dan
     `AI_MODEL`. Semuanya server only dan tidak memakai prefix `NEXT_PUBLIC_`.
   - Biarkan `NEXT_PUBLIC_IOT_INTEGRATION_ENABLED=false`.
3. Terapkan database (migration + RLS + seed):
   - **Cloud:** `supabase db push` (dengan `SUPABASE_ACCESS_TOKEN` / CLI login), atau jalankan seluruh file di `supabase/migrations/` secara berurutan lewat SQL editor Supabase.
   - **Lokal:** `supabase start && supabase db push`. Lalu `npm run db:types` untuk regenerate `src/types/database.types.ts` dari DB lokal.
4. Jalankan:
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000.

   Script ini memakai Turbopack dan menolak instance dev kedua agar cache tidak
   ditulis dua proses sekaligus. Jika proses sebelumnya mati paksa atau cache
   perlu dibuat ulang, jalankan `npm run dev:fresh`. Jangan menjalankan
   `next dev`/`npx next dev` secara langsung karena melewati pengaman tersebut.

## Role akun

Halaman daftar menyediakan akun `student` dan `teacher`. Trigger database hanya menerima dua role publik tersebut; role `admin` tidak pernah diterima dari metadata signup dan harus diberikan secara manual:

```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

## Quality gate

```bash
npm run lint
npm run typecheck
npm run test        # unit + integration tests
npm run build
npm run test:e2e    # Playwright (butuh dev server / webServer otomatis)
```

## Menguji kamera

1. Pastikan `.env` terisi (model MediaPipe dimuat dari CDN).
2. Login → buka `/exercises` → pilih latihan → klik **Mulai latihan**.
3. Klik **Aktifkan kamera**, izinkan akses, posisikan tubuh hingga status **"Posisi sudah baik"**.
4. Klik **Mulai**, lakukan gerakan; overlay landmark + hitung repetisi + feedback muncul real-time.
5. Klik **Selesai** → skor, grade, XP, badge, dan challenge ditampilkan, lalu tersimpan ke riwayat.

> Kamera butuh HTTPS atau `localhost`. Frame tidak direkam/disimpan/dikirim.

## Menguji fitur lari GPS

1. Login → buka `/running` → klik **Mulai lari**.
2. Izinkan lokasi presisi dan gunakan perangkat di area terbuka.
3. Peta mengikuti posisi, sementara jarak, durasi aktif, dan pace diperbarui langsung.
4. Tombol **Jeda** menghentikan pencatatan lokasi dan waktu aktif; **Lanjut** membuat segmen rute baru tanpa garis loncatan.
5. Selesaikan aktivitas untuk menyimpan rute, split per kilometer, elevasi, dan estimasi kalori.

> Geolocation memerlukan HTTPS atau `localhost`. Tile OpenStreetMap digunakan secara interaktif dengan atribusi terlihat dan tanpa prefetch/offline download.

## Struktur

```
src/
├─ app/                      # route groups: (marketing) (auth) (app) admin
├─ components/               # ui, layout, pwa
├─ features/
│  ├─ auth/                  # server actions + forms + schemas
│  ├─ profile/               # queries + form
│  ├─ exercises/             # queries (catalog)
│  ├─ pose/                  # camera, MediaPipe loader, readiness, overlay
│  ├─ exercise-engine/       # core (types/angles/landmarks) + squat/jumping-jack/push-up
│  ├─ workout-session/       # session controller, schema, finalize action, runner UI
│  ├─ scoring/               # weighted score + grade (server-authoritative)
│  ├─ gamification/          # XP, level, badge, challenge (idempotent)
│  ├─ history/               # list + detail + trend
│  ├─ running/               # GPS tracker, filter noise, map, metrics, result
│  ├─ admin/                 # guard, audit, CRUD actions, forms
│  └─ sensor-integration/    # SensorProvider + NoopSensorProvider + feature flag (inert)
├─ lib/                      # utils, env, supabase clients
├─ types/                    # database.types.ts
supabase/
├─ migrations/               # 0001_init s.d. 0008_learning_platform
└─ config.toml
docs/iot-integration-contract.md
```

## Environment variables

Lihat [.env.example](.env.example). Inti:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` (server only, opsional)
- `NEXT_PUBLIC_MEDIAPIPE_MODEL_PATH`, `NEXT_PUBLIC_MEDIAPIPE_WASM_PATH`
- `NEXT_PUBLIC_MAP_TILE_URL` — provider tile peta; default OpenStreetMap untuk pengujian
- `NEXT_PUBLIC_IOT_INTEGRATION_ENABLED` — **harus `false`** untuk MVP ini.

## Deployment (Vercel)

1. Push repo ke GitHub.
2. Import di Vercel dan set env production. Jangan menyalin nilai localhost:
   - `NEXT_PUBLIC_APP_URL=https://kitmotion.vercel.app`
   - `NEXT_PUBLIC_APP_ENV=production`
   - isi kredensial Supabase/AI lainnya sesuai environment production.
3. Jalankan migration Supabase (`supabase db push` atau SQL editor).
4. Di Supabase **Authentication > URL Configuration**:
   - Site URL: `https://kitmotion.vercel.app`
   - Redirect URLs: `https://kitmotion.vercel.app/auth/callback`
5. Di Supabase **Authentication > Emails > SMTP Settings**, aktifkan Custom SMTP. Email bawaan Supabase hanya untuk pengujian dan dibatasi sangat rendah, sehingga tidak cocok untuk pendaftaran publik.
6. Setelah Custom SMTP aktif, sesuaikan kuota di **Authentication > Rate Limits** dengan kapasitas provider email.
7. Deploy. PWA aktif di production (service worker hanya terdaftar saat `NODE_ENV=production`).

Email verifikasi yang dibuat ketika Site URL masih localhost tidak dapat diperbaiki. Setelah konfigurasi di atas disimpan, kirim ulang verifikasi dari halaman daftar dan gunakan hanya link terbaru.

## Privasi

- Frame kamera tidak direkam/disimpan/dikirim ke server.
- Landmark per frame tidak disimpan; hanya ringkasan sesi + metrik per repetisi.
- Rute GPS hanya direkam saat tracker lari aktif dan berhenti saat jeda/selesai/halaman ditutup.
- Data pengguna dilindungi RLS (user hanya baca data miliknya).
- Guru hanya membaca data siswa dengan membership aktif dan consent tercatat; sesi sebelum consent tidak masuk laporan.
- Skor final & XP dihitung/diberikan server-side; client tidak bisa mengubah.
- Bukan alat medis; feedback bukan diagnosis.
