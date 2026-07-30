import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icons";
import { createClassAction } from "@/features/classes/actions";
import { getTeacherOverview } from "@/features/classes/queries";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const query = await searchParams;
  const { profile, classrooms } = await getTeacherOverview();
  const totalStudents = classrooms.reduce((sum, classroom) => sum + classroom.studentCount, 0);
  return (
    <Container className="py-xl tablet-narrow:py-section">
      <header className="flex flex-col gap-md tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between">
        <div><p className="eyebrow text-mute">Dashboard guru</p><h1 className="mt-sm font-display text-5xl uppercase tablet-narrow:text-6xl">Halo, {profile.full_name}</h1><p className="mt-md max-w-2xl text-sm leading-relaxed text-mute">Kelola kelas dan pantau hanya siswa yang sudah memberikan persetujuan aktif.</p></div>
        <div className="flex gap-sm"><Stat label="Kelas" value={classrooms.length} /><Stat label="Siswa aktif" value={totalStudents} /></div>
      </header>
      {query.error && <Notice tone="error">{query.error}</Notice>}
      {query.success && <Notice tone="success">{query.success}</Notice>}

      <section className="mt-xl grid gap-lg desktop-small:grid-cols-[360px_1fr]">
        <article className="h-fit rounded-sm bg-sport-black p-xl text-white">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-sport-lime text-sport-black"><Icon name="users" className="h-6 w-6" /></span>
          <h2 className="mt-lg font-display text-3xl uppercase">Buat kelas</h2>
          <form action={createClassAction} className="mt-lg space-y-md">
            <div><label htmlFor="name" className="text-xs font-semibold text-white/60">Nama kelas</label><input id="name" name="name" required minLength={2} maxLength={80} className="input-pill mt-sm text-sport-black" placeholder="PJOK VIII A" /></div>
            <div><label htmlFor="schoolYear" className="text-xs font-semibold text-white/60">Tahun ajaran</label><input id="schoolYear" name="schoolYear" maxLength={20} className="input-pill mt-sm text-sport-black" placeholder="2026/2027" /></div>
            <button type="submit" className="btn-primary w-full">Buat kelas dan kode</button>
          </form>
        </article>

        <div className="grid gap-md tablet-narrow:grid-cols-2">
          {classrooms.map((classroom) => (
            <article key={classroom.id} className="flex flex-col rounded-sm bg-white p-xl">
              <div className="flex items-start justify-between gap-md"><div><p className="text-xs font-bold uppercase tracking-widest text-mute">{classroom.school_year ?? "Tahun berjalan"}</p><h2 className="mt-xs text-xl font-semibold">{classroom.name}</h2></div><span className="grid h-10 w-10 place-items-center rounded-full bg-sport-lime"><Icon name="users" className="h-5 w-5" /></span></div>
              <div className="mt-lg rounded-sm bg-soft-cloud p-lg"><p className="text-[10px] font-bold uppercase tracking-widest text-mute">Kode bergabung</p><p className="mt-xs font-display text-4xl tracking-[0.12em]">{classroom.code}</p><p className="mt-xs text-[11px] text-mute">Berikan kode ini hanya kepada siswa kelas.</p></div>
              <div className="mt-lg flex items-center justify-between text-sm"><span className="text-mute">Anggota disetujui</span><strong>{classroom.studentCount} siswa</strong></div>
              <Link href={`/teacher/classes/${classroom.id}`} className="mt-lg flex min-h-12 items-center justify-between border-t border-hairline-soft pt-lg text-sm font-semibold">Buka laporan <Icon name="arrow" className="h-4 w-4" /></Link>
            </article>
          ))}
          {classrooms.length === 0 && <div className="rounded-sm border border-dashed border-hairline p-xl text-sm text-mute">Belum ada kelas. Buat kelas pertama untuk mendapatkan kode undangan.</div>}
        </div>
      </section>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="min-w-28 rounded-sm bg-white p-md text-center"><p className="font-display text-3xl">{value}</p><p className="text-[10px] uppercase tracking-widest text-mute">{label}</p></div>; }
function Notice({ children, tone }: { children: React.ReactNode; tone: "error" | "success" }) { return <div role="status" className={`mt-lg rounded-sm p-md text-sm ${tone === "error" ? "bg-red-50 text-danger" : "bg-[#eaf7ee] text-success"}`}>{children}</div>; }
