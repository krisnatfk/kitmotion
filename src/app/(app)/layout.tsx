import { env } from "@/lib/env";
import { AppNav } from "@/components/layout/app-nav";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getCurrentProfile } from "@/features/profile/queries";
import { withTimeoutFallback } from "@/lib/async";

// All app routes are session-dependent (cookies) and must render on demand.
export const dynamic = "force-dynamic";

export default async function AppLayout({
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

  const profile = await withTimeoutFallback(getCurrentProfile(), null, 2_500);

  return (
    <div className="min-h-dvh bg-[#f7f8f5]">
      <AppNav
        avatarPath={profile?.avatar_path}
        displayName={profile?.full_name}
        isAdmin={profile?.role === "admin"}
      />
      <main className="app-content">{children}</main>
    </div>
  );
}
