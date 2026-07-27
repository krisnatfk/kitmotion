import type { FeedbackSeverity } from "../core/types";

/** Squat feedback codes + Indonesian messages (prd.md §10.1). */
export const SQUAT_FEEDBACK: Record<
  string,
  { severity: FeedbackSeverity; message: string }
> = {
  "back-bend": { severity: "warning", message: "Punggung terlalu membungkuk." },
  "shallow-depth": { severity: "warning", message: "Kedalaman belum cukup." },
  "knee-cavein": { severity: "warning", message: "Lutut terlalu masuk." },
  "tempo-fast": { severity: "info", message: "Gerakan terlalu cepat." },
  "tempo-slow": { severity: "info", message: "Gerakan terlalu lambat." },
  good: { severity: "info", message: "Posisi sudah baik." },
};
