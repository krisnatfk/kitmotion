import Link from "next/link";
import { requireAdmin } from "@/features/admin/guard";
import { adminListExercises } from "@/features/admin/queries";
import { AdminExerciseForm } from "@/features/admin/admin-exercise-form";

export const dynamic = "force-dynamic";

export default async function AdminExercisesPage() {
  await requireAdmin("/admin/exercises");
  const exercises = await adminListExercises();

  return (
    <div className="space-y-section">
      <h1 className="text-heading-xl">Latihan</h1>

      <section>
        <div className="divide-y divide-hairline border-t border-hairline">
          {exercises.map((e) => (
            <Link
              key={e.id}
              href={`/admin/exercises/${e.id}`}
              className="flex items-center justify-between py-md transition-colors hover:bg-soft-cloud"
            >
              <div>
                <p className="text-body-strong">
                  {e.name}{" "}
                  {!e.is_active && <span className="text-mute">(nonaktif)</span>}
                </p>
                <p className="text-caption-sm text-mute">
                  {e.slug} · {e.difficulty}
                </p>
              </div>
              <span className="text-caption-md text-mute">Sunting →</span>
            </Link>
          ))}
          {exercises.length === 0 && (
            <p className="py-lg text-body-md text-mute">Belum ada latihan.</p>
          )}
        </div>
      </section>

      <section className="surface-cloud p-xl">
        <h2 className="text-heading-md">Buat latihan baru</h2>
        <div className="mt-lg">
          <AdminExerciseForm />
        </div>
      </section>
    </div>
  );
}
