import Link from "next/link";
import { requireAdmin } from "@/features/admin/guard";
import { Logo } from "@/components/ui/logo";
import { Icon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/exercises", label: "Latihan" },
  { href: "/admin/badges", label: "Badge" },
  { href: "/admin/challenges", label: "Challenge" },
  { href: "/admin/sessions", label: "Sesi" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side, DB-backed role check (rules.md §13.5). Non-admins are bounced.
  await requireAdmin("/admin");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-white/10 bg-sport-black text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-lg py-lg tablet-narrow:px-xl desktop-large:px-section">
          <div className="flex items-center gap-md"><Logo href="/admin" tone="light" /><span className="rounded-full bg-sport-lime px-md py-xs text-[10px] font-bold uppercase tracking-widest text-black">Admin</span></div>
          <Link href="/dashboard" className="flex items-center gap-sm text-xs text-white/55 hover:text-sport-lime">
            <Icon name="arrow" className="h-4 w-4 rotate-180" /> <span className="hidden mobile-landscape:inline">Kembali ke aplikasi</span>
          </Link>
        </div>
        <div className="border-t border-white/10">
          <nav
            className="mx-auto flex max-w-[1440px] gap-sm overflow-x-auto px-lg py-sm text-sm tablet-narrow:px-xl desktop-large:px-section"
            aria-label="Navigasi admin"
          >
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="shrink-0 rounded-full px-lg py-sm text-white/65 transition-colors hover:bg-white/10 hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-lg py-section tablet-narrow:px-xl desktop-large:px-section">{children}</main>
    </div>
  );
}
