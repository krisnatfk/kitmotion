import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata = { title: "Syarat Layanan" };

export default function TermsPage() {
  return (
    <Container className="py-section">
      <h1 className="display-campaign">Syarat</h1>
      <div className="mt-xl max-w-prose space-y-lg text-body-md text-charcoal">
        <p>
          KITMOTION adalah aplikasi pembelajaran olahraga untuk siswa SMA. Dengan
          mendaftar, kamu setuju untuk menggunakan aplikasi ini secara bertanggung
          jawab dan tidak menyalahgunakan akun atau data pengguna lain.
        </p>
        <p>
          Skor dan penilaian dihasilkan dari analisis pose berbasis kamera dan
          bersifat indikatif. Hasil tidak boleh dijadikan satu-satunya rujukan
          untuk keputusan terkait kesehatan atau pendidikan formal.
        </p>
        <p>
          Pemberian XP, level, badge, dan challenge bersifat otomatis dan
          idempoten. Upaya manipulasi skor atau reward dapat mengakibatkan
          penonaktifan akun.
        </p>
        <p>
          KITMOTION dapat memperbarui syarat ini sewaktu-waktu. Perubahan berlaku
          sejak dipublikasikan di halaman ini.
        </p>
      </div>
      <Link href="/" className="mt-section inline-block text-ink underline">
        Kembali ke beranda
      </Link>
    </Container>
  );
}
