import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icons";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const FEATURES: { icon: IconName; number: string; title: string; body: string }[] = [
  { icon: "camera", number: "01", title: "AI pose coach", body: "Kamera membaca titik tubuh secara real-time dan membantumu menjaga posisi selama bergerak." },
  { icon: "target", number: "02", title: "Gerakan tervalidasi", body: "Setiap repetisi atau durasi tahan dicek melalui fase dan syarat teknik, bukan hanya gerakan acak." },
  { icon: "bolt", number: "03", title: "Progress yang terasa", body: "Skor, XP, level, badge, dan streak mengubah rutinitas latihan menjadi progres yang terukur." },
  { icon: "route", number: "04", title: "Lari GPS", body: "Rekam jarak, pace, durasi aktif, dan garis rute pada peta langsung dari GPS perangkatmu." },
];

const EXERCISES = [
  { slug: "squat", name: "Squat", type: "Lower body", target: "12 repetisi", tone: "from-[#d7ff4f] to-[#8db500]" },
  { slug: "jumping-jack", name: "Jumping Jack", type: "Full body", target: "20 repetisi", tone: "from-[#a6dcff] to-[#287ab1]" },
  { slug: "push-up", name: "Push-up", type: "Upper body", target: "10 repetisi", tone: "from-[#ffbb91] to-[#b95029]" },
  { slug: "sit-up", name: "Sit-up", type: "Core", target: "15 repetisi", tone: "from-[#ffd889] to-[#bc7429]" },
  { slug: "pull-up", name: "Pull-up", type: "Upper body", target: "6 repetisi", tone: "from-[#c5b8ff] to-[#6651ad]" },
  { slug: "chinning-up", name: "Chinning-up", type: "Static hold", target: "30 detik", tone: "from-[#a8efcf] to-[#277a59]" },
];

const RUNNING_BENEFITS: { icon: IconName; title: string; body: string }[] = [
  { icon: "location", title: "Fokus lokasi otomatis", body: "Peta langsung mengikuti titik GPS saat aktivitas dimulai." },
  { icon: "activity", title: "Pace dan durasi aktif", body: "Waktu jeda tidak ikut dihitung ke performa lari." },
  { icon: "route", title: "Garis rute yang jelas", body: "Start, finish, dan setiap segmen perjalanan tersimpan." },
  { icon: "shield", title: "Rute tetap privat", body: "Aktivitas hanya dapat dibuka oleh pemilik akun." },
];

const STADIUM_LAP_PATH = "M252 158 H548 C620 158 656 218 656 300 C656 382 620 442 548 442 H252 C180 442 144 382 144 300 C144 218 180 158 252 158 Z";

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
              Pelatih gerak dan aktivitas GPS yang mengoreksi teknik, menghitung repetisi, serta merekam lari—langsung dari browsermu.
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
              <span className="flex items-center gap-xs"><Icon name="route" className="h-4 w-4 text-sport-lime" /> GPS route tracker</span>
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
          <div className="mt-section grid gap-md tablet-narrow:grid-cols-2 desktop-small:grid-cols-4">
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

      <section id="lari-gps" className="scroll-mt-[72px] bg-[#eef2e8] py-section-lg">
        <ScrollReveal>
          <Container className="grid gap-section desktop-small:grid-cols-[0.82fr_1.18fr] desktop-small:items-center">
            <div>
              <p className="eyebrow text-sport-lime-deep">KITRUN GPS tracker</p>
              <h2 className="mt-lg max-w-2xl font-display text-5xl uppercase leading-[0.9] tablet-narrow:text-7xl">
                Lari di luar. <span className="text-black/35">Progres tetap terukur.</span>
              </h2>
              <p className="mt-xl max-w-xl text-sm leading-relaxed text-mute tablet-narrow:text-base">
                Pengalaman lari bergaya aplikasi profesional yang terhubung langsung dengan akun KITMOTION. Mulai GPS, lihat rute bergerak, lalu simpan seluruh statistik dalam satu riwayat.
              </p>
              <ul className="mt-xl grid gap-md text-sm mobile-landscape:grid-cols-2">
                {RUNNING_BENEFITS.map((benefit) => (
                  <li key={benefit.title} className="flex gap-md rounded-sm bg-white p-lg">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sport-lime"><Icon name={benefit.icon} className="h-4 w-4" /></span>
                    <div><h3 className="text-sm font-semibold">{benefit.title}</h3><p className="mt-xs text-xs leading-relaxed text-mute">{benefit.body}</p></div>
                  </li>
                ))}
              </ul>
              <ButtonLink href="/register" className="mt-xl bg-sport-black px-xxl text-white hover:bg-sport-charcoal">
                Mulai rekam lari <Icon name="arrow" className="h-5 w-5" />
              </ButtonLink>
            </div>

            <RunningRoutePreview />
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
          <div className="mt-section grid gap-lg tablet-narrow:grid-cols-2 desktop-small:grid-cols-3">
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
                ["01", "Pilih latihan", "Pilih dari squat, jumping jack, push-up, sit-up, pull-up, atau chinning-up."],
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
          <div><p className="text-xs font-bold uppercase tracking-[0.2em]">Giliranmu untuk bergerak</p><h2 className="mt-sm max-w-4xl font-display text-5xl uppercase leading-[0.9] tablet-narrow:text-7xl">Latihan lebih cerdas. Lari lebih terukur.</h2></div>
          <ButtonLink href="/register" className="shrink-0 bg-sport-black px-xxl text-white">Buat akun gratis <Icon name="arrow" className="h-5 w-5" /></ButtonLink>
        </Container>
        </ScrollReveal>
      </section>
    </>
  );
}

function RunningRoutePreview() {
  return (
    <div className="landing-running-preview relative overflow-hidden rounded-sm border border-black/[0.08] bg-white p-md tablet-narrow:p-lg">
      <div className="relative">
        <div className="landing-map-canvas relative aspect-[4/3] overflow-hidden rounded-sm border border-black/[0.06] bg-[#dfe8da]">
        <svg
          viewBox="0 0 800 600"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Ilustrasi peta lapangan atletik dengan pelari yang bergerak mengikuti rute lintasan"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect width="800" height="600" fill="#dfe8da" />
          <g fill="none" stroke="#f8faf7" strokeLinecap="round">
            <path d="M-30 74 C160 110 232 54 402 86 S630 130 840 74" strokeWidth="34" />
            <path d="M-20 520 C138 470 224 536 384 512 S628 454 840 500" strokeWidth="30" />
            <path d="M72 -40 C52 116 88 210 60 350 S30 510 52 650" strokeWidth="24" />
            <path d="M744 -40 C716 110 750 244 726 350 S690 520 730 650" strokeWidth="26" />
          </g>
          <g fill="#cbd5c7">
            <rect x="98" y="20" width="118" height="64" rx="8" /><rect x="244" y="14" width="82" height="68" rx="8" /><rect x="606" y="18" width="104" height="70" rx="8" />
            <rect x="84" y="506" width="136" height="70" rx="8" /><rect x="590" y="504" width="126" height="72" rx="8" /><rect x="18" y="136" width="62" height="112" rx="8" /><rect x="724" y="132" width="66" height="118" rx="8" />
          </g>
          <g opacity="0.55" fill="#657365" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700">
            <text x="105" y="112">JL. OLAHRAGA</text><text x="612" y="112">SPORT CENTER</text><text x="100" y="494">AREA PARKIR</text>
          </g>

          <g className="landing-stadium" transform="translate(0 -58)">
            <rect x="108" y="122" width="584" height="356" rx="164" fill="#b45e42" stroke="#ffffff" strokeWidth="5" />
            <rect x="135" y="149" width="530" height="302" rx="140" fill="none" stroke="#f7d7c9" strokeWidth="2" />
            <rect x="153" y="167" width="494" height="266" rx="122" fill="none" stroke="#f7d7c9" strokeWidth="2" />
            <rect x="171" y="185" width="458" height="230" rx="105" fill="#70a75b" stroke="#f7d7c9" strokeWidth="2" />
            <g fill="none" stroke="#e8f1e3" strokeWidth="2" opacity="0.85">
              <rect x="260" y="199" width="280" height="202" /><line x1="400" y1="199" x2="400" y2="401" /><circle cx="400" cy="300" r="28" />
              <rect x="260" y="251" width="36" height="98" /><rect x="504" y="251" width="36" height="98" />
            </g>
            <g fill="#879a82">
              <rect x="292" y="104" width="216" height="10" rx="5" /><rect x="292" y="486" width="216" height="10" rx="5" />
            </g>

            <path d={STADIUM_LAP_PATH} fill="none" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" opacity="0.94" />
            <path className="landing-track-route landing-track-route-animated" d={STADIUM_LAP_PATH} pathLength={1} fill="none" stroke="#baff20" strokeWidth="8" strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1}>
              <animate id="landingRouteProgress" attributeName="stroke-dashoffset" from="1" to="0" begin="0s" dur="7s" repeatCount="indefinite" calcMode="linear" />
            </path>
            <path className="landing-track-route landing-track-route-static" d={STADIUM_LAP_PATH} fill="none" stroke="#baff20" strokeWidth="8" strokeLinecap="round" />
            <line x1="252" y1="145" x2="252" y2="174" stroke="#111310" strokeWidth="5" />
            <circle cx="252" cy="158" r="11" fill="#111310" stroke="#ffffff" strokeWidth="5" />
            <circle className="landing-runner-marker landing-runner-animated" r="13" fill="#c8ff2e" stroke="#111310" strokeWidth="5">
              <animateMotion begin="0s" dur="7s" repeatCount="indefinite" calcMode="paced" path={STADIUM_LAP_PATH} />
            </circle>
            <circle className="landing-runner-marker landing-runner-static" cx="548" cy="158" r="13" fill="#c8ff2e" stroke="#111310" strokeWidth="5" />
          </g>
        </svg>

        <div className="absolute inset-x-md top-md flex items-start justify-between gap-sm tablet-narrow:inset-x-lg tablet-narrow:top-lg">
          <span className="inline-flex items-center gap-sm rounded-full bg-white/95 px-md py-sm text-[10px] font-bold uppercase tracking-widest"><Icon name="route" className="h-4 w-4 text-sport-lime-deep" /> Live lap</span>
          <span className="rounded-full bg-sport-black px-md py-sm text-[10px] font-bold text-white">GPS ±6 m</span>
        </div>

        </div>

        <div className="landing-activity-panel relative mt-sm overflow-hidden rounded-sm border border-black/[0.08] bg-white text-sport-black shadow-[0_14px_34px_rgba(17,19,16,0.12)] mobile-landscape:absolute mobile-landscape:inset-x-lg mobile-landscape:bottom-lg mobile-landscape:mt-0 mobile-landscape:bg-white/95 mobile-landscape:backdrop-blur">
          <div className="flex items-center justify-between border-b border-black/[0.08] px-lg py-md">
            <div><p className="text-[9px] font-bold uppercase tracking-widest text-mute">Aktivitas berlangsung</p><p className="mt-xs text-sm font-semibold">8 putaran · Stadion KITMOTION</p></div>
            <span className="flex items-center gap-sm text-[10px] font-bold text-[#5f8200]"><span className="h-2 w-2 animate-pulse rounded-full bg-sport-lime-deep" /> MEREKAM</span>
          </div>
          <div className="grid grid-cols-3 gap-px bg-black/[0.08]">
            <PreviewStat label="Jarak" value="3.20" unit="km" />
            <PreviewStat label="Pace" value="5:16" unit="/km" />
            <PreviewStat label="Durasi" value="16:51" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0 bg-[#f5f7f2] px-md py-md">
      <p className="text-[8px] font-bold uppercase tracking-widest text-mute">{label}</p>
      <p className="mt-xs truncate font-display text-2xl text-sport-black tablet-narrow:text-3xl">{value}<span className="ml-xs font-sans text-[8px] text-mute">{unit}</span></p>
    </div>
  );
}
