import type { FeedbackSeverity } from "../core/types";

/** Push-up feedback codes + Indonesian messages (prd.md §10.3). */
export const PUSH_UP_FEEDBACK: Record<
  string,
  { severity: FeedbackSeverity; message: string }
> = {
  "hips-too-low": { severity: "warning", message: "Pinggul terlalu turun." },
  "hips-too-high": { severity: "warning", message: "Pinggul terlalu tinggi." },
  "elbows-not-bent": { severity: "warning", message: "Siku belum cukup menekuk." },
  unstable: { severity: "warning", message: "Tubuh belum stabil." },
  "tempo-fast": { severity: "info", message: "Gerakan terlalu cepat." },
  "tempo-slow": { severity: "info", message: "Gerakan terlalu lambat." },
  good: { severity: "info", message: "Gerakan sudah baik." },
};
