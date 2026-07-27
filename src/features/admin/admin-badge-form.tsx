"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError, Input, Label } from "@/components/ui/field";
import { saveBadgeAction, type AdminResult } from "./actions";

export function AdminBadgeForm() {
  const router = useRouter();
  const [server, setServer] = useState<AdminResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    xp_reward: 20,
    is_active: true,
    criteria: '{"type":"total_sessions","target":1}',
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
    const result = await saveBadgeAction({
      code: form.code,
      name: form.name,
      description: form.description,
      xp_reward: Number(form.xp_reward),
      is_active: form.is_active,
      criteria: criteriaObj,
    });
    setSubmitting(false);
    setServer(result);
    if (result.ok) {
      setForm({
        code: "",
        name: "",
        description: "",
        xp_reward: 20,
        is_active: true,
        criteria: '{"type":"total_sessions","target":1}',
      });
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-lg" noValidate>
      {server?.error && <FormError>{server.error}</FormError>}
      <div className="grid gap-lg tablet-narrow:grid-cols-2">
        <div>
          <Label htmlFor="b-code">Code</Label>
          <Input id="b-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="b-name">Nama</Label>
          <Input id="b-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label htmlFor="b-desc">Deskripsi</Label>
        <Input id="b-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid gap-lg tablet-narrow:grid-cols-2">
        <div>
          <Label htmlFor="b-xp">XP reward</Label>
          <Input id="b-xp" type="number" value={String(form.xp_reward)} onChange={(e) => setForm((f) => ({ ...f, xp_reward: Number(e.target.value) }))} />
        </div>
        <div>
          <Label htmlFor="b-criteria">Criteria (JSON)</Label>
          <Input id="b-criteria" className="font-mono" value={form.criteria} onChange={(e) => setForm((f) => ({ ...f, criteria: e.target.value }))} />
        </div>
      </div>
      <label className="flex items-center gap-sm text-body-md">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
        Aktif
      </label>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan…" : "Buat badge"}
      </Button>
    </form>
  );
}
