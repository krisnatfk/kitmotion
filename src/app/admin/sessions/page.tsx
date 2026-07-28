import { Icon } from "@/components/ui/icons";
import { requireAdmin } from "@/features/admin/guard";
import { adminListRuns, adminListSessions } from "@/features/admin/queries";
import { formatDistance, formatDuration, formatPace } from "@/features/running/metrics";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  await requireAdmin("/admin/sessions");
  const [sessions, runs] = await Promise.all([adminListSessions(100), adminListRuns(100)]);
  const validReps = sessions.reduce((sum, session) => sum + session.valid_reps, 0);
  const distance = runs.reduce((sum, run) => sum + Number(run.distance_meters), 0);

  return (
    <div className="space-y-xl">
      <header><p className="eyebrow text-sport-lime-deep">Monitoring komunitas</p><h1 className="mt-md font-display text-5xl uppercase leading-none tablet-narrow:text-6xl">Aktivitas pengguna</h1><p className="mt-md max-w-2xl text-sm leading-relaxed text-mute">Pantau hasil latihan kamera dan rekaman lari GPS seluruh pengguna.</p></header>
      <section className="grid grid-cols-2 gap-md desktop:grid-cols-4"><ActivityStat icon="activity" label="Sesi latihan" value={String(sessions.length)} /><ActivityStat icon="route" label="Aktivitas lari" value={String(runs.length)} /><ActivityStat icon="check" label="Repetisi valid" value={validReps.toLocaleString("id-ID")} /><ActivityStat icon="location" label="Jarak GPS" value={`${formatDistance(distance)} km`} /></section>

      <section className="overflow-hidden rounded-sm border border-black/[0.08] bg-white"><SectionHeader icon="activity" title="Latihan kamera terbaru" count={sessions.length} /><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-[#f7f8f5] text-[9px] font-bold uppercase tracking-[0.16em] text-mute"><tr><th className="px-lg py-md text-left">Pengguna</th><th className="px-lg py-md text-left">Latihan</th><th className="px-lg py-md text-right">Skor</th><th className="px-lg py-md text-right">Valid / Tidak</th><th className="px-lg py-md text-right">Selesai</th></tr></thead><tbody className="divide-y divide-black/[0.08]">{sessions.map((session) => <tr key={session.id} className="hover:bg-[#f7f8f5]"><td className="px-lg py-md font-semibold">{session.profiles?.full_name ?? "-"}</td><td className="px-lg py-md">{session.exercises?.name ?? "-"}</td><td className="px-lg py-md text-right font-display text-xl">{session.final_score != null ? Math.round(Number(session.final_score)) : "-"}</td><td className="px-lg py-md text-right"><span className="text-success">{session.valid_reps}</span> / <span className="text-danger">{session.invalid_reps}</span></td><td className="px-lg py-md text-right text-xs text-mute">{formatAdminDate(session.completed_at)}</td></tr>)}{sessions.length === 0 && <tr><td colSpan={5} className="px-lg py-xl text-center text-mute">Belum ada sesi latihan.</td></tr>}</tbody></table></div></section>

      <section className="overflow-hidden rounded-sm border border-black/[0.08] bg-white"><SectionHeader icon="route" title="Lari GPS terbaru" count={runs.length} /><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-[#f7f8f5] text-[9px] font-bold uppercase tracking-[0.16em] text-mute"><tr><th className="px-lg py-md text-left">Pengguna</th><th className="px-lg py-md text-right">Jarak</th><th className="px-lg py-md text-right">Durasi</th><th className="px-lg py-md text-right">Pace</th><th className="px-lg py-md text-right">Selesai</th></tr></thead><tbody className="divide-y divide-black/[0.08]">{runs.map((run) => <tr key={run.id} className="hover:bg-[#f7f8f5]"><td className="px-lg py-md font-semibold">{run.profiles?.full_name ?? "-"}</td><td className="px-lg py-md text-right font-semibold">{formatDistance(Number(run.distance_meters))} km</td><td className="px-lg py-md text-right">{formatDuration(run.duration_seconds)}</td><td className="px-lg py-md text-right">{formatPace(run.average_pace_seconds_per_km)} /km</td><td className="px-lg py-md text-right text-xs text-mute">{formatAdminDate(run.completed_at)}</td></tr>)}{runs.length === 0 && <tr><td colSpan={5} className="px-lg py-xl text-center text-mute">Belum ada aktivitas lari.</td></tr>}</tbody></table></div></section>
    </div>
  );
}

function ActivityStat({ icon, label, value }: { icon: "activity" | "route" | "check" | "location"; label: string; value: string }) {
  return <div className="rounded-sm border border-black/[0.08] bg-white p-lg"><span className="grid h-9 w-9 place-items-center rounded-full bg-sport-lime"><Icon name={icon} className="h-4 w-4" /></span><p className="mt-lg text-[9px] font-bold uppercase tracking-widest text-mute">{label}</p><p className="mt-xs font-display text-4xl leading-none">{value}</p></div>;
}

function SectionHeader({ icon, title, count }: { icon: "activity" | "route"; title: string; count: number }) {
  return <div className="flex items-center justify-between border-b border-black/[0.08] p-lg"><div className="flex items-center gap-md"><span className="grid h-10 w-10 place-items-center rounded-full bg-sport-black text-sport-lime"><Icon name={icon} className="h-4 w-4" /></span><div><p className="font-semibold">{title}</p><p className="mt-xs text-xs text-mute">Maksimal 100 catatan terbaru</p></div></div><span className="rounded-full bg-[#eff2ec] px-md py-sm text-xs font-semibold">{count}</span></div>;
}

function formatAdminDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}
