export type AIInsightSource = "ai" | "fallback";

export type AIInsightMeta = {
  source: AIInsightSource;
  model: string | null;
  generatedAt: string;
};

export type SessionCoachInsight = AIInsightMeta & {
  summary: string;
  strengths: string[];
  improvements: string[];
  nextTarget: string;
};

export type DailyRecommendation = AIInsightMeta & {
  exerciseSlug: string;
  headline: string;
  reason: string;
  focus: string;
  targetReps: number | null;
  targetSeconds: number | null;
};

export type TeacherClassInsight = AIInsightMeta & {
  summary: string;
  highlights: string[];
  concerns: string[];
  teachingFocus: string[];
};

