import Link from "next/link";
import { RegisterForm } from "@/features/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="space-y-lg">
      <div>
        <p className="eyebrow text-mute">Mulai bergerak</p>
        <h1 className="mt-md font-display text-5xl uppercase leading-none">Buat akun gratis</h1>
        <p className="mt-sm text-sm text-charcoal">
          Buat akun dan mulai latihan pertamamu dalam beberapa detik.
        </p>
      </div>
      <RegisterForm />
      <p className="border-t border-hairline-soft pt-lg text-sm text-mute">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-ink underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
