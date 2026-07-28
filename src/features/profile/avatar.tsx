"use client";

import { useEffect, useState } from "react";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const PROFILE_AVATAR_UPDATED_EVENT = "kitmotion:profile-avatar-updated";

export function broadcastProfileAvatarUpdated(avatarPath: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, { detail: { avatarPath } }));
}

export const AVATAR_PRESETS: Record<string, string> = {
  "preset:blue": "bg-[#9bd7ff]",
  "preset:orange": "bg-[#ffad7a]",
  "preset:violet": "bg-[#d4c5ff]",
  "preset:lime": "bg-sport-lime",
};

export function getAvatarPublicUrl(avatarPath?: string | null) {
  if (!avatarPath || avatarPath.startsWith("preset:") || !env.supabaseUrl) return null;
  const safePath = avatarPath.split("/").map(encodeURIComponent).join("/");
  try {
    return new URL(`/storage/v1/object/public/profile-avatars/${safePath}`, env.supabaseUrl).toString();
  } catch {
    return null;
  }
}

export function ProfileAvatar({
  avatarPath,
  displayName,
  className,
  imageUrl,
}: {
  avatarPath?: string | null;
  displayName: string;
  className?: string;
  imageUrl?: string | null;
}) {
  const [currentPath, setCurrentPath] = useState(avatarPath);

  useEffect(() => setCurrentPath(avatarPath), [avatarPath]);
  useEffect(() => {
    function handleAvatarUpdate(event: Event) {
      const nextPath = (event as CustomEvent<{ avatarPath: string | null }>).detail?.avatarPath;
      if (typeof nextPath === "string" || nextPath === null) setCurrentPath(nextPath);
    }
    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleAvatarUpdate);
    return () => window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, handleAvatarUpdate);
  }, []);

  const resolvedImage = imageUrl ?? getAvatarPublicUrl(currentPath);
  const presetClass = AVATAR_PRESETS[currentPath ?? ""] ?? "bg-sport-lime";
  const initial = displayName.trim().slice(0, 1).toUpperCase() || "K";

  return (
    <span
      role="img"
      aria-label={`Foto profil ${displayName}`}
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-cover bg-center font-display text-black",
        presetClass,
        className,
      )}
      style={resolvedImage ? { backgroundImage: `url("${resolvedImage}")` } : undefined}
    >
      {!resolvedImage && initial}
    </span>
  );
}
