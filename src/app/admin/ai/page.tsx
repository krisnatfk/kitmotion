import { Icon } from "@/components/ui/icons";
import { AdminAIProviders } from "@/features/admin/admin-ai-providers";
import { adminGetAIProviderRegistry } from "@/features/admin/ai-provider-queries";
import { requireAdmin } from "@/features/admin/guard";

export default async function AdminAIProvidersPage() {
  await requireAdmin("/admin/ai");
  const { providers, error: registryError } = await adminGetAIProviderRegistry();
  const healthy = providers.filter((item) => item.isActive && item.healthStatus === "healthy").length;
  return (
    <div className="space-y-xl">
      <header className="flex flex-col gap-lg tablet-narrow:flex-row tablet-narrow:items-end tablet-narrow:justify-between"><div><p className="eyebrow text-sport-lime-deep">AI infrastructure</p><h1 className="mt-md font-display text-5xl uppercase leading-none tablet-narrow:text-6xl">Provider AI</h1><p className="mt-md max-w-2xl text-sm leading-relaxed text-mute">Kelola koneksi AI yang digunakan Coach, riwayat, rekomendasi harian, dan insight guru.</p></div><div className="flex gap-sm"><span className="rounded-full bg-white px-md py-sm text-xs font-semibold">{providers.length} tersedia</span><span className="rounded-full bg-sport-lime px-md py-sm text-xs font-semibold">{healthy} sehat</span></div></header>
      {registryError && <section className="flex items-start gap-md rounded-sm border border-[#f0c36a] bg-[#fff7df] p-lg"><Icon name="bolt" className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Migration provider belum terpasang</p><p className="mt-xs text-xs leading-relaxed text-mute">{registryError}</p></div></section>}
      <AdminAIProviders providers={providers} />
    </div>
  );
}
