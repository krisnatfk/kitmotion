# Rules — KITMOTION (Application-First)

> **Versi:** 2.0  
> **Fokus:** Bangun aplikasi terlebih dahulu  
> **IoT:** Disiapkan, belum diimplementasikan

---

## 1. Dokumen Wajib

Baca:

1. `prd.md`
2. `architecture.md`
3. `schema.md`
4. `design.md`
5. `rules.md`

---

## 2. Aturan Terpenting

Aplikasi harus selesai lebih dahulu.

AI dilarang membuat integrasi IoT aktif sebelum pemilik proyek secara eksplisit meminta fase IoT dimulai.

---

## 3. Yang Harus Dibangun

1. Landing page.
2. Auth.
3. Profile.
4. Dashboard.
5. Exercise catalog.
6. Tutorial.
7. Camera readiness.
8. Pose detection.
9. Squat engine.
10. Jumping jack engine.
11. Push-up engine.
12. Repetition counting.
13. Feedback.
14. Scoring.
15. Result.
16. History.
17. XP.
18. Level.
19. Badge.
20. Challenge.
21. Admin minimum.
22. PWA.
23. SensorProvider interface.
24. NoopSensorProvider.
25. Feature flag IoT false.

---

## 4. Yang Tidak Boleh Dibangun Sekarang

1. Device page.
2. Device pairing.
3. QR pairing.
4. ESP32 code.
5. MPU6050 code.
6. Telemetry endpoint.
7. Heartbeat endpoint.
8. Device authentication.
9. Device secret.
10. Device tables.
11. Telemetry tables.
12. Sensor fusion.
13. Bluetooth.
14. Wi-Fi provisioning.
15. Kalung status UI.
16. Bonus XP kalung.
17. Fake sensor connected.
18. Mock telemetry production.

---

## 5. Future-Ready Rules

Kesiapan IoT hanya melalui:

- `SensorProvider`;
- `SensorSample`;
- `SensorSessionSummary`;
- `NoopSensorProvider`;
- `iotIntegrationEnabled = false`;
- field database opsional;
- dokumentasi contract.

Jangan membuat implementasi nyata.

---

## 6. Source of Truth

1. Instruksi terbaru pemilik proyek.
2. PRD.
3. Design.
4. Architecture.
5. Schema.
6. Rules.

---

## 7. Coding Rules

- TypeScript strict.
- Hindari `any`.
- Validasi semua input.
- Domain logic terpisah dari UI.
- State machine dapat diuji.
- Server code tidak masuk client.
- Gunakan `"use client"` hanya bila perlu.
- Gunakan migration.
- Jangan duplikasi fungsi.
- Jangan menulis file sangat besar.
- Jangan menambah dependency tanpa alasan.

---

## 8. Camera Rules

1. Minta izin saat diperlukan.
2. Beri penjelasan sebelum prompt.
3. Stop stream saat keluar.
4. Jangan simpan frame.
5. Jangan upload frame.
6. Lazy-load model.
7. Confidence threshold wajib.
8. Pause scoring saat tracking buruk.
9. Gunakan state machine.
10. Cleanup resource.

---

## 9. Exercise Rules

Setiap gerakan memiliki:

- phase;
- transition;
- threshold;
- debounce;
- metrics;
- issue code;
- feedback;
- test;
- version.

Engine tidak boleh mengetahui IoT.

Workout session yang menggabungkan engine dengan provider.

---

## 10. Scoring Rules

1. Kamera adalah satu-satunya sumber skor saat ini.
2. Sensor tidak boleh memengaruhi skor.
3. Scoring version wajib.
4. Final score server-side.
5. Nilai 0–100.
6. Sesi lama tidak berubah saat algoritma baru dibuat.

---

## 11. Database Rules

1. Tidak membuat tabel device.
2. Tidak membuat telemetry.
3. `sensor_source` selalu `none`.
4. `sensor_summary` selalu null.
5. RLS wajib.
6. Client tidak mengubah score/XP/role.
7. Migration immutable.
8. Constraint dan index wajib.

---

## 12. UI Rules

1. Ikuti `design.md`.
2. Tidak menampilkan menu perangkat.
3. Tidak menampilkan status connected.
4. Tidak menampilkan sensor card.
5. Tidak menyebut kalung sebagai fitur aktif.
6. Bila integrasi disebut di landing page, tandai sebagai “pengembangan berikutnya” hanya jika sesuai design dan instruksi pemilik.
7. Semua state tersedia.
8. Responsif.
9. Aksesibel.

---

## 13. Security

1. Secret tidak di frontend.
2. Service role hanya server.
3. RLS aktif.
4. User ID dari session.
5. Admin server-side.
6. Tidak log token.
7. Rate limit endpoint sensitif.
8. Tidak ada endpoint IoT sekarang.

---

## 14. Testing

### Wajib

- angle utility;
- state machine;
- repetition counting;
- scoring;
- XP;
- level;
- challenge;
- session idempotency;
- RLS;
- NoopSensorProvider.

### Tidak perlu sekarang

- device auth;
- telemetry batch;
- pairing;
- heartbeat;
- sensor fusion.

---

## 15. Quality Gate

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

E2E dijalankan bila tersedia.

---

## 16. Definition of Done

Fitur selesai bila:

1. Sesuai PRD.
2. Sesuai design.
3. Sesuai architecture.
4. Sesuai schema.
5. Tidak mengaktifkan IoT.
6. Test lulus.
7. Build lulus.
8. Responsif.
9. Aman.
10. Dokumentasi diperbarui.
