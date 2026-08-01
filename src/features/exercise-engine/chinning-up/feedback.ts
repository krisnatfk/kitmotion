import type { FeedbackMeta } from "../core/engine-utils";

export const CHINNING_UP_FEEDBACK: FeedbackMeta = {
  "chin-below-bar": { severity: "warning", message: "Pertahankan dagu tetap di atas palang agar waktu terus dihitung." },
  "elbows-too-open": { severity: "warning", message: "Tekuk siku dan tarik tubuh kembali ke posisi tahan." },
  "elbows-asymmetric": { severity: "warning", message: "Seimbangkan tekukan siku kiri dan kanan." },
  swinging: { severity: "warning", message: "Jaga badan dan tungkai tetap lurus tanpa mengayun." },
  good: { severity: "info", message: "Posisi valid. Timer chinning-up sedang berjalan." },
};
