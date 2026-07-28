import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppNav } from "./app-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
}));

describe("AppNav", () => {
  it("keeps profile only in the mobile tabs because desktop already has an avatar button", () => {
    render(<AppNav displayName="Krisna" avatarPath="preset:lime" />);

    const desktop = screen.getByRole("navigation", { name: "Navigasi aplikasi" });
    const mobile = screen.getByRole("navigation", { name: "Navigasi aplikasi seluler" });

    expect(within(desktop).queryByRole("link", { name: /profil/i })).not.toBeInTheDocument();
    expect(within(mobile).getByRole("link", { name: /profil/i })).toBeInTheDocument();
    const profileLink = screen.getByRole("link", { name: "Buka profil" });
    expect(profileLink).toHaveAttribute("aria-current", "page");
    expect(profileLink).not.toHaveClass("ring-2", "ring-sport-black", "ring-offset-2");
    expect(screen.getAllByRole("img", { name: "Foto profil Krisna" })).toHaveLength(2);
  });
});
