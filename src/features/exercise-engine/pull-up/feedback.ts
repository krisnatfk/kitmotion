import type { FeedbackMeta } from "../core/engine-utils";

export const PULL_UP_FEEDBACK: FeedbackMeta = {
  "chin-below-bar": { severity: "warning", message: "Tarik lebih tinggi sampai dagu menyentuh atau melewati palang." },
  "arms-not-straight": { severity: "warning", message: "Luruskan kedua lengan saat kembali ke posisi gantung." },
  "elbows-asymmetric": { severity: "warning", message: "Tarik kedua siku secara seimbang." },
  swinging: { severity: "warning", message: "Hentikan ayunan. Pertahankan kepala sampai kaki dalam satu garis." },
  "tempo-fast": { severity: "warning", message: "Gerakan terlalu cepat. Hindari hentakan atau tolakan kaki." },
  good: { severity: "info", message: "Pull-up valid. Dagu sudah melewati palang." },
};
