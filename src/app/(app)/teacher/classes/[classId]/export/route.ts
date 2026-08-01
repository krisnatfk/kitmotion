import type { NextRequest } from "next/server";
import { buildTeacherClassReportPdf } from "@/features/classes/pdf-report";
import {
  getTeacherClassReport,
  type TeacherReportFilters,
} from "@/features/classes/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> },
) {
  const { classId } = await params;
  const filters = readFilters(request.nextUrl.searchParams);
  const report = await getTeacherClassReport(classId, filters);
  const generatedAt = new Date();
  const pdf = await buildTeacherClassReportPdf(report, filters, generatedAt);
  const date = generatedAt.toISOString().slice(0, 10);
  const fileName = `laporan-${fileSlug(report.classroom.name)}-${date}.pdf`;

  return new Response(pdf as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function readFilters(searchParams: URLSearchParams): TeacherReportFilters {
  return {
    student: valueOrUndefined(searchParams.get("student")),
    exercise: valueOrUndefined(searchParams.get("exercise")),
    from: valueOrUndefined(searchParams.get("from")),
    to: valueOrUndefined(searchParams.get("to")),
  };
}

function valueOrUndefined(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function fileSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "kelas";
}
