"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import type { Json, UserRole } from "@/types/database.types";
import { requireAdminOrThrow } from "./guard";

export type AdminResult = { error?: string; ok?: boolean; message?: string };

async function audit(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  before?: unknown,
  after?: unknown,
) {
  const admin = getSupabaseServiceRole();
  await admin.from("admin_audit_logs").insert({
    admin_user_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_data: (before ?? null) as Json,
    after_data: (after ?? null) as Json,
  });
}

// --- Exercises ---------------------------------------------------------------

const exerciseSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  camera_position: z.string().min(1),
  default_target_reps: z.number().int().positive().nullable(),
  default_target_seconds: z.number().int().positive().nullable(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
});

export async function saveExerciseAction(
  input: z.infer<typeof exerciseSchema>,
): Promise<AdminResult> {
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const admin = await requireAdminOrThrow();
  const svc = getSupabaseServiceRole();

  if (parsed.data.id) {
    const { data: before } = await svc
      .from("exercises")
      .select("*")
      .eq("id", parsed.data.id)
      .single();
    const { error } = await svc
      .from("exercises")
      .update({
        slug: parsed.data.slug,
        name: parsed.data.name,
        description: parsed.data.description,
        difficulty: parsed.data.difficulty,
        camera_position: parsed.data.camera_position,
        default_target_reps: parsed.data.default_target_reps,
        default_target_seconds: parsed.data.default_target_seconds,
        is_active: parsed.data.is_active,
        sort_order: parsed.data.sort_order,
      })
      .eq("id", parsed.data.id);
    if (error) return { error: error.message };
    await audit(admin.id, "exercise.update", "exercise", parsed.data.id, before, parsed.data);
    revalidatePath("/admin/exercises");
    return { ok: true };
  }

  const { data, error } = await svc
    .from("exercises")
    .insert({
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
      difficulty: parsed.data.difficulty,
      camera_position: parsed.data.camera_position,
      default_target_reps: parsed.data.default_target_reps,
      default_target_seconds: parsed.data.default_target_seconds,
      is_active: parsed.data.is_active,
      sort_order: parsed.data.sort_order,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await audit(admin.id, "exercise.create", "exercise", data.id, null, parsed.data);
  revalidatePath("/admin/exercises");
  return { ok: true };
}

// --- Exercise versions / config ---------------------------------------------

const versionSchema = z.object({
  exerciseId: z.string().uuid(),
  version: z.number().int().positive(),
  engineKey: z.string().min(1),
  scoringVersion: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
  isActive: z.boolean(),
});

export async function saveVersionAction(
  input: z.infer<typeof versionSchema>,
): Promise<AdminResult> {
  const parsed = versionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const admin = await requireAdminOrThrow();
  const svc = getSupabaseServiceRole();

  const { error } = await svc.from("exercise_versions").insert({
    exercise_id: parsed.data.exerciseId,
    version: parsed.data.version,
    engine_key: parsed.data.engineKey,
    scoring_version: parsed.data.scoringVersion,
    config: parsed.data.config as Json,
    is_active: parsed.data.isActive,
    created_by: admin.id,
  });
  if (error) return { error: error.message };
  await audit(
    admin.id,
    "version.create",
    "exercise_version",
    parsed.data.exerciseId,
    null,
    parsed.data,
  );
  revalidatePath("/admin/exercises");
  return { ok: true };
}

// --- Badges ------------------------------------------------------------------

const badgeSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  xp_reward: z.number().int().nonnegative(),
  is_active: z.boolean(),
  criteria: z.record(z.string(), z.unknown()),
});

export async function saveBadgeAction(
  input: z.infer<typeof badgeSchema>,
): Promise<AdminResult> {
  const parsed = badgeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const admin = await requireAdminOrThrow();
  const svc = getSupabaseServiceRole();

  if (parsed.data.id) {
    const { error } = await svc
      .from("badges")
      .update({
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description,
        xp_reward: parsed.data.xp_reward,
        is_active: parsed.data.is_active,
        criteria: parsed.data.criteria as Json,
      })
      .eq("id", parsed.data.id);
    if (error) return { error: error.message };
    await audit(admin.id, "badge.update", "badge", parsed.data.id, null, parsed.data);
    revalidatePath("/admin/badges");
    return { ok: true };
  }

  const { data, error } = await svc
    .from("badges")
    .insert({
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description,
      xp_reward: parsed.data.xp_reward,
      is_active: parsed.data.is_active,
      criteria: parsed.data.criteria as Json,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await audit(admin.id, "badge.create", "badge", data.id, null, parsed.data);
  revalidatePath("/admin/badges");
  return { ok: true };
}

// --- Challenges --------------------------------------------------------------

const challengeSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  period: z.enum(["daily", "weekly", "custom"]),
  startsAt: z.string(),
  endsAt: z.string(),
  xpReward: z.number().int().nonnegative(),
  isActive: z.boolean(),
  criteria: z.record(z.string(), z.unknown()),
});

export async function saveChallengeAction(
  input: z.infer<typeof challengeSchema>,
): Promise<AdminResult> {
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) {
    return { error: "Tanggal selesai harus setelah tanggal mulai." };
  }
  const admin = await requireAdminOrThrow();
  const svc = getSupabaseServiceRole();

  if (parsed.data.id) {
    const { error } = await svc
      .from("challenges")
      .update({
        code: parsed.data.code,
        title: parsed.data.title,
        description: parsed.data.description,
        period: parsed.data.period,
        starts_at: parsed.data.startsAt,
        ends_at: parsed.data.endsAt,
        xp_reward: parsed.data.xpReward,
        is_active: parsed.data.isActive,
        criteria: parsed.data.criteria as Json,
      })
      .eq("id", parsed.data.id);
    if (error) return { error: error.message };
    await audit(admin.id, "challenge.update", "challenge", parsed.data.id, null, parsed.data);
    revalidatePath("/admin/challenges");
    return { ok: true };
  }

  const { data, error } = await svc
    .from("challenges")
    .insert({
      code: parsed.data.code,
      title: parsed.data.title,
      description: parsed.data.description,
      period: parsed.data.period,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      xp_reward: parsed.data.xpReward,
      is_active: parsed.data.isActive,
      criteria: parsed.data.criteria as Json,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await audit(admin.id, "challenge.create", "challenge", data.id, null, parsed.data);
  revalidatePath("/admin/challenges");
  return { ok: true };
}

// --- User management --------------------------------------------------------

const managedUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  role: z.enum(["student", "admin"]),
});

const managedUserStatusSchema = z.object({
  userId: z.string().uuid(),
  blocked: z.boolean(),
});

const deleteManagedUserSchema = z.object({
  userId: z.string().uuid(),
  confirmation: z.literal("HAPUS"),
});

async function readManagedProfile(userId: string) {
  const service = getSupabaseServiceRole();
  const { data, error } = await service.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error("Profil pengguna tidak ditemukan.");
  return data;
}

async function ensureAdminWouldRemain(targetRole: UserRole) {
  if (targetRole !== "admin") return;
  const service = getSupabaseServiceRole();
  const { count, error } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error("Gagal memeriksa jumlah administrator.");
  if ((count ?? 0) <= 1) throw new Error("Administrator terakhir tidak dapat dinonaktifkan atau dihapus.");
}

export async function updateManagedUserAction(
  input: z.infer<typeof managedUserSchema>,
): Promise<AdminResult> {
  const parsed = managedUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const admin = await requireAdminOrThrow();
    if (admin.id === parsed.data.userId) {
      return { error: "Akun yang sedang digunakan tidak dapat diubah dari menu manajemen pengguna." };
    }

    const service = getSupabaseServiceRole();
    const before = await readManagedProfile(parsed.data.userId);
    if (before.role === "admin" && parsed.data.role !== "admin") await ensureAdminWouldRemain(before.role);

    const patch = {
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      updated_at: new Date().toISOString(),
    };
    const { error } = await service.from("profiles").update(patch).eq("id", parsed.data.userId);
    if (error) return { error: `Gagal menyimpan pengguna: ${error.message}` };

    await audit(admin.id, "user.update", "user", parsed.data.userId, before, {
      full_name: parsed.data.fullName,
      role: parsed.data.role,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/users");
    return { ok: true, message: "Data pengguna berhasil diperbarui." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal memperbarui pengguna." };
  }
}

export async function setManagedUserBlockedAction(
  input: z.infer<typeof managedUserStatusSchema>,
): Promise<AdminResult> {
  const parsed = managedUserStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const admin = await requireAdminOrThrow();
    if (admin.id === parsed.data.userId) return { error: "Anda tidak dapat memblokir akun yang sedang digunakan." };

    const service = getSupabaseServiceRole();
    const profile = await readManagedProfile(parsed.data.userId);
    if (parsed.data.blocked && profile.role === "admin") await ensureAdminWouldRemain(profile.role);
    const { data: authUser } = await service.auth.admin.getUserById(parsed.data.userId);
    const wasBlocked = Boolean(authUser.user?.banned_until && new Date(authUser.user.banned_until).getTime() > Date.now());

    const { error } = await service.auth.admin.updateUserById(parsed.data.userId, {
      ban_duration: parsed.data.blocked ? "876000h" : "none",
    });
    if (error) return { error: `Gagal mengubah status akun: ${error.message}` };

    await audit(admin.id, parsed.data.blocked ? "user.block" : "user.unblock", "user", parsed.data.userId, {
      email: authUser.user?.email ?? null,
      blocked: wasBlocked,
    }, {
      email: authUser.user?.email ?? null,
      blocked: parsed.data.blocked,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/users");
    return { ok: true, message: parsed.data.blocked ? "Pengguna berhasil diblokir." : "Akses pengguna berhasil dipulihkan." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal mengubah status pengguna." };
  }
}

export async function deleteManagedUserAction(
  input: z.infer<typeof deleteManagedUserSchema>,
): Promise<AdminResult> {
  const parsed = deleteManagedUserSchema.safeParse(input);
  if (!parsed.success) return { error: "Ketik HAPUS untuk mengonfirmasi penghapusan permanen." };

  try {
    const admin = await requireAdminOrThrow();
    if (admin.id === parsed.data.userId) return { error: "Anda tidak dapat menghapus akun yang sedang digunakan." };

    const service = getSupabaseServiceRole();
    const profile = await readManagedProfile(parsed.data.userId);
    if (profile.role === "admin") await ensureAdminWouldRemain(profile.role);
    const { data: authUser } = await service.auth.admin.getUserById(parsed.data.userId);

    const { error } = await service.auth.admin.deleteUser(parsed.data.userId);
    if (error) return { error: `Gagal menghapus akun: ${error.message}` };

    await audit(admin.id, "user.delete", "user", parsed.data.userId, {
      email: authUser.user?.email ?? null,
      full_name: profile.full_name,
      role: profile.role,
    }, null);
    revalidatePath("/admin");
    revalidatePath("/admin/users");
    return { ok: true, message: "Akun dan seluruh data terkait berhasil dihapus." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal menghapus pengguna." };
  }
}
