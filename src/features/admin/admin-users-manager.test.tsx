import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminUsersManager } from "./admin-users-manager";
import type { AdminUserRow } from "./queries";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("./actions", () => ({
  updateManagedUserAction: vi.fn(),
  setManagedUserBlockedAction: vi.fn(),
  deleteManagedUserAction: vi.fn(),
}));

const users: AdminUserRow[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "admin@example.com",
    fullName: "Admin Saat Ini",
    role: "admin",
    schoolName: null,
    className: null,
    avatarPath: "preset:lime",
    createdAt: "2026-07-01T00:00:00.000Z",
    lastSignInAt: "2026-07-28T00:00:00.000Z",
    emailConfirmed: true,
    isBlocked: false,
    bannedUntil: null,
    totalXp: 100,
    level: 2,
    totalSessions: 4,
    totalValidReps: 50,
    currentStreak: 2,
    runCount: 1,
    lastActivityDate: "2026-07-28",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "siswa@example.com",
    fullName: "Siswa Contoh",
    role: "student",
    schoolName: "SMK Contoh",
    className: "XII RPL",
    avatarPath: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    lastSignInAt: null,
    emailConfirmed: true,
    isBlocked: false,
    bannedUntil: null,
    totalXp: 0,
    level: 1,
    totalSessions: 0,
    totalValidReps: 0,
    currentStreak: 0,
    runCount: 0,
    lastActivityDate: null,
  },
];

describe("AdminUsersManager", () => {
  it("filters users and protects the currently signed-in administrator", async () => {
    const user = userEvent.setup();
    render(<AdminUsersManager initialUsers={users} currentAdminId={users[0]!.id} />);

    await user.type(screen.getByPlaceholderText(/Cari nama/i), "Siswa Contoh");
    expect(screen.getAllByText("Siswa Contoh").length).toBeGreaterThan(0);
    expect(screen.queryByText("admin@example.com")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/Cari nama/i));
    const currentRow = screen.getAllByText("Admin Saat Ini")
      .map((element) => element.closest("tr"))
      .find((row): row is HTMLTableRowElement => row != null);
    expect(currentRow).not.toBeNull();
    await user.click(within(currentRow as HTMLTableRowElement).getByRole("button", { name: "Kelola" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Akun administrator aktif dilindungi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hapus akun" })).not.toBeInTheDocument();
  });
});
