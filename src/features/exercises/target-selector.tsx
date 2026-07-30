import { Icon } from "@/components/ui/icons";

export function TargetSelector({ slug, defaultReps, defaultSeconds, milestoneLevel = null }: { slug: string; defaultReps: number | null; defaultSeconds: number | null; milestoneLevel?: number | null }) {
  const usesReps = defaultReps != null;
  const base = usesReps ? (defaultReps ?? 12) : (defaultSeconds ?? 60);
  const presets = usesReps
    ? Array.from(new Set([8, 12, base, 16, 20, 25])).sort((a, b) => a - b)
    : Array.from(new Set([30, 45, base, 60, 90])).sort((a, b) => a - b);

  return (
    <form action={`/workout/${slug}`} method="get" className="mt-lg">
      <input type="hidden" name="tutorial" value="1" />
      {milestoneLevel != null && <input type="hidden" name="milestone" value={milestoneLevel} />}
      <input type="hidden" name="mode" value={usesReps ? "reps" : "seconds"} />
      <label htmlFor="target" className="text-xs font-semibold text-mute">Pilih target sesi</label>
      <div className="mt-sm grid grid-cols-[1fr_auto] gap-sm">
        <select id="target" name="target" defaultValue={base} disabled={milestoneLevel != null} className="input-pill min-w-0" aria-label={usesReps ? "Target repetisi" : "Target durasi"}>
          {presets.map((value) => <option key={value} value={value}>{value} {usesReps ? "repetisi" : "detik"}</option>)}
        </select>
        <button type="submit" className="btn-primary px-lg" aria-label="Mulai dengan target terpilih"><Icon name="play" className="h-5 w-5" /></button>
      </div>
      <p className="mt-sm text-[11px] leading-relaxed text-stone">{milestoneLevel ? "Target dikunci sesuai syarat challenge milestone." : "Target digunakan untuk menghitung progres dan bonus XP sesi."}</p>
    </form>
  );
}
