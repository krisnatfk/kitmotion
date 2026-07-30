import { notFound, redirect } from "next/navigation";
import { getActiveVersion, getExerciseBySlug } from "@/features/exercises/queries";
import { getCurrentProfile } from "@/features/profile/queries";
import { isEngineSupported } from "@/features/exercise-engine/registry";
import type { ExerciseConfig } from "@/features/exercise-engine/core/types";
import { WorkoutRunner } from "@/features/workout-session/workout-runner";
import { exerciseConfigForLevel, targetRepsForLevel } from "@/features/exercises/difficulty";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ target?: string; mode?: string; tutorial?: string; milestone?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  if (query.tutorial !== "1") redirect(`/exercises/${slug}`);
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/workout/${slug}`);
  if (profile.role === "teacher") redirect("/teacher");

  const exercise = await getExerciseBySlug(slug);
  if (!exercise) notFound();

  const version = await getActiveVersion(exercise.id);
  if (!version || !isEngineSupported(version.engine_key)) {
    notFound();
  }

  const requestedTarget = Number.parseInt(query.target ?? "", 10);
  const safeTarget = Number.isFinite(requestedTarget) && requestedTarget > 0 && requestedTarget <= 500
    ? requestedTarget
    : null;
  const supabase = await getSupabaseServer();
  const { data: progress } = await supabase.from("user_progress").select("current_level").eq("user_id", profile.id).single();
  const level = progress?.current_level ?? 1;
  const requestedMilestone = Number.parseInt(query.milestone ?? "", 10);
  const milestoneLevel = Number.isInteger(requestedMilestone) && requestedMilestone >= 10 && requestedMilestone % 10 === 0
    ? requestedMilestone
    : null;
  let milestoneTarget: number | null = null;
  if (query.milestone && milestoneLevel == null) redirect("/dashboard");
  if (milestoneLevel != null) {
    const [{ data: challenge }, { data: state }] = await Promise.all([
      supabase.from("milestone_challenges").select("exercise_id, target_reps").eq("milestone_level", milestoneLevel).eq("is_active", true).single(),
      supabase.from("user_milestones").select("status").eq("user_id", profile.id).eq("milestone_level", milestoneLevel).single(),
    ]);
    if (!challenge || challenge.exercise_id !== exercise.id || state?.status !== "available") redirect("/dashboard");
    milestoneTarget = challenge.target_reps;
  }
  let targetReps = targetRepsForLevel(exercise.default_target_reps ?? null, level);
  let targetSeconds = exercise.default_target_seconds ?? null;
  if (milestoneTarget != null) {
    targetReps = milestoneTarget;
    targetSeconds = null;
  } else if (query.mode === "reps" && safeTarget != null) {
    targetReps = safeTarget;
    targetSeconds = null;
  } else if (query.mode === "seconds" && safeTarget != null) {
    targetReps = null;
    targetSeconds = safeTarget;
  }

  return (
    <WorkoutRunner
      exerciseSlug={exercise.slug}
      exerciseName={exercise.name}
      cameraPosition={exercise.camera_position}
      engineKey={version.engine_key}
      config={exerciseConfigForLevel(version.engine_key, (version.config as ExerciseConfig) ?? {}, level)}
      scoringVersion={version.scoring_version}
      targetReps={targetReps}
      targetSeconds={targetSeconds}
      milestoneLevel={milestoneLevel}
    />
  );
}
