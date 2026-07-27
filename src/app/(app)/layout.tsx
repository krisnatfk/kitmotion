import { env } from "@/lib/env";
import { AppNav } from "@/components/layout/app-nav";
import { SetupNotice } from "@/components/layout/setup-notice";

// All app routes are session-dependent (cookies) and must render on demand.
export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!env.isSupabaseConfigured) {
    return (
      <main className="min-h-dvh">
        <SetupNotice />
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f7f8f5]">
      <AppNav />
      <main className="pb-24 desktop-small:pb-0">{children}</main>
    </div>
  );
}
