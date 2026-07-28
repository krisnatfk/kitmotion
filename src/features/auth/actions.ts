"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { translateAuthError } from "./errors";
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type ProfileInput,
  type ResetPasswordInput,
} from "./schemas";

export type ActionResult = {
  error?: string;
  message?: string;
  redirectTo?: string;
  avatarPath?: string;
};

const AVATAR_MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function hasValidImageSignature(bytes: ArrayBuffer, mimeType: keyof typeof AVATAR_MIME_TYPES) {
  const data = new Uint8Array(bytes);
  if (mimeType === "image/jpeg") return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mimeType === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => data[index] === value);
  return data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50;
}

/** Only allow relative redirect targets to prevent open-redirect. */
function safeNext(next: unknown): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
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

  const requestedAvatar = parsed.data.avatar_path || null;
  if (requestedAvatar && !requestedAvatar.startsWith("preset:") && !requestedAvatar.startsWith(`${user.id}/`)) {
    return { error: "Avatar tidak valid untuk akun ini." };
  }

  const { data: previousProfile } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
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

  const previousAvatar = previousProfile?.avatar_path;
  const nextAvatar = requestedAvatar;
  if (previousAvatar && !previousAvatar.startsWith("preset:") && previousAvatar !== nextAvatar) {
    await supabase.storage.from("profile-avatars").remove([previousAvatar]);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { message: "Profil tersimpan.", avatarPath: nextAvatar ?? "" };
}

export async function uploadAvatarAction(formData: FormData): Promise<ActionResult> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih foto terlebih dahulu." };
  const mimeType = file.type as keyof typeof AVATAR_MIME_TYPES;
  const extension = AVATAR_MIME_TYPES[mimeType];
  if (!extension) return { error: "Gunakan gambar JPG, PNG, atau WebP." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "Ukuran foto maksimal 5 MB." };

  const bytes = await file.arrayBuffer();
  if (!hasValidImageSignature(bytes, mimeType)) return { error: "Isi file tidak cocok dengan format gambarnya." };

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi login berakhir. Silakan masuk kembali." };

  const { data: profile } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  const avatarPath = `${user.id}/avatar-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("profile-avatars").upload(avatarPath, bytes, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) return { error: "Foto gagal diunggah. Pastikan migration storage sudah diterapkan." };

  const { error: profileError } = await supabase.from("profiles").update({ avatar_path: avatarPath }).eq("id", user.id);
  if (profileError) {
    await supabase.storage.from("profile-avatars").remove([avatarPath]);
    return { error: "Foto terunggah tetapi profil gagal diperbarui. Coba lagi." };
  }

  const previousAvatar = profile?.avatar_path;
  if (previousAvatar && !previousAvatar.startsWith("preset:") && previousAvatar !== avatarPath) {
    await supabase.storage.from("profile-avatars").remove([previousAvatar]);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { message: "Foto profil berhasil diperbarui.", avatarPath };
}
