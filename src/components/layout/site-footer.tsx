import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";

const COLUMNS = [
  { title: "Jelajahi", links: [{ label: "Fitur", href: "/#fitur" }, { label: "Latihan", href: "/#latihan" }, { label: "Cara kerja", href: "/#cara-kerja" }] },
  { title: "Akun", links: [{ label: "Masuk", href: "/login" }, { label: "Daftar gratis", href: "/register" }, { label: "Dashboard", href: "/dashboard" }] },
  { title: "Dukungan", links: [{ label: "Privasi", href: "/privacy" }, { label: "Syarat penggunaan", href: "/terms" }] },
];

export function SiteFooter() {
  return (
    <footer className="bg-sport-black py-section text-white">
      <Container>
        <div className="grid gap-section tablet-narrow:grid-cols-2 desktop-small:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div><Logo tone="light" variant="wordmark" /><p className="mt-lg max-w-xs text-sm leading-relaxed text-white/45">Pelatih olahraga berbasis AI untuk membantu setiap gerakan menjadi lebih baik.</p></div>
          {COLUMNS.map((column) => <div key={column.title}><h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">{column.title}</h2><ul className="mt-lg space-y-md">{column.links.map((link) => <li key={link.href}><Link href={link.href} className="text-sm text-white/75 transition-colors hover:text-sport-lime">{link.label}</Link></li>)}</ul></div>)}
        </div>
        <div className="mt-section flex flex-col gap-md border-t border-white/10 pt-xl text-xs text-white/35 tablet-narrow:flex-row tablet-narrow:items-center tablet-narrow:justify-between"><p>© {new Date().getFullYear()} KITMOTION. Seluruh hak dilindungi.</p><p>Aplikasi pembelajaran olahraga, bukan alat medis.</p></div>
      </Container>
    </footer>
  );
}
