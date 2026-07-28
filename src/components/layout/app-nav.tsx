"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Icon, type IconName } from "@/components/ui/icons";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { ProfileAvatar } from "@/features/profile/avatar";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Beranda", icon: "home" },
  { href: "/exercises", label: "Latihan", icon: "activity" },
  { href: "/running", label: "Lari", icon: "route" },
  { href: "/history", label: "Riwayat", icon: "history" },
  { href: "/profile", label: "Profil", icon: "user" },
];

const DESKTOP_TABS = TABS.filter((tab) => tab.href !== "/profile");
const ADMIN_TAB: { href: string; label: string; icon: IconName } = {
  href: "/admin",
  label: "Admin",
  icon: "shield",
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  avatarPath,
  displayName = "Pengguna KITMOTION",
  isAdmin = false,
}: {
  avatarPath?: string | null;
  displayName?: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const desktopTabs = isAdmin ? [...DESKTOP_TABS, ADMIN_TAB] : DESKTOP_TABS;
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setAccountMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setAccountMenuOpen(false);
      accountTriggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  return (
    <>
      <header className="app-desktop-nav sticky top-0 z-[1000] border-b border-hairline-soft bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-section">
          <Logo href="/dashboard" />
          <nav className="flex items-center gap-sm" aria-label="Navigasi aplikasi">
            {desktopTabs.map((tab) => {
              const active = isActive(pathname, tab.href);
              return <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-sm rounded-full px-lg text-sm font-semibold transition-colors", active ? "bg-sport-black text-white" : "text-mute hover:bg-soft-cloud hover:text-ink")}><Icon name={tab.icon} className={cn("h-[18px] w-[18px]", active && "text-sport-lime")} />{tab.label}</Link>;
            })}
          </nav>
          <div ref={accountMenuRef} className="relative">
            <button
              ref={accountTriggerRef}
              type="button"
              className={cn(
                "grid h-12 w-12 place-items-center rounded-full transition-colors hover:bg-soft-cloud",
                accountMenuOpen && "bg-soft-cloud",
              )}
              aria-label="Buka menu akun"
              aria-haspopup="true"
              aria-expanded={accountMenuOpen}
              aria-controls="account-menu"
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <ProfileAvatar avatarPath={avatarPath} displayName={displayName} className="h-11 w-11 text-lg" />
            </button>

            {accountMenuOpen && (
              <div
                id="account-menu"
                className="absolute right-0 top-[calc(100%+12px)] w-64 overflow-hidden rounded-sm border border-hairline-soft bg-white p-sm text-ink shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
                aria-label="Menu akun"
              >
                <div className="border-b border-hairline-soft px-md py-md">
                  <div className="flex items-center justify-between gap-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-mute">Akun</p>
                    {isAdmin && <span className="rounded-full bg-sport-lime px-sm py-xs text-[9px] font-bold uppercase tracking-wider text-sport-black">Admin</span>}
                  </div>
                  <p className="mt-xs truncate text-sm font-semibold">{displayName}</p>
                </div>
                <div className="py-sm">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="mb-xs flex min-h-11 items-center gap-md rounded-md bg-sport-black px-md text-sm font-semibold text-white transition-colors hover:bg-sport-charcoal"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-sport-lime text-sport-black">
                        <Icon name="shield" className="h-4 w-4" />
                      </span>
                      Buka Admin Panel
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="flex min-h-11 items-center gap-md rounded-md px-md text-sm font-semibold transition-colors hover:bg-soft-cloud"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-soft-cloud">
                      <Icon name="user" className="h-4 w-4" />
                    </span>
                    Pengaturan profil
                  </Link>
                  <SignOutButton
                    variant="ghost"
                    containerClassName="mt-xs"
                    className="w-full justify-start rounded-md px-md text-sm font-semibold text-danger hover:bg-red-50"
                    onSignedOut={() => setAccountMenuOpen(false)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="app-mobile-nav safe-bottom fixed inset-x-0 bottom-0 z-[1000] border-t border-hairline-soft bg-white/95 backdrop-blur" aria-label="Navigasi aplikasi seluler">
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
