"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FieldError, FormError, Input, Label } from "@/components/ui/field";
import { saveVersionAction, type AdminResult } from "./actions";

const ENGINE_KEYS = ["squat", "jumping-jack", "push-up"];

export function AdminVersionForm({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const [server, setServer] = useState<AdminResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    version: 2,
    engineKey: "squat",
    scoringVersion: "cam-v1",
    config: "{}",
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setServer(null);
    setError(null);

    let configObj: Record<string, unknown> = {};
    try {
      configObj = form.config.trim() ? JSON.parse(form.config) : {};
    } catch {
      setError("Config bukan JSON valid.");
      setSubmitting(false);
      return;
    }

    const result = await saveVersionAction({
      exerciseId,
      version: Number(form.version),
      engineKey: form.engineKey,
      scoringVersion: form.scoringVersion,
      config: configObj,
      isActive: form.isActive,
    });
    setSubmitting(false);
    setServer(result);
    if (result.ok) router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-lg" noValidate>
      {server?.error && <FormError>{server.error}</FormError>}
      {error && <FormError>{error}</FormError>}

      <div className="grid gap-lg tablet-narrow:grid-cols-2">
        <div>
          <Label htmlFor="version">Versi</Label>
          <Input
            id="version"
            type="number"
            value={String(form.version)}
            onChange={(e) => setForm((f) => ({ ...f, version: Number(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="engineKey">Engine key</Label>
          <select
            id="engineKey"
            className="input-pill"
            value={form.engineKey}
            onChange={(e) => setForm((f) => ({ ...f, engineKey: e.target.value }))}
          >
            {ENGINE_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="scoringVersion">Scoring version</Label>
        <Input
          id="scoringVersion"
          value={form.scoringVersion}
          onChange={(e) => setForm((f) => ({ ...f, scoringVersion: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor="config">Config (JSON)</Label>
        <textarea
          id="config"
          className="input-pill min-h-32 py-md font-mono"
          value={form.config}
          onChange={(e) => setForm((f) => ({ ...f, config: e.target.value }))}
          placeholder='{"kneeBottomMax": 100}'
        />
        <FieldError>{error}</FieldError>
      </div>

      <label className="flex items-center gap-sm text-body-md">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
        />
        Aktif
      </label>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan…" : "Tambah versi"}
      </Button>
    </form>
  );
}
