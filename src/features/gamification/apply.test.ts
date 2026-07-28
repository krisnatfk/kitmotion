import { describe, expect, it } from "vitest";
import { applySessionRewards } from "./apply";

/**
 * Integration-style test for reward idempotency. The Supabase service client is
 * faked so we can assert the XP insert path and duplicate-replay detection
 * (unique constraint on (user_id, idempotency_key)). A live-DB RLS/integration
 * suite runs separately when a Supabase project is configured (see README).
 */

type Row = Record<string, unknown>;

function makeClient(opts: {
  xpInsertError?: { message: string };
  progress?: Row | null;
  levels?: Row[];
  badges?: Row[];
  userBadges?: Row[];
  challenges?: Row[];
  challengeProgress?: Row | null;
}) {
  const xpInserts: Row[] = [];
  const badgeUpserts: Row[] = [];
  const progressUpserts: Row[] = [];
  const challengeUpserts: Row[] = [];

  const client = {
    from(table: string) {
      return {
        insert: (row: unknown) => {
          if (table === "xp_events" && opts.xpInsertError) {
            return Promise.resolve({ data: null, error: opts.xpInsertError });
          }
          if (table === "xp_events") xpInserts.push(row as Row);
          if (table === "user_badges") badgeUpserts.push(row as Row);
          return Promise.resolve({ data: null, error: null });
        },
        upsert: (row: unknown) => {
          if (table === "user_progress") progressUpserts.push(row as Row);
          if (table === "user_badges") badgeUpserts.push(row as Row);
          if (table === "challenge_progress") challengeUpserts.push(row as Row);
          return Promise.resolve({ data: null, error: null });
        },
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
        select: () => ({
          eq: () => {
            const thenable = {
              single: () => {
                if (table === "user_progress") return Promise.resolve({ data: opts.progress ?? null, error: null });
                if (table === "challenge_progress") return Promise.resolve({ data: opts.challengeProgress ?? null, error: null });
                return Promise.resolve({ data: null, error: null });
              },
              order: () => ({
                limit: () => ({
                  single: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
              lte: () => ({
                gte: () => ({
                  then: (resolve: (v: { data: Row[]; error: null }) => void) =>
                    Promise.resolve({ data: listFor(table), error: null }).then(resolve),
                }),
              }),
              then: (resolve: (v: { data: Row[]; error: null }) => void) =>
                Promise.resolve({ data: listFor(table), error: null }).then(resolve),
            };
            return thenable;
          },
          order: () => ({
            then: (resolve: (v: { data: Row[]; error: null }) => void) =>
              Promise.resolve({ data: listFor(table), error: null }).then(resolve),
          }),
          lte: () => ({
            gte: () => ({
              then: (resolve: (v: { data: Row[]; error: null }) => void) =>
                Promise.resolve({ data: listFor(table), error: null }).then(resolve),
            }),
          }),
        }),
      };
    },
  };

  function listFor(table: string): Row[] {
    if (table === "level_definitions") return opts.levels ?? [];
    if (table === "badges") return opts.badges ?? [];
    if (table === "user_badges") return opts.userBadges ?? [];
    if (table === "challenges") return opts.challenges ?? [];
    return [];
  }

  return { client, xpInserts, badgeUpserts, progressUpserts, challengeUpserts };
}

const baseInput = {
  sessionId: "session-1",
  userId: "user-1",
  exerciseSlug: "squat",
  finalScore: 80,
  validReps: 10,
  durationSeconds: 60,
  targetReps: 10,
  targetSeconds: null,
  startedAt: null,
  completedAt: new Date("2026-07-28T10:00:00Z").toISOString(),
};

const progressZero: Row = {
  user_id: "user-1",
  total_xp: 0,
  current_level: 1,
  total_sessions: 0,
  total_valid_reps: 0,
  current_streak: 0,
  longest_streak: 0,
  last_activity_date: null,
};

describe("applySessionRewards idempotency", () => {
  it("awards XP once and updates progress on first call", async () => {
    const c = makeClient({
      progress: progressZero,
      levels: [{ level: 1, name: "Beginner", min_total_xp: 0 }],
      badges: [],
      challenges: [],
    });
    const result = await applySessionRewards(c.client as never, baseInput);
    expect(result.xpAwarded).toBe(20 + 16 + 15); // base + floor(80/10)*2 + target bonus
    expect(c.xpInserts).toHaveLength(1);
    expect(c.progressUpserts).toHaveLength(1);
  });

  it("does not double-award XP when the unique constraint rejects a replay", async () => {
    const c = makeClient({
      xpInsertError: { message: 'duplicate key value violates unique constraint "xp_events_user_id_idempotency_key_key"' },
      progress: {
        ...progressZero,
        total_xp: 51,
        total_sessions: 1,
        total_valid_reps: 10,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: "2026-07-28",
      },
      levels: [{ level: 1, name: "Beginner", min_total_xp: 0 }],
      badges: [],
      challenges: [],
    });
    const result = await applySessionRewards(c.client as never, baseInput);
    expect(result.xpAwarded).toBe(0);
    expect(c.xpInserts).toHaveLength(0);
  });

  it("awards a badge when the criteria is met", async () => {
    const c = makeClient({
      progress: progressZero,
      levels: [{ level: 1, name: "Beginner", min_total_xp: 0 }],
      badges: [
        { id: "b1", code: "first-workout", name: "Latihan Pertama", criteria: { type: "total_sessions", target: 1 }, xp_reward: 20 },
      ],
      challenges: [],
    });
    const result = await applySessionRewards(c.client as never, baseInput);
    expect(result.newBadges).toEqual([{ code: "first-workout", name: "Latihan Pertama" }]);
    expect(c.badgeUpserts).toHaveLength(1);
    expect(result.xpAwarded).toBe(71);
    expect(c.xpInserts).toHaveLength(2);
  });

  it("does not report or reward an already-owned badge again", async () => {
    const c = makeClient({
      progress: progressZero,
      levels: [{ level: 1, name: "Beginner", min_total_xp: 0 }],
      badges: [
        { id: "b1", code: "first-workout", name: "Latihan Pertama", criteria: { type: "total_sessions", target: 1 }, xp_reward: 20 },
      ],
      userBadges: [{ badge_id: "b1" }],
      challenges: [],
    });
    const result = await applySessionRewards(c.client as never, baseInput);
    expect(result.newBadges).toEqual([]);
    expect(c.badgeUpserts).toHaveLength(0);
    expect(c.xpInserts).toHaveLength(1);
  });

  it("throws on a non-idempotency XP insert error", async () => {
    const c = makeClient({
      xpInsertError: { message: "connection refused" },
      levels: [],
      badges: [],
      challenges: [],
    });
    await expect(applySessionRewards(c.client as never, baseInput)).rejects.toThrow();
  });
});
