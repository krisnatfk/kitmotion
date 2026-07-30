import { redirect } from "next/navigation";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";

async function currentActor() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = getSupabaseServiceRole();
  const { data: profile } = await admin.from("profiles").select("id, role, full_name").eq("id", user.id).single();
  if (!profile) redirect("/login");
  return { user, profile, admin };
}

export async function previewClassCode(rawCode: string | undefined) {
  const { profile, admin } = await currentActor();
  if (profile.role !== "student" || !rawCode) return null;
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) return null;
  const now = new Date().toISOString();
  const { data: joinCode } = await admin.from("class_join_codes")
    .select("classroom_id, code, expires_at")
    .eq("code", code)
    .eq("is_active", true)
    .single();
  if (!joinCode || (joinCode.expires_at && joinCode.expires_at < now)) return null;
  const { data: classroom } = await admin.from("classrooms")
    .select("id, teacher_id, name, school_year, is_active")
    .eq("id", joinCode.classroom_id)
    .single();
  if (!classroom?.is_active) return null;
  const { data: teacher } = await admin.from("profiles").select("full_name").eq("id", classroom.teacher_id).single();
  return { ...classroom, code, teacherName: teacher?.full_name ?? "Guru KITMOTION" };
}

export async function getStudentClasses() {
  const { user, profile, admin } = await currentActor();
  if (profile.role !== "student") redirect(profile.role === "teacher" ? "/teacher" : "/dashboard");
  const { data: memberships } = await admin.from("class_memberships")
    .select("classroom_id, status, joined_at, consented_at")
    .eq("student_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: false });
  if (!memberships?.length) return [];
  const { data: classrooms } = await admin.from("classrooms").select("id, teacher_id, name, school_year").in("id", memberships.map((row) => row.classroom_id));
  const teacherIds = [...new Set((classrooms ?? []).map((row) => row.teacher_id))];
  const { data: teachers } = teacherIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", teacherIds)
    : { data: [] };
  const teacherMap = new Map((teachers ?? []).map((row) => [row.id, row.full_name]));
  const membershipMap = new Map(memberships.map((row) => [row.classroom_id, row]));
  return (classrooms ?? []).map((classroom) => ({
    ...classroom,
    teacherName: teacherMap.get(classroom.teacher_id) ?? "Guru KITMOTION",
    joinedAt: membershipMap.get(classroom.id)?.joined_at ?? null,
    consentedAt: membershipMap.get(classroom.id)?.consented_at ?? null,
  }));
}

export async function getTeacherOverview() {
  const { user, profile, admin } = await currentActor();
  if (profile.role !== "teacher") redirect("/dashboard");
  const { data: classrooms } = await admin.from("classrooms").select("*").eq("teacher_id", user.id).eq("is_active", true).order("created_at", { ascending: false });
  if (!classrooms?.length) return { profile, classrooms: [] };
  const classIds = classrooms.map((row) => row.id);
  const [{ data: codes }, { data: memberships }] = await Promise.all([
    admin.from("class_join_codes").select("classroom_id, code, expires_at").in("classroom_id", classIds).eq("is_active", true),
    admin.from("class_memberships").select("classroom_id").in("classroom_id", classIds).eq("status", "active"),
  ]);
  const codeMap = new Map((codes ?? []).map((row) => [row.classroom_id, row]));
  const counts = new Map<string, number>();
  for (const membership of memberships ?? []) counts.set(membership.classroom_id, (counts.get(membership.classroom_id) ?? 0) + 1);
  return {
    profile,
    classrooms: classrooms.map((classroom) => ({
      ...classroom,
      code: codeMap.get(classroom.id)?.code ?? "—",
      codeExpiresAt: codeMap.get(classroom.id)?.expires_at ?? null,
      studentCount: counts.get(classroom.id) ?? 0,
    })),
  };
}

export type TeacherReportFilters = { student?: string; exercise?: string; from?: string; to?: string };

export async function getTeacherClassReport(classId: string, filters: TeacherReportFilters) {
  const { user, profile, admin } = await currentActor();
  if (profile.role !== "teacher") redirect("/dashboard");
  const { data: classroom } = await admin.from("classrooms").select("id, name, school_year, teacher_id").eq("id", classId).single();
  if (!classroom || classroom.teacher_id !== user.id) redirect("/teacher");

  const { data: memberships } = await admin.from("class_memberships")
    .select("student_id, joined_at, consented_at")
    .eq("classroom_id", classId)
    .eq("status", "active");
  const allStudentIds = (memberships ?? []).map((row) => row.student_id);
  let sessionStudentIds = allStudentIds;
  if (filters.student && allStudentIds.includes(filters.student)) sessionStudentIds = [filters.student];
  if (!allStudentIds.length) return { classroom, students: [], exercises: [], summary: emptySummary(), rows: [], commonIssues: [], weekly: [] };

  const [{ data: students }, { data: progress }, { data: exercises }, { data: challengeProgress }, { data: milestones }] = await Promise.all([
    admin.from("profiles").select("id, full_name, class_name").in("id", allStudentIds).order("full_name"),
    admin.from("user_progress").select("user_id, current_level, total_xp").in("user_id", allStudentIds),
    admin.from("exercises").select("id, slug, name").eq("is_active", true).order("sort_order"),
    admin.from("challenge_progress").select("user_id").in("user_id", allStudentIds).not("completed_at", "is", null),
    admin.from("user_milestones").select("user_id").in("user_id", allStudentIds).eq("status", "completed"),
  ]);
  const exerciseMap = new Map((exercises ?? []).map((row) => [row.id, row]));
  let sessionQuery = admin.from("workout_sessions")
    .select("id, user_id, exercise_id, completed_at, duration_seconds, valid_reps, invalid_reps, final_score")
    .in("user_id", sessionStudentIds)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });
  if (filters.exercise && [...exerciseMap.values()].some((row) => row.slug === filters.exercise)) {
    const exerciseId = [...exerciseMap.values()].find((row) => row.slug === filters.exercise)?.id;
    if (exerciseId) sessionQuery = sessionQuery.eq("exercise_id", exerciseId);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(filters.from ?? "")) sessionQuery = sessionQuery.gte("completed_at", `${filters.from}T00:00:00.000Z`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(filters.to ?? "")) sessionQuery = sessionQuery.lte("completed_at", `${filters.to}T23:59:59.999Z`);
  const { data: sessions } = await sessionQuery;
  const studentMap = new Map((students ?? []).map((row) => [row.id, row]));
  const progressMap = new Map((progress ?? []).map((row) => [row.user_id, row]));
  const consentMap = new Map((memberships ?? []).map((row) => [row.student_id, row.consented_at ?? row.joined_at]));
  const permittedSessions = (sessions ?? []).filter((session) => {
    const consentedAt = consentMap.get(session.user_id);
    return Boolean(session.completed_at && consentedAt && session.completed_at >= consentedAt);
  });
  const rows = permittedSessions.map((session) => ({
    ...session,
    studentName: studentMap.get(session.user_id)?.full_name ?? "Siswa",
    exerciseName: exerciseMap.get(session.exercise_id)?.name ?? "Latihan",
    exerciseSlug: exerciseMap.get(session.exercise_id)?.slug ?? "",
    level: progressMap.get(session.user_id)?.current_level ?? 1,
    xp: progressMap.get(session.user_id)?.total_xp ?? 0,
  }));
  const sessionIds = rows.map((row) => row.id);
  const { data: feedback } = sessionIds.length
    ? await admin.from("session_feedback").select("session_id, code, message, occurrence_count").in("session_id", sessionIds)
    : { data: [] };
  const issueCounts = new Map<string, { message: string; count: number }>();
  for (const item of feedback ?? []) {
    if (item.code === "good") continue;
    const current = issueCounts.get(item.code) ?? { message: item.message, count: 0 };
    current.count += item.occurrence_count;
    issueCounts.set(item.code, current);
  }
  const totalSessions = rows.length;
  const summary = {
    totalSessions,
    totalReps: rows.reduce((sum, row) => sum + row.valid_reps, 0),
    averageScore: totalSessions ? Math.round(rows.reduce((sum, row) => sum + Number(row.final_score ?? 0), 0) / totalSessions) : 0,
    durationSeconds: rows.reduce((sum, row) => sum + row.duration_seconds, 0),
  };
  const challengeCounts = new Map<string, number>();
  for (const item of [...(challengeProgress ?? []), ...(milestones ?? [])]) {
    challengeCounts.set(item.user_id, (challengeCounts.get(item.user_id) ?? 0) + 1);
  }
  const weeklyMap = new Map<string, { totalScore: number; sessions: number }>();
  for (const row of rows) {
    if (!row.completed_at) continue;
    const week = weekStart(row.completed_at);
    const current = weeklyMap.get(week) ?? { totalScore: 0, sessions: 0 };
    current.totalScore += Number(row.final_score ?? 0);
    current.sessions += 1;
    weeklyMap.set(week, current);
  }
  const weekly = [...weeklyMap.entries()].map(([week, value]) => ({
    week,
    sessions: value.sessions,
    averageScore: Math.round(value.totalScore / value.sessions),
  })).sort((a, b) => a.week.localeCompare(b.week)).slice(-8);
  return {
    classroom,
    students: (students ?? []).map((student) => ({ ...student, level: progressMap.get(student.id)?.current_level ?? 1, xp: progressMap.get(student.id)?.total_xp ?? 0, challengesCompleted: challengeCounts.get(student.id) ?? 0 })),
    exercises: exercises ?? [],
    summary,
    rows,
    commonIssues: [...issueCounts.entries()].map(([code, value]) => ({ code, ...value })).sort((a, b) => b.count - a.count).slice(0, 5),
    weekly,
  };
}

function emptySummary() {
  return { totalSessions: 0, totalReps: 0, averageScore: 0, durationSeconds: 0 };
}

function weekStart(value: string): string {
  const date = new Date(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}
