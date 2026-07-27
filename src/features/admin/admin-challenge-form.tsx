"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError, Input, Label } from "@/components/ui/field";
import { saveChallengeAction, type AdminResult } from "./actions";

function isoOffsetDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 16);
}

export function AdminChallengeForm() {
  const router = useRouter();
  const [server, setServer] = useState<AdminResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: "",
    title: "",
    description: "",
    period: "daily" as "daily" | "weekly" | "custom",
    startsAt: isoOffsetDays(0),
    endsAt: isoOffsetDays(30),
    xpReward: 30,
    isActive: true,
    criteria: '{"type":"session_reps","exercise_slug":"squat","target":30}',
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setServer(null);
    let criteriaObj: Record<string, unknown> = {};
    try {
      criteriaObj = JSON.parse(form.criteria);
    } catch {
      setServer({ error: "Criteria bukan JSON valid." });
      setSubmitting(false);
      return;
    }
    const result = await saveChallengeAction({
      code: form.code,
      title: form.title,
      description: form.description,
      period: form.period,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      xpReward: Number(form.xpReward),
      isActive: form.isActive,
      criteria: criteriaObj,
    });
    setSubmitting(false);
    setServer(result);
    if (result.ok) {
      setForm((f) => ({ ...f, code: "", title: "", description: "" }));
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-lg" noValidate>
      {server?.error && <FormError>{server.error}</FormError>}
      <div className="grid gap-lg tablet-narrow:grid-cols-2">
        <div>
          <Label htmlFor="c-code">Code</Label>
          <Input id="c-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="c-title">Judul</Label>
          <Input id="c-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label htmlFor="c-desc">Deskripsi</Label>
        <Input id="c-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid gap-lg tablet-narrow:grid-cols-2">
        <div>
          <Label htmlFor="c-period">Periode</Label>
          <select id="c-period" className="input-pill" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value as typeof form.period }))}>
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="custom">Kustom</option>
          </select>
        </div>
        <div>
          <Label htmlFor="c-xp">XP reward</Label>
          <Input id="c-xp" type="number" value={String(form.xpReward)} onChange={(e) => setForm((f) => ({ ...f, xpReward: Number(e.target.value) }))} />
        </div>
      </div>
      <div className="grid gap-lg tablet-narrow:grid-cols-2">
        <div>
          <Label htmlFor="c-start">Mulai</Label>
          <Input id="c-start" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="c-end">Selesai</Label>
          <Input id="c-end" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label htmlFor="c-criteria">Criteria (JSON)</Label>
        <Input id="c-criteria" className="font-mono" value={form.criteria} onChange={(e) => setForm((f) => ({ ...f, criteria: e.target.value }))} />
      </div>
      <label className="flex items-center gap-sm text-body-md">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
        Aktif
      </label>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan…" : "Buat challenge"}
      </Button>
    </form>
  );
}
