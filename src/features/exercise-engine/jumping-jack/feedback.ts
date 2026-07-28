import type { FeedbackSeverity } from "../core/types";

/** Jumping jack feedback codes + Indonesian messages (prd.md §10.2). */
export const JUMPING_JACK_FEEDBACK: Record<
  string,
  { severity: FeedbackSeverity; message: string }
> = {
  "arms-too-low": { severity: "warning", message: "Tangan terlalu rendah. Angkat kedua tangan hingga mendekati bertemu di atas kepala." },
  "legs-too-narrow": { severity: "warning", message: "Bukaan kaki kurang lebar. Mendaratlah sedikit lebih lebar dari bahu." },
  asymmetry: { severity: "warning", message: "Sisi kiri dan kanan tidak seimbang. Gerakkan kedua tangan dan kaki secara bersamaan." },
  "tempo-unstable": { severity: "info", message: "Tempo berubah-ubah. Gunakan ritme buka-tutup yang sama." },
  "tempo-fast": { severity: "info", message: "Gerakan terlalu cepat. Kurangi kecepatan agar pendaratan tetap lembut." },
  "tempo-slow": { severity: "info", message: "Gerakan terlalu lambat. Tingkatkan ritme secara bertahap dan tetap terkontrol." },
  good: { severity: "info", message: "Gerakan jumping jack sudah simetris. Pertahankan ritmenya." },
};
