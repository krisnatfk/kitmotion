import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { getSessionDetail, getTrend } from "@/features/history/queries";

export const dynamic = "force-dynamic";

const SEVERITY_LABEL: Record<string, string> = { info: "Info", warning: "Perhatian", critical: "Penting" };

export default async function SessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSessionDetail(sessionId);
  if (!session) notFound();
  const trend = await getTrend(10);
  const maxScore = Math.max(1, ...trend.map((item) => item.score));
  const score = session.final_score != null ? Math.round(Number(session.final_score)) : null;

  return <Container className="py-xl tablet-narrow:py-section">
    <Link href="/history" className="inline-flex items-center gap-sm text-xs text-mute hover:text-ink"><Icon name="arrow" className="h-4 w-4 rotate-180" /> Kembali ke riwayat</Link>
    <section className="mt-lg grid overflow-hidden rounded-sm bg-sport-black text-white tablet-narrow:grid-cols-[1.25fr_0.75fr]">
      <div className="p-xl tablet-narrow:p-section"><p className="eyebrow text-sport-lime">Hasil latihan</p><h1 className="mt-lg font-display text-5xl uppercase leading-none tablet-narrow:text-7xl">{session.exercises?.name ?? "Latihan"}</h1><p className="mt-lg text-sm text-white/55">Grade <strong className="text-white">{session.grade ?? "—"}</strong> · {session.valid_reps} repetisi valid · {session.duration_seconds} detik</p></div>
      <div className="grid place-items-center border-t border-white/10 bg-white/[0.04] p-xl text-center tablet-narrow:border-l tablet-narrow:border-t-0"><div><p className="text-xs uppercase tracking-[0.2em] text-white/40">Skor akhir</p><p className="mt-sm font-display text-8xl leading-none text-sport-lime">{score ?? "—"}</p><p className="mt-sm text-xs text-white/40">dari 100</p></div></div>
    </section>

    <section className="mt-lg grid grid-cols-2 gap-sm tablet-narrow:grid-cols-5">
      <SubScore label="Postur" value={session.form_score} /><SubScore label="Rentang" value={session.range_score} /><SubScore label="Konsistensi" value={session.consistency_score} /><SubScore label="Tempo" value={session.tempo_score} /><SubScore label="Stabilitas" value={session.stability_score} />
    </section>

    <div className="mt-section grid gap-lg desktop-small:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-sm bg-white p-xl"><h2 className="font-display text-3xl uppercase">Tren skor</h2>{trend.length > 1 ? <div className="mt-xl flex h-40 items-end gap-xs" role="img" aria-label="Tren skor 10 sesi terakhir">{trend.map((item, index) => <div key={`${item.date}-${index}`} className="group flex flex-1 flex-col justify-end"><div className="min-h-2 rounded-t-sm bg-sport-lime-deep transition-colors group-hover:bg-sport-black" style={{ height: `${(item.score / maxScore) * 130 + 8}px` }} title={`${item.date}: ${Math.round(item.score)}`} /></div>)}</div> : <p className="mt-lg text-sm text-mute">Selesaikan sesi berikutnya untuk melihat tren.</p>}</section>
      <section className="rounded-sm bg-white p-xl"><h2 className="font-display text-3xl uppercase">Saran utama</h2>{session.feedback.length > 0 ? <ul className="mt-lg space-y-sm">{session.feedback.map((item) => <li key={item.id} className="rounded-sm bg-soft-cloud p-lg"><div className="flex items-start gap-md"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sport-lime"><Icon name="bolt" className="h-4 w-4" /></span><div><p className="text-[10px] font-bold uppercase tracking-widest text-mute">{SEVERITY_LABEL[item.severity] ?? item.severity} · {item.occurrence_count}×</p><p className="mt-xs text-sm leading-relaxed">{item.message}</p></div></div></li>)}</ul> : <p className="mt-lg text-sm text-mute">Tidak ada koreksi utama pada sesi ini.</p>}</section>
    </div>

    {session.repetitions.length > 0 && <section className="mt-lg rounded-sm bg-white p-xl"><div className="flex items-center justify-between"><h2 className="font-display text-3xl uppercase">Detail repetisi</h2><span className="chip">{session.repetitions.length} total</span></div><ul className="mt-lg divide-y divide-hairline-soft">{session.repetitions.map((rep) => <li key={rep.id} className="flex items-center justify-between gap-lg py-md"><span className="text-sm font-semibold">Repetisi {rep.rep_number}</span><span className={`rounded-full px-md py-xs text-xs font-semibold ${rep.is_valid ? "bg-[#ddf8e8] text-success" : "bg-soft-cloud text-mute"}`}>{rep.is_valid ? "Valid" : "Perlu perbaikan"}{rep.issue_codes.length > 0 ? ` · ${rep.issue_codes.join(", ")}` : ""}</span></li>)}</ul></section>}

    <div className="mt-section flex flex-col gap-sm mobile-landscape:flex-row"><ButtonLink href="/history" variant="secondary">Kembali ke riwayat</ButtonLink>{session.exercises?.slug && <ButtonLink href={`/exercises/${session.exercises.slug}`}>Ulangi latihan <Icon name="arrow" className="h-4 w-4" /></ButtonLink>}</div>
  </Container>;
}

function SubScore({ label, value }: { label: string; value: number | null }) {
  return <div className="rounded-sm bg-white p-lg"><p className="text-[10px] font-bold uppercase tracking-widest text-mute">{label}</p><p className="mt-sm font-display text-3xl">{value != null ? Math.round(Number(value)) : "—"}</p></div>;
}
