import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Icon } from "@/components/ui/icons";
import { AuthVisual } from "@/components/layout/auth-visual";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell grid h-svh overflow-hidden bg-white desktop-small:grid-cols-[minmax(420px,0.78fr)_1.22fr]">
      <div className="flex min-h-0 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between px-lg tablet-narrow:px-xxl">
          <Logo href="/" />
          <Link href="/" className="flex min-h-11 items-center gap-sm rounded-full px-md text-sm text-mute transition-colors hover:bg-soft-cloud hover:text-ink">
            <Icon name="arrow" className="h-4 w-4 rotate-180" /> Kembali
          </Link>
        </header>
        <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-lg py-md tablet-narrow:px-xxl">
          <div className="w-full max-w-md animate-auth-enter">{children}</div>
        </main>
        <footer className="hidden h-10 shrink-0 items-center px-xxl text-[10px] text-stone mobile-landscape:flex">
          © {new Date().getFullYear()} KITMOTION · Kamera tetap privat
        </footer>
      </div>
      <AuthVisual />
    </div>
  );
}
