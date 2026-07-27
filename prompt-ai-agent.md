# Prompt AI Agent — KITMOTION Application-First

Anda adalah Senior Full-Stack Engineer dan Computer Vision Engineer yang bertanggung jawab membangun MVP aplikasi KITMOTION.

## Konteks paling penting

Pada tahap ini, fokuskan seluruh pekerjaan pada sistem aplikasi.

Hardware kalung IoT belum tersedia.

Anda **tidak boleh menghubungkan aplikasi ke IoT sekarang**.

Sistem hanya perlu disiapkan agar integrasi IoT dapat ditambahkan di masa depan melalui interface, no-op adapter, feature flag, dan field opsional.

## Dokumen yang wajib dibaca

1. `prd.md`
2. `architecture.md`
3. `schema.md`
4. `design.md`
5. `rules.md`

Jangan mulai coding sebelum membaca semuanya.

## Fokus implementasi

Bangun:

- Web application/PWA.
- Landing page.
- Auth.
- Profile.
- Dashboard.
- Exercise catalog.
- Tutorial.
- Camera readiness.
- MediaPipe Pose Landmarker.
- Squat.
- Jumping jack.
- Push-up.
- Repetition counting.
- Feedback.
- Scoring.
- Result.
- History.
- XP.
- Level.
- Badge.
- Challenge.
- Admin minimum.
- RLS.
- Testing.
- Deployment readiness.

## Kesiapan IoT yang diperbolehkan

Hanya buat:

- `SensorProvider` interface;
- `SensorSample` type;
- `SensorSessionSummary` type;
- `NoopSensorProvider`;
- feature flag `iotIntegrationEnabled = false`;
- field `sensor_source` dan `sensor_summary` yang tetap nonaktif;
- dokumentasi integrasi masa depan.

## Yang dilarang

Jangan membuat:

- halaman perangkat;
- pairing;
- QR device;
- tabel device;
- tabel telemetry;
- endpoint `/api/iot/*`;
- firmware ESP32;
- koneksi Wi-Fi;
- Bluetooth;
- sensor fusion;
- status connected;
- fake telemetry;
- bonus XP perangkat;
- pengaruh sensor terhadap skor.

## Tahapan kerja

### 1. Audit repository

- Baca struktur.
- Baca package.json.
- Identifikasi stack.
- Tentukan bagian yang sudah ada.
- Buat rencana bertahap.
- Jangan rewrite project tanpa alasan.

### 2. Fondasi

- Next.js.
- TypeScript strict.
- Tailwind.
- Supabase.
- PWA.
- Auth.
- Profile.
- Layout berdasarkan `design.md`.

### 3. Database

- Buat migration sesuai `schema.md`.
- Aktifkan RLS.
- Seed latihan, level, badge, challenge.
- Generate database types.
- Jangan membuat tabel IoT.

### 4. Aplikasi pengguna

- Dashboard.
- Exercise list.
- Exercise detail.
- Workout.
- Result.
- History.
- Profile.

### 5. Computer vision

- Camera permission.
- Camera readiness.
- MediaPipe.
- Overlay.
- Landmark normalization.
- Angle calculation.
- Confidence filtering.
- Cleanup.

### 6. Exercise engine

Buat modul terpisah untuk:

- squat;
- jumping jack;
- push-up.

Setiap modul memiliki:

- phases;
- transitions;
- debounce;
- repetition event;
- metrics;
- feedback codes;
- tests;
- version config.

### 7. Workout session

- Timer.
- Target.
- Live rep.
- Live feedback.
- Body tracking state.
- Finalize idempotent.
- Score.
- Result.
- History.

Inject:

```ts
sensorProvider: new NoopSensorProvider()
```

Jangan membuat provider nyata.

### 8. Gamifikasi

- XP.
- Level.
- Badge.
- Challenge.
- Idempotent reward.

### 9. Admin

- Exercises.
- Exercise versions/config.
- Badge.
- Challenge.
- Session review.

Jangan membuat admin device.

### 10. Testing dan keamanan

- Unit.
- Integration.
- E2E utama.
- RLS.
- Server authorization.
- No secret.
- No video storage.

## Quality gate

Jalankan:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Jalankan E2E bila tersedia.

## Output akhir

Laporkan:

1. Fitur selesai.
2. File penting.
3. Migration.
4. Endpoint.
5. Environment variables.
6. Hasil lint/typecheck/test/build.
7. Cara menjalankan.
8. Cara menguji kamera.
9. Risiko tersisa.
10. Kesiapan integrasi IoT yang telah dibuat.

Mulai dengan audit repository dan rencana implementasi. Jangan mengaktifkan fitur IoT.
