import { getAIConfig } from "@/lib/ai/config";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { targetRepsForLevel } from "@/features/exercises/difficulty";
import { generateStructuredCompletionWithFailover } from "./client";
import { insightCacheKey, readCachedInsight, writeCachedInsight } from "./cache";
import { eligibleDailyExercises, fallbackDailyRecommendation } from "./recommendation";
import {
  dailyRecommendationContentSchema,
  dailyRecommendationJsonSchema,
  sessionCoachContentSchema,
  sessionCoachJsonSchema,
  teacherClassContentSchema,
  teacherClassJsonSchema,
  type DailyRecommendationContent,
  type SessionCoachContent,
  type TeacherClassContent,
} from "./schemas";
import type { DailyRecommendation, SessionCoachInsight, TeacherClassInsight } from "./types";

const SESSION_PROMPT_VERSION = "session-coach-v1";
const DAILY_PROMPT_VERSION = "daily-recommendation-v2";
const TEACHER_PROMPT_VERSION = "teacher-class-v1";

const COACH_SYSTEM_PROMPT = `Kamu adalah Coach AI KITMOTION untuk siswa SMA Indonesia.
Gunakan hanya data terstruktur yang diberikan. Jangan mengarang data, diagnosis medis,
atau klaim cedera. Skor, repetisi, XP, level, dan challenge sudah final dan tidak boleh
diubah. Gunakan bahasa Indonesia yang ringkas, konkret, suportif, dan berfokus pada
teknik yang dapat dilakukan pada sesi berikutnya. Keluarkan hanya JSON sesuai schema.`;

type SessionRecord = {
  id: string;
  user_id: string;
  completed_at: string | null;
  duration_seconds: number;
  target_reps: number | null;
  total_reps: number;
  valid_reps: number;
  invalid_reps: number;
  form_score: number | null;
  range_score: number | null;
  consistency_score: number | null;
  tempo_score: number | null;
  stability_score: number | null;
  final_score: number | null;
  grade: string | null;
  exercises: { name: string; slug: string };
};

export async function getCurrentUserSessionCoach(sessionId: string): Promise<SessionCoachInsight | null> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getSessionCoachForUser(sessionId, user.id);
}

export async function getSessionCoachForUser(sessionId: string, userId: string): Promise<SessionCoachInsight | null> {
  const admin = getSupabaseServiceRole();
  const [{ data: session }, { data: feedback }] = await Promise.all([
    admin
      .from("workout_sessions")
      .select("id, user_id, completed_at, duration_seconds, target_reps, total_reps, valid_reps, invalid_reps, form_score, range_score, consistency_score, tempo_score, stability_score, final_score, grade, exercises!inner(name, slug)")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .eq("status", "completed")
      .single(),
    admin
      .from("session_feedback")
      .select("code, severity, message, occurrence_count")
      .eq("session_id", sessionId)
      .order("occurrence_count", { ascending: false }),
  ]);
  if (!session) return null;

  const record = session as unknown as SessionRecord;
  const input = {
    exercise: record.exercises,
    completedAt: record.completed_at,
    durationSeconds: record.duration_seconds,
    targetReps: record.target_reps,
    totalReps: record.total_reps,
    validReps: record.valid_reps,
    invalidReps: record.invalid_reps,
    finalScore: numberOrZero(record.final_score),
    grade: record.grade,
    subScores: {
      form: numberOrZero(record.form_score),
      range: numberOrZero(record.range_score),
      consistency: numberOrZero(record.consistency_score),
      tempo: numberOrZero(record.tempo_score),
      stability: numberOrZero(record.stability_score),
    },
    feedback: (feedback ?? []).slice(0, 5).map((item) => ({
      code: item.code,
      severity: item.severity,
      message: item.message,
      occurrences: item.occurrence_count,
    })),
  };
  const cacheKey = `session:${sessionId}:${SESSION_PROMPT_VERSION}`;
  const cached = await readCachedInsight({
    ownerUserId: userId,
    kind: "session_coach",
    cacheKey,
    schema: sessionCoachContentSchema,
  });
  if (cached) return { ...cached.data, source: cached.source, model: cached.model, generatedAt: cached.generatedAt };

  const fallback = fallbackSessionCoach(input);
  const completion = await generateStructuredCompletionWithFailover({
    schemaName: "kitmotion_session_coach",
    schema: sessionCoachContentSchema,
    jsonSchema: sessionCoachJsonSchema,
    systemPrompt: COACH_SYSTEM_PROMPT,
    input,
    timeoutMs: 7_000,
  });
  const content = completion?.data ?? fallback;
  const meta = completionMeta(completion);
  await writeCachedInsight({
    ownerUserId: userId,
    kind: "session_coach",
    cacheKey,
    content,
    source: meta.source,
    provider: completion?.provider ?? providerName(),
    model: meta.model,
    promptVersion: SESSION_PROMPT_VERSION,
    sessionId,
    expiresAt: completion ? null : new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  return { ...content, ...meta };
}

export async function getDailyRecommendation(): Promise<DailyRecommendation | null> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = getSupabaseServiceRole();
  const localDate = jakartaDate();
  const [{ data: profile }, { data: exercises }, { data: sessions }, { data: progress }, { data: previousInsight }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin.from("exercises").select("id, slug, name, difficulty, default_target_reps, default_target_seconds").eq("is_active", true).order("sort_order"),
    admin.from("workout_sessions").select("id, exercise_id, completed_at, valid_reps, invalid_reps, final_score").eq("user_id", user.id).eq("status", "completed").order("completed_at", { ascending: false }).limit(12),
    admin.from("user_progress").select("current_level, current_streak, total_sessions").eq("user_id", user.id).maybeSingle(),
    admin.from("ai_insights").select("content").eq("owner_user_id", user.id).eq("kind", "daily_recommendation").lt("updated_at", jakartaDayStartIso(localDate)).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (profile?.role !== "student" || !exercises?.length) return null;

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const history = (sessions ?? []).map((session) => ({
    id: session.id,
    exerciseSlug: exerciseById.get(session.exercise_id)?.slug ?? "unknown",
    completedAt: session.completed_at,
    validReps: session.valid_reps,
    invalidReps: session.invalid_reps,
    score: numberOrZero(session.final_score),
  }));
  const previousParsed = dailyRecommendationContentSchema.safeParse(previousInsight?.content);
  const previousRecommendationSlug = previousParsed.success ? previousParsed.data.exerciseSlug : null;
  const eligibleExercises = eligibleDailyExercises(exercises, history, previousRecommendationSlug);
  const input = {
    localDate,
    level: progress?.current_level ?? 1,
    streak: progress?.current_streak ?? 0,
    totalSessions: progress?.total_sessions ?? 0,
    availableExercises: exercises.map((exercise) => ({
      slug: exercise.slug,
      name: exercise.name,
      difficulty: exercise.difficulty,
      defaultTargetReps: exercise.default_target_reps,
      defaultTargetSeconds: exercise.default_target_seconds,
    })),
    eligibleExerciseSlugs: eligibleExercises.map((exercise) => exercise.slug),
    previousRecommendationSlug,
    recentSessions: history,
  };
  const cacheKey = insightCacheKey(`daily:${input.localDate}:${DAILY_PROMPT_VERSION}`, input);
  const cached = await readCachedInsight({
    ownerUserId: user.id,
    kind: "daily_recommendation",
    cacheKey,
    schema: dailyRecommendationContentSchema,
  });
  const fallback = fallbackDailyRecommendation(exercises, history, previousRecommendationSlug, `${user.id}:${input.localDate}`);
  const cachedContent = cached?.data && eligibleExercises.some((item) => item.slug === cached.data.exerciseSlug) ? cached.data : null;
  let content: DailyRecommendationContent;
  let meta;

  if (cachedContent && cached) {
    content = cachedContent;
    meta = { source: cached.source, model: cached.model, generatedAt: cached.generatedAt } as const;
  } else {
    const completion = await generateStructuredCompletionWithFailover({
      schemaName: "kitmotion_daily_recommendation",
      schema: dailyRecommendationContentSchema,
      jsonSchema: dailyRecommendationJsonSchema,
      systemPrompt: `${COACH_SYSTEM_PROMPT}\nPilih tepat satu exerciseSlug dari eligibleExerciseSlugs. Jangan memilih slug di luar daftar tersebut. Prioritaskan keseimbangan latihan, nilai yang perlu ditingkatkan, dan jeda sejak latihan terakhir.`,
      input,
      timeoutMs: 7_000,
    });
    content = completion?.data && eligibleExercises.some((item) => item.slug === completion.data.exerciseSlug)
      ? completion.data
      : fallback;
    meta = completion && content === completion.data ? completionMeta(completion) : fallbackMeta();
    await writeCachedInsight({
      ownerUserId: user.id,
      kind: "daily_recommendation",
      cacheKey,
      content,
      source: meta.source,
      provider: completion?.provider ?? providerName(),
      model: meta.model,
      promptVersion: DAILY_PROMPT_VERSION,
      expiresAt: nextJakartaDayIso(),
    });
  }

  const selected = exercises.find((item) => item.slug === content.exerciseSlug) ?? exercises[0]!;
  const level = progress?.current_level ?? 1;
  return {
    ...content,
    exerciseSlug: selected.slug,
    targetReps: targetRepsForLevel(selected.default_target_reps, level),
    targetSeconds: selected.default_target_seconds,
    ...meta,
  };
}

export type TeacherClassInsightInput = {
  teacherId: string;
  classroomId: string;
  className: string;
  totalStudents: number;
  totalSessions: number;
  totalValidReps: number;
  averageScore: number;
  durationSeconds: number;
  rows: Array<{
    id: string;
    userId: string;
    exerciseName: string;
    validReps: number;
    invalidReps: number;
    finalScore: number;
    completedAt: string | null;
  }>;
  commonIssues: Array<{ code: string; message: string; count: number }>;
  weekly: Array<{ week: string; sessions: number; averageScore: number }>;
};

export async function getTeacherClassInsight(input: TeacherClassInsightInput): Promise<TeacherClassInsight | null> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== input.teacherId) return null;

  const exerciseMap = new Map<string, { sessions: number; validReps: number; invalidReps: number; totalScore: number }>();
  for (const row of input.rows) {
    const current = exerciseMap.get(row.exerciseName) ?? { sessions: 0, validReps: 0, invalidReps: 0, totalScore: 0 };
    current.sessions += 1;
    current.validReps += row.validReps;
    current.invalidReps += row.invalidReps;
    current.totalScore += row.finalScore;
    exerciseMap.set(row.exerciseName, current);
  }
  const promptInput = {
    className: input.className,
    totalStudents: input.totalStudents,
    studentsWithActivity: new Set(input.rows.map((row) => row.userId)).size,
    summary: {
      totalSessions: input.totalSessions,
      totalValidReps: input.totalValidReps,
      averageScore: input.averageScore,
      durationSeconds: input.durationSeconds,
    },
    exerciseBreakdown: [...exerciseMap.entries()].map(([exercise, value]) => ({
      exercise,
      sessions: value.sessions,
      validReps: value.validReps,
      invalidReps: value.invalidReps,
      averageScore: value.sessions ? Math.round(value.totalScore / value.sessions) : 0,
    })),
    commonIssues: input.commonIssues.slice(0, 5),
    weeklyTrend: input.weekly,
  };
  const cacheKey = insightCacheKey(`${TEACHER_PROMPT_VERSION}:${input.classroomId}`, {
    sessions: input.rows.map((row) => row.id),
    promptInput,
  });
  const cached = await readCachedInsight({
    ownerUserId: input.teacherId,
    kind: "teacher_class",
    cacheKey,
    schema: teacherClassContentSchema,
  });
  if (cached) return { ...cached.data, source: cached.source, model: cached.model, generatedAt: cached.generatedAt };

  const fallback = fallbackTeacherClass(promptInput);
  const completion = await generateStructuredCompletionWithFailover({
    schemaName: "kitmotion_teacher_class",
    schema: teacherClassContentSchema,
    jsonSchema: teacherClassJsonSchema,
    systemPrompt: `${COACH_SYSTEM_PROMPT}\nKamu membantu guru PJOK. Data sudah dibatasi pada siswa yang memberi consent. Analisis hanya agregat kelas; jangan meminta atau mengarang identitas siswa.`,
    input: promptInput,
    timeoutMs: 7_000,
  });
  const content = completion?.data ?? fallback;
  const meta = completionMeta(completion);
  await writeCachedInsight({
    ownerUserId: input.teacherId,
    kind: "teacher_class",
    cacheKey,
    content,
    source: meta.source,
    provider: completion?.provider ?? providerName(),
    model: meta.model,
    promptVersion: TEACHER_PROMPT_VERSION,
    classroomId: input.classroomId,
    expiresAt: completion ? new Date(Date.now() + 60 * 60_000).toISOString() : new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  return { ...content, ...meta };
}

function fallbackSessionCoach(input: {
  exercise: { name: string };
  targetReps: number | null;
  validReps: number;
  invalidReps: number;
  finalScore: number;
  subScores: Record<string, number>;
  feedback: Array<{ message: string }>;
}): SessionCoachContent {
  const scoreLabels: Record<string, string> = { form: "postur", range: "rentang gerak", consistency: "konsistensi", tempo: "tempo", stability: "stabilitas" };
  const sorted = Object.entries(input.subScores).sort((a, b) => b[1] - a[1]);
  const strongest = scoreLabels[sorted[0]?.[0] ?? "form"];
  const weakest = scoreLabels[sorted.at(-1)?.[0] ?? "range"];
  const nextReps = Math.max(input.targetReps ?? 0, input.validReps + (input.validReps > 0 ? 2 : 1));
  return {
    summary: `Kamu menyelesaikan ${input.validReps} repetisi valid ${input.exercise.name} dengan skor ${Math.round(input.finalScore)}. ${input.invalidReps} repetisi masih perlu diperbaiki.`,
    strengths: [`Aspek ${strongest} menjadi bagian paling konsisten pada sesi ini.`],
    improvements: input.feedback.length
      ? input.feedback.slice(0, 2).map((item) => item.message)
      : [`Pertahankan kontrol ${weakest} pada setiap repetisi.`],
    nextTarget: `Targetkan ${nextReps} repetisi valid dengan fokus pada ${weakest}.`,
  };
}

function fallbackTeacherClass(input: {
  totalStudents: number;
  studentsWithActivity: number;
  summary: { totalSessions: number; averageScore: number };
  commonIssues: Array<{ message: string; count: number }>;
}): TeacherClassContent {
  const inactive = Math.max(0, input.totalStudents - input.studentsWithActivity);
  const mainIssue = input.commonIssues[0];
  return {
    summary: input.summary.totalSessions
      ? `Kelas mencatat ${input.summary.totalSessions} sesi dengan rata-rata skor ${input.summary.averageScore}. ${input.studentsWithActivity} dari ${input.totalStudents} siswa memiliki aktivitas pada laporan ini.`
      : "Belum ada sesi latihan yang dapat dianalisis pada filter laporan ini.",
    highlights: input.summary.totalSessions
      ? [`Partisipasi tercatat pada ${input.studentsWithActivity} siswa aktif.`]
      : ["Struktur kelas dan persetujuan siswa sudah siap digunakan."],
    concerns: [mainIssue ? `${mainIssue.message} muncul ${mainIssue.count} kali.` : "Belum cukup data kesalahan untuk menemukan pola kelas."],
    teachingFocus: [mainIssue ? `Berikan demonstrasi ulang untuk: ${mainIssue.message}` : inactive > 0 ? `Ajak ${inactive} siswa yang belum aktif untuk menyelesaikan sesi pertama.` : "Pertahankan latihan teknik dasar secara konsisten."],
  };
}

function completionMeta(completion: { model: string; generatedAt: string } | null) {
  return completion
    ? { source: "ai" as const, model: completion.model, generatedAt: completion.generatedAt }
    : fallbackMeta();
}

function fallbackMeta() {
  return { source: "fallback" as const, model: null, generatedAt: new Date().toISOString() };
}

function providerName(): string | null {
  try {
    return getAIConfig()?.provider ?? null;
  } catch {
    return null;
  }
}

function numberOrZero(value: number | null): number {
  return Number(value ?? 0);
}

function jakartaDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function jakartaDayStartIso(localDate: string): string {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!, -7)).toISOString();
}

function nextJakartaDayIso(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day) + 1, -7)).toISOString();
}
