import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = params.code;

  if (!code) {
    return (
      <div className="space-y-section">
        <h1 className="text-heading-xl">Tautan tidak valid</h1>
        <p className="text-body-md text-charcoal">
          Tautan reset tidak ditemukan atau sudah kedaluwarsa.
        </p>
        <Link href="/forgot-password" className="text-ink underline">
          Minta tautan baru
        </Link>
      </div>
    );
  }

  // Exchange the PKCE code for a session so updateUser works on the next request.
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return (
      <div className="space-y-section">
        <h1 className="text-heading-xl">Tautan kedaluwarsa</h1>
        <p className="text-body-md text-charcoal">{error.message}</p>
        <Link href="/forgot-password" className="text-ink underline">
          Minta tautan baru
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-section">
      <div>
        <h1 className="text-heading-xl">Kata sandi baru</h1>
        <p className="mt-md text-body-md text-charcoal">
          Pilih kata sandi baru untuk akunmu.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
