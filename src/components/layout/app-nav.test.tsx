import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppNav } from "./app-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("AppNav", () => {
  it("keeps the student mobile bar to five items and moves secondary links into More", async () => {
    const user = userEvent.setup();
    render(<AppNav displayName="Krisna" avatarPath="preset:lime" />);

    const mobile = screen.getByRole("navigation", { name: "Navigasi aplikasi seluler" });

    expect(within(mobile).getAllByRole("link")).toHaveLength(4);
    expect(within(mobile).queryByRole("link", { name: /profil/i })).not.toBeInTheDocument();
    expect(within(mobile).queryByRole("link", { name: /kelas/i })).not.toBeInTheDocument();

    await user.click(within(mobile).getByRole("button", { name: "Buka menu lainnya" }));

    const moreMenu = screen.getByRole("dialog", { name: "Akun KITMOTION" });
    expect(within(moreMenu).getByRole("link", { name: /^kelas\b/i })).toHaveAttribute("href", "/classes");
    expect(within(moreMenu).getByRole("link", { name: /pengaturan profil/i })).toHaveAttribute("href", "/profile");
    expect(within(moreMenu).getByRole("button", { name: "Keluar" })).toBeInTheDocument();

    await user.click(within(moreMenu).getByRole("button", { name: "Tutup menu lainnya" }));
    expect(screen.queryByRole("dialog", { name: "Akun KITMOTION" })).not.toBeInTheDocument();
  });

  it("opens an account menu from the desktop avatar", async () => {
    const user = userEvent.setup();
    render(<AppNav displayName="Krisna" avatarPath="preset:lime" />);

    const desktop = screen.getByRole("navigation", { name: "Navigasi aplikasi" });
    expect(within(desktop).queryByRole("link", { name: /profil/i })).not.toBeInTheDocument();

    const accountButton = screen.getByRole("button", { name: "Buka menu akun" });
    expect(accountButton).toHaveAttribute("aria-expanded", "false");

    await user.click(accountButton);

    expect(accountButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Pengaturan profil" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("button", { name: "Keluar" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Foto profil Krisna" })).toHaveLength(1);
  });

  it("shows admin entry points only for an administrator", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AppNav displayName="Siswa" />);
    expect(screen.queryByRole("link", { name: /^Admin$/i })).not.toBeInTheDocument();

    rerender(<AppNav displayName="Krisna" isAdmin />);
    expect(screen.getByRole("link", { name: /^Admin$/i })).toHaveAttribute("href", "/admin");

    await user.click(screen.getByRole("button", { name: "Buka menu akun" }));
    expect(screen.getByRole("link", { name: "Buka Admin Panel" })).toHaveAttribute("href", "/admin");
  });
});
