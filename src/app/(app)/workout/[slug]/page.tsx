import { notFound, redirect } from "next/navigation";
import { getActiveVersion, getExerciseBySlug } from "@/features/exercises/queries";
import { getCurrentProfile } from "@/features/profile/queries";
import { isEngineSupported } from "@/features/exercise-engine/registry";
import type { ExerciseConfig } from "@/features/exercise-engine/core/types";
import { WorkoutRunner } from "@/features/workout-session/workout-runner";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ target?: string; mode?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=/workout/${slug}`);

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
  let targetReps = exercise.default_target_reps ?? null;
  let targetSeconds = exercise.default_target_seconds ?? null;
  if (query.mode === "reps" && safeTarget != null) {
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
      config={(version.config as ExerciseConfig) ?? {}}
      scoringVersion={version.scoring_version}
      targetReps={targetReps}
      targetSeconds={targetSeconds}
    />
  );
}
