import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

type SupabaseCookie = { name: string; value: string; options: CookieOptions };

/**
 * Supabase client for Server Components and Server Actions. Carries the user's
 * cookie session so RLS enforces row ownership.
 */
export async function getSupabaseServer() {
  if (!env.isSupabaseConfigured) {
    throw new Error("Supabase belum dikonfigurasi.");
  }
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: SupabaseCookie[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // Safe to ignore: middleware refreshes the session.
        }
      },
    },
  });
}

/**
 * Service-role client that bypasses RLS. SERVER ONLY — used by finalize,
 * scoring, and gamification to write authoritative rows (scores, XP, badges).
 * Never import this from a Client Component.
 */
export function getSupabaseServiceRole() {
  if (!env.isServiceRoleConfigured) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  }
  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
