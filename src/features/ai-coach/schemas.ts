import { z } from "zod";

const conciseText = z.string().trim().min(4).max(320);
const insightList = z.array(z.string().trim().min(4).max(180)).min(1).max(3);

export const sessionCoachContentSchema = z.object({
  summary: conciseText,
  strengths: insightList,
  improvements: insightList,
  nextTarget: z.string().trim().min(4).max(220),
});

export const dailyRecommendationContentSchema = z.object({
  exerciseSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  headline: z.string().trim().min(4).max(100),
  reason: conciseText,
  focus: z.string().trim().min(4).max(180),
});

export const teacherClassContentSchema = z.object({
  summary: conciseText,
  highlights: insightList,
  concerns: insightList,
  teachingFocus: insightList,
});

export type SessionCoachContent = z.infer<typeof sessionCoachContentSchema>;
export type DailyRecommendationContent = z.infer<typeof dailyRecommendationContentSchema>;
export type TeacherClassContent = z.infer<typeof teacherClassContentSchema>;

const stringField = (description: string, maxLength: number) => ({
  type: "string",
  description,
  maxLength,
});

const stringList = (description: string) => ({
  type: "array",
  description,
  minItems: 1,
  maxItems: 3,
  items: { type: "string", maxLength: 180 },
});

export const sessionCoachJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "strengths", "improvements", "nextTarget"],
  properties: {
    summary: stringField("Ringkasan sesi yang faktual dan mudah dipahami siswa SMA.", 320),
    strengths: stringList("Satu sampai tiga kekuatan yang didukung data sesi."),
    improvements: stringList("Satu sampai tiga koreksi yang dapat langsung dilakukan."),
    nextTarget: stringField("Target latihan berikut yang realistis dan spesifik.", 220),
  },
} as const;

export const dailyRecommendationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["exerciseSlug", "headline", "reason", "focus"],
  properties: {
    exerciseSlug: stringField("Slug yang harus dipilih persis dari daftar latihan tersedia.", 80),
    headline: stringField("Judul rekomendasi singkat.", 100),
    reason: stringField("Alasan rekomendasi berdasarkan riwayat yang diberikan.", 320),
    focus: stringField("Satu fokus teknik utama untuk latihan hari ini.", 180),
  },
} as const;

export const teacherClassJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "highlights", "concerns", "teachingFocus"],
  properties: {
    summary: stringField("Ringkasan faktual performa kelas tanpa diagnosis medis.", 320),
    highlights: stringList("Satu sampai tiga perkembangan positif kelas."),
    concerns: stringList("Satu sampai tiga pola yang memerlukan perhatian guru."),
    teachingFocus: stringList("Satu sampai tiga fokus pembelajaran berikutnya."),
  },
} as const;

