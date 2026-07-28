import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icons";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const FEATURES: { icon: IconName; number: string; title: string; body: string }[] = [
  { icon: "camera", number: "01", title: "AI pose coach", body: "Kamera membaca titik tubuh secara real-time dan membantumu menjaga posisi selama bergerak." },
  { icon: "target", number: "02", title: "Repetisi tervalidasi", body: "Setiap repetisi dicek melalui fase gerakan, bukan hanya dihitung dari gerakan acak." },
  { icon: "bolt", number: "03", title: "Progress yang terasa", body: "Skor, XP, level, badge, dan streak mengubah rutinitas latihan menjadi progres yang terukur." },
];

const EXERCISES = [
  { slug: "squat", name: "Squat", type: "Lower body", target: "12 repetisi", tone: "from-[#d7ff4f] to-[#8db500]" },
  { slug: "jumping-jack", name: "Jumping Jack", type: "Full body", target: "20 repetisi", tone: "from-[#a6dcff] to-[#287ab1]" },
  { slug: "push-up", name: "Push-up", type: "Upper body", target: "10 repetisi", tone: "from-[#ffbb91] to-[#b95029]" },
];

export default function LandingPage() {
  return (
    <>
      <section id="top" className="relative isolate min-h-[calc(100svh-72px)] overflow-hidden bg-sport-black text-white">
        <Image
          src="/images/kitmotion-athlete-hero.webp"
          alt="Atlet melakukan latihan lompat di studio olahraga"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_center] opacity-70 mobile-landscape:object-center desktop-small:opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sport-black via-sport-black/85 to-sport-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-sport-black via-transparent to-transparent" />
        <Container className="relative z-10 flex min-h-[calc(100svh-72px)] items-end py-section tablet-narrow:items-center tablet-narrow:py-section-lg">
          <div className="animate-hero-enter max-w-3xl pb-xl tablet-narrow:pb-0">
            <p className="eyebrow text-sport-lime">AI-powered fitness coach</p>
            <h1 className="mt-lg max-w-3xl font-display text-[clamp(4.2rem,10vw,9rem)] uppercase leading-[0.82] tracking-tight">
              Gerak lebih baik.<br /><span className="text-sport-lime">Jadi lebih kuat.</span>
            </h1>
            <p className="mt-xl max-w-xl text-base leading-relaxed text-white/70 tablet-narrow:text-lg">
              Pelatih gerak berbasis kamera yang menghitung repetisi, mengoreksi teknik, dan membangun konsistensi—langsung dari browsermu.
            </p>
            <div className="mt-xl flex flex-col gap-md mobile-landscape:flex-row">
              <ButtonLink href="/register" className="bg-sport-lime px-xxl text-sport-black hover:bg-white">
                Mulai latihan gratis <Icon name="arrow" className="h-5 w-5" />
              </ButtonLink>
              <ButtonLink href="/login" variant="ghost" className="border border-white/30 px-xxl text-white hover:bg-white/10">
                <Icon name="user" className="h-5 w-5" /> Sudah punya akun
              </ButtonLink>
            </div>
            <div className="mt-xxl flex flex-wrap gap-x-xl gap-y-sm text-xs font-semibold uppercase tracking-wider text-white/55">
              <span className="flex items-center gap-xs"><Icon name="check" className="h-4 w-4 text-sport-lime" /> Tanpa alat tambahan</span>
              <span className="flex items-center gap-xs"><Icon name="shield" className="h-4 w-4 text-sport-lime" /> Kamera tetap privat</span>
            </div>
          </div>
        </Container>
        <div className="absolute bottom-0 right-0 hidden border-l border-t border-white/10 bg-sport-black/75 px-xl py-lg backdrop-blur-md tablet-narrow:block">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Live movement</p>
          <p className="mt-xs font-display text-3xl text-sport-lime">READY TO MOVE</p>
        </div>
      </section>

      <section id="fitur" className="bg-sport-black py-section-lg text-white">
        <ScrollReveal>
        <Container>
          <div className="grid gap-xl desktop-small:grid-cols-[0.8fr_1.2fr] desktop-small:items-end">
            <div>
              <p className="eyebrow text-sport-lime">Teknologi yang mengikuti gerakmu</p>
              <h2 className="mt-lg max-w-xl font-display text-5xl uppercase leading-[0.9] tablet-narrow:text-7xl">Bukan hanya menghitung. <span className="text-white/40">Kami membaca gerakan.</span></h2>
            </div>
            <p className="max-w-xl text-white/60 desktop-small:justify-self-end">KITMOTION memadukan computer vision dan mesin latihan berbasis fase untuk memberi feedback yang mudah dipahami, tepat saat kamu membutuhkannya.</p>
          </div>
          <div className="mt-section grid gap-md desktop-small:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="group relative overflow-hidden rounded-sm border border-white/10 bg-white/[0.04] p-xl transition-colors hover:bg-white/[0.08]">
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-sport-lime text-sport-black"><Icon name={feature.icon} className="h-6 w-6" /></span>
                  <span className="font-display text-2xl text-white/20">{feature.number}</span>
                </div>
                <h3 className="mt-section font-display text-3xl uppercase">{feature.title}</h3>
                <p className="mt-md text-sm leading-relaxed text-white/55">{feature.body}</p>
              </article>
            ))}
          </div>
        </Container>
        </ScrollReveal>
      </section>

      <section id="latihan" className="py-section-lg">
        <ScrollReveal>
        <Container>
          <div className="flex flex-col gap-lg tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between">
            <div>
              <p className="eyebrow text-ash">Program latihan</p>
              <h2 className="mt-md font-display text-5xl uppercase leading-none tablet-narrow:text-7xl">Mulai dari gerakan dasar</h2>
            </div>
            <ButtonLink href="/register" variant="secondary">Buka semua latihan <Icon name="arrow" className="h-4 w-4" /></ButtonLink>
          </div>
          <div className="mt-section grid gap-lg tablet-narrow:grid-cols-3">
            {EXERCISES.map((exercise, index) => (
              <Link key={exercise.slug} href="/register" className="group overflow-hidden rounded-sm bg-soft-cloud">
                <div className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${exercise.tone}`}>
                  <div className="absolute -bottom-12 -right-8 h-56 w-56 rounded-full border-[28px] border-black/10 transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute left-xl top-xl font-display text-7xl text-black/15">0{index + 1}</div>
                  <div className="absolute inset-x-xl bottom-xl flex items-end justify-between">
                    <Icon name={index === 1 ? "bolt" : "activity"} className="h-20 w-20 text-black/75" />
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-sport-black text-white transition-transform group-hover:-rotate-45"><Icon name="arrow" className="h-5 w-5" /></span>
                  </div>
                </div>
                <div className="p-xl">
                  <p className="text-xs font-semibold uppercase tracking-widest text-mute">{exercise.type}</p>
                  <div className="mt-sm flex items-center justify-between gap-md"><h3 className="font-display text-3xl uppercase">{exercise.name}</h3><span className="text-sm text-mute">{exercise.target}</span></div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
        </ScrollReveal>
      </section>

      <section id="cara-kerja" className="bg-[#eef2e8] py-section-lg">
        <ScrollReveal>
        <Container className="grid gap-section desktop-small:grid-cols-2 desktop-small:items-center">
          <div className="relative overflow-hidden rounded-sm bg-sport-black p-lg text-white tablet-narrow:p-xl">
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
              <Image
                src="/images/kitmotion-female-athlete-v2.webp"
                alt="Atlet perempuan berlatih dengan panduan KITMOTION"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="pointer-events-none object-cover object-[62%_center]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute left-lg top-lg flex items-center gap-sm rounded-full bg-sport-black/80 px-md py-sm text-xs font-semibold backdrop-blur"><span className="h-2 w-2 animate-pulse rounded-full bg-sport-lime" /> POSE TERDETEKSI</div>
              <div className="absolute inset-x-lg bottom-lg grid grid-cols-3 gap-sm">
                {[['REP', '08'], ['FORM', '92'], ['TEMPO', 'GOOD']].map(([label, value]) => <div key={label} className="rounded-sm bg-black/70 p-md backdrop-blur"><p className="text-[10px] tracking-widest text-white/50">{label}</p><p className="mt-xs font-display text-2xl text-sport-lime">{value}</p></div>)}
              </div>
            </div>
          </div>
          <div>
            <p className="eyebrow text-ash">Tiga langkah sederhana</p>
            <h2 className="mt-md font-display text-5xl uppercase leading-none tablet-narrow:text-7xl">Siap bergerak dalam hitungan detik</h2>
            <ol className="mt-xl divide-y divide-black/10 border-y border-black/10">
              {[
                ["01", "Pilih latihan", "Pilih squat, jumping jack, atau push-up sesuai targetmu."],
                ["02", "Aktifkan kamera", "Posisikan seluruh tubuh di dalam frame. Video diproses di perangkatmu."],
                ["03", "Ikuti feedback", "Bergerak, perbaiki teknik, lalu lihat skor dan perkembanganmu."],
              ].map(([number, title, body]) => <li key={number} className="grid grid-cols-[auto_1fr] gap-lg py-lg"><span className="font-display text-2xl text-mute">{number}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-xs text-sm leading-relaxed text-mute">{body}</p></div></li>)}
            </ol>
            <ButtonLink href="/register" className="mt-xl bg-sport-black px-xxl text-white">Coba sekarang <Icon name="arrow" className="h-5 w-5" /></ButtonLink>
          </div>
        </Container>
        </ScrollReveal>
      </section>

      <section className="bg-sport-lime py-section-lg">
        <ScrollReveal>
        <Container className="flex flex-col gap-xl desktop-small:flex-row desktop-small:items-center desktop-small:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em]">Giliranmu untuk bergerak</p><h2 className="mt-sm max-w-4xl font-display text-5xl uppercase leading-[0.9] tablet-narrow:text-7xl">Latihan lebih cerdas. Mulai hari ini.</h2></div>
          <ButtonLink href="/register" className="shrink-0 bg-sport-black px-xxl text-white">Buat akun gratis <Icon name="arrow" className="h-5 w-5" /></ButtonLink>
        </Container>
        </ScrollReveal>
      </section>
    </>
  );
}
