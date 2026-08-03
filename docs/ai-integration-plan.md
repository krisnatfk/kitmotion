# Arsitektur Integrasi AI KITMOTION

## Keputusan arsitektur

KITMOTION menggunakan dua lapisan AI dengan tanggung jawab yang berbeda:

1. **Computer vision real-time di perangkat**
   - MediaPipe Pose Landmarker membaca 33 landmark tubuh langsung di browser.
   - State machine per latihan menghitung fase, repetisi, dan metrik gerakan.
   - Scoring tetap deterministik dan dapat diuji; model bahasa tidak menentukan skor.
   - Video dan frame tidak dikirim ke server.

2. **AI coach generatif opsional di server (terimplementasi)**
   - Model bahasa menerima ringkasan terstruktur setelah sesi, misalnya jenis latihan,
     skor komponen, tempo, jumlah repetisi valid, dan kode feedback.
   - Model menghasilkan penjelasan yang lebih natural, rangkuman progres, dan saran
     latihan berikutnya.
   - Konfigurasi provider menggunakan secret server generik: `AI_PROVIDER`,
     `AI_API_KEY`, `AI_BASE_URL`, dan `AI_MODEL`. Tidak ada yang memakai prefix
     `NEXT_PUBLIC_` atau dipanggil langsung dari browser.
   - Respons AI tidak mengubah skor final, XP, badge, atau data sumber sesi.

## Aliran data yang direkomendasikan

```text
Kamera browser
  -> MediaPipe (landmark lokal)
  -> exercise engine (fase + repetisi)
  -> scoring server (hasil resmi)
  -> simpan ringkasan sesi di Supabase
  -> endpoint AI server (ringkasan saja)
  -> feedback personal untuk pengguna
```

## API key atau melatih model?

Untuk MVP, gunakan model pre-trained melalui API untuk bahasa dan tetap gunakan
MediaPipe pre-trained untuk pose. Tidak perlu melatih foundation model sendiri.

Dataset baru diperlukan ketika KITMOTION ingin memperbaiki akurasi domain gerakan,
misalnya kalibrasi threshold untuk siswa dengan tinggi, sudut kamera, pakaian, dan
pencahayaan yang berbeda. Dataset sebaiknya berupa hasil uji berizin dan berlabel,
dengan prioritas pada landmark/metrik turunan, bukan rekaman video mentah.

Fine-tuning model bahasa baru layak dipertimbangkan setelah tersedia eval yang stabil,
contoh feedback berkualitas tinggi dalam jumlah cukup, dan prompt biasa terbukti belum
memenuhi target. Untuk model gerakan khusus, pelatihan merupakan proyek computer
vision terpisah dari fine-tuning model bahasa.

## Konfigurasi provider

Gunakan endpoint dengan format OpenAI-compatible sebagai adapter pertama. Nama
provider dan model tidak dikunci ke vendor tertentu:

```dotenv
AI_PROVIDER=openai-compatible
AI_API_KEY=isi-secret-provider
AI_BASE_URL=https://endpoint-provider.example/v1
AI_MODEL=nama-model-provider
AI_TIMEOUT_MS=20000
```

Untuk Ollama atau LM Studio lokal, `AI_API_KEY` boleh kosong dan `AI_BASE_URL` dapat
menggunakan HTTP pada `localhost`. Provider dengan format API yang tidak kompatibel
memerlukan adapter tersendiri, tetapi tetap memakai kontrak konfigurasi server yang sama.

## Status dan penguatan berikutnya

1. Computer vision, enam engine, scoring, session coach, rekomendasi harian, insight kelas, cache, fallback, dan provider failover sudah terimplementasi.
2. Kumpulkan hasil pengujian berizin untuk kalibrasi threshold dan eval regresi.
3. Tambahkan rate limit dan observability biaya/latensi pada deployment produksi.
4. Uji kualitas feedback secara berkala sebelum mengubah prompt atau model.
5. Pertimbangkan fine-tuning hanya jika hasil eval menunjukkan kebutuhan nyata.

## Batas keselamatan dan privasi

- Jangan kirim video atau frame kamera ke model generatif.
- Hindari diagnosis medis dan klaim cedera.
- Tampilkan AI sebagai pendamping latihan, bukan penentu medis.
- Simpan audit versi prompt/model untuk feedback yang dihasilkan.
- Gunakan persetujuan eksplisit bila data sesi dipakai untuk riset atau dataset.
