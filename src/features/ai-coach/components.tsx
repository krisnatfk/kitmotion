import { Icon } from "@/components/ui/icons";
import type { SessionCoachInsight, TeacherClassInsight } from "./types";

export function SessionCoachPanel({ insight }: { insight: SessionCoachInsight }) {
  return (
    <section className="mt-lg overflow-hidden rounded-sm bg-white" aria-labelledby="ai-coach-title">
      <div className="flex flex-col gap-md bg-sport-black p-xl text-white mobile-landscape:flex-row mobile-landscape:items-start mobile-landscape:justify-between">
        <div className="flex items-start gap-md">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sport-lime text-sport-black"><Icon name="bolt" className="h-5 w-5" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-sport-lime">Analisis setelah latihan</p><h2 id="ai-coach-title" className="mt-xs font-display text-3xl uppercase">Coach AI</h2></div>
        </div>
        <InsightSource source={insight.source} />
      </div>
      <div className="p-xl">
        <p className="max-w-3xl text-sm font-medium leading-relaxed text-charcoal">{insight.summary}</p>
        <div className="mt-lg grid gap-lg border-t border-hairline-soft pt-lg tablet-narrow:grid-cols-2">
          <InsightList title="Yang sudah baik" icon="check" items={insight.strengths} tone="success" />
          <InsightList title="Fokus perbaikan" icon="target" items={insight.improvements} tone="default" />
        </div>
        <div className="mt-lg flex items-start gap-md bg-soft-cloud p-lg"><Icon name="arrow" className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-[9px] font-bold uppercase tracking-widest text-mute">Target berikutnya</p><p className="mt-xs text-sm font-semibold leading-relaxed">{insight.nextTarget}</p></div></div>
        <p className="mt-md text-[10px] leading-relaxed text-mute">Coach AI menjelaskan hasil resmi KITMOTION dan tidak mengubah skor, XP, level, atau challenge.</p>
      </div>
    </section>
  );
}

export function TeacherClassInsightPanel({ insight }: { insight: TeacherClassInsight }) {
  return (
    <section className="mt-lg overflow-hidden rounded-sm bg-sport-black text-white" aria-labelledby="teacher-ai-title">
      <div className="flex flex-col gap-md border-b border-white/10 p-xl mobile-landscape:flex-row mobile-landscape:items-start mobile-landscape:justify-between">
        <div className="flex items-start gap-md">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sport-lime text-sport-black"><Icon name="chart" className="h-5 w-5" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-widest text-sport-lime">Insight kelas</p><h2 id="teacher-ai-title" className="mt-xs font-display text-3xl uppercase">Asisten AI guru</h2></div>
        </div>
        <InsightSource source={insight.source} dark />
      </div>
      <div className="p-xl">
        <p className="max-w-4xl text-sm font-medium leading-relaxed text-white/75">{insight.summary}</p>
        <div className="mt-lg grid gap-lg border-t border-white/10 pt-lg tablet-narrow:grid-cols-3">
          <DarkInsightList title="Perkembangan" items={insight.highlights} />
          <DarkInsightList title="Perlu perhatian" items={insight.concerns} />
          <DarkInsightList title="Fokus mengajar" items={insight.teachingFocus} accent />
        </div>
        <p className="mt-lg text-[10px] leading-relaxed text-white/35">Insight memakai data agregat dari siswa yang memberikan persetujuan aktif. Identitas dan rekaman kamera tidak dikirim ke model AI.</p>
      </div>
    </section>
  );
}

function InsightList({ title, icon, items, tone }: { title: string; icon: "check" | "target"; items: string[]; tone: "success" | "default" }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-widest text-mute">{title}</p><ul className="mt-md space-y-sm">{items.map((item) => <li key={item} className="flex items-start gap-sm text-xs leading-relaxed text-charcoal"><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${tone === "success" ? "bg-[#ddf8e8] text-success" : "bg-sport-lime"}`}><Icon name={icon} className="h-3 w-3" /></span>{item}</li>)}</ul></div>;
}

function DarkInsightList({ title, items, accent = false }: { title: string; items: string[]; accent?: boolean }) {
  return <div><p className={`text-[10px] font-bold uppercase tracking-widest ${accent ? "text-sport-lime" : "text-white/40"}`}>{title}</p><ul className="mt-md space-y-sm">{items.map((item) => <li key={item} className="flex items-start gap-sm text-xs leading-relaxed text-white/65"><span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${accent ? "bg-sport-lime" : "bg-white/30"}`} />{item}</li>)}</ul></div>;
}

function InsightSource({ source, dark = false }: { source: "ai" | "fallback"; dark?: boolean }) {
  return <span className={`inline-flex w-fit items-center gap-xs rounded-full px-md py-sm text-[9px] font-bold uppercase tracking-widest ${source === "ai" ? "bg-sport-lime text-sport-black" : dark ? "bg-white/10 text-white/55" : "bg-soft-cloud text-mute"}`}><span className={`h-1.5 w-1.5 rounded-full ${source === "ai" ? "bg-sport-black" : "bg-stone"}`} />{source === "ai" ? "AI aktif" : "Saran sistem"}</span>;
}
