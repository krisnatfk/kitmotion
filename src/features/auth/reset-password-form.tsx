"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FieldError, FormError, Label, PasswordInput } from "@/components/ui/field";
import { resetPasswordAction } from "./actions";
import { resetPasswordSchema, type ResetPasswordInput } from "./schemas";

export function ResetPasswordForm() {
  const router = useRouter();
  const [server, setServer] = useState<{ error?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setSubmitting(true);
    setServer(null);
    const result = await resetPasswordAction(values);
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg" noValidate>
      {server?.error && <FormError>{server.error}</FormError>}

      <div>
        <Label htmlFor="password">Kata sandi baru</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        <FieldError>{errors.password?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="confirm">Ulangi kata sandi baru</Label>
        <PasswordInput
          id="confirm"
          autoComplete="new-password"
          aria-invalid={!!errors.confirm}
          {...register("confirm")}
        />
        <FieldError>{errors.confirm?.message}</FieldError>
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Menyimpan…" : "Simpan kata sandi baru"}
      </Button>
    </form>
  );
}
