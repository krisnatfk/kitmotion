"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldError, FormError, Input, Label } from "@/components/ui/field";
import { saveExerciseAction, type AdminResult } from "./actions";

type Difficulty = "beginner" | "intermediate" | "advanced";

interface Props {
  defaultValues?: {
    id?: string;
    slug: string;
    name: string;
    description: string;
    difficulty: Difficulty;
    camera_position: string;
    default_target_reps: number | null;
    default_target_seconds: number | null;
    is_active: boolean;
    sort_order: number;
  };
}

export function AdminExerciseForm({ defaultValues }: Props) {
  const router = useRouter();
  const [server, setServer] = useState<AdminResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<{
    slug: string;
    name: string;
    description: string;
    difficulty: Difficulty;
    camera_position: string;
    default_target_reps: number | null;
    default_target_seconds: number | null;
    is_active: boolean;
    sort_order: number;
  }>({
    slug: defaultValues?.slug ?? "",
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
    difficulty: defaultValues?.difficulty ?? "beginner",
    camera_position: defaultValues?.camera_position ?? "",
    default_target_reps: defaultValues?.default_target_reps ?? 15,
    default_target_seconds: defaultValues?.default_target_seconds ?? null,
    is_active: defaultValues?.is_active ?? true,
    sort_order: defaultValues?.sort_order ?? 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setServer(null);
    setErrors({});

    if (!form.slug || !form.name || !form.description || !form.camera_position) {
      setErrors({ _: "Semua field bertanda wajib diisi." });
      setSubmitting(false);
      return;
    }

    const result = await saveExerciseAction({
      id: defaultValues?.id,
      slug: form.slug,
      name: form.name,
      description: form.description,
      difficulty: form.difficulty,
      camera_position: form.camera_position,
      default_target_reps: form.default_target_reps ? Number(form.default_target_reps) : null,
      default_target_seconds: form.default_target_seconds
        ? Number(form.default_target_seconds)
        : null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    });
    setSubmitting(false);
    setServer(result);
    if (result.ok) {
      router.refresh();
      if (!defaultValues?.id) {
        router.push("/admin/exercises");
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-lg" noValidate>
      {server?.error && <FormError>{server.error}</FormError>}
      {errors._ && <FormError>{errors._}</FormError>}
      {defaultValues?.id && (
        <p className="text-caption-md text-success">Menyunting latihan yang ada.</p>
      )}

      <div className="grid gap-lg tablet-narrow:grid-cols-2">
        <div>
          <Label htmlFor="slug">Slug*</Label>
          <Input
            id="slug"
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="squat"
            disabled={!!defaultValues?.id}
          />
          <FieldError>{errors.slug}</FieldError>
        </div>
        <div>
          <Label htmlFor="name">Nama*</Label>
          <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Deskripsi*</Label>
        <textarea
          id="description"
          className="input-pill min-h-24 py-md"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="grid gap-lg tablet-narrow:grid-cols-2">
        <div>
          <Label htmlFor="difficulty">Kesulitan</Label>
          <select
            id="difficulty"
            className="input-pill"
            value={form.difficulty}
            onChange={(e) => update("difficulty", e.target.value as Difficulty)}
          >
            <option value="beginner">Pemula</option>
            <option value="intermediate">Menengah</option>
            <option value="advanced">Lanjutan</option>
          </select>
        </div>
        <div>
          <Label htmlFor="sort_order">Urutan</Label>
          <Input
            id="sort_order"
            type="number"
            value={String(form.sort_order)}
            onChange={(e) => update("sort_order", Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="camera_position">Posisi kamera*</Label>
        <textarea
          id="camera_position"
          className="input-pill min-h-20 py-md"
          value={form.camera_position}
          onChange={(e) => update("camera_position", e.target.value)}
        />
      </div>

      <div className="grid gap-lg tablet-narrow:grid-cols-2">
        <div>
          <Label htmlFor="default_target_reps">Target repetisi</Label>
          <Input
            id="default_target_reps"
            type="number"
            value={String(form.default_target_reps ?? "")}
            onChange={(e) => update("default_target_reps", e.target.value ? Number(e.target.value) : null)}
          />
        </div>
        <div>
          <Label htmlFor="default_target_seconds">Target durasi (detik)</Label>
          <Input
            id="default_target_seconds"
            type="number"
            value={String(form.default_target_seconds ?? "")}
            onChange={(e) => update("default_target_seconds", e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>

      <label className="flex items-center gap-sm text-body-md">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => update("is_active", e.target.checked)}
        />
        Aktif
      </label>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan…" : defaultValues?.id ? "Simpan perubahan" : "Buat latihan"}
      </Button>
    </form>
  );
}
