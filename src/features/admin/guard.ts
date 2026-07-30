import { redirect } from "next/navigation";
import { cache } from "react";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import type { Profile } from "@/features/profile/queries";

type SupabaseServerClient = Awaited<ReturnType<typeof getSupabaseServer>>;

async function getProfileForVerifiedUser(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (data) return data;

  // The identity still comes from auth.getUser(). The service client only
  // reads that verified ID, so a broken profile RLS policy cannot lock an
  // administrator out without allowing callers to choose another account.
  try {
    const service = getSupabaseServiceRole();
    const { data: fallback } = await service
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return fallback;
  } catch {
    return null;
  }
}

type AdminAccessResult =
  | { status: "authenticated"; profile: Profile }
  | { status: "unauthenticated" }
  | { status: "forbidden" };

// The admin layout and page both enforce authorization. Memoizing this lookup
// keeps that defense in depth without making the same auth/profile requests
// twice during one server render.
const resolveAdminAccess = cache(async (): Promise<AdminAccessResult> => {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  const profile = await getProfileForVerifiedUser(supabase, user.id);
  if (!profile || profile.role !== "admin") return { status: "forbidden" };

  return { status: "authenticated", profile };
});

/**
 * Server-side admin authorization. Used by admin layouts and actions.
 * Returns the admin profile, or redirects non-admins away.
 *
 * Role is read from the DB (RLS-protected profiles table) — never trusted
 * from a client claim. Service-role writes elsewhere never bypass this check.
 */
export async function requireAdmin(next?: string): Promise<Profile> {
  const access = await resolveAdminAccess();
  if (access.status === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(next ?? "/admin")}`);
  }
  if (access.status === "forbidden") redirect("/dashboard");
  return access.profile;
}

/** Throws for use inside server actions (no redirect). */
export async function requireAdminOrThrow(): Promise<Profile> {
  const access = await resolveAdminAccess();
  if (access.status === "unauthenticated") {
    throw new Error("Unauthorized: not authenticated");
  }
  if (access.status === "forbidden") {
    throw new Error("Forbidden: admin role required");
  }
  return access.profile;
}
