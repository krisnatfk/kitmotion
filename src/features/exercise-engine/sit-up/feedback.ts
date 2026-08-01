import type { FeedbackMeta } from "../core/engine-utils";

export const SIT_UP_FEEDBACK: FeedbackMeta = {
  "chest-not-close": { severity: "warning", message: "Dekatkan dada sampai menyentuh atau melewati garis lutut." },
  "back-not-straight": { severity: "warning", message: "Jaga punggung tetap lurus dan kepala segaris dengan badan." },
  "knees-wrong-angle": { severity: "warning", message: "Tekuk lutut mendekati 90 derajat dan pertahankan telapak kaki di lantai." },
  "return-incomplete": { severity: "warning", message: "Turunkan punggung hingga lurus kembali sebelum repetisi berikutnya." },
  "tempo-fast": { severity: "warning", message: "Gerakan terlalu cepat. Naik dan turun dengan kontrol." },
  good: { severity: "info", message: "Sit-up valid. Punggung lurus dan dada sudah mencapai lutut." },
};
