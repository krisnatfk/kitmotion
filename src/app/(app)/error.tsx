"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App route error", error);
  }, [error]);

  return (
    <Container className="grid min-h-[70dvh] place-items-center py-section">
      <section className="w-full max-w-xl rounded-sm bg-white p-xl text-center tablet-narrow:p-section">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sport-lime"><Icon name="activity" className="h-6 w-6" /></span>
        <p className="eyebrow mt-xl text-mute">Gangguan sementara</p>
        <h1 className="mt-md font-display text-5xl uppercase">Halaman belum berhasil dimuat</h1>
        <p className="mt-md text-sm leading-relaxed text-mute">Koneksi data mungkin sedang lambat. Coba muat ulang tanpa kehilangan akun atau hasil latihanmu.</p>
        <div className="mt-xl flex flex-wrap justify-center gap-md">
          <Button onClick={reset}>Coba lagi</Button>
          <Link href="/exercises" className="btn-secondary">Buka latihan</Link>
        </div>
      </section>
    </Container>
  );
}
