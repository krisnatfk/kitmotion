"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-sport-black px-lg text-white">
      <div className="max-w-lg text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10"><Icon name="bolt" className="h-7 w-7 text-sport-lime" /></span>
        <p className="eyebrow mt-xl justify-center text-sport-lime">Terjadi gangguan</p>
        <h1 className="mt-md font-display text-5xl uppercase leading-none">Gerakanmu belum berhenti</h1>
        <p className="mt-lg text-sm leading-relaxed text-white/55">Halaman gagal dimuat. Coba ulangi tanpa kehilangan progres yang sudah tersimpan.</p>
        <Button onClick={reset} className="mt-xl bg-sport-lime text-sport-black hover:bg-white">Coba lagi</Button>
      </div>
    </main>
  );
}
