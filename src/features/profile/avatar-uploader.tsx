"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { uploadAvatarAction } from "@/features/auth/actions";
import { broadcastProfileAvatarUpdated, ProfileAvatar } from "./avatar";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUploader({
  displayName,
  avatarPath,
  onUploaded,
}: {
  displayName: string;
  avatarPath: string | null;
  onUploaded: (avatarPath: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ error?: string; message?: string } | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function selectFile(nextFile?: File) {
    setStatus(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setStatus({ error: "Gunakan gambar JPG, PNG, atau WebP." });
      return;
    }
    if (nextFile.size > MAX_AVATAR_BYTES) {
      setStatus({ error: "Ukuran foto maksimal 5 MB." });
      return;
    }
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function upload() {
    if (!file || pending) return;
    setPending(true);
    setStatus(null);
    const formData = new FormData();
    formData.set("avatar", file);
    const result = await uploadAvatarAction(formData);
    setPending(false);
    setStatus(result);
    if (result.avatarPath) {
      broadcastProfileAvatarUpdated(result.avatarPath);
      onUploaded(result.avatarPath);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    }
  }

  return (
    <section className="relative overflow-hidden rounded-sm bg-sport-black p-lg text-white tablet-narrow:p-xl" aria-labelledby="avatar-upload-title">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[32px] border-white/[0.04]" aria-hidden="true" />
      <div className="relative flex flex-col gap-lg tablet-narrow:flex-row tablet-narrow:items-center">
        <ProfileAvatar avatarPath={avatarPath} displayName={displayName} imageUrl={previewUrl} className="h-24 w-24 border-4 border-white/10 text-4xl tablet-narrow:h-28 tablet-narrow:w-28" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sport-lime">Profil atlet</p>
          <h3 id="avatar-upload-title" className="mt-xs font-display text-3xl uppercase tablet-narrow:text-4xl">{displayName}</h3>
          <p className="mt-sm max-w-xl text-xs leading-relaxed text-white/55">Gunakan foto JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.</p>
          <div className="mt-md flex flex-wrap gap-sm">
            <label className="btn-secondary cursor-pointer">
              <Icon name="camera" className="h-4 w-4" /> Ganti foto
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} />
            </label>
            {file && <Button type="button" onClick={upload} disabled={pending}>{pending ? "Mengunggah..." : "Unggah foto"}</Button>}
          </div>
          {status?.error && <p className="mt-sm text-xs text-[#ffad7a]" role="alert">{status.error}</p>}
          {status?.message && <p className="mt-sm text-xs text-sport-lime" role="status">{status.message}</p>}
        </div>
      </div>
    </section>
  );
}
