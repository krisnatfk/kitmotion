import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-xl">
      <div>
        <p className="eyebrow text-mute">Welcome back</p>
        <h1 className="mt-md font-display text-5xl uppercase leading-none">Masuk ke akunmu</h1>
        <p className="mt-sm text-sm text-charcoal">
          Lanjutkan latihan dan capai level berikutnya.
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <div className="flex flex-col gap-sm border-t border-hairline-soft pt-lg text-sm text-mute">
        <p>
          Belum punya akun?{" "}
          <Link href="/register" className="text-ink underline">
            Daftar
          </Link>
        </p>
        <Link href="/forgot-password" className="text-ink underline">
          Lupa kata sandi?
        </Link>
      </div>
    </div>
  );
}
