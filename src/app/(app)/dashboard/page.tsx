import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { getCurrentProfile, getCurrentProgress, getDashboardGamification } from "@/features/profile/queries";
import { listExercises } from "@/features/exercises/queries";
import { withTimeoutFallback } from "@/lib/async";

const EMPTY_GAMIFICATION = { badges: [], challenges: [] };

export default async function DashboardPage() {
  // Authentication is enforced by middleware. Optional dashboard data gets a
  // deadline so one unavailable Supabase table cannot blank the entire route.
  const [profile, progress, exercises, gamification] = await Promise.all([
    withTimeoutFallback(getCurrentProfile(), null),
    withTimeoutFallback(getCurrentProgress(), null),
    withTimeoutFallback(listExercises(), []),
    withTimeoutFallback(getDashboardGamification(), EMPTY_GAMIFICATION),
  ]);
  const totalXp = progress?.total_xp ?? 0;
  const level = progress?.current_level ?? 1;
  const streak = progress?.current_streak ?? 0;
  const sessions = progress?.total_sessions ?? 0;
  const featured = exercises[0];
  const databaseReady = Boolean(profile || progress || exercises.length > 0);

  return (
    <Container className="py-xl tablet-narrow:py-section">
      <header className="flex flex-col gap-md tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between">
        <div><p className="text-sm font-medium text-mute">Selamat datang kembali,</p><h1 className="mt-xs font-display text-5xl uppercase leading-none tablet-narrow:text-6xl">{profile?.full_name ?? "Atlet KITMOTION"}</h1></div>
        <p className="flex items-center gap-sm text-sm font-semibold"><span className="grid h-9 w-9 place-items-center rounded-full bg-sport-lime"><Icon name="bolt" className="h-4 w-4" /></span>{streak > 0 ? `${streak} hari beruntun` : "Mulai streak pertamamu"}</p>
      </header>

      {profile?.role === "admin" && (
        <section className="mt-xl flex flex-col gap-lg rounded-sm bg-sport-lime p-lg mobile-landscape:flex-row mobile-landscape:items-center mobile-landscape:justify-between tablet-narrow:p-xl" aria-label="Akses administrator">
          <div className="flex items-start gap-md">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sport-black text-sport-lime">
              <Icon name="shield" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Mode administrator aktif</p>
              <h2 className="mt-xs text-lg font-bold">Kelola sistem KITMOTION</h2>
              <p className="mt-xs max-w-2xl text-xs leading-relaxed text-black/60">Buka dashboard khusus untuk mengelola latihan, badge, challenge, serta memantau aktivitas seluruh pengguna.</p>
            </div>
          </div>
          <ButtonLink href="/admin" className="shrink-0 bg-sport-black px-xl text-white hover:bg-sport-charcoal">
            Buka Admin Panel <Icon name="arrow" className="h-4 w-4" />
          </ButtonLink>
        </section>
      )}

      {!databaseReady && (
        <section className="mt-xl flex items-start gap-md rounded-sm border border-[#f0c36a] bg-[#fff7df] p-lg" role="status">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sport-black text-sport-lime"><Icon name="activity" className="h-5 w-5" /></span>
          <div>
            <h2 className="font-semibold">Database aplikasi belum terpasang</h2>
            <p className="mt-xs text-sm leading-relaxed text-charcoal">Akun sudah terautentikasi, tetapi tabel latihan dan progres belum tersedia di project Supabase. Terapkan migration di folder <code className="rounded bg-black/5 px-xs py-xxs text-xs">supabase/migrations</code> agar katalog, kamera, riwayat, XP, badge, dan challenge aktif.</p>
          </div>
        </section>
      )}

      <section className="mt-xl grid gap-lg desktop-small:grid-cols-[1.55fr_0.9fr]">
        <div className="relative min-h-[420px] overflow-hidden rounded-sm bg-sport-black text-white tablet-narrow:min-h-[470px]">
          <Image
            src="/images/kitmotion-athlete-hero.webp"
            alt="Atlet KITMOTION sedang berlatih"
            fill
            priority
            sizes="(min-width: 1024px) 64vw, 100vw"
            className="object-cover object-[68%_center] opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent" />
          <div className="relative z-10 flex h-full min-h-[420px] max-w-lg flex-col justify-between p-xl tablet-narrow:min-h-[470px] tablet-narrow:p-section">
            <p className="eyebrow text-sport-lime">Rekomendasi hari ini</p>
            <div><p className="text-sm uppercase tracking-widest text-white/55">{featured?.difficulty ?? "Pemula"} · {featured?.default_target_reps ?? 12} repetisi</p><h2 className="mt-md font-display text-6xl uppercase leading-[0.85] tablet-narrow:text-7xl">{featured?.name ?? "Full Body Starter"}</h2><p className="mt-lg max-w-md text-sm leading-relaxed text-white/65">Aktifkan seluruh tubuh, ikuti panduan pose real-time, dan mulai bangun konsistensi latihanmu.</p><ButtonLink href={featured ? `/exercises/${featured.slug}` : "/exercises"} className="mt-xl bg-sport-lime px-xxl text-sport-black hover:bg-white">Mulai latihan <Icon name="arrow" className="h-5 w-5" /></ButtonLink></div>
          </div>
        </div>

        <aside className="rounded-sm bg-sport-black p-xl text-white">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-white/45">Performa kamu</p><h2 className="mt-xs font-display text-3xl uppercase">Level {level}</h2></div><div className="grid h-16 w-16 place-items-center rounded-full border-4 border-sport-lime font-display text-2xl">{level}</div></div>
          <div className="mt-xl h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sport-lime" style={{ width: `${Math.min(100, totalXp % 100)}%` }} /></div>
          <p className="mt-sm text-xs text-white/45">{totalXp} total XP · terus bergerak untuk naik level</p>
          <div className="mt-xl grid grid-cols-2 gap-sm">
            <Stat label="Total XP" value={String(totalXp)} icon="bolt" />
            <Stat label="Sesi" value={String(sessions)} icon="activity" />
            <Stat label="Streak" value={`${streak} hari`} icon="history" />
            <Stat label="Level" value={String(level)} icon="target" />
          </div>
          <Link href="/history" className="mt-lg flex min-h-12 items-center justify-between border-t border-white/10 pt-lg text-sm font-semibold text-white/75 hover:text-sport-lime">Lihat laporan lengkap <Icon name="arrow" className="h-4 w-4" /></Link>
        </aside>
      </section>

      <section className="mt-lg grid gap-md tablet-narrow:grid-cols-2 desktop-small:grid-cols-4" aria-label="Akses cepat fitur">
        <QuickAction href="/exercises" icon="camera" eyebrow="AI camera coach" title="Latihan dengan kamera" body="Pilih gerakan, aktifkan kamera, lalu dapatkan hitungan repetisi dan feedback secara real-time." />
        <QuickAction href="/running" icon="route" eyebrow="GPS run tracker" title="Lari dan rekam rute" body="Pantau jarak, pace, durasi, serta peta rute langsung dari GPS perangkatmu." />
        <QuickAction href="/history" icon="history" eyebrow="Perkembangan" title="Buka riwayat latihan" body="Lihat skor, repetisi, durasi, feedback, dan tren dari setiap sesi yang sudah selesai." />
        <QuickAction href="/profile" icon="user" eyebrow="Akun siswa" title="Lengkapi profil" body="Atur nama, sekolah, kelas, serta identitas yang tampil pada pengalaman latihanmu." />
      </section>

      <section className="mt-section">
        <div className="flex items-end justify-between gap-md"><div><p className="text-xs font-bold uppercase tracking-widest text-mute">Quick start</p><h2 className="mt-xs font-display text-4xl uppercase">Latihan lainnya</h2></div><Link href="/exercises" className="text-sm font-semibold underline underline-offset-4">Lihat semua</Link></div>
        <div className="mt-lg grid gap-md tablet-narrow:grid-cols-3">
          {exercises.slice(0, 3).map((exercise, index) => <Link key={exercise.slug} href={`/exercises/${exercise.slug}`} className="group flex items-center gap-lg rounded-sm bg-white p-lg transition-transform hover:-translate-y-1"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-sport-lime font-display text-2xl">0{index + 1}</span><div className="min-w-0"><p className="truncate font-semibold">{exercise.name}</p><p className="mt-xs text-xs capitalize text-mute">{exercise.difficulty} · {exercise.default_target_reps ?? "—"} repetisi</p></div><Icon name="arrow" className="ml-auto h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" /></Link>)}
          {exercises.length === 0 && <div className="rounded-sm border border-dashed border-hairline p-xl text-sm text-mute">Belum ada latihan aktif. Hubungi admin untuk mengaktifkan latihan.</div>}
        </div>
      </section>

      <section className="mt-section grid gap-lg desktop-small:grid-cols-2">
        <div className="rounded-sm bg-white p-xl">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-mute">Tantangan aktif</p><h2 className="mt-xs font-display text-3xl uppercase">Target berikutnya</h2></div><span className="grid h-11 w-11 place-items-center rounded-full bg-sport-lime"><Icon name="target" className="h-5 w-5" /></span></div>
          <div className="mt-lg space-y-md">
            {gamification.challenges.map((challenge) => {
              const percent = Math.min(100, (challenge.progressValue / Math.max(1, challenge.targetValue)) * 100);
              return <article key={challenge.id} className="rounded-sm bg-soft-cloud p-lg"><div className="flex items-start justify-between gap-md"><div><h3 className="font-semibold">{challenge.title}</h3><p className="mt-xs text-xs text-mute">{challenge.description}</p></div><span className="shrink-0 text-xs font-bold text-success">+{challenge.xpReward} XP</span></div><div className="mt-md h-2 overflow-hidden rounded-full bg-hairline-soft"><div className="h-full rounded-full bg-sport-lime-deep" style={{ width: `${percent}%` }} /></div><p className="mt-sm text-[10px] text-mute">{challenge.progressValue}/{challenge.targetValue} · {challenge.completed ? "Selesai" : "Masih berjalan"}</p></article>;
            })}
            {gamification.challenges.length === 0 && <div className="rounded-sm border border-dashed border-hairline p-lg"><p className="text-sm font-semibold">Belum ada tantangan aktif</p><p className="mt-xs text-xs text-mute">Latihan tetap akan menambah XP dan streak kamu.</p></div>}
          </div>
        </div>
        <div className="rounded-sm bg-white p-xl">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-mute">Koleksi pencapaian</p><h2 className="mt-xs font-display text-3xl uppercase">Badge kamu</h2></div><span className="grid h-11 w-11 place-items-center rounded-full bg-sport-black text-sport-lime"><Icon name="bolt" className="h-5 w-5" /></span></div>
          <div className="mt-lg grid grid-cols-2 gap-sm">
            {gamification.badges.map((badge) => <article key={badge.id} className="rounded-sm border border-hairline-soft p-lg"><span className="text-2xl" aria-hidden="true">🏅</span><h3 className="mt-md text-sm font-semibold">{badge.name}</h3><p className="mt-xs line-clamp-2 text-[11px] leading-relaxed text-mute">{badge.description}</p></article>)}
            {gamification.badges.length === 0 && <div className="col-span-2 rounded-sm border border-dashed border-hairline p-lg"><p className="text-sm font-semibold">Badge pertamamu menunggu</p><p className="mt-xs text-xs text-mute">Selesaikan latihan dan raih pencapaian pertama.</p></div>}
          </div>
        </div>
      </section>
    </Container>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: "bolt" | "activity" | "history" | "target" }) {
  return <div className="rounded-sm border border-white/10 bg-white/[0.04] p-md"><Icon name={icon} className="h-4 w-4 text-sport-lime" /><p className="mt-lg text-[10px] uppercase tracking-widest text-white/40">{label}</p><p className="mt-xs font-display text-2xl">{value}</p></div>;
}

function QuickAction({ href, icon, eyebrow, title, body }: { href: string; icon: "camera" | "route" | "history" | "user"; eyebrow: string; title: string; body: string }) {
  return <Link href={href} className="group flex min-h-48 flex-col rounded-sm border border-hairline-soft bg-white p-xl transition-transform duration-200 hover:-translate-y-1"><span className="grid h-11 w-11 place-items-center rounded-full bg-sport-lime"><Icon name={icon} className="h-5 w-5" /></span><p className="mt-lg text-[10px] font-bold uppercase tracking-widest text-mute">{eyebrow}</p><h2 className="mt-xs text-lg font-semibold">{title}</h2><p className="mt-sm text-xs leading-relaxed text-mute">{body}</p><span className="mt-auto flex items-center gap-sm pt-lg text-xs font-semibold">Buka fitur <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>;
}
