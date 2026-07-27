"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export function AuthVisual() {
  const pathname = usePathname();
  const isRegister = pathname === "/register";
  const image = isRegister
    ? "/images/kitmotion-female-athlete-v2.png"
    : "/images/kitmotion-athlete-hero.png";
  const alt = isRegister
    ? "Atlet perempuan melakukan latihan lunge"
    : "Atlet melakukan latihan eksplosif";

  return (
    <aside className="relative hidden h-svh overflow-hidden bg-sport-black desktop-small:block">
      <Image
        src={image}
        alt={alt}
        fill
        priority
        sizes="55vw"
        className={isRegister ? "object-cover object-[62%_center]" : "object-cover object-[68%_center]"}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-sport-black via-sport-black/5 to-sport-black/10" />
      <div className="absolute inset-x-8 bottom-8 max-w-xl text-white desktop-large:inset-x-section desktop-large:bottom-section">
        <p className="eyebrow text-sport-lime">{isRegister ? "Start your movement" : "Train smarter"}</p>
        <p className="mt-md font-display text-5xl uppercase leading-[0.86] desktop-large:text-6xl">
          {isRegister ? "Mulai kuat dari gerakan pertama." : "Setiap repetisi adalah progres."}
        </p>
        <p className="mt-md max-w-md text-sm leading-relaxed text-white/60">
          Analisis gerakan secara real-time tanpa perangkat tambahan.
        </p>
      </div>
    </aside>
  );
}
