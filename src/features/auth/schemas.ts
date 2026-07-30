import { z } from "zod";

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter")
    .max(72, "Kata sandi terlalu panjang"),
  role: z.enum(["student", "teacher"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Kata sandi minimal 8 karakter").max(72),
    confirm: z.string().min(8, "Konfirmasi kata sandi wajib diisi"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirm"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  school_id: z.string().uuid().nullable().optional(),
  class_name: z
    .string()
    .trim()
    .max(50, "Kelas maksimal 50 karakter")
    .optional()
    .nullable(),
  avatar_path: z
    .string()
    .max(200)
    .refine(
      (value) => value === "" || ["preset:lime", "preset:blue", "preset:orange", "preset:violet"].includes(value) || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(value),
      "Avatar tidak valid",
    )
    .optional()
    .nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
