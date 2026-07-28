import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { Database, Json, UserRole } from "@/types/database.types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseVersion = Database["public"]["Tables"]["exercise_versions"]["Row"];
type Badge = Database["public"]["Tables"]["badges"]["Row"];
type Challenge = Database["public"]["Tables"]["challenges"]["Row"];
type WorkoutSession = Database["public"]["Tables"]["workout_sessions"]["Row"];
type RunningSession = Database["public"]["Tables"]["running_sessions"]["Row"];

export async function adminListExercises(): Promise<Exercise[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function adminGetExercise(id: string): Promise<Exercise | null> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from("exercises").select("*").eq("id", id).single();
  return data ?? null;
}

export async function adminListVersions(exerciseId: string): Promise<ExerciseVersion[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("exercise_versions")
    .select("*")
    .eq("exercise_id", exerciseId)
    .order("version", { ascending: false });
  return data ?? [];
}

export async function adminListBadges(): Promise<Badge[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from("badges").select("*").order("code");
  return data ?? [];
}

export async function adminListChallenges(): Promise<Challenge[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("challenges")
    .select("*")
    .order("ends_at", { ascending: false });
  return data ?? [];
}

export interface AdminSessionRow extends WorkoutSession {
  profiles?: { full_name: string } | null;
  exercises?: { name: string; slug: string } | null;
}

export async function adminListSessions(limit = 50): Promise<AdminSessionRow[]> {
  // Admin pages are DB-role guarded by their layout. Service role is required
  // here because workout RLS intentionally exposes only the current user's rows.
  const supabase = getSupabaseServiceRole();
  const { data } = await supabase
    .from("workout_sessions")
    .select("*, profiles(full_name), exercises(name, slug)")
    .order("completed_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AdminSessionRow[];
}

export interface AdminRunRow extends RunningSession {
  profiles?: { full_name: string } | null;
}

export async function adminListRuns(limit = 50): Promise<AdminRunRow[]> {
  const supabase = getSupabaseServiceRole();
  const { data } = await supabase
    .from("running_sessions")
    .select("*, profiles(full_name)")
    .order("completed_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AdminRunRow[];
}

export async function adminActivityCounts(): Promise<{ workouts: number; runs: number }> {
  const supabase = getSupabaseServiceRole();
  const [workouts, runs] = await Promise.all([
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }),
    supabase.from("running_sessions").select("id", { count: "exact", head: true }),
  ]);
  return { workouts: workouts.count ?? 0, runs: runs.count ?? 0 };
}

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  schoolName: string | null;
  className: string | null;
  avatarPath: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  isBlocked: boolean;
  bannedUntil: string | null;
  totalXp: number;
  level: number;
  totalSessions: number;
  totalValidReps: number;
  currentStreak: number;
  runCount: number;
  lastActivityDate: string | null;
}

async function listAllAuthUsers() {
  const supabase = getSupabaseServiceRole();
  const users: User[] = [];
  const perPage = 1000;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Gagal membaca akun pengguna: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < perPage) break;
  }

  return users;
}

export async function adminListUsers(): Promise<AdminUserRow[]> {
  const supabase = getSupabaseServiceRole();
  const [authUsers, profilesResult, progressResult, schoolsResult, runsResult] = await Promise.all([
    listAllAuthUsers(),
    supabase.from("profiles").select("*"),
    supabase.from("user_progress").select("*"),
    supabase.from("schools").select("id, name"),
    supabase.from("running_sessions").select("user_id"),
  ]);

  if (profilesResult.error) throw new Error(`Gagal membaca profil: ${profilesResult.error.message}`);
  if (progressResult.error) throw new Error(`Gagal membaca progres: ${progressResult.error.message}`);

  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const progress = new Map((progressResult.data ?? []).map((row) => [row.user_id, row]));
  const schools = new Map((schoolsResult.data ?? []).map((school) => [school.id, school.name]));
  const runCounts = new Map<string, number>();
  for (const run of runsResult.data ?? []) runCounts.set(run.user_id, (runCounts.get(run.user_id) ?? 0) + 1);

  const now = Date.now();
  return authUsers
    .map((user) => {
      const profile = profiles.get(user.id);
      const userProgress = progress.get(user.id);
      const bannedUntil = user.banned_until ?? null;
      const fallbackName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "Pengguna KITMOTION";
      return {
        id: user.id,
        email: user.email ?? "Tanpa email",
        fullName: profile?.full_name ?? fallbackName,
        role: profile?.role ?? "student",
        schoolName: profile?.school_id ? schools.get(profile.school_id) ?? null : null,
        className: profile?.class_name ?? null,
        avatarPath: profile?.avatar_path ?? null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        emailConfirmed: Boolean(user.email_confirmed_at),
        isBlocked: Boolean(bannedUntil && new Date(bannedUntil).getTime() > now),
        bannedUntil,
        totalXp: userProgress?.total_xp ?? 0,
        level: userProgress?.current_level ?? 1,
        totalSessions: userProgress?.total_sessions ?? 0,
        totalValidReps: userProgress?.total_valid_reps ?? 0,
        currentStreak: userProgress?.current_streak ?? 0,
        runCount: runCounts.get(user.id) ?? 0,
        lastActivityDate: userProgress?.last_activity_date ?? null,
      } satisfies AdminUserRow;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface AdminActivityDay {
  key: string;
  label: string;
  workouts: number;
  runs: number;
}

export interface AdminAnalytics {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  adminUsers: number;
  newUsersThisMonth: number;
  totalActivities: number;
  totalDistanceKm: number;
  totalValidReps: number;
  averageWorkoutScore: number;
  engagementRate: number;
  activityByDay: AdminActivityDay[];
  recentUsers: AdminUserRow[];
}

function isoDay(value: string) {
  return value.slice(0, 10);
}

export async function adminGetAnalytics(): Promise<AdminAnalytics> {
  const supabase = getSupabaseServiceRole();
  const [users, workoutsResult, runsResult] = await Promise.all([
    adminListUsers(),
    supabase.from("workout_sessions").select("completed_at, final_score, valid_reps").eq("status", "completed"),
    supabase.from("running_sessions").select("completed_at, distance_meters").eq("status", "completed"),
  ]);

  const workouts = workoutsResult.data ?? [];
  const runs = runsResult.data ?? [];
  const now = new Date();
  const activeBoundary = new Date(now);
  activeBoundary.setDate(activeBoundary.getDate() - 30);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const activityByDay: AdminActivityDay[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - offset);
    const key = day.toISOString().slice(0, 10);
    activityByDay.push({
      key,
      label: day.toLocaleDateString("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" }),
      workouts: workouts.filter((item) => item.completed_at && isoDay(item.completed_at) === key).length,
      runs: runs.filter((item) => isoDay(item.completed_at) === key).length,
    });
  }

  const scoredWorkouts = workouts.filter((item) => item.final_score != null);
  const averageWorkoutScore = scoredWorkouts.length
    ? scoredWorkouts.reduce((sum, item) => sum + Number(item.final_score), 0) / scoredWorkouts.length
    : 0;
  const activeUsers = users.filter((user) => {
    const lastSeen = user.lastActivityDate ?? user.lastSignInAt;
    return lastSeen ? new Date(lastSeen) >= activeBoundary : false;
  }).length;

  return {
    totalUsers: users.length,
    activeUsers,
    blockedUsers: users.filter((user) => user.isBlocked).length,
    adminUsers: users.filter((user) => user.role === "admin").length,
    newUsersThisMonth: users.filter((user) => new Date(user.createdAt) >= monthStart).length,
    totalActivities: workouts.length + runs.length,
    totalDistanceKm: runs.reduce((sum, item) => sum + Number(item.distance_meters), 0) / 1000,
    totalValidReps: users.reduce((sum, user) => sum + user.totalValidReps, 0),
    averageWorkoutScore,
    engagementRate: users.length ? Math.round((activeUsers / users.length) * 100) : 0,
    activityByDay,
    recentUsers: users.slice(0, 5),
  };
}

export interface AdminAuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeData: Json | null;
  afterData: Json | null;
  createdAt: string;
  adminName: string;
}

export async function adminListAuditLogs(limit = 100): Promise<AdminAuditRow[]> {
  const supabase = getSupabaseServiceRole();
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Gagal membaca audit log: ${error.message}`);

  const adminIds = [...new Set((data ?? []).flatMap((row) => row.admin_user_id ? [row.admin_user_id] : []))];
  const { data: profiles } = adminIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", adminIds)
    : { data: [] as { id: string; full_name: string }[] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    beforeData: row.before_data,
    afterData: row.after_data,
    createdAt: row.created_at,
    adminName: row.admin_user_id ? names.get(row.admin_user_id) ?? "Admin terhapus" : "Sistem",
  }));
}
