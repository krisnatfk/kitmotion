"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServiceRole } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";
import { requireAdminOrThrow } from "./guard";

export type AdminResult = { error?: string; ok?: boolean };

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
