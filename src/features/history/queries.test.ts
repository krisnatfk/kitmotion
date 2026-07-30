import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);

  return {
    authGetUser: vi.fn(),
    serviceFrom: vi.fn(() => query),
    serviceRole: vi.fn(),
    query,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: vi.fn(async () => ({
    auth: { getUser: mocks.authGetUser },
  })),
  getSupabaseServiceRole: mocks.serviceRole,
}));

import { listSessions } from "./queries";

describe("history queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.select.mockReturnValue(mocks.query);
    mocks.query.eq.mockReturnValue(mocks.query);
    mocks.query.order.mockReturnValue(mocks.query);
    mocks.query.limit.mockResolvedValue({ data: [], error: null });
    mocks.serviceRole.mockReturnValue({ from: mocks.serviceFrom });
  });

  it("does not use the service role without an authenticated user", async () => {
    mocks.authGetUser.mockResolvedValue({ data: { user: null } });

    await expect(listSessions()).resolves.toEqual([]);
    expect(mocks.serviceRole).not.toHaveBeenCalled();
  });

  it("scopes completed sessions to the authenticated user", async () => {
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: "student-1" } } });

    await listSessions();

    expect(mocks.serviceFrom).toHaveBeenCalledWith("workout_sessions");
    expect(mocks.query.eq).toHaveBeenCalledWith("user_id", "student-1");
    expect(mocks.query.eq).toHaveBeenCalledWith("status", "completed");
  });
});
