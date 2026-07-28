import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { broadcastProfileAvatarUpdated, getAvatarPublicUrl, ProfileAvatar } from "./avatar";

vi.mock("@/lib/env", () => ({
  env: { supabaseUrl: "https://example.supabase.co" },
}));

describe("ProfileAvatar", () => {
  it("uses an initial for preset avatars", () => {
    render(<ProfileAvatar avatarPath="preset:blue" displayName="Krisna" />);
    expect(screen.getByRole("img", { name: "Foto profil Krisna" })).toHaveTextContent("K");
  });

  it("builds the public storage URL only for uploaded avatars", () => {
    expect(getAvatarPublicUrl("preset:lime")).toBeNull();
    expect(getAvatarPublicUrl("123/avatar-file.webp")).toContain("/storage/v1/object/public/profile-avatars/123/avatar-file.webp");
  });

  it("synchronizes every mounted avatar after an upload", () => {
    render(<><ProfileAvatar avatarPath="preset:lime" displayName="Krisna" /><ProfileAvatar avatarPath="preset:lime" displayName="Krisna" /></>);
    act(() => broadcastProfileAvatarUpdated("123/avatar-file.webp"));
    for (const avatar of screen.getAllByRole("img", { name: "Foto profil Krisna" })) {
      expect(avatar).toHaveStyle({ backgroundImage: 'url("https://example.supabase.co/storage/v1/object/public/profile-avatars/123/avatar-file.webp")' });
      expect(avatar).not.toHaveTextContent("K");
    }
  });
});
