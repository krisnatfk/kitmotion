import Link from "next/link";
import { requireAdmin } from "@/features/admin/guard";
import {
  adminListBadges,
  adminListChallenges,
  adminListExercises,
  adminListSessions,
} from "@/features/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin("/admin");
  const [exercises, badges, challenges, sessions] = await Promise.all([
    adminListExercises(),
    adminListBadges(),
    adminListChallenges(),
    adminListSessions(5),
  ]);

  return (
    <div className="space-y-section">
      <header>
        <p className="text-caption-md text-mute">Admin</p>
        <h1 className="text-heading-xl">{admin.full_name}</h1>
      </header>

      <section className="grid grid-cols-2 gap-sm tablet-narrow:grid-cols-4">
        <Stat label="Latihan" value={String(exercises.length)} href="/admin/exercises" />
        <Stat label="Badge" value={String(badges.length)} href="/admin/badges" />
        <Stat label="Challenge" value={String(challenges.length)} href="/admin/challenges" />
        <Stat label="Sesi" value="—" href="/admin/sessions" />
      </section>

      <section>
        <h2 className="text-heading-md">Sesi terbaru</h2>
        <div className="mt-lg divide-y divide-hairline border-t border-hairline">
          {sessions.length === 0 && (
            <p className="py-lg text-body-md text-mute">Belum ada sesi.</p>
          )}
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-md">
              <div>
                <p className="text-body-strong">
                  {s.profiles?.full_name ?? "—"} · {s.exercises?.name ?? "—"}
                </p>
                <p className="text-caption-sm text-mute">
                  {s.completed_at ? new Date(s.completed_at).toLocaleString("id-ID") : "—"}
                </p>
              </div>
              <p className="font-display text-heading-md">
                {s.final_score != null ? Math.round(Number(s.final_score)) : "—"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="surface-cloud p-lg transition-colors hover:bg-hairline-soft">
      <p className="text-caption-md text-mute">{label}</p>
      <p className="mt-xs font-display text-heading-lg leading-none">{value}</p>
    </Link>
  );
}
