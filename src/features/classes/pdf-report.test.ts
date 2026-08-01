import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildTeacherClassReportPdf } from "./pdf-report";
import type { TeacherClassReport } from "./queries";

function sampleReport(sessionCount = 4): TeacherClassReport {
  const students = [
    { id: "student-1", full_name: "Andi Pratama", class_name: "VIII A", level: 4, xp: 740, challengesCompleted: 3 },
    { id: "student-2", full_name: "Siti Rahmawati", class_name: "VIII A", level: 5, xp: 1510, challengesCompleted: 5 },
  ];
  const rows = Array.from({ length: sessionCount }, (_, index) => {
    const student = students[index % students.length]!;
    return {
      id: `session-${index}`,
      user_id: student.id,
      exercise_id: index % 2 ? "exercise-2" : "exercise-1",
      completed_at: new Date(Date.UTC(2026, 6, 1 + (index % 28), 3, 30)).toISOString(),
      duration_seconds: 120 + index,
      valid_reps: 8 + (index % 12),
      invalid_reps: index % 3,
      final_score: 72 + (index % 24),
      metadata: {},
      validDurationSeconds: 0,
      studentName: student.full_name,
      exerciseName: index % 2 ? "Sit-up" : "Squat",
      exerciseSlug: index % 2 ? "sit-up" : "squat",
      level: student.level,
      xp: student.xp,
    };
  });
  return {
    classroom: { id: "class-1", name: "PJOK VIII A", school_year: "2026/2027", teacher_id: "teacher-1" },
    teacher: { id: "teacher-1", full_name: "Budi Santoso, S.Pd." },
    students,
    exercises: [
      { id: "exercise-1", slug: "squat", name: "Squat" },
      { id: "exercise-2", slug: "sit-up", name: "Sit-up" },
    ],
    summary: {
      totalSessions: rows.length,
      totalReps: rows.reduce((sum, row) => sum + row.valid_reps, 0),
      validDurationSeconds: rows.reduce((sum, row) => sum + row.validDurationSeconds, 0),
      averageScore: Math.round(rows.reduce((sum, row) => sum + Number(row.final_score), 0) / Math.max(1, rows.length)),
      durationSeconds: rows.reduce((sum, row) => sum + row.duration_seconds, 0),
    },
    rows,
    commonIssues: [
      { code: "range", message: "Rentang gerakan belum penuh dan perlu ditingkatkan secara bertahap.", count: 12 },
      { code: "stability", message: "Posisi tubuh belum stabil selama menyelesaikan repetisi.", count: 8 },
    ],
    weekly: Array.from({ length: 8 }, (_, index) => ({
      week: `2026-0${index < 4 ? 6 : 7}-${String(2 + (index % 4) * 7).padStart(2, "0")}`,
      sessions: 3 + index,
      averageScore: 70 + index * 3,
    })),
  } as TeacherClassReport;
}

describe("buildTeacherClassReportPdf", () => {
  it("creates a valid, metadata-labeled PDF", async () => {
    const bytes = await buildTeacherClassReportPdf(
      sampleReport(),
      { exercise: "sit-up", from: "2026-07-01", to: "2026-07-31" },
      new Date("2026-08-01T03:00:00Z"),
    );
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const document = await PDFDocument.load(bytes);
    expect(document.getTitle()).toBe("Laporan Kelas PJOK VIII A");
    expect(document.getAuthor()).toBe("KITMOTION");
    expect(document.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("paginates a long activity table", async () => {
    const bytes = await buildTeacherClassReportPdf(
      sampleReport(90),
      {},
      new Date("2026-08-01T03:00:00Z"),
    );
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(3);
  });
});
