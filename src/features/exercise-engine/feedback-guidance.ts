export interface FeedbackGuidance {
  title: string;
  bodyPart: string;
  problem: string;
  correction: string;
}

const GUIDANCE: Record<string, FeedbackGuidance> = {
  "back-bend": {
    title: "Jaga punggung netral",
    bodyPart: "Punggung dan dada",
    problem: "Badan terlalu condong atau punggung membulat saat turun.",
    correction: "Angkat dada, arahkan pandangan ke depan, dan kencangkan otot perut.",
  },
  "shallow-depth": {
    title: "Tambah kedalaman squat",
    bodyPart: "Pinggul dan lutut",
    problem: "Pinggul belum turun sampai rentang gerak yang dinilai cukup.",
    correction: "Dorong pinggul ke belakang lalu turunkan paha mendekati sejajar lantai.",
  },
  "knee-cavein": {
    title: "Stabilkan arah lutut",
    bodyPart: "Lutut",
    problem: "Lutut bergerak masuk ke arah tengah tubuh.",
    correction: "Dorong lutut keluar mengikuti arah ujung kaki dan jaga telapak tetap menapak.",
  },
  "arms-too-low": {
    title: "Angkat tangan lebih tinggi",
    bodyPart: "Bahu dan tangan",
    problem: "Tangan belum mencapai posisi terbuka penuh di atas kepala.",
    correction: "Angkat kedua tangan bersamaan hingga mendekati bertemu di atas kepala.",
  },
  "legs-too-narrow": {
    title: "Lebarkan bukaan kaki",
    bodyPart: "Pinggul dan kaki",
    problem: "Jarak kedua kaki belum cukup lebar pada fase terbuka.",
    correction: "Mendaratlah sedikit lebih lebar dari bahu dengan lutut tetap lentur.",
  },
  asymmetry: {
    title: "Samakan sisi kiri dan kanan",
    bodyPart: "Seluruh tubuh",
    problem: "Tangan atau kaki kiri dan kanan bergerak pada waktu yang berbeda.",
    correction: "Kurangi kecepatan lalu buka dan tutup kedua sisi secara bersamaan.",
  },
  "hips-too-low": {
    title: "Angkat posisi pinggul",
    bodyPart: "Pinggul dan inti tubuh",
    problem: "Pinggul turun sehingga garis tubuh melengkung ke bawah.",
    correction: "Kencangkan perut dan angkat pinggul sampai bahu, pinggul, dan lutut segaris.",
  },
  "hips-too-high": {
    title: "Turunkan posisi pinggul",
    bodyPart: "Pinggul dan inti tubuh",
    problem: "Pinggul berada terlalu tinggi dari garis bahu ke lutut.",
    correction: "Turunkan pinggul perlahan sambil mempertahankan perut tetap aktif.",
  },
  "elbows-not-bent": {
    title: "Tekuk siku lebih dalam",
    bodyPart: "Siku dan dada",
    problem: "Dada belum turun cukup dekat ke lantai.",
    correction: "Tekuk siku dengan kontrol sampai mendekati 90 derajat lalu dorong kembali.",
  },
  unstable: {
    title: "Stabilkan tubuh",
    bodyPart: "Inti tubuh",
    problem: "Garis tubuh berubah atau bergoyang selama repetisi.",
    correction: "Lebarkan tumpuan bila perlu, kencangkan perut, dan bergerak lebih perlahan.",
  },
  "tempo-fast": {
    title: "Kurangi kecepatan",
    bodyPart: "Tempo gerakan",
    problem: "Repetisi selesai terlalu cepat untuk dinilai terkontrol.",
    correction: "Gunakan hitungan teratur dan kendalikan fase turun maupun kembali.",
  },
  "tempo-slow": {
    title: "Jaga ritme bergerak",
    bodyPart: "Tempo gerakan",
    problem: "Ada jeda terlalu lama di tengah repetisi.",
    correction: "Pertahankan aliran gerakan yang stabil tanpa berhenti terlalu lama.",
  },
  "tempo-unstable": {
    title: "Samakan tempo",
    bodyPart: "Tempo gerakan",
    problem: "Kecepatan berubah cukup besar antar fase atau repetisi.",
    correction: "Gunakan ritme yang sama dari awal sampai akhir setiap repetisi.",
  },
};

export function getFeedbackGuidance(code: string): FeedbackGuidance {
  return GUIDANCE[code] ?? {
    title: "Perbaiki teknik gerakan",
    bodyPart: "Posisi tubuh",
    problem: code.replaceAll("-", " "),
    correction: "Ulangi dengan lebih perlahan sambil mengikuti contoh teknik di halaman latihan.",
  };
}
