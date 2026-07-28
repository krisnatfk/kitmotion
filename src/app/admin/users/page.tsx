import { Icon } from "@/components/ui/icons";
import { requireAdmin } from "@/features/admin/guard";
import { AdminUsersManager } from "@/features/admin/admin-users-manager";
import { adminListUsers } from "@/features/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [admin, users] = await Promise.all([
    requireAdmin("/admin/users"),
    adminListUsers(),
  ]);
  const active = users.filter((user) => !user.isBlocked).length;
  const admins = users.filter((user) => user.role === "admin").length;

  return (
    <div className="space-y-xl">
      <header className="flex flex-col gap-lg tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between">
        <div><p className="eyebrow text-sport-lime-deep">Akses &amp; keamanan</p><h1 className="mt-md font-display text-5xl uppercase leading-none tablet-narrow:text-6xl">Manajemen pengguna</h1><p className="mt-md max-w-2xl text-sm leading-relaxed text-mute">Kelola profil, hak akses, dan status login seluruh pengguna KITMOTION dari satu tempat.</p></div>
        <div className="flex flex-wrap gap-sm"><SummaryChip icon="users" label={`${users.length} akun`} /><SummaryChip icon="check" label={`${active} aktif`} /><SummaryChip icon="shield" label={`${admins} admin`} /></div>
      </header>
      <AdminUsersManager initialUsers={users} currentAdminId={admin.id} />
    </div>
  );
}

function SummaryChip({ icon, label }: { icon: "users" | "check" | "shield"; label: string }) {
  return <span className="inline-flex min-h-10 items-center gap-sm rounded-full bg-white px-md text-xs font-semibold"><Icon name={icon} className="h-4 w-4 text-sport-lime-deep" />{label}</span>;
}
