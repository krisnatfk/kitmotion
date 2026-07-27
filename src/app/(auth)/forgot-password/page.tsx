import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-section">
      <div>
        <h1 className="text-heading-xl">Lupa kata sandi</h1>
        <p className="mt-md text-body-md text-charcoal">
          Kami kirim tautan reset ke email kamu jika terdaftar.
        </p>
      </div>
      <ForgotPasswordForm />
      <Link href="/login" className="text-caption-md text-mute underline">
        Kembali ke masuk
      </Link>
    </div>
  );
}
