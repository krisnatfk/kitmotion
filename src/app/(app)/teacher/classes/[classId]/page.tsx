import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icons";
import { removeStudentAction } from "@/features/classes/actions";
import { getTeacherClassReport } from "@/features/classes/queries";
import { TeacherClassInsightPanel } from "@/features/ai-coach/components";
import { getTeacherClassInsight } from "@/features/ai-coach/insights";
import { withTimeoutFallback } from "@/lib/async";

export const dynamic = "force-dynamic";

export default async function TeacherClassReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ student?: string; exercise?: string; from?: string; to?: string; success?: string }>;
}) {
  const { classId } = await params;
  const query = await searchParams;
  const report = await getTeacherClassReport(classId, query);
  const aiInsight = await withTimeoutFallback(getTeacherClassInsight({
    teacherId: report.classroom.teacher_id,
    classroomId: report.classroom.id,
    className: report.classroom.name,
    totalStudents: report.students.length,
    totalSessions: report.summary.totalSessions,
    totalValidReps: report.summary.totalReps,
    averageScore: report.summary.averageScore,
    durationSeconds: report.summary.durationSeconds,
    rows: report.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      exerciseName: row.exerciseName,
      validReps: row.valid_reps,
      invalidReps: row.invalid_reps,
      finalScore: Number(row.final_score ?? 0),
      completedAt: row.completed_at,
    })),
    commonIssues: report.commonIssues,
    weekly: report.weekly,
  }), null, 8_000);
  const exportParams = new URLSearchParams();
  for (const key of ["student", "exercise", "from", "to"] as const) {
    const value = query[key];
    if (value) exportParams.set(key, value);
  }
  const exportHref = `/teacher/classes/${classId}/export${exportParams.size ? `?${exportParams.toString()}` : ""}`;
  return (
    <Container className="py-xl tablet-narrow:py-section">
      <Link href="/teacher" className="inline-flex items-center gap-sm text-sm text-mute"><Icon name="arrow" className="h-4 w-4 rotate-180" /> Dashboard guru</Link>
      <header className="mt-lg flex flex-col gap-lg tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between"><div><p className="eyebrow text-mute">Laporan kelas · {report.classroom.school_year ?? "Tahun berjalan"}</p><h1 className="mt-sm font-display text-5xl uppercase tablet-narrow:text-6xl">{report.classroom.name}</h1></div><div className="tablet-narrow:text-right"><a href={exportHref} download className="btn-primary inline-flex min-h-12 items-center gap-sm px-xl"><Icon name="arrow" className="h-4 w-4 rotate-90" /> Export PDF</a><p className="mt-sm text-[10px] leading-relaxed text-mute">PDF mengikuti filter laporan yang sedang aktif.</p></div></header>
      {query.success && <div role="status" className="mt-lg rounded-sm bg-[#eaf7ee] p-md text-sm text-success">{query.success}</div>}

      <form method="get" className="mt-xl grid gap-sm rounded-sm bg-white p-lg tablet-narrow:grid-cols-4 desktop-small:grid-cols-[1fr_1fr_160px_160px_auto]">
        <select name="student" defaultValue={query.student ?? ""} className="input-pill"><option value="">Semua siswa</option>{report.students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}</select>
        <select name="exercise" defaultValue={query.exercise ?? ""} className="input-pill"><option value="">Semua latihan</option>{report.exercises.map((exercise) => <option key={exercise.id} value={exercise.slug}>{exercise.name}</option>)}</select>
        <input type="date" name="from" defaultValue={query.from} className="input-pill" aria-label="Tanggal mulai" />
        <input type="date" name="to" defaultValue={query.to} className="input-pill" aria-label="Tanggal akhir" />
        <button type="submit" className="btn-primary px-lg">Terapkan</button>
      </form>

      <section className="mt-lg grid grid-cols-2 gap-sm desktop-small:grid-cols-4">
        <Summary label="Total latihan" value={String(report.summary.totalSessions)} icon="activity" />
        <Summary label="Repetisi valid" value={String(report.summary.totalReps)} icon="target" />
        <Summary label="Rata-rata skor" value={String(report.summary.averageScore)} icon="chart" />
        <Summary label="Waktu latihan" value={formatDuration(report.summary.durationSeconds)} icon="history" />
      </section>

      {aiInsight && <TeacherClassInsightPanel insight={aiInsight} />}

      <section className="mt-lg rounded-sm bg-white p-xl">
        <div><p className="text-xs font-bold uppercase tracking-widest text-mute">Perkembangan mingguan</p><h2 className="mt-xs font-display text-3xl uppercase">Skor dan konsistensi</h2></div>
        {report.weekly.length > 0 ? <div className="mt-lg flex h-48 items-end gap-sm border-b border-hairline-soft px-sm">{report.weekly.map((week) => <div key={week.week} className="flex min-w-0 flex-1 flex-col items-center justify-end"><span className="mb-xs text-[10px] font-bold">{week.averageScore}</span><div className="w-full max-w-16 rounded-t bg-sport-lime-deep" style={{ height: `${Math.max(8, week.averageScore)}%` }} title={`${week.sessions} sesi`} /><span className="mt-sm text-[9px] text-mute">{formatShortDate(week.week)}</span></div>)}</div> : <p className="mt-lg text-sm text-mute">Belum cukup data untuk menampilkan perkembangan mingguan.</p>}
      </section>

      <section className="mt-section grid gap-lg desktop-small:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-sm bg-white">
          <div className="border-b border-hairline-soft p-xl"><h2 className="font-display text-3xl uppercase">Aktivitas siswa</h2></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-soft-cloud text-[10px] uppercase tracking-widest text-mute"><tr><th className="p-md">Siswa</th><th className="p-md">Latihan</th><th className="p-md">Tanggal</th><th className="p-md">Hasil valid</th><th className="p-md">Skor</th><th className="p-md">Durasi</th><th className="p-md">Level/XP</th></tr></thead><tbody className="divide-y divide-hairline-soft">{report.rows.map((row) => <tr key={row.id}><td className="p-md font-semibold">{row.studentName}</td><td className="p-md">{row.exerciseName}</td><td className="p-md text-mute">{formatDate(row.completed_at)}</td><td className="p-md">{formatValidResult(row.valid_reps, row.validDurationSeconds)}</td><td className="p-md font-semibold">{Math.round(Number(row.final_score ?? 0))}</td><td className="p-md">{formatDuration(row.duration_seconds)}</td><td className="p-md">Lv {row.level} · {row.xp} XP</td></tr>)}{report.rows.length === 0 && <tr><td colSpan={7} className="p-xl text-center text-mute">Belum ada aktivitas untuk filter ini.</td></tr>}</tbody></table></div>
        </div>
        <aside className="h-fit rounded-sm bg-sport-black p-xl text-white"><p className="text-xs font-bold uppercase tracking-widest text-white/45">Kesalahan yang sering terjadi</p><div className="mt-lg space-y-sm">{report.commonIssues.map((issue, index) => <article key={issue.code} className="rounded-sm border border-white/10 p-md"><div className="flex items-center justify-between"><span className="font-display text-2xl text-sport-lime">0{index + 1}</span><span className="text-xs font-bold">{issue.count}×</span></div><p className="mt-sm text-xs leading-relaxed text-white/65">{issue.message}</p></article>)}{report.commonIssues.length === 0 && <p className="text-sm text-white/50">Belum ada feedback kesalahan pada sesi terpilih.</p>}</div></aside>
      </section>

      <section className="mt-section"><h2 className="font-display text-4xl uppercase">Anggota aktif</h2><div className="mt-lg grid gap-sm tablet-narrow:grid-cols-2 desktop-small:grid-cols-3">{report.students.map((student) => <article key={student.id} className="rounded-sm bg-white p-lg"><div className="flex items-center justify-between gap-sm"><div><p className="font-semibold">{student.full_name}</p><p className="mt-xs text-xs text-mute">Level {student.level} · {student.xp} XP · {student.challengesCompleted} challenge</p></div><span className="grid h-10 w-10 place-items-center rounded-full bg-sport-lime"><Icon name="user" className="h-5 w-5" /></span></div><form action={removeStudentAction} className="mt-lg border-t border-hairline-soft pt-md"><input type="hidden" name="classId" value={classId} /><input type="hidden" name="studentId" value={student.id} /><button type="submit" className="text-xs font-semibold text-danger">Keluarkan siswa</button></form></article>)}</div></section>
    </Container>
  );
}

function Summary({ label, value, icon }: { label: string; value: string; icon: "activity" | "target" | "chart" | "history" }) { return <div className="rounded-sm bg-sport-black p-lg text-white"><Icon name={icon} className="h-5 w-5 text-sport-lime" /><p className="mt-lg font-display text-4xl">{value}</p><p className="mt-xs text-[10px] uppercase tracking-widest text-white/45">{label}</p></div>; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)) : "—"; }
function formatShortDate(value: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00Z`)); }
function formatDuration(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); return hours ? `${hours}j ${minutes}m` : `${minutes}m`; }
function formatValidResult(reps: number, seconds: number) { return seconds > 0 ? `${seconds} detik` : `${reps} repetisi`; }
