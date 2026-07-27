import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Supabase client for Client Components. Singleton per browser session.
 * Throws at call time (not import time) if Supabase env is missing, so the
 * app still builds with placeholder env.
 */
export function getSupabaseBrowser() {
  if (!env.isSupabaseConfigured) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env",
    );
  }
  if (!cached) {
    cached = createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  }
  return cached;
}

/** Safe accessor — returns null instead of throwing when Supabase is not configured. */
export function maybeSupabaseBrowser() {
  if (!env.isSupabaseConfigured) return null;
  return getSupabaseBrowser();
}
