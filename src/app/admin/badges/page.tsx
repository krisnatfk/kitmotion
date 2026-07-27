import { requireAdmin } from "@/features/admin/guard";
import { adminListBadges } from "@/features/admin/queries";
import { AdminBadgeForm } from "@/features/admin/admin-badge-form";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  await requireAdmin("/admin/badges");
  const badges = await adminListBadges();

  return (
    <div className="space-y-section">
      <h1 className="text-heading-xl">Badge</h1>

      <section>
        <div className="divide-y divide-hairline border-t border-hairline">
          {badges.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-md">
              <div>
                <p className="text-body-strong">
                  {b.name}{" "}
                  {!b.is_active && <span className="text-mute">(nonaktif)</span>}
                </p>
                <p className="text-caption-sm text-mute">
                  {b.code} · +{b.xp_reward} XP · {JSON.stringify(b.criteria)}
                </p>
              </div>
            </div>
          ))}
          {badges.length === 0 && (
            <p className="py-lg text-body-md text-mute">Belum ada badge.</p>
          )}
        </div>
      </section>

      <section className="surface-cloud p-xl">
        <h2 className="text-heading-md">Buat badge</h2>
        <div className="mt-lg">
          <AdminBadgeForm />
        </div>
      </section>
    </div>
  );
}
