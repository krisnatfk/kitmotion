import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { getFeedbackGuidance } from "@/features/exercise-engine/feedback-guidance";
import { getSessionDetail, getTrend, type WorkoutRepetitionRow } from "@/features/history/queries";
import { formatDuration } from "@/features/running/metrics";
import { SessionCoachPanel } from "@/features/ai-coach/components";
import { getCurrentUserSessionCoach } from "@/features/ai-coach/insights";

export const dynamic = "force-dynamic";
const SEVERITY_LABEL: Record<string, string> = { info: "Saran", warning: "Perhatian", critical: "Penting" };

export default async function SessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSessionDetail(sessionId);
  if (!session) notFound();
  const [trend, aiCoach] = await Promise.all([
    getTrend(10),
    getCurrentUserSessionCoach(sessionId),
  ]);
  const maxScore = Math.max(1, ...trend.map((item) => item.score));
  const score = session.final_score != null ? Math.round(Number(session.final_score)) : null;
  const totalReps = Math.max(session.total_reps, session.valid_reps + session.invalid_reps);
  const validityRate = totalReps > 0 ? Math.round((session.valid_reps / totalReps) * 100) : 0;

  return <Container className="py-xl tablet-narrow:py-section">
    <Link href="/history" className="inline-flex items-center gap-sm text-xs text-mute hover:text-ink"><Icon name="arrow" className="h-4 w-4 rotate-180" /> Kembali ke riwayat</Link>
    <section className="mt-lg grid overflow-hidden rounded-sm bg-sport-black text-white tablet-narrow:grid-cols-[1.25fr_0.75fr]">
      <div className="p-xl tablet-narrow:p-section"><p className="eyebrow text-sport-lime">Analisis sesi</p><h1 className="mt-lg font-display text-5xl uppercase leading-none tablet-narrow:text-7xl">{session.exercises?.name ?? "Latihan"}</h1><p className="mt-lg max-w-xl text-sm leading-relaxed text-white/55">Dari <strong className="text-white">{totalReps} repetisi</strong>, {session.valid_reps} memenuhi rentang dan kontrol gerakan, sedangkan {session.invalid_reps} masih membutuhkan koreksi.</p><div className="mt-lg flex flex-wrap gap-sm"><span className="rounded-full bg-sport-lime px-md py-xs text-[10px] font-bold text-sport-black">{validityRate}% gerakan valid</span><span className="rounded-full bg-white/10 px-md py-xs text-[10px] font-semibold text-white/65">{formatDuration(session.duration_seconds)}</span><span className="rounded-full bg-white/10 px-md py-xs text-[10px] font-semibold text-white/65">Grade {session.grade ?? "—"}</span></div></div>
      <div className="grid place-items-center border-t border-white/10 bg-white/[0.04] p-xl text-center tablet-narrow:border-l tablet-narrow:border-t-0"><div><p className="text-xs uppercase tracking-[0.2em] text-white/40">Skor akhir</p><p className="mt-sm font-display text-8xl leading-none text-sport-lime">{score ?? "—"}</p><p className="mt-sm text-xs text-white/40">dari 100</p></div></div>
    </section>

    <section className="mt-lg grid grid-cols-2 gap-sm tablet-narrow:grid-cols-5"><SubScore label="Postur" value={session.form_score} explanation="Keselarasan tubuh" /><SubScore label="Rentang" value={session.range_score} explanation="Kedalaman gerak" /><SubScore label="Konsistensi" value={session.consistency_score} explanation="Keseragaman repetisi" /><SubScore label="Tempo" value={session.tempo_score} explanation="Kontrol kecepatan" /><SubScore label="Stabilitas" value={session.stability_score} explanation="Kontrol keseimbangan" /></section>

    {aiCoach && <SessionCoachPanel insight={aiCoach} />}

    <div className="mt-section grid gap-lg desktop-small:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-sm bg-white p-xl"><h2 className="font-display text-3xl uppercase">Tren skor</h2><p className="mt-xs text-xs text-mute">Perbandingan hingga 10 sesi terakhir.</p>{trend.length > 1 ? <div className="mt-xl flex h-40 items-end gap-xs" role="img" aria-label="Tren skor 10 sesi terakhir">{trend.map((item, index) => <div key={`${item.date}-${index}`} className="group flex flex-1 flex-col justify-end"><div className="min-h-2 rounded-t-sm bg-sport-lime-deep transition-colors group-hover:bg-sport-black" style={{ height: `${(item.score / maxScore) * 130 + 8}px` }} title={`${item.date}: ${Math.round(item.score)}`} /></div>)}</div> : <p className="mt-lg text-sm text-mute">Selesaikan sesi berikutnya untuk melihat tren.</p>}</section>
      <section className="rounded-sm bg-white p-xl"><div><p className="text-[10px] font-bold uppercase tracking-widest text-mute">Prioritas perbaikan</p><h2 className="mt-xs font-display text-3xl uppercase">Apa yang perlu dilakukan?</h2></div>{session.feedback.length > 0 ? <ul className="mt-lg grid gap-sm">{session.feedback.map((item) => { const guidance = getFeedbackGuidance(item.code); return <li key={item.id} className="rounded-sm border border-hairline-soft p-lg"><div className="flex items-start gap-md"><span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${item.severity === "critical" ? "bg-[#ff7657]" : "bg-sport-lime"}`}><Icon name="bolt" className="h-4 w-4" /></span><div><p className="text-[9px] font-bold uppercase tracking-widest text-mute">{SEVERITY_LABEL[item.severity] ?? item.severity} · muncul {item.occurrence_count}× · {guidance.bodyPart}</p><h3 className="mt-xs font-semibold">{guidance.title}</h3><p className="mt-sm text-xs leading-relaxed text-mute"><strong className="text-ink">Yang terjadi:</strong> {guidance.problem}</p><p className="mt-xs text-xs leading-relaxed text-mute"><strong className="text-ink">Cara memperbaiki:</strong> {guidance.correction}</p></div></div></li>; })}</ul> : <div className="mt-lg rounded-sm bg-[#ddf8e8] p-lg"><p className="font-semibold text-success">Teknik utama sudah konsisten</p><p className="mt-xs text-xs leading-relaxed text-mute">Tidak ada pola kesalahan yang cukup sering untuk menjadi prioritas koreksi.</p></div>}</section>
    </div>

    {session.repetitions.length > 0 && <section className="mt-lg rounded-sm bg-white p-xl"><div className="flex flex-col gap-sm mobile-landscape:flex-row mobile-landscape:items-end mobile-landscape:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-mute">Pemeriksaan satu per satu</p><h2 className="mt-xs font-display text-3xl uppercase">Detail repetisi</h2></div><div className="flex gap-sm"><span className="rounded-full bg-[#ddf8e8] px-md py-xs text-[10px] font-semibold text-success">{session.valid_reps} valid</span><span className="rounded-full bg-[#fff0eb] px-md py-xs text-[10px] font-semibold text-[#a43b20]">{session.invalid_reps} diperbaiki</span></div></div><div className="mt-lg space-y-sm">{session.repetitions.map((rep) => <RepetitionDetail key={rep.id} repetition={rep} />)}</div></section>}

    <div className="mt-section flex flex-col gap-sm mobile-landscape:flex-row"><ButtonLink href="/history" variant="secondary">Kembali ke riwayat</ButtonLink>{session.exercises?.slug && <ButtonLink href={`/exercises/${session.exercises.slug}`}>Ulangi latihan <Icon name="arrow" className="h-4 w-4" /></ButtonLink>}</div>
  </Container>;
}

function RepetitionDetail({ repetition }: { repetition: WorkoutRepetitionRow }) {
  const duration = Math.max(0, repetition.completed_offset_ms - repetition.started_offset_ms) / 1000;
  const guidance = repetition.issue_codes.map(getFeedbackGuidance);
  return <article className={`rounded-sm border p-lg ${repetition.is_valid ? "border-[#bfe8d1] bg-[#f5fcf8]" : "border-[#ffd1c5] bg-[#fff8f5]"}`}><div className="flex flex-col gap-md mobile-landscape:flex-row mobile-landscape:items-center mobile-landscape:justify-between"><div className="flex items-center gap-md"><span className={`grid h-10 w-10 place-items-center rounded-full font-display text-xl ${repetition.is_valid ? "bg-success text-white" : "bg-[#ff7657] text-sport-black"}`}>{repetition.rep_number}</span><div><p className="font-semibold">Repetisi {repetition.rep_number} · {repetition.is_valid ? "Valid" : "Perlu perbaikan"}</p><p className="mt-xs text-[10px] text-mute">Durasi gerakan {duration.toFixed(1)} detik</p></div></div><div className="grid grid-cols-3 gap-sm"><RepScore label="Postur" value={repetition.form_score} /><RepScore label="Rentang" value={repetition.range_score} /><RepScore label="Stabil" value={repetition.stability_score} /></div></div>{guidance.length > 0 && <div className="mt-md grid gap-sm border-t border-black/5 pt-md tablet-narrow:grid-cols-2">{guidance.map((item, index) => <div key={`${item.title}-${index}`}><p className="text-[9px] font-bold uppercase tracking-widest text-[#a43b20]">{item.bodyPart}</p><p className="mt-xs text-xs font-semibold">{item.title}</p><p className="mt-xs text-[11px] leading-relaxed text-mute">{item.correction}</p></div>)}</div>}{repetition.is_valid && <p className="mt-md border-t border-black/5 pt-md text-[11px] leading-relaxed text-success">Rentang gerak, kontrol postur, dan tempo memenuhi kriteria repetisi valid.</p>}</article>;
}

function RepScore({ label, value }: { label: string; value: number | null }) { return <div className="min-w-14 text-right"><p className="text-[8px] uppercase tracking-wider text-mute">{label}</p><p className="mt-xs font-display text-xl">{value != null ? Math.round(Number(value)) : "—"}</p></div>; }
function SubScore({ label, value, explanation }: { label: string; value: number | null; explanation: string }) { return <div className="rounded-sm bg-white p-lg"><p className="text-[9px] font-bold uppercase tracking-widest text-mute">{label}</p><p className="mt-sm font-display text-3xl">{value != null ? Math.round(Number(value)) : "—"}</p><p className="mt-xs text-[9px] leading-relaxed text-mute">{explanation}</p></div>; }
