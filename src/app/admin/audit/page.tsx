import { Icon } from "@/components/ui/icons";
import { requireAdmin } from "@/features/admin/guard";
import { adminListAuditLogs } from "@/features/admin/queries";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "user.update": "Memperbarui pengguna",
  "user.block": "Memblokir pengguna",
  "user.unblock": "Memulihkan pengguna",
  "user.delete": "Menghapus pengguna",
  "exercise.create": "Membuat latihan",
  "exercise.update": "Memperbarui latihan",
  "version.create": "Membuat versi engine",
  "badge.create": "Membuat badge",
  "badge.update": "Memperbarui badge",
  "challenge.create": "Membuat challenge",
  "challenge.update": "Memperbarui challenge",
};

export default async function AdminAuditPage() {
  await requireAdmin("/admin/audit");
  const logs = await adminListAuditLogs(100);

  return <div className="space-y-xl"><header><p className="eyebrow text-sport-lime-deep">Keamanan sistem</p><h1 className="mt-md font-display text-5xl uppercase leading-none tablet-narrow:text-6xl">Audit aktivitas</h1><p className="mt-md max-w-2xl text-sm leading-relaxed text-mute">Jejak tindakan administrator membantu memastikan setiap perubahan penting dapat ditelusuri.</p></header><section className="overflow-hidden rounded-sm border border-black/[0.08] bg-white"><div className="flex items-center justify-between border-b border-black/[0.08] p-lg"><div><p className="font-semibold">Aktivitas administrator</p><p className="mt-xs text-xs text-mute">100 tindakan terbaru</p></div><span className="rounded-full bg-[#eff2ec] px-md py-sm text-xs font-semibold">{logs.length} catatan</span></div><div className="divide-y divide-black/[0.08]">{logs.map((log) => <article key={log.id} className="grid gap-md p-lg tablet-narrow:grid-cols-[auto_minmax(0,1fr)_auto] tablet-narrow:items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-sport-black text-sport-lime"><Icon name="shield" className="h-4 w-4" /></span><div className="min-w-0"><p className="text-sm font-semibold">{ACTION_LABELS[log.action] ?? log.action}</p><p className="mt-xs truncate text-xs text-mute">{log.adminName} · {log.entityType}{log.entityId ? ` · ${log.entityId}` : ""}</p></div><time className="text-xs text-mute" dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}</time></article>)}{logs.length === 0 && <div className="grid min-h-60 place-items-center p-xl text-center"><div><Icon name="shield" className="mx-auto h-8 w-8 text-mute" /><p className="mt-md font-semibold">Belum ada tindakan admin</p><p className="mt-xs text-xs text-mute">Perubahan berikutnya akan tercatat otomatis.</p></div></div>}</div></section></div>;
}
