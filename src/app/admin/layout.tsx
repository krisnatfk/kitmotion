import { requireAdmin } from "@/features/admin/guard";
import { AdminShell } from "@/features/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side, DB-backed role check (rules.md §13.5). Non-admins are bounced.
  const admin = await requireAdmin("/admin");

  return (
    <AdminShell adminName={admin.full_name} avatarPath={admin.avatar_path}>
      {children}
    </AdminShell>
  );
}
