"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FieldError, FormError, FormSuccess, Input, Label, PasswordInput } from "@/components/ui/field";
import { registerAction, type ActionResult } from "./actions";
import { registerSchema, type RegisterInput } from "./schemas";

export function RegisterForm() {
  const router = useRouter();
  const [server, setServer] = useState<ActionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    setSubmitting(true);
    setServer(null);
    const result = await registerAction(values);
    setSubmitting(false);
    setServer(result);
    if (result.redirectTo) {
      router.push(result.redirectTo);
      router.refresh();
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
    </form>
  );
}
