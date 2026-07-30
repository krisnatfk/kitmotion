import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

type SupabaseCookie = { name: string; value: string; options: CookieOptions };

const PROTECTED_ROOTS = ["/dashboard", "/exercises", "/workout", "/running", "/history", "/profile", "/classes", "/teacher"];
const ADMIN_ROOT = "/admin";
const AUTH_ROOTS = ["/login", "/register", "/forgot-password"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Dev without Supabase creds: skip auth so the app still renders placeholders.
  if (!env.isSupabaseConfigured) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: SupabaseCookie[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
  const isAdmin = pathname === ADMIN_ROOT || pathname.startsWith(`${ADMIN_ROOT}/`);
  const isAuthRoute = AUTH_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));

  // Unauthenticated → redirect to login (preserve destination).
  if ((isProtected || isAdmin) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Already authenticated → bounce off auth pages.
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Admin role is verified server-side in the admin layout (DB-backed),
  // not in middleware. Middleware only guarantees authentication here.
  return supabaseResponse;
}
