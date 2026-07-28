import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import { requireAdmin } from "@/features/admin/guard";
import {
  adminGetAnalytics,
  adminListBadges,
  adminListChallenges,
  adminListExercises,
  adminListRuns,
  adminListSessions,
  type AdminActivityDay,
} from "@/features/admin/queries";
import { formatDistance, formatDuration, formatPace } from "@/features/running/metrics";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [admin, analytics, exercises, badges, challenges, sessions, runs] = await Promise.all([
    requireAdmin("/admin"),
    adminGetAnalytics(),
    adminListExercises(),
    adminListBadges(),
    adminListChallenges(),
    adminListSessions(6),
    adminListRuns(6),
  ]);
  const recentActivity = [
    ...sessions.map((session) => ({
      id: session.id,
      type: "Latihan" as const,
      title: `${session.profiles?.full_name ?? "Pengguna"} · ${session.exercises?.name ?? "Latihan"}`,
      detail: `${session.valid_reps} repetisi valid · skor ${session.final_score != null ? Math.round(Number(session.final_score)) : "-"}`,
      date: session.completed_at ?? session.created_at,
      icon: "activity" as IconName,
    })),
    ...runs.map((run) => ({
      id: run.id,
      type: "Lari" as const,
      title: `${run.profiles?.full_name ?? "Pengguna"} · ${formatDistance(Number(run.distance_meters))} km`,
      detail: `${formatDuration(run.duration_seconds)} · ${formatPace(run.average_pace_seconds_per_km)} /km`,
      date: run.completed_at,
      icon: "route" as IconName,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  return (
    <div className="space-y-xl">
      <section className="relative overflow-hidden rounded-sm bg-sport-black p-xl text-white tablet-narrow:p-section">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-sport-lime/20" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border border-sport-lime/35" />
        <div className="relative grid gap-xl desktop:grid-cols-[1fr_auto] desktop:items-end">
          <div><p className="eyebrow text-sport-lime">Command center</p><h1 className="mt-lg font-display text-5xl uppercase leading-[0.88] tablet-narrow:text-7xl">Selamat datang,<br /><span className="text-sport-lime">{admin.full_name}</span></h1><p className="mt-lg max-w-xl text-sm leading-relaxed text-white/55">Pantau kesehatan platform, aktivitas komunitas, dan akses pengguna tanpa meninggalkan satu dashboard.</p></div>
          <div className="grid grid-cols-2 gap-sm tablet-narrow:min-w-[390px]">
            <HeroMetric label="Pengguna aktif" value={`${analytics.engagementRate}%`} detail="30 hari terakhir" />
            <HeroMetric label="Rata-rata skor" value={analytics.averageWorkoutScore ? String(Math.round(analytics.averageWorkoutScore)) : "-"} detail="seluruh latihan" />
            <HeroMetric label="User baru" value={`+${analytics.newUsersThisMonth}`} detail="bulan ini" />
            <HeroMetric label="Status sistem" value="ONLINE" detail="seluruh layanan" compact />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-md desktop:grid-cols-4" aria-label="Statistik utama">
        <MetricCard icon="users" label="Total pengguna" value={String(analytics.totalUsers)} detail={`${analytics.activeUsers} aktif`} href="/admin/users" accent />
        <MetricCard icon="activity" label="Total aktivitas" value={String(analytics.totalActivities)} detail={`${sessions.length ? "Data terus diperbarui" : "Menunggu aktivitas"}`} href="/admin/sessions" />
        <MetricCard icon="check" label="Repetisi valid" value={analytics.totalValidReps.toLocaleString("id-ID")} detail="Seluruh pengguna" />
        <MetricCard icon="route" label="Jarak lari" value={analytics.totalDistanceKm.toFixed(1)} unit="km" detail="Akumulasi GPS" />
      </section>

      <section className="grid gap-md desktop:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.75fr)]">
        <div className="rounded-sm border border-black/[0.08] bg-white p-lg tablet-narrow:p-xl">
          <div className="flex flex-col gap-md mobile-landscape:flex-row mobile-landscape:items-start mobile-landscape:justify-between">
            <div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sport-lime-deep">Analitik mingguan</p><h2 className="mt-xs text-xl font-bold">Aktivitas 7 hari terakhir</h2><p className="mt-xs text-xs text-mute">Perbandingan sesi latihan kamera dan aktivitas lari GPS.</p></div>
            <div className="flex gap-md text-[10px] font-semibold text-mute"><span className="flex items-center gap-xs"><span className="h-2 w-2 rounded-full bg-sport-black" />Latihan</span><span className="flex items-center gap-xs"><span className="h-2 w-2 rounded-full bg-sport-lime-deep" />Lari</span></div>
          </div>
          <ActivityChart data={analytics.activityByDay} />
        </div>

        <div className="flex flex-col rounded-sm bg-sport-black p-lg text-white tablet-narrow:p-xl">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sport-lime">Engagement pengguna</p>
          <div className="mt-xl flex items-center gap-xl">
            <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#c8ff2e ${analytics.engagementRate * 3.6}deg, #252825 0deg)` }}><div className="grid h-24 w-24 place-items-center rounded-full bg-sport-black text-center"><div><p className="font-display text-4xl leading-none text-sport-lime">{analytics.engagementRate}%</p><p className="mt-xs text-[8px] font-bold uppercase tracking-widest text-white/35">Aktif</p></div></div></div>
            <div className="space-y-md"><EngagementLine label="Aktif" value={analytics.activeUsers} tone="lime" /><EngagementLine label="Admin" value={analytics.adminUsers} /><EngagementLine label="Diblokir" value={analytics.blockedUsers} tone="danger" /></div>
          </div>
          <Link href="/admin/users" className="mt-auto flex min-h-12 items-center justify-between border-t border-white/10 pt-lg text-sm font-semibold text-white/65 transition-colors hover:text-sport-lime">Kelola semua pengguna <Icon name="arrow" className="h-4 w-4" /></Link>
        </div>
      </section>

      <section className="grid gap-md desktop:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-sm border border-black/[0.08] bg-white p-lg tablet-narrow:p-xl">
          <div className="flex items-end justify-between gap-md"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-mute">Live feed</p><h2 className="mt-xs text-xl font-bold">Aktivitas terbaru</h2></div><Link href="/admin/sessions" className="text-xs font-semibold underline underline-offset-4">Lihat semua</Link></div>
          <div className="mt-lg divide-y divide-black/[0.08]">
            {recentActivity.map((activity) => <div key={`${activity.type}-${activity.id}`} className="flex items-center gap-md py-md"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eff3eb]"><Icon name={activity.icon} className="h-4 w-4 text-sport-lime-deep" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{activity.title}</p><p className="mt-xxs truncate text-xs text-mute">{activity.detail}</p></div><div className="text-right"><span className="rounded-full bg-[#f1f3ef] px-sm py-xs text-[8px] font-bold uppercase">{activity.type}</span><p className="mt-xs text-[9px] text-mute">{formatRelativeDate(activity.date)}</p></div></div>)}
            {recentActivity.length === 0 && <p className="py-xl text-center text-sm text-mute">Belum ada aktivitas.</p>}
          </div>
        </div>

        <div className="rounded-sm border border-black/[0.08] bg-white p-lg tablet-narrow:p-xl">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-mute">Pertumbuhan komunitas</p><h2 className="mt-xs text-xl font-bold">Pengguna terbaru</h2></div>
          <div className="mt-lg space-y-sm">
            {analytics.recentUsers.map((user) => <Link key={user.id} href="/admin/users" className="flex items-center gap-md rounded-sm p-md transition-colors hover:bg-[#f4f6f2]"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sport-lime font-display text-lg">{user.fullName.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.fullName}</p><p className="truncate text-xs text-mute">{user.email}</p></div><div className="text-right"><p className="text-[9px] font-bold uppercase tracking-wider">{user.role === "admin" ? "Admin" : "User"}</p><p className="mt-xs text-[9px] text-mute">{formatRelativeDate(user.createdAt)}</p></div></Link>)}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-md"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-mute">Akses cepat</p><h2 className="mt-xs text-xl font-bold">Kelola sistem</h2></div><span className="text-xs text-mute">{exercises.length} latihan · {badges.length} badge · {challenges.length} challenge</span></div>
        <div className="mt-lg grid gap-md tablet-narrow:grid-cols-2 desktop:grid-cols-4">
          <QuickAction href="/admin/users" icon="users" title="Pengguna" body="Role, blokir, dan keamanan akun" />
          <QuickAction href="/admin/exercises" icon="activity" title="Konten latihan" body="Gerakan, target, dan konfigurasi AI" />
          <QuickAction href="/admin/sessions" icon="history" title="Aktivitas" body="Sesi kamera dan lari GPS" />
          <QuickAction href="/admin/audit" icon="shield" title="Audit sistem" body="Jejak seluruh tindakan admin" />
        </div>
      </section>
    </div>
  );
}

function HeroMetric({ label, value, detail, compact = false }: { label: string; value: string; detail: string; compact?: boolean }) {
  return <div className="rounded-sm border border-white/10 bg-white/[0.05] p-md"><p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/35">{label}</p><p className={`mt-sm font-display leading-none text-sport-lime ${compact ? "text-2xl" : "text-4xl"}`}>{value}</p><p className="mt-xs text-[9px] text-white/35">{detail}</p></div>;
}

function MetricCard({ icon, label, value, unit, detail, href, accent = false }: { icon: IconName; label: string; value: string; unit?: string; detail: string; href?: string; accent?: boolean }) {
  const content = <><div className="flex items-start justify-between gap-sm"><span className={`grid h-10 w-10 place-items-center rounded-full ${accent ? "bg-sport-black text-sport-lime" : "bg-[#edf1e9] text-sport-black"}`}><Icon name={icon} className="h-[18px] w-[18px]" /></span>{href && <Icon name="arrow" className="h-4 w-4 text-mute" />}</div><p className="mt-xl text-[9px] font-bold uppercase tracking-[0.16em] text-mute">{label}</p><p className="mt-xs font-display text-4xl leading-none tablet-narrow:text-5xl">{value}<span className="ml-xs font-sans text-[10px] text-mute">{unit}</span></p><p className="mt-sm text-[10px] text-mute">{detail}</p></>;
  const className = "rounded-sm border border-black/[0.08] bg-white p-lg transition-transform hover:-translate-y-0.5";
  return href ? <Link href={href} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}

function ActivityChart({ data }: { data: AdminActivityDay[] }) {
  const maximum = Math.max(1, ...data.map((day) => day.workouts + day.runs));
  return <div className="mt-xl"><div className="flex h-52 items-end gap-sm border-b border-black/10 tablet-narrow:gap-md">{data.map((day) => { const totalHeight = ((day.workouts + day.runs) / maximum) * 100; const runShare = day.workouts + day.runs ? (day.runs / (day.workouts + day.runs)) * 100 : 0; return <div key={day.key} className="flex h-full flex-1 flex-col justify-end"><div className="mb-sm text-center text-[9px] font-bold text-mute">{day.workouts + day.runs || ""}</div><div className="mx-auto flex w-full max-w-10 flex-col overflow-hidden rounded-t-md bg-[#e8ebe5]" style={{ height: `${Math.max(4, totalHeight)}%` }} title={`${day.workouts} latihan, ${day.runs} lari`}>{day.runs > 0 && <span className="w-full bg-sport-lime-deep" style={{ height: `${runShare}%` }} />}{day.workouts > 0 && <span className="min-h-1 flex-1 bg-sport-black" />}</div></div>; })}</div><div className="mt-sm grid grid-cols-7 gap-sm text-center text-[9px] font-bold uppercase text-mute">{data.map((day) => <span key={day.key}>{day.label}</span>)}</div></div>;
}

function EngagementLine({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "lime" | "danger" }) {
  return <div><p className={`font-display text-2xl leading-none ${tone === "lime" ? "text-sport-lime" : tone === "danger" ? "text-red-400" : "text-white"}`}>{value}</p><p className="mt-xs text-[9px] font-bold uppercase tracking-wider text-white/35">{label}</p></div>;
}

function QuickAction({ href, icon, title, body }: { href: string; icon: IconName; title: string; body: string }) {
  return <Link href={href} className="group flex min-h-32 items-start gap-md rounded-sm bg-sport-black p-lg text-white transition-transform hover:-translate-y-1"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sport-lime text-sport-black"><Icon name={icon} className="h-[18px] w-[18px]" /></span><div className="min-w-0"><p className="font-semibold">{title}</p><p className="mt-xs text-xs leading-relaxed text-white/45">{body}</p><Icon name="arrow" className="mt-md h-4 w-4 text-sport-lime transition-transform group-hover:translate-x-1" /></div></Link>;
}

function formatRelativeDate(value: string) {
  const formatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  const difference = new Date(value).getTime() - Date.now();
  const days = Math.round(difference / 86_400_000);
  if (Math.abs(days) < 1) return "Hari ini";
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
