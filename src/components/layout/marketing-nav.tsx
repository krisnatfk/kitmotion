"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";

const LINKS = [
  { href: "/#fitur", label: "Fitur" },
  { href: "/#lari-gps", label: "Lari GPS" },
  { href: "/#latihan", label: "Latihan" },
  { href: "/#cara-kerja", label: "Cara kerja" },
  { href: "/privacy", label: "Privasi" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-sport-black text-white">
      <Container className="flex h-[72px] items-center justify-between">
        <Logo tone="light" />
        <nav className="hidden items-center gap-xxl text-sm font-semibold desktop-small:flex" aria-label="Navigasi utama">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-sport-lime">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-md tablet-narrow:flex">
          <ButtonLink href="/login" variant="ghost" className="px-sm text-sm font-semibold text-white hover:bg-white/10">
            Masuk
          </ButtonLink>
          <ButtonLink href="/register" className="min-h-[42px] bg-sport-lime px-lg text-sm font-semibold text-sport-black hover:bg-white">
            Mulai gratis <Icon name="arrow" className="h-3.5 w-3.5" />
          </ButtonLink>
        </div>
        <button
          type="button"
          className="tap-target grid place-items-center rounded-full border border-white/20 desktop-small:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? "close" : "menu"} className="h-5 w-5" />
        </button>
      </Container>

      {open && (
        <div id="mobile-menu" className="border-t border-white/10 bg-sport-black desktop-small:hidden">
          <Container className="py-lg">
            <nav className="flex flex-col" aria-label="Navigasi seluler">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center justify-between border-b border-white/10 py-md text-lg font-semibold"
                >
                  {link.label}<Icon name="arrow" className="h-5 w-5 text-sport-lime" />
                </Link>
              ))}
            </nav>
            <div className="mt-lg grid grid-cols-2 gap-sm">
              <ButtonLink href="/login" variant="secondary" onClick={() => setOpen(false)}>Masuk</ButtonLink>
              <ButtonLink href="/register" className="bg-sport-lime text-sport-black" onClick={() => setOpen(false)}>Daftar</ButtonLink>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
