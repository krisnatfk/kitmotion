import Link from "next/link";
import { requireAdmin } from "@/features/admin/guard";
import { adminListSessions } from "@/features/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  await requireAdmin("/admin/sessions");
  const sessions = await adminListSessions(100);

  return (
    <div className="space-y-section">
      <h1 className="text-heading-xl">Sesi</h1>
      <p className="text-body-md text-charcoal">
        {sessions.length} sesi terbaru (semua pengguna).
      </p>

      <section className="overflow-x-auto">
        <table className="w-full text-caption-md">
          <thead>
            <tr className="border-b border-hairline text-mute">
              <th className="py-md text-left font-medium">Pengguna</th>
              <th className="py-md text-left font-medium">Latihan</th>
              <th className="py-md text-right font-medium">Skor</th>
              <th className="py-md text-right font-medium">Valid</th>
              <th className="py-md text-left font-medium">Selesai</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-hairline-soft">
                <td className="py-md">
                  <Link href={`/history/${s.id}`} className="hover:underline">
                    {s.profiles?.full_name ?? "—"}
                  </Link>
                </td>
                <td className="py-md">{s.exercises?.name ?? "—"}</td>
                <td className="py-md text-right font-display">
                  {s.final_score != null ? Math.round(Number(s.final_score)) : "—"}
                </td>
                <td className="py-md text-right">{s.valid_reps}</td>
                <td className="py-md">
                  {s.completed_at ? new Date(s.completed_at).toLocaleString("id-ID") : "—"}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="py-lg text-mute">
                  Belum ada sesi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
