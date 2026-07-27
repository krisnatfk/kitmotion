import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center py-section">
      <p className="text-caption-md text-mute">404</p>
      <h1 className="display-campaign mt-xs">Halaman tidak ditemukan</h1>
      <p className="mt-md text-body-md text-charcoal">
        Halaman yang kamu cari tidak ada atau sudah dipindahkan.
      </p>
      <ButtonLink href="/" variant="primary" className="mt-xl">
        Kembali ke beranda
      </ButtonLink>
    </Container>
  );
}
