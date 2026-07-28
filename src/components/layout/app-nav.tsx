"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Icon, type IconName } from "@/components/ui/icons";
import { ProfileAvatar } from "@/features/profile/avatar";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Beranda", icon: "home" },
  { href: "/exercises", label: "Latihan", icon: "activity" },
  { href: "/history", label: "Riwayat", icon: "history" },
  { href: "/profile", label: "Profil", icon: "user" },
];

const DESKTOP_TABS = TABS.filter((tab) => tab.href !== "/profile");

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({ avatarPath, displayName = "Pengguna KITMOTION" }: { avatarPath?: string | null; displayName?: string }) {
  const pathname = usePathname();
  return (
    <>
      <header className="app-desktop-nav sticky top-0 z-40 border-b border-hairline-soft bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-section">
          <Logo href="/dashboard" />
          <nav className="flex items-center gap-sm" aria-label="Navigasi aplikasi">
            {DESKTOP_TABS.map((tab) => {
              const active = isActive(pathname, tab.href);
              return <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-sm rounded-full px-lg text-sm font-semibold transition-colors", active ? "bg-sport-black text-white" : "text-mute hover:bg-soft-cloud hover:text-ink")}><Icon name={tab.icon} className={cn("h-[18px] w-[18px]", active && "text-sport-lime")} />{tab.label}</Link>;
            })}
          </nav>
          <Link href="/profile" className="rounded-full transition-transform hover:scale-105" aria-label="Buka profil" aria-current={isActive(pathname, "/profile") ? "page" : undefined}><ProfileAvatar avatarPath={avatarPath} displayName={displayName} className="h-11 w-11 text-lg" /></Link>
        </div>
      </header>

      <nav className="app-mobile-nav safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-hairline-soft bg-white/95 backdrop-blur" aria-label="Navigasi aplikasi seluler">
        <div className="mx-auto flex max-w-xl items-stretch justify-around">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
              return <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={cn("tap-target relative flex flex-1 flex-col items-center justify-center gap-xs py-sm text-[11px] font-semibold transition-colors", active ? "text-ink" : "text-stone")}>{tab.href === "/profile" ? <ProfileAvatar avatarPath={avatarPath} displayName={displayName} className="h-5 w-5 text-[9px]" /> : <Icon name={tab.icon} className="h-5 w-5" />}{tab.label}{active && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-sport-lime-deep" />}</Link>;
          })}
        </div>
      </nav>
    </>
  );
}
