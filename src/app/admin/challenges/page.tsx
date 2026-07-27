import { requireAdmin } from "@/features/admin/guard";
import { adminListChallenges } from "@/features/admin/queries";
import { AdminChallengeForm } from "@/features/admin/admin-challenge-form";

export const dynamic = "force-dynamic";

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminChallengesPage() {
  await requireAdmin("/admin/challenges");
  const challenges = await adminListChallenges();

  return (
    <div className="space-y-section">
      <h1 className="text-heading-xl">Challenge</h1>

      <section>
        <div className="divide-y divide-hairline border-t border-hairline">
          {challenges.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-md">
              <div>
                <p className="text-body-strong">
                  {c.title}{" "}
                  {!c.is_active && <span className="text-mute">(nonaktif)</span>}
                </p>
                <p className="text-caption-sm text-mute">
                  {c.code} · {c.period} · {fmt(c.starts_at)}–{fmt(c.ends_at)} · +{c.xp_reward} XP
                </p>
              </div>
            </div>
          ))}
          {challenges.length === 0 && (
            <p className="py-lg text-body-md text-mute">Belum ada challenge.</p>
          )}
        </div>
      </section>

      <section className="surface-cloud p-xl">
        <h2 className="text-heading-md">Buat challenge</h2>
        <div className="mt-lg">
          <AdminChallengeForm />
        </div>
      </section>
    </div>
  );
}
