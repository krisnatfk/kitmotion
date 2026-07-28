"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Icon, type IconName } from "@/components/ui/icons";
import { ProfileAvatar } from "@/features/profile/avatar";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { cn } from "@/lib/utils";

const NAVIGATION: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/admin", label: "Ringkasan", icon: "chart", exact: true },
  { href: "/admin/users", label: "Pengguna", icon: "users" },
  { href: "/admin/exercises", label: "Latihan", icon: "activity" },
  { href: "/admin/badges", label: "Badge", icon: "target" },
  { href: "/admin/challenges", label: "Challenge", icon: "bolt" },
  { href: "/admin/sessions", label: "Aktivitas", icon: "history" },
  { href: "/admin/audit", label: "Audit sistem", icon: "shield" },
];

function activePath(pathname: string, href: string, exact = false) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  adminName,
  avatarPath,
  children,
}: {
  adminName: string;
  avatarPath?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-[#f2f5ef] desktop-small:grid desktop-small:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="hidden h-dvh flex-col overflow-y-auto bg-sport-black px-lg py-xl text-white desktop-small:sticky desktop-small:top-0 desktop-small:flex">
        <div className="flex items-center justify-between gap-md px-sm">
          <Logo href="/admin" tone="light" />
          <span className="rounded-full bg-sport-lime px-md py-xs text-[9px] font-bold uppercase tracking-[0.18em] text-sport-black">Admin</span>
        </div>

        <div className="mt-section px-sm">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/30">Workspace</p>
          <nav className="mt-md space-y-xs" aria-label="Navigasi admin">
            {NAVIGATION.map((item) => {
              const active = activePath(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-h-12 items-center gap-md rounded-sm px-md text-sm font-semibold transition-all",
                    active ? "bg-sport-lime text-sport-black" : "text-white/[0.58] hover:bg-white/[0.08] hover:text-white",
                  )}
                >
                  <Icon name={item.icon} className={cn("h-[18px] w-[18px]", !active && "text-white/35 group-hover:text-sport-lime")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto rounded-sm border border-white/10 bg-white/[0.04] p-md">
          <div className="flex items-center gap-md">
            <ProfileAvatar avatarPath={avatarPath} displayName={adminName} className="h-10 w-10 text-base" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{adminName}</p>
              <p className="mt-xxs text-[9px] font-bold uppercase tracking-widest text-sport-lime">Administrator</p>
            </div>
          </div>
          <Link href="/dashboard" className="mt-md flex min-h-10 items-center gap-sm border-t border-white/10 pt-md text-xs font-semibold text-white/55 transition-colors hover:text-sport-lime">
            <Icon name="arrow" className="h-4 w-4 rotate-180" /> Kembali ke aplikasi
          </Link>
          <SignOutButton variant="ghost" containerClassName="mt-xs" className="w-full justify-start px-0 text-xs text-white/45 hover:text-white" />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-[1100] border-b border-black/10 bg-sport-black text-white desktop-small:hidden">
          <div className="flex h-16 items-center justify-between px-lg">
            <div className="flex items-center gap-md"><Logo href="/admin" tone="light" size="sm" /><span className="rounded-full bg-sport-lime px-sm py-xs text-[8px] font-bold uppercase tracking-wider text-black">Admin</span></div>
            <Link href="/dashboard" aria-label="Kembali ke aplikasi" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/60"><Icon name="arrow" className="h-4 w-4 rotate-180" /></Link>
          </div>
          <nav className="flex gap-xs overflow-x-auto border-t border-white/10 px-lg py-sm" aria-label="Navigasi admin">
            {NAVIGATION.map((item) => {
              const active = activePath(pathname, item.href, item.exact);
              return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex shrink-0 items-center gap-sm rounded-full px-md py-sm text-xs font-semibold", active ? "bg-sport-lime text-black" : "text-white/55")}><Icon name={item.icon} className="h-4 w-4" />{item.label}</Link>;
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-[1540px] px-lg py-xl tablet-narrow:px-xl tablet-narrow:py-section desktop-large:px-section">
          {children}
        </main>
      </div>
    </div>
  );
}
