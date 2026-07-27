import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata = { title: "Kebijakan Privasi" };

export default function PrivacyPage() {
  return (
    <Container className="py-section">
      <h1 className="display-campaign">Privasi</h1>
      <div className="mt-xl max-w-prose space-y-lg text-body-md text-charcoal">
        <p>
          KITMOTION memproses pose tubuh kamu secara lokal di browser menggunakan
          kamera. Frame kamera <strong>tidak direkam, tidak disimpan, dan tidak
          dikirim ke server</strong>. Inferensi pose berjalan di perangkatmu.
        </p>
        <p>
          Yang disimpan di server: ringkasan sesi (skor, jumlah repetisi, durasi,
          metrik per repetisi, dan ringkasan umpan balik), serta data akun (nama,
          sekolah, kelas). Data ini dilindungi dengan Row Level Security — kamu
          hanya bisa mengakses data milikmu sendiri.
        </p>
        <p>
          Landmark per frame dan raw sensor tidak disimpan. Pada fase aplikasi
          ini, tidak ada data perangkat IoT yang dikumpulkan karena integrasi
          kalung belum diaktifkan.
        </p>
        <p>
          Dengan menggunakan KITMOTION, kamu menyetujui penggunaan kamera untuk
          analisis gerakan. KITMOTION bukan alat medis dan feedback yang diberikan
          bukan diagnosis medis.
        </p>
        <p className="text-caption-md text-mute">
          Pertanyaan soal privasi? Hubungi admin sekolahmu.
        </p>
      </div>
      <Link href="/" className="mt-section inline-block text-ink underline">
        Kembali ke beranda
      </Link>
    </Container>
  );
}
