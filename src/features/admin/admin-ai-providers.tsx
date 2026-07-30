"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Input, Label, PasswordInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icons";
import {
  deleteAIProviderAction,
  importEnvironmentAIProviderAction,
  saveAIProviderAction,
  setAIProviderActiveAction,
  testAIProviderAction,
  testAIProviderFeaturesAction,
  testEnvironmentAIProviderAction,
} from "./ai-provider-actions";
import type { AdminAIProviderRow } from "./ai-provider-queries";
import type { AdminResult } from "./actions";

const EMPTY_FORM = { name: "", baseUrl: "", apiKey: "", model: "", priority: 10, isActive: true };

export function AdminAIProviders({ providers }: { providers: AdminAIProviderRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState<AdminResult | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const databaseProviders = providers.filter((item) => item.source === "database");

  function editProvider(provider: AdminAIProviderRow) {
    if (!provider.id) return;
    setEditingId(provider.id);
    setForm({
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: "",
      model: provider.model,
      priority: provider.priority,
      isActive: provider.isActive,
    });
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusyAction("save");
    setResult(null);
    const response = await saveAIProviderAction({
      ...(editingId ? { id: editingId } : {}),
      ...form,
      priority: Number(form.priority),
    });
    setBusyAction(null);
    setResult(response);
    if (response.ok) {
      resetForm();
      router.refresh();
    }
  }

  async function run(id: string, action: "test" | "features" | "toggle" | "delete", active?: boolean) {
    if (action === "delete" && !window.confirm("Hapus provider AI ini?")) return;
    setBusyAction(`${action}:${id}`);
    setResult(null);
    const response = action === "test"
      ? await testAIProviderAction(id)
      : action === "features"
        ? await testAIProviderFeaturesAction(id)
      : action === "toggle"
        ? await setAIProviderActiveAction(id, Boolean(active))
        : await deleteAIProviderAction(id);
    setBusyAction(null);
    setResult(response);
    router.refresh();
    if (action === "delete" && editingId === id) resetForm();
  }

  async function runEnvironment(action: "test" | "import") {
    setBusyAction(`environment:${action}`);
    setResult(null);
    const response = action === "test"
      ? await testEnvironmentAIProviderAction()
      : await importEnvironmentAIProviderAction();
    setBusyAction(null);
    setResult(response);
    router.refresh();
  }

  return (
    <div className="grid gap-lg desktop:grid-cols-[minmax(380px,0.8fr)_minmax(0,1.2fr)] desktop:items-start">
      <section className="rounded-sm border border-black/[0.08] bg-white p-lg tablet-narrow:p-xl">
        <div className="mb-xl flex items-start justify-between gap-md border-b border-black/[0.08] pb-lg">
          <div><p className="font-semibold">{editingId ? "Ubah provider" : "Tambah provider"}</p><p className="mt-xs text-xs text-mute">Credential disimpan terenkripsi di server.</p></div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sport-lime"><Icon name="bolt" className="h-5 w-5" /></span>
        </div>
        <form onSubmit={submit} className="space-y-lg" noValidate>
          {result?.error && <FormError>{result.error}</FormError>}
          {result?.ok && result.message && <FormSuccess>{result.message}</FormSuccess>}
          <div><Label htmlFor="ai-name">Nama provider</Label><Input id="ai-name" required value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="DeepSeek utama" /></div>
          <div><Label htmlFor="ai-base-url">Base URL</Label><Input id="ai-base-url" type="url" required value={form.baseUrl} onChange={(event) => setForm((value) => ({ ...value, baseUrl: event.target.value }))} placeholder="https://provider.example/v1" autoCapitalize="none" spellCheck={false} /></div>
          <div><Label htmlFor="ai-key">API key</Label><PasswordInput id="ai-key" value={form.apiKey} onChange={(event) => setForm((value) => ({ ...value, apiKey: event.target.value }))} placeholder={editingId ? "Biarkan kosong untuk mempertahankan key" : "Masukkan API key"} autoComplete="new-password" /></div>
          <div className="grid gap-lg tablet-narrow:grid-cols-[minmax(0,1fr)_120px]">
            <div><Label htmlFor="ai-model">Model</Label><Input id="ai-model" required value={form.model} onChange={(event) => setForm((value) => ({ ...value, model: event.target.value }))} placeholder="deepseek-chat" autoCapitalize="none" spellCheck={false} /></div>
            <div><Label htmlFor="ai-priority">Prioritas</Label><Input id="ai-priority" type="number" min={0} max={9999} value={String(form.priority)} onChange={(event) => setForm((value) => ({ ...value, priority: Number(event.target.value) }))} /></div>
          </div>
          <label className="flex min-h-11 items-center gap-sm text-sm font-semibold"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))} />Aktif setelah disimpan</label>
          <div className="flex flex-wrap gap-sm"><Button type="submit" disabled={busyAction === "save"}>{busyAction === "save" ? "Menguji..." : editingId ? "Tes & simpan perubahan" : "Tes & simpan provider"}</Button>{editingId && <Button type="button" variant="secondary" onClick={resetForm}>Batal</Button>}</div>
        </form>
      </section>

      <section className="overflow-hidden rounded-sm border border-black/[0.08] bg-white">
        <div className="flex items-center justify-between gap-md border-b border-black/[0.08] p-lg"><div><p className="font-semibold">Urutan failover</p><p className="mt-xs text-xs text-mute">Angka prioritas terkecil digunakan lebih dahulu.</p></div><span className="rounded-full bg-sport-lime px-md py-sm text-xs font-semibold">{databaseProviders.filter((item) => item.isActive).length} aktif</span></div>
        <div className="divide-y divide-black/[0.08]">
          {providers.map((provider) => <ProviderRow key={provider.id ?? "environment"} provider={provider} busyAction={busyAction} onEdit={editProvider} onRun={run} onRunEnvironment={runEnvironment} />)}
          {providers.length === 0 && <div className="grid min-h-52 place-items-center p-xl text-center"><div><Icon name="bolt" className="mx-auto h-8 w-8 text-mute" /><p className="mt-md font-semibold">Belum ada provider</p><p className="mt-xs text-xs text-mute">Tambahkan provider pertama untuk mengaktifkan AI.</p></div></div>}
        </div>
      </section>
    </div>
  );
}

function ProviderRow({ provider, busyAction, onEdit, onRun, onRunEnvironment }: { provider: AdminAIProviderRow; busyAction: string | null; onEdit: (provider: AdminAIProviderRow) => void; onRun: (id: string, action: "test" | "features" | "toggle" | "delete", active?: boolean) => Promise<void>; onRunEnvironment: (action: "test" | "import") => Promise<void> }) {
  const id = provider.id;
  const host = safeHost(provider.baseUrl);
  const busy = id ? busyAction?.endsWith(id) : false;
  return (
    <article className={`p-lg ${!provider.isActive ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-md tablet-narrow:flex-row tablet-narrow:items-start tablet-narrow:justify-between">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-sm"><span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLE[provider.healthStatus]}`} /><h2 className="font-semibold">{provider.name}</h2><span className="rounded-full bg-soft-cloud px-sm py-xs text-[9px] font-bold uppercase tracking-wider">{provider.source === "environment" ? "ENV fallback" : `P${provider.priority}`}</span></div><p className="mt-sm break-all text-xs text-mute">{host} · {provider.model}</p></div>
        <div className="flex shrink-0 items-center gap-sm"><span className="text-[9px] font-bold uppercase tracking-wider text-mute">{STATUS_LABEL[provider.healthStatus]}</span>{provider.lastLatencyMs != null && <span className="text-xs font-semibold">{provider.lastLatencyMs} ms</span>}</div>
      </div>
      <div className="mt-md flex flex-wrap gap-sm text-[10px] text-mute"><span>{provider.responseFormat}</span>{provider.lastCheckedAt && <span>· diuji {formatDate(provider.lastCheckedAt)}</span>}{provider.consecutiveFailures > 0 && <span className="text-danger">· {provider.consecutiveFailures} gagal</span>}</div>
      {provider.lastError && <p className="mt-sm rounded-sm bg-red-50 px-md py-sm text-xs text-danger">{provider.lastError}</p>}
      {id && <div className="mt-md flex flex-wrap gap-sm border-t border-black/[0.08] pt-md"><Button type="button" variant="secondary" disabled={busy} onClick={() => onRun(id, "test")}>Tes koneksi</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => onRun(id, "features")}>Tes 4 fitur</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => onEdit(provider)}><Icon name="edit" className="h-4 w-4" /> Ubah</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => onRun(id, "toggle", !provider.isActive)}>{provider.isActive ? "Nonaktifkan" : "Aktifkan"}</Button><Button type="button" variant="ghost" className="text-danger" disabled={busy} aria-label={`Hapus ${provider.name}`} onClick={() => onRun(id, "delete")}><Icon name="trash" className="h-4 w-4" /></Button></div>}
      {!id && <div className="mt-md flex flex-wrap gap-sm border-t border-black/[0.08] pt-md"><Button type="button" variant="secondary" disabled={busyAction?.startsWith("environment")} onClick={() => onRunEnvironment("test")}>Tes ENV</Button><Button type="button" variant="ghost" disabled={busyAction?.startsWith("environment")} onClick={() => onRunEnvironment("import")}>Impor ke registry</Button></div>}
    </article>
  );
}

const STATUS_LABEL = { unchecked: "Belum diuji", healthy: "Sehat", degraded: "Terganggu", unhealthy: "Tidak sehat" } as const;
const STATUS_STYLE = { unchecked: "bg-stone", healthy: "bg-success-bright", degraded: "bg-warning", unhealthy: "bg-danger" } as const;

function safeHost(value: string) { try { return new URL(value).host; } catch { return value; } }
function formatDate(value: string) { return new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }); }
