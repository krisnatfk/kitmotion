"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FieldError, FormError, FormSuccess, Input, Label } from "@/components/ui/field";
import { updateProfileAction } from "@/features/auth/actions";
import { profileSchema, type ProfileInput } from "@/features/auth/schemas";
import type { School } from "./queries";

export function ProfileForm({
  defaultValues,
  schools,
}: {
  defaultValues: {
    full_name: string;
    class_name: string | null;
    school_id: string | null;
    avatar_path: string | null;
  };
  schools: School[];
}) {
  const [server, setServer] = useState<{ error?: string; message?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: defaultValues.full_name,
      class_name: defaultValues.class_name ?? "",
      school_id: defaultValues.school_id ?? "",
      avatar_path: defaultValues.avatar_path ?? "",
    },
  });

  const selectedAvatar = watch("avatar_path") ?? "";

  async function onSubmit(values: ProfileInput) {
    setSubmitting(true);
    setServer(null);
    const result = await updateProfileAction(values);
    setSubmitting(false);
    setServer(result);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg" noValidate>
      {server?.error && <FormError>{server.error}</FormError>}
      {server?.message && <FormSuccess>{server.message}</FormSuccess>}

      <fieldset>
        <legend className="mb-sm text-caption-md text-charcoal">Gaya avatar</legend>
        <div className="flex flex-wrap gap-sm">
          {[
            { value: "", label: "Otomatis", color: "bg-soft-cloud" },
            { value: "preset:lime", label: "Lime", color: "bg-sport-lime" },
            { value: "preset:blue", label: "Biru", color: "bg-[#9bd7ff]" },
            { value: "preset:orange", label: "Oranye", color: "bg-[#ffad7a]" },
            { value: "preset:violet", label: "Violet", color: "bg-[#d4c5ff]" },
          ].map((avatar) => (
            <label key={avatar.value || "auto"} className={`cursor-pointer rounded-full border p-1 transition-colors ${selectedAvatar === avatar.value ? "border-ink" : "border-transparent"}`} title={avatar.label}>
              <input type="radio" value={avatar.value} className="sr-only" {...register("avatar_path")} />
              <span className={`grid h-10 w-10 place-items-center rounded-full ${avatar.color} font-display text-lg`} aria-hidden="true">{defaultValues.full_name.slice(0, 1).toUpperCase()}</span>
              <span className="sr-only">{avatar.label}</span>
            </label>
          ))}
        </div>
        <FieldError>{errors.avatar_path?.message}</FieldError>
      </fieldset>

      <div>
        <Label htmlFor="full_name">Nama lengkap</Label>
        <Input
          id="full_name"
          autoComplete="name"
          aria-invalid={!!errors.full_name}
          {...register("full_name")}
        />
        <FieldError>{errors.full_name?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="school_id">Sekolah</Label>
        <select
          id="school_id"
          className="input-pill"
          aria-invalid={!!errors.school_id}
          {...register("school_id")}
        >
          <option value="">— Pilih sekolah —</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {schools.length === 0 && (
          <p className="mt-xs text-caption-sm text-mute">
            Belum ada sekolah terdaftar. Hubungi admin.
          </p>
        )}
        <FieldError>{errors.school_id?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="class_name">Kelas</Label>
        <Input
          id="class_name"
          placeholder="Mis. XII IPA 1"
          aria-invalid={!!errors.class_name}
          {...register("class_name")}
        />
        <FieldError>{errors.class_name?.message}</FieldError>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan…" : "Simpan profil"}
      </Button>
    </form>
  );
}
