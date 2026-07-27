"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FieldError, FormError, FormSuccess, Input, Label } from "@/components/ui/field";
import { forgotPasswordAction } from "./actions";
import { forgotPasswordSchema, type ForgotPasswordInput } from "./schemas";

export function ForgotPasswordForm() {
  const [server, setServer] = useState<{ error?: string; message?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setSubmitting(true);
    setServer(null);
    const result = await forgotPasswordAction(values);
    setSubmitting(false);
    setServer(result);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg" noValidate>
      {server?.error && <FormError>{server.error}</FormError>}
      {server?.message && <FormSuccess>{server.message}</FormSuccess>}

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

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Mengirim…" : "Kirim tautan reset"}
      </Button>
    </form>
  );
}
