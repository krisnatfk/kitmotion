import type { FeedbackSeverity } from "../core/types";

/** Jumping jack feedback codes + Indonesian messages (prd.md §10.2). */
export const JUMPING_JACK_FEEDBACK: Record<
  string,
  { severity: FeedbackSeverity; message: string }
> = {
  "arms-too-low": { severity: "warning", message: "Tangan belum cukup tinggi." },
  "legs-too-narrow": { severity: "warning", message: "Kaki belum cukup terbuka." },
  asymmetry: { severity: "warning", message: "Gerakan belum simetris." },
  "tempo-unstable": { severity: "info", message: "Tempo belum stabil." },
  "tempo-fast": { severity: "info", message: "Gerakan terlalu cepat." },
  "tempo-slow": { severity: "info", message: "Gerakan terlalu lambat." },
  good: { severity: "info", message: "Gerakan sudah baik." },
};
