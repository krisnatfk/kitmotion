"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { translateAuthError } from "./errors";
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type ProfileInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "./schemas";

export type ActionResult = {
  error?: string;
  message?: string;
  redirectTo?: string;
};

/** Only allow relative redirect targets to prevent open-redirect. */
function safeNext(next: unknown): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
}

export async function registerAction(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name } },
  });

  if (error) return { error: translateAuthError(error.message) };

  // No session => email confirmation is enabled; ask the user to verify.
  if (!data.session) {
    return { message: "Akun dibuat. Cek email untuk verifikasi sebelum masuk." };
  }

  return { redirectTo: "/dashboard" };
}

export async function loginAction(input: LoginInput & { next?: string }): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { error: translateAuthError(error.message) };

  return { redirectTo: safeNext(input.next) };
}

export async function logoutAction(): Promise<ActionResult> {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  return { redirectTo: "/login" };
}

export async function forgotPasswordAction(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.appUrl}/reset-password`,
  });

  if (error) return { error: translateAuthError(error.message) };

  // Always return the same message whether or not the email exists.
  return { message: "Jika email terdaftar, tautan reset telah dikirim." };
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { error: translateAuthError(error.message) };

  return { redirectTo: "/dashboard" };
}

export async function updateProfileAction(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Belum masuk." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      class_name: parsed.data.class_name ?? null,
      school_id: parsed.data.school_id ?? null,
      avatar_path: parsed.data.avatar_path || null,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) return { error: "Gagal menyimpan profil. Coba lagi." };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { message: "Profil tersimpan." };
}
