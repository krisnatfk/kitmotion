# KITMOTION — Application-First MVP

Aplikasi pembelajaran olahraga berbasis web (PWA) untuk siswa SMA. Membaca pose tubuh via kamera (MediaPipe), menghitung repetisi otomatis, memberi skor + feedback real-time, dan gamifikasi (XP, level, badge, challenge).

> **Status IoT:** Future-ready, **tidak aktif**. Tidak ada perangkat/pairing/telemetri/endpoint IoT. Lihat [docs/iot-integration-contract.md](docs/iot-integration-contract.md).

---

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict
- Tailwind CSS 3.4 (design tokens dari `design.md`, gaya editorial Nike)
- Supabase (Auth + PostgreSQL + RLS)
- MediaPipe Tasks Vision `PoseLandmarker` (inference lokal di browser, hanya di `/workout`)
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
   - Biarkan `NEXT_PUBLIC_IOT_INTEGRATION_ENABLED=false`.
3. Terapkan database (migration + RLS + seed):
   - **Cloud:** `supabase db push` (dengan `SUPABASE_ACCESS_TOKEN` / CLI login), atau jalankan ketiga file di `supabase/migrations/` lewat SQL editor Supabase.
   - **Lokal:** `supabase start && supabase db push`. Lalu `npm run db:types` untuk regenerate `src/types/database.types.ts` dari DB lokal.
4. Jalankan:
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000.

## Membuat akun admin

RLS hanya memberi role `student` saat signup. Untuk menjadikan seorang user admin, jalankan di SQL editor Supabase:

```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

## Quality gate

```bash
npm run lint
npm run typecheck
npm run test        # 58 unit + integration tests
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
│  ├─ admin/                 # guard, audit, CRUD actions, forms
│  └─ sensor-integration/    # SensorProvider + NoopSensorProvider + feature flag (inert)
├─ lib/                      # utils, env, supabase clients
├─ types/                    # database.types.ts
supabase/
├─ migrations/               # 0001_init, 0002_rls, 0003_seed
└─ config.toml
docs/iot-integration-contract.md
```

## Environment variables

Lihat [.env.example](.env.example). Inti:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_MEDIAPIPE_MODEL_PATH`, `NEXT_PUBLIC_MEDIAPIPE_WASM_PATH`
- `NEXT_PUBLIC_IOT_INTEGRATION_ENABLED` — **harus `false`** untuk MVP ini.

## Deployment (Vercel)

1. Push repo ke GitHub.
2. Import di Vercel, set env vars (sama seperti `.env`).
3. Jalankan migration Supabase (`supabase db push` atau SQL editor).
4. Deploy. PWA aktif di production (service worker hanya terdaftar saat `NODE_ENV=production`).

## Privasi

- Frame kamera tidak direkam/disimpan/dikirim ke server.
- Landmark per frame tidak disimpan; hanya ringkasan sesi + metrik per repetisi.
- Data pengguna dilindungi RLS (user hanya baca data miliknya).
- Skor final & XP dihitung/diberikan server-side; client tidak bisa mengubah.
- Bukan alat medis; feedback bukan diagnosis.
