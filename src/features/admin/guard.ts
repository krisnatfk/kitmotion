import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/features/profile/queries";

/**
 * Server-side admin authorization. Used by admin layouts and actions.
 * Returns the admin profile, or redirects non-admins away.
 *
 * Role is read from the DB (RLS-protected profiles table) — never trusted
 * from a client claim. Service-role writes elsewhere never bypass this check.
 */
export async function requireAdmin(next?: string): Promise<Profile> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next ?? "/admin")}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }
  return profile;
}

/** Throws for use inside server actions (no redirect). */
export async function requireAdminOrThrow(): Promise<Profile> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized: not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: admin role required");
  }
  return profile;
}
