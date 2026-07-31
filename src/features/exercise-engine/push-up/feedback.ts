import type { FeedbackSeverity } from "../core/types";

/** Push-up feedback codes + Indonesian messages (prd.md §10.3). */
export const PUSH_UP_FEEDBACK: Record<
  string,
  { severity: FeedbackSeverity; message: string }
> = {
  "plank-required": { severity: "warning", message: "Ambil posisi plank atas dan luruskan kedua siku sebelum memulai push-up." },
  "body-not-horizontal": { severity: "critical", message: "Tubuh belum sejajar lantai. Luruskan badan dari bahu sampai kaki." },
  "knees-bent": { severity: "warning", message: "Lutut masih menekuk atau menyentuh lantai. Luruskan kaki dan bertumpu pada ujung kaki." },
  "hips-too-low": { severity: "warning", message: "Pinggul turun. Kencangkan perut dan angkat pinggul hingga bahu, pinggul, dan lutut segaris." },
  "hips-too-high": { severity: "warning", message: "Pinggul terlalu tinggi. Turunkan pinggul hingga tubuh membentuk garis lurus." },
  "elbows-not-bent": { severity: "warning", message: "Siku belum cukup menekuk. Turunkan dada dengan kontrol hingga siku mendekati 90 derajat." },
  "elbows-asymmetric": { severity: "warning", message: "Tekukan siku belum seimbang. Turunkan tubuh dengan kedua siku bergerak bersamaan." },
  unstable: { severity: "warning", message: "Tubuh bergoyang. Lebarkan tumpuan tangan sedikit dan kencangkan otot inti." },
  "tempo-fast": { severity: "info", message: "Push-up terlalu cepat. Turunkan dan dorong tubuh kembali dengan kontrol." },
  "tempo-slow": { severity: "info", message: "Push-up terlalu lambat. Pertahankan ritme tanpa berhenti di posisi bawah." },
  good: { severity: "info", message: "Garis tubuh dan posisi siku sudah baik. Pertahankan tekniknya." },
};
