"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Icon, type IconName } from "@/components/ui/icons";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { ProfileAvatar } from "@/features/profile/avatar";

const STUDENT_TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Beranda", icon: "home" },
  { href: "/exercises", label: "Latihan", icon: "activity" },
  { href: "/running", label: "Lari", icon: "route" },
  { href: "/history", label: "Riwayat", icon: "history" },
  { href: "/classes", label: "Kelas", icon: "users" },
  { href: "/profile", label: "Profil", icon: "user" },
];

const TEACHER_TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/teacher", label: "Dashboard guru", icon: "chart" },
  { href: "/profile", label: "Profil", icon: "user" },
];
const DESKTOP_TABS = STUDENT_TABS.filter((tab) => tab.href !== "/profile");
const MOBILE_STUDENT_TABS = STUDENT_TABS.filter(
  (tab) => tab.href !== "/classes" && tab.href !== "/profile",
);
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
  isTeacher = false,
}: {
  avatarPath?: string | null;
  displayName?: string;
  isAdmin?: boolean;
  isTeacher?: boolean;
}) {
  const pathname = usePathname();
  const mobileTabs = isTeacher ? TEACHER_TABS : MOBILE_STUDENT_TABS;
  const desktopTabs = isTeacher ? TEACHER_TABS : isAdmin ? [...DESKTOP_TABS, ADMIN_TAB] : DESKTOP_TABS;
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMoreActive =
    !isTeacher &&
    ["/classes", "/profile", ...(isAdmin ? ["/admin"] : [])].some((href) =>
      isActive(pathname, href),
    );

  useEffect(() => {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

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

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileMenuOpen(false);
      mobileMenuTriggerRef.current?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

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
                    {(isAdmin || isTeacher) && <span className="rounded-full bg-sport-lime px-sm py-xs text-[9px] font-bold uppercase tracking-wider text-sport-black">{isAdmin ? "Admin" : "Guru"}</span>}
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
                  {isTeacher && (
                    <Link
                      href="/teacher"
                      className="mb-xs flex min-h-11 items-center gap-md rounded-md bg-sport-black px-md text-sm font-semibold text-white transition-colors hover:bg-sport-charcoal"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-sport-lime text-sport-black"><Icon name="chart" className="h-4 w-4" /></span>
                      Buka Dashboard Guru
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
          {mobileTabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap-target relative flex flex-1 flex-col items-center justify-center gap-xs py-sm text-[11px] font-semibold transition-colors",
                  active ? "text-ink" : "text-stone",
                )}
              >
                {tab.href === "/profile" ? (
                  <ProfileAvatar avatarPath={avatarPath} displayName={displayName} className="h-5 w-5 text-[9px]" />
                ) : (
                  <Icon name={tab.icon} className="h-5 w-5" />
                )}
                {tab.label}
                {active && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-sport-lime-deep" />}
              </Link>
            );
          })}
          {!isTeacher && (
            <button
              ref={mobileMenuTriggerRef}
              type="button"
              className={cn(
                "tap-target relative flex flex-1 flex-col items-center justify-center gap-xs py-sm text-[11px] font-semibold transition-colors",
                mobileMoreActive || mobileMenuOpen ? "text-ink" : "text-stone",
              )}
              aria-label="Buka menu lainnya"
              aria-haspopup="dialog"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Icon name="menu" className="h-5 w-5" />
              Lainnya
              {(mobileMoreActive || mobileMenuOpen) && (
                <span className="absolute top-0 h-1 w-8 rounded-b-full bg-sport-lime-deep" />
              )}
            </button>
          )}
        </div>
      </nav>

      {mobileMenuOpen && !isTeacher && (
        <div
          className="app-mobile-nav fixed inset-0 z-[1100] flex items-end bg-sport-black/35"
          onClick={() => setMobileMenuOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            className="safe-bottom w-full rounded-t-lg border-t border-hairline-soft bg-white px-lg pb-md pt-sm shadow-[0_-18px_50px_rgba(0,0,0,0.16)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-md h-1 w-10 rounded-full bg-hairline" aria-hidden="true" />
            <div className="mx-auto max-w-xl">
              <div className="flex items-center justify-between gap-md border-b border-hairline-soft pb-md">
                <div className="flex min-w-0 items-center gap-md">
                  <ProfileAvatar avatarPath={avatarPath} displayName={displayName} className="h-11 w-11 shrink-0 text-base" />
                  <div className="min-w-0">
                    <p id="mobile-more-title" className="text-[10px] font-bold uppercase tracking-[0.16em] text-mute">
                      Akun KITMOTION
                    </p>
                    <p className="mt-xs truncate text-sm font-semibold text-ink">{displayName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="tap-target grid shrink-0 place-items-center rounded-full text-mute hover:bg-soft-cloud hover:text-ink"
                  aria-label="Tutup menu lainnya"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>

              <div className="py-sm">
                <Link
                  href="/classes"
                  className="flex min-h-14 items-center gap-md rounded-md px-sm text-sm font-semibold text-ink transition-colors hover:bg-soft-cloud"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-sport-lime text-sport-black">
                    <Icon name="users" className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block">Kelas</span>
                    <span className="mt-xs block text-xs font-normal text-mute">Kelas, undangan, dan aktivitas siswa</span>
                  </span>
                </Link>
                <Link
                  href="/profile"
                  className="flex min-h-14 items-center gap-md rounded-md px-sm text-sm font-semibold text-ink transition-colors hover:bg-soft-cloud"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-soft-cloud">
                    <Icon name="user" className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block">Pengaturan profil</span>
                    <span className="mt-xs block text-xs font-normal text-mute">Identitas, kelas, dan avatar</span>
                  </span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex min-h-14 items-center gap-md rounded-md px-sm text-sm font-semibold text-ink transition-colors hover:bg-soft-cloud"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-sport-black text-sport-lime">
                      <Icon name="shield" className="h-5 w-5" />
                    </span>
                    Admin Panel
                  </Link>
                )}
              </div>
              <div className="border-t border-hairline-soft pt-sm">
                <SignOutButton
                  variant="ghost"
                  className="w-full justify-start rounded-md px-sm text-sm font-semibold text-danger hover:bg-red-50"
                  onSignedOut={() => setMobileMenuOpen(false)}
                />
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
