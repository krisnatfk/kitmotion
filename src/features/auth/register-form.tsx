"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FieldError, FormError, FormSuccess, Input, Label, PasswordInput } from "@/components/ui/field";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { translateAuthError } from "./errors";
import { registerSchema, type RegisterInput } from "./schemas";

type RegisterResult = { error?: string; message?: string };

export function RegisterForm() {
  const router = useRouter();
  const [server, setServer] = useState<RegisterResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const submittingRef = useRef(false);
  const resendingRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setServer(null);
    try {
      // Sign up from the browser so Supabase rate-limits each end-user IP,
      // instead of grouping every registration under a Vercel server IP.
      const supabase = getSupabaseBrowser();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.full_name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setServer({ error: translateAuthError(error.message, error.code, error.status) });
        return;
      }
      if (!data.session) {
        setPendingEmail(values.email);
        setServer({ message: "Akun dibuat. Cek email untuk verifikasi sebelum masuk." });
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setServer({ error: "Pendaftaran tidak dapat diproses. Periksa koneksi lalu coba lagi." });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    if (!pendingEmail || resendingRef.current) return;
    resendingRef.current = true;
    setResending(true);
    setServer(null);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) {
        setServer({ error: translateAuthError(error.message, error.code, error.status) });
        return;
      }
      setServer({ message: "Email verifikasi baru sudah dikirim. Gunakan link terbaru di kotak masuk." });
    } catch {
      setServer({ error: "Email verifikasi tidak dapat dikirim. Periksa koneksi lalu coba lagi." });
    } finally {
      resendingRef.current = false;
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-md" noValidate>
      {server?.error && <FormError>{server.error}</FormError>}
      {server?.message && <FormSuccess>{server.message}</FormSuccess>}

      <div>
        <Label htmlFor="full_name">Nama lengkap</Label>
        <Input
          id="full_name"
          autoComplete="name"
          placeholder="Nama kamu"
          aria-invalid={!!errors.full_name}
          {...register("full_name")}
        />
        <FieldError>{errors.full_name?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nama@sekolah.sch.id"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        <FieldError>{errors.email?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="password">Kata sandi</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        <FieldError>{errors.password?.message}</FieldError>
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Membuat akun…" : "Daftar"}
      </Button>
      {pendingEmail && (
        <Button type="button" variant="secondary" disabled={resending} onClick={resendVerification} className="w-full">
          {resending ? "Mengirim ulang…" : "Kirim ulang email verifikasi"}
        </Button>
      )}
    </form>
  );
}
