import { requireAdmin } from "@/features/admin/guard";
import { adminListExercises, adminListVersions } from "@/features/admin/queries";
import {
  AdminPoseCalibration,
  type CalibrationExercise,
} from "@/features/admin/admin-pose-calibration";
import { isEngineSupported } from "@/features/exercise-engine/registry";
import type { ExerciseConfig } from "@/features/exercise-engine/core/types";

export const dynamic = "force-dynamic";

export default async function AdminCalibrationPage() {
  await requireAdmin("/admin/calibration");
  const exercises = await adminListExercises();
  const calibrationExercises = (
    await Promise.all(
      exercises
        .filter((exercise) => exercise.is_active)
        .map(async (exercise): Promise<CalibrationExercise | null> => {
          const activeVersion = (await adminListVersions(exercise.id)).find(
            (version) => version.is_active,
          );
          if (!activeVersion || !isEngineSupported(activeVersion.engine_key)) return null;
          return {
            slug: exercise.slug,
            name: exercise.name,
            cameraPosition: exercise.camera_position,
            engineKey: activeVersion.engine_key,
            scoringVersion: activeVersion.scoring_version,
            config: activeVersion.config as ExerciseConfig,
          };
        }),
    )
  ).filter((exercise): exercise is CalibrationExercise => exercise !== null);

  return (
    <div className="space-y-xl">
      <header className="flex flex-col gap-lg tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between">
        <div>
          <p className="eyebrow text-sport-lime-deep">Pose quality lab</p>
          <h1 className="mt-md font-display text-5xl uppercase leading-none tablet-narrow:text-6xl">
            Kalibrasi pose
          </h1>
          <p className="mt-md max-w-2xl text-sm leading-relaxed text-mute">
            Uji video terhadap model dan aturan scoring aktif. Pemrosesan berlangsung di browser tanpa menyimpan videonya.
          </p>
        </div>
        <span className="w-fit rounded-full bg-sport-lime px-md py-sm text-xs font-semibold">
          {calibrationExercises.length} engine aktif
        </span>
      </header>

      <AdminPoseCalibration exercises={calibrationExercises} />
    </div>
  );
}
