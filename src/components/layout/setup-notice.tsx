import { Container } from "@/components/ui/container";

/** Shown when Supabase env is missing — keeps the app buildable with placeholders. */
export function SetupNotice() {
  return (
    <Container className="py-section">
      <div className="surface-cloud p-section">
        <h1 className="text-heading-xl">Supabase belum dikonfigurasi</h1>
        <p className="mt-md max-w-xl text-body-md text-charcoal">
          Aplikasi sudah terpasang, tapi backend belum dihubungkan. Isi{" "}
          <code className="bg-canvas px-xs">NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
          <code className="bg-canvas px-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di
          file <code className="bg-canvas px-xs">.env</code>, lalu jalankan{" "}
          <code className="bg-canvas px-xs">npm run dev</code> kembali. Lihat{" "}
          <code className="bg-canvas px-xs">README.md</code> untuk langkah lengkap.
        </p>
      </div>
    </Container>
  );
}
