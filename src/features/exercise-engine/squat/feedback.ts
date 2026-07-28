import type { FeedbackSeverity } from "../core/types";

/** Squat feedback codes + Indonesian messages (prd.md §10.1). */
export const SQUAT_FEEDBACK: Record<
  string,
  { severity: FeedbackSeverity; message: string }
> = {
  "back-bend": { severity: "warning", message: "Punggung membungkuk. Angkat dada, lihat ke depan, dan jaga punggung tetap netral." },
  "shallow-depth": { severity: "warning", message: "Squat belum cukup dalam. Dorong pinggul ke belakang dan turunkan paha mendekati sejajar lantai." },
  "knee-cavein": { severity: "warning", message: "Lutut masuk ke dalam. Dorong lutut mengikuti arah ujung kaki." },
  "tempo-fast": { severity: "info", message: "Gerakan terlalu cepat. Turun dan berdiri kembali dengan kontrol." },
  "tempo-slow": { severity: "info", message: "Gerakan terlalu lambat. Jaga ritme tetap stabil tanpa berhenti terlalu lama." },
  good: { severity: "info", message: "Posisi squat sudah baik. Pertahankan dada tegak dan lutut stabil." },
};
