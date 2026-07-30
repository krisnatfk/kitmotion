export type ExerciseTutorial = {
  startPosition: string;
  steps: string[];
  mistakes: string[];
  safety: string[];
  animationUrl: string | null;
};

const TUTORIALS: Record<string, ExerciseTutorial> = {
  squat: {
    animationUrl: "/tutorials/squat-3d.mp4",
    startPosition: "Berdiri tegak, kaki selebar bahu, ujung kaki sedikit mengarah keluar, dan pandangan lurus ke depan.",
    steps: [
      "Dorong pinggul ke belakang seperti hendak duduk.",
      "Tekuk lutut sambil menjaga dada terangkat dan punggung netral.",
      "Turun hingga paha mendekati sejajar lantai sesuai kemampuan.",
      "Tekan telapak kaki lalu kembali berdiri penuh dengan kontrol.",
    ],
    mistakes: [
      "Lutut masuk ke arah dalam.",
      "Tumit terangkat dari lantai.",
      "Punggung membulat atau badan jatuh terlalu jauh ke depan.",
    ],
    safety: [
      "Gunakan area datar dan tidak licin.",
      "Kurangi kedalaman bila lutut atau pinggang terasa nyeri.",
    ],
  },
  "jumping-jack": {
    animationUrl: "/tutorials/jumping-jack-3d.mp4",
    startPosition: "Berdiri tegak dengan kaki rapat, tangan di samping tubuh, dan lutut rileks.",
    steps: [
      "Lompat ringan sambil membuka kaki sedikit lebih lebar dari bahu.",
      "Angkat kedua tangan bersamaan hingga berada di atas kepala.",
      "Mendarat dengan lutut sedikit menekuk dan gerakan kiri-kanan seimbang.",
      "Lompat kembali ke posisi kaki rapat dan tangan di samping tubuh.",
    ],
    mistakes: [
      "Tangan melebar tetapi tidak cukup tinggi.",
      "Bukaan kaki terlalu sempit.",
      "Tangan dan kaki membuka atau menutup pada waktu yang berbeda.",
    ],
    safety: [
      "Gunakan sepatu yang stabil dan area bebas benda.",
      "Mendaratlah dengan lembut; hentikan latihan jika pergelangan atau lutut terasa nyeri.",
    ],
  },
  "push-up": {
    animationUrl: "/tutorials/push-up-3d.mp4",
    startPosition: "Mulai dari plank tinggi: tangan sedikit lebih lebar dari bahu dan tubuh lurus dari kepala sampai tumit.",
    steps: [
      "Kencangkan perut dan bokong agar pinggul tidak turun atau terangkat.",
      "Tekuk kedua siku bersamaan dan turunkan dada dengan kontrol.",
      "Turun hingga siku mendekati sudut 90 derajat.",
      "Dorong lantai hingga siku kembali lurus tanpa mengunci sendi berlebihan.",
    ],
    mistakes: [
      "Siku belum cukup menekuk atau kiri-kanan tidak seimbang.",
      "Pinggul turun, terlalu tinggi, atau garis tubuh bergoyang.",
      "Hanya menggerakkan bahu sedikit lalu kembali ke atas.",
    ],
    safety: [
      "Gunakan alas yang tidak licin dan beri ruang di depan kepala.",
      "Gunakan variasi lutut bila teknik plank penuh belum stabil.",
    ],
  },
};

const FALLBACK: ExerciseTutorial = {
  animationUrl: null,
  startPosition: "Ikuti posisi awal yang terlihat pada contoh gerakan.",
  steps: ["Lakukan gerakan perlahan.", "Ikuti feedback kamera.", "Selesaikan target dengan teknik yang stabil."],
  mistakes: ["Tubuh keluar dari frame.", "Gerakan terlalu cepat atau tidak mencapai rentang penuh."],
  safety: ["Pastikan area latihan aman dan hentikan bila terasa nyeri."],
};

export function getExerciseTutorial(slug: string): ExerciseTutorial {
  return TUTORIALS[slug] ?? FALLBACK;
}
