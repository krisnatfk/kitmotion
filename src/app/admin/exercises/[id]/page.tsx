import { notFound } from "next/navigation";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { requireAdmin } from "@/features/admin/guard";
import { adminGetExercise, adminListVersions } from "@/features/admin/queries";
import { AdminExerciseForm } from "@/features/admin/admin-exercise-form";
import { AdminVersionForm } from "@/features/admin/admin-version-form";

export const dynamic = "force-dynamic";

export default async function AdminExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("/admin/exercises");
  const { id } = await params;
  const exercise = await adminGetExercise(id);
  if (!exercise) notFound();
  const versions = await adminListVersions(exercise.id);

  return (
    <div className="space-y-section">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-xl">{exercise.name}</h1>
        <ButtonLink href="/admin/exercises" variant="secondary">
          Kembali
        </ButtonLink>
      </div>

      <section className="surface-cloud p-xl">
        <h2 className="text-heading-md">Edit latihan</h2>
        <div className="mt-lg">
          <AdminExerciseForm
            defaultValues={{
              id: exercise.id,
              slug: exercise.slug,
              name: exercise.name,
              description: exercise.description,
              difficulty: exercise.difficulty,
              camera_position: exercise.camera_position,
              default_target_reps: exercise.default_target_reps,
              default_target_seconds: exercise.default_target_seconds,
              is_active: exercise.is_active,
              sort_order: exercise.sort_order,
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="text-heading-md">Versi engine</h2>
        <div className="mt-lg divide-y divide-hairline border-t border-hairline">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between py-md">
              <div>
                <p className="text-body-strong">
                  v{v.version} · {v.engine_key} · {v.scoring_version}
                </p>
                <p className="text-caption-sm text-mute">
                  {v.is_active ? "aktif" : "nonaktif"}
                </p>
              </div>
            </div>
          ))}
          {versions.length === 0 && (
            <p className="py-lg text-body-md text-mute">Belum ada versi.</p>
          )}
        </div>
      </section>

      <section className="surface-cloud p-xl">
        <h2 className="text-heading-md">Tambah versi</h2>
        <div className="mt-lg">
          <AdminVersionForm exerciseId={exercise.id} />
        </div>
      </section>

      <Link href="/admin/exercises" className="text-caption-md text-mute underline">
        Kembali ke daftar latihan
      </Link>
    </div>
  );
}
