export type ExerciseTutorial = {
  startPosition: string;
  steps: string[];
  mistakes: string[];
  safety: string[];
  animationUrl: string | null;
  assessment: {
    title: string;
    unit: "repetisi" | "detik valid";
    rules: string[];
  };
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
    assessment: {
      title: "Repetisi squat valid",
      unit: "repetisi",
      rules: ["Turun sampai kedalaman yang ditentukan.", "Dada dan punggung tetap terkendali.", "Kembali berdiri penuh sebelum hitungan berikutnya."],
    },
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
    assessment: {
      title: "Repetisi jumping jack valid",
      unit: "repetisi",
      rules: ["Tangan naik melewati kepala dan kaki terbuka cukup lebar.", "Gerakan kiri dan kanan tetap simetris.", "Tangan dan kaki kembali menutup bersamaan."],
    },
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
    assessment: {
      title: "Repetisi push-up valid",
      unit: "repetisi",
      rules: ["Mulai dan selesai dengan kedua siku lurus.", "Turun sampai kedua siku mendekati 90 derajat.", "Badan tetap lurus tanpa pinggul turun atau terangkat."],
    },
  },
  "sit-up": {
    animationUrl: null,
    startPosition: "Berbaring telentang menghadap samping kamera, lutut ditekuk sekitar 90 derajat, kaki menapak, dan punggung lurus di matras.",
    steps: [
      "Tahan kaki tetap menapak dan letakkan tangan di samping telinga.",
      "Angkat badan dengan punggung tetap lurus.",
      "Dekatkan dada sampai menyentuh atau melewati garis lutut.",
      "Turunkan punggung sampai lurus kembali sebelum repetisi berikutnya.",
    ],
    mistakes: ["Dada berhenti sebelum mencapai lutut.", "Punggung membulat atau leher ditarik dengan tangan.", "Lutut berubah jauh dari sudut 90 derajat."],
    safety: ["Gunakan matras dan minta bantuan untuk menahan kaki bila perlu.", "Hentikan latihan bila leher atau pinggang terasa nyeri."],
    assessment: {
      title: "Repetisi sit-up valid",
      unit: "repetisi",
      rules: ["Punggung terbaca lurus selama gerakan.", "Hitungan bertambah saat dada mencapai garis lutut.", "Punggung harus kembali lurus sebelum repetisi berikutnya."],
    },
  },
  "pull-up": {
    animationUrl: null,
    startPosition: "Menggantung menghadap kamera, kedua tangan selebar bahu, siku lurus, serta badan dan tungkai membentuk satu garis.",
    steps: [
      "Mulai dari gantung penuh dengan kedua siku lurus.",
      "Tarik tubuh tanpa mengayun atau menolak dengan kaki.",
      "Naik sampai dagu menyentuh atau melewati palang.",
      "Turun kembali sampai kedua siku lurus sebelum tarikan berikutnya.",
    ],
    mistakes: ["Dagu belum mencapai palang.", "Lengan tidak lurus saat kembali ke bawah.", "Badan mengayun atau tarikan kiri-kanan tidak seimbang."],
    safety: ["Gunakan palang yang kokoh dan area pendaratan yang aman.", "Gunakan pendamping bila belum mampu menggantung dengan stabil."],
    assessment: {
      title: "Repetisi pull-up valid",
      unit: "repetisi",
      rules: ["Berawal dari kedua lengan lurus.", "Hitungan bertambah saat dagu menyentuh atau melewati garis palang.", "Badan tidak mengayun dan lengan kembali lurus sebelum hitungan berikutnya."],
    },
  },
  "chinning-up": {
    animationUrl: null,
    startPosition: "Gunakan pegangan telapak menghadap ke arah kepala, siku ditekuk, dagu berada di atas palang, dan badan lurus menghadap kamera.",
    steps: [
      "Ambil posisi siku tekuk dengan bantuan pijakan atau pendamping.",
      "Letakkan dagu di atas palang tanpa menumpukannya pada palang.",
      "Tahan badan dan tungkai tetap lurus tanpa mengayun.",
      "Timer hanya berjalan selama seluruh syarat posisi tetap terpenuhi.",
    ],
    mistakes: ["Dagu turun di bawah palang.", "Siku terbuka terlalu jauh.", "Badan mengayun atau posisi lengan tidak seimbang."],
    safety: ["Gunakan palang kokoh dan pendamping saat naik atau turun.", "Hentikan bila pegangan melemah; jangan memaksakan posisi."],
    assessment: {
      title: "Durasi chinning-up valid",
      unit: "detik valid",
      rules: ["Dagu tetap berada di atas palang.", "Kedua siku tetap ditekuk dan seimbang.", "Hanya waktu dengan badan lurus tanpa ayunan yang dihitung."],
    },
  },
};

const FALLBACK: ExerciseTutorial = {
  animationUrl: null,
  startPosition: "Ikuti posisi awal yang terlihat pada contoh gerakan.",
  steps: ["Lakukan gerakan perlahan.", "Ikuti feedback kamera.", "Selesaikan target dengan teknik yang stabil."],
  mistakes: ["Tubuh keluar dari frame.", "Gerakan terlalu cepat atau tidak mencapai rentang penuh."],
  safety: ["Pastikan area latihan aman dan hentikan bila terasa nyeri."],
  assessment: {
    title: "Penilaian gerakan",
    unit: "repetisi",
    rules: ["Selesaikan rentang gerak penuh.", "Pertahankan teknik sesuai feedback kamera."],
  },
};

export function getExerciseTutorial(slug: string): ExerciseTutorial {
  return TUTORIALS[slug] ?? FALLBACK;
}
