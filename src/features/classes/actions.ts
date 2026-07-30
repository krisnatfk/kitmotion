"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database.types";

const classSchema = z.object({
  name: z.string().trim().min(2).max(80),
  schoolYear: z.string().trim().max(20).optional(),
});

const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/);
const idSchema = z.string().uuid();

async function requireRole(role: UserRole) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = getSupabaseServiceRole();
  const { data: profile } = await admin.from("profiles").select("id, role").eq("id", user.id).single();
  if (!profile || profile.role !== role) redirect(profile?.role === "teacher" ? "/teacher" : "/dashboard");
  return { user, admin };
}

function withMessage(path: string, key: "error" | "success", message: string) {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}

export async function createClassAction(formData: FormData): Promise<void> {
  const { user, admin } = await requireRole("teacher");
  const parsed = classSchema.safeParse({
    name: formData.get("name"),
    schoolYear: formData.get("schoolYear"),
  });
  if (!parsed.success) redirect(withMessage("/teacher", "error", "Nama kelas minimal 2 karakter."));

  const { data: classroom, error } = await admin.from("classrooms").insert({
    teacher_id: user.id,
    name: parsed.data.name,
    school_year: parsed.data.schoolYear || null,
  }).select("id").single();
  if (error || !classroom) redirect(withMessage("/teacher", "error", "Kelas gagal dibuat."));

  const code = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  const { error: codeError } = await admin.from("class_join_codes").insert({
    classroom_id: classroom.id,
    code,
  });
  if (codeError) {
    await admin.from("classrooms").delete().eq("id", classroom.id);
    redirect(withMessage("/teacher", "error", "Kode kelas gagal dibuat. Silakan coba lagi."));
  }

  revalidatePath("/teacher");
  redirect(withMessage("/teacher", "success", `Kelas dibuat. Kode: ${code}`));
}

export async function joinClassAction(formData: FormData): Promise<void> {
  const { user, admin } = await requireRole("student");
  const parsed = codeSchema.safeParse(formData.get("code"));
  if (!parsed.success) redirect(withMessage("/classes", "error", "Kode kelas harus terdiri dari 8 karakter."));
  const now = new Date().toISOString();

  const { data: joinCode } = await admin.from("class_join_codes")
    .select("id, classroom_id, expires_at")
    .eq("code", parsed.data)
    .eq("is_active", true)
    .single();
  if (!joinCode || (joinCode.expires_at && joinCode.expires_at < now)) {
    redirect(withMessage("/classes", "error", "Kode kelas tidak ditemukan atau sudah kedaluwarsa."));
  }

  const { data: classroom } = await admin.from("classrooms").select("id, is_active").eq("id", joinCode.classroom_id).single();
  if (!classroom?.is_active) redirect(withMessage("/classes", "error", "Kelas ini sudah tidak aktif."));

  const { data: existing } = await admin.from("class_memberships")
    .select("id, status")
    .eq("classroom_id", classroom.id)
    .eq("student_id", user.id)
    .single();
  if (existing?.status === "active") redirect(withMessage("/classes", "success", "Kamu sudah bergabung di kelas tersebut."));

  const { data: invitation, error: invitationError } = await admin.from("class_invitations").insert({
    classroom_id: classroom.id,
    student_id: user.id,
    code_used: parsed.data,
    status: "accepted",
    consented_at: now,
    responded_at: now,
    expires_at: joinCode.expires_at,
  }).select("id").single();
  if (invitationError || !invitation) redirect(withMessage("/classes", "error", "Persetujuan bergabung gagal disimpan."));

  const { error: membershipError } = await admin.from("class_memberships").upsert({
    classroom_id: classroom.id,
    student_id: user.id,
    invitation_id: invitation.id,
    status: "active",
    consented_at: now,
    joined_at: now,
    ended_at: null,
  }, { onConflict: "classroom_id,student_id", ignoreDuplicates: false });
  if (membershipError) redirect(withMessage("/classes", "error", "Keanggotaan kelas gagal disimpan."));

  revalidatePath("/classes");
  revalidatePath("/teacher");
  redirect(withMessage("/classes", "success", "Persetujuan tersimpan. Kamu sudah bergabung ke kelas."));
}

export async function leaveClassAction(formData: FormData): Promise<void> {
  const { user, admin } = await requireRole("student");
  const classId = idSchema.safeParse(formData.get("classId"));
  if (!classId.success) redirect(withMessage("/classes", "error", "Kelas tidak valid."));
  await admin.from("class_memberships").update({
    status: "left",
    ended_at: new Date().toISOString(),
  }).eq("classroom_id", classId.data).eq("student_id", user.id).eq("status", "active");
  revalidatePath("/classes");
  revalidatePath("/teacher");
  redirect(withMessage("/classes", "success", "Kamu sudah keluar. Guru tidak lagi menerima laporan latihan baru."));
}

export async function removeStudentAction(formData: FormData): Promise<void> {
  const { user, admin } = await requireRole("teacher");
  const classId = idSchema.safeParse(formData.get("classId"));
  const studentId = idSchema.safeParse(formData.get("studentId"));
  if (!classId.success || !studentId.success) redirect(withMessage("/teacher", "error", "Data anggota tidak valid."));
  const { data: classroom } = await admin.from("classrooms").select("teacher_id").eq("id", classId.data).single();
  if (classroom?.teacher_id !== user.id) redirect("/teacher");
  await admin.from("class_memberships").update({
    status: "removed",
    ended_at: new Date().toISOString(),
  }).eq("classroom_id", classId.data).eq("student_id", studentId.data).eq("status", "active");
  revalidatePath(`/teacher/classes/${classId.data}`);
  revalidatePath("/teacher");
  redirect(withMessage(`/teacher/classes/${classId.data}`, "success", "Siswa dikeluarkan dari kelas."));
}
