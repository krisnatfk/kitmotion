import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icons";
import { getStudentClasses, previewClassCode } from "@/features/classes/queries";
import { joinClassAction, leaveClassAction } from "@/features/classes/actions";

export const dynamic = "force-dynamic";

export default async function StudentClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const [classes, preview] = await Promise.all([
    getStudentClasses(),
    previewClassCode(query.code),
  ]);

  return (
    <Container className="py-xl tablet-narrow:py-section">
      <header className="max-w-3xl">
        <p className="eyebrow text-mute">Kelas saya</p>
        <h1 className="mt-sm font-display text-5xl uppercase tablet-narrow:text-6xl">Hubungkan ke guru</h1>
        <p className="mt-md text-sm leading-relaxed text-mute">Data latihan tidak dibagikan otomatis. Masukkan kode, periksa nama kelas dan guru, lalu berikan persetujuan secara eksplisit.</p>
      </header>

      {query.error && <Notice tone="error">{query.error}</Notice>}
      {query.success && <Notice tone="success">{query.success}</Notice>}

      <section className="mt-xl grid gap-lg desktop-small:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-sm bg-sport-black p-xl text-white">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-sport-lime text-sport-black"><Icon name="users" className="h-6 w-6" /></span>
          <h2 className="mt-lg font-display text-3xl uppercase">Masukkan kode kelas</h2>
          <form method="get" className="mt-lg">
            <label htmlFor="code" className="text-xs font-semibold text-white/60">Kode 8 karakter dari guru</label>
            <div className="mt-sm grid grid-cols-[1fr_auto] gap-sm">
              <input id="code" name="code" required minLength={8} maxLength={8} defaultValue={query.code?.toUpperCase()} className="input-pill uppercase text-sport-black" placeholder="AB12CD34" />
              <button type="submit" className="btn-primary px-lg">Periksa</button>
            </div>
          </form>
          {query.code && !preview && <p className="mt-md text-xs leading-relaxed text-sale">Kode tidak ditemukan, tidak aktif, atau sudah kedaluwarsa.</p>}
        </article>

        <article className="rounded-sm border border-hairline-soft bg-white p-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-mute">Konfirmasi persetujuan</p>
          {preview ? (
            <>
              <h2 className="mt-md font-display text-4xl uppercase">{preview.name}</h2>
              <dl className="mt-lg divide-y divide-hairline-soft border-y border-hairline-soft text-sm">
                <InfoRow label="Guru" value={preview.teacherName} />
                <InfoRow label="Tahun ajaran" value={preview.school_year ?? "Tidak dicantumkan"} />
                <InfoRow label="Kode" value={preview.code} />
              </dl>
              <div className="mt-lg rounded-sm bg-soft-cloud p-lg text-xs leading-relaxed text-charcoal">
                Dengan memilih setuju, guru kelas ini dapat melihat ringkasan latihan, repetisi, skor, durasi, level, XP, challenge, dan kesalahan gerakan selama keanggotaanmu aktif.
              </div>
              <form action={joinClassAction} className="mt-lg">
                <input type="hidden" name="code" value={preview.code} />
                <button type="submit" className="btn-primary w-full">Saya setuju dan bergabung</button>
              </form>
            </>
          ) : (
            <div className="grid min-h-64 place-items-center text-center">
              <div><Icon name="lock" className="mx-auto h-8 w-8 text-stone" /><p className="mt-md text-sm font-semibold">Informasi kelas akan tampil di sini</p><p className="mt-xs text-xs text-mute">Persetujuan belum diberikan sebelum kamu menekan tombol bergabung.</p></div>
            </div>
          )}
        </article>
      </section>

      <section className="mt-section">
        <h2 className="font-display text-4xl uppercase">Keanggotaan aktif</h2>
        <div className="mt-lg grid gap-md tablet-narrow:grid-cols-2">
          {classes.map((classroom) => (
            <article key={classroom.id} className="rounded-sm bg-white p-xl">
              <div className="flex items-start justify-between gap-md"><div><p className="text-xs font-bold uppercase tracking-widest text-mute">{classroom.school_year ?? "Kelas aktif"}</p><h3 className="mt-xs text-xl font-semibold">{classroom.name}</h3><p className="mt-sm text-sm text-mute">Guru: {classroom.teacherName}</p></div><span className="chip bg-[#eaf7ee] text-success"><Icon name="check" className="h-3.5 w-3.5" /> Disetujui</span></div>
              <p className="mt-lg text-[11px] leading-relaxed text-stone">Persetujuan diberikan {formatDate(classroom.consentedAt)}. Keluar dari kelas akan menghentikan akses guru ke laporan latihan berikutnya.</p>
              <form action={leaveClassAction} className="mt-lg border-t border-hairline-soft pt-lg">
                <input type="hidden" name="classId" value={classroom.id} />
                <button type="submit" className="text-sm font-semibold text-danger hover:underline">Keluar dari kelas</button>
              </form>
            </article>
          ))}
          {classes.length === 0 && <div className="rounded-sm border border-dashed border-hairline p-xl text-sm text-mute">Belum ada kelas aktif. Gunakan kode dari guru untuk bergabung.</div>}
        </div>
      </section>
    </Container>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "error" | "success" }) {
  return <div role="status" className={`mt-lg rounded-sm p-md text-sm ${tone === "error" ? "bg-red-50 text-danger" : "bg-[#eaf7ee] text-success"}`}>{children}</div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-md py-md"><dt className="text-mute">{label}</dt><dd className="font-semibold">{value}</dd></div>;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
}
