"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FieldError, FormError, Input, Label, PasswordInput } from "@/components/ui/field";
import { loginAction } from "./actions";
import { loginSchema, type LoginInput } from "./schemas";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const verificationError = searchParams.has("error")
    ? "Tautan verifikasi tidak valid atau sudah kedaluwarsa."
    : null;
  const [server, setServer] = useState<{ error?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    setServer(null);
    const result = await loginAction({ ...values, next });
    setSubmitting(false);
    if (result.error) {
      setServer({ error: result.error });
      return;
    }
    if (result.redirectTo) {
      router.push(result.redirectTo);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-md" noValidate>
      {(server?.error || verificationError) && <FormError>{server?.error ?? verificationError}</FormError>}

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
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        <FieldError>{errors.password?.message}</FieldError>
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Memeriksa…" : "Masuk"}
      </Button>
    </form>
  );
}
