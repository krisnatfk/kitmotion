import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import type {
  TeacherClassReport,
  TeacherReportFilters,
} from "./queries";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_HEIGHT = 38;

const COLORS = {
  ink: rgb(0.039, 0.043, 0.039),
  charcoal: rgb(0.18, 0.2, 0.18),
  muted: rgb(0.43, 0.45, 0.42),
  lime: rgb(0.784, 1, 0.18),
  limeDeep: rgb(0.5, 0.69, 0),
  cloud: rgb(0.96, 0.965, 0.95),
  line: rgb(0.87, 0.88, 0.85),
  white: rgb(1, 1, 1),
  danger: rgb(0.72, 0.2, 0.16),
};

type StudentReportRow = {
  id: string;
  name: string;
  sessions: number;
  validReps: number;
  validDurationSeconds: number;
  averageScore: number;
  durationSeconds: number;
  level: number;
  xp: number;
  challengesCompleted: number;
};

export async function buildTeacherClassReportPdf(
  report: TeacherClassReport,
  filters: TeacherReportFilters,
  generatedAt = new Date(),
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  document.setTitle(`Laporan Kelas ${report.classroom.name}`);
  document.setAuthor("KITMOTION");
  document.setSubject("Laporan hasil latihan siswa");
  document.setCreator("KITMOTION Teacher Report");
  document.setProducer("KITMOTION");
  document.setCreationDate(generatedAt);
  document.setModificationDate(generatedAt);

  const pages: PDFPage[] = [];
  let page = addPage(document, pages);
  let y = drawCoverHeader(page, report, generatedAt, bold, regular);

  const addContinuationPage = (section: string) => {
    page = addPage(document, pages);
    page.drawText("KITMOTION", { x: MARGIN, y: PAGE_HEIGHT - 31, size: 10, font: bold, color: COLORS.ink });
    page.drawText(safeText(section).toUpperCase(), { x: MARGIN + 82, y: PAGE_HEIGHT - 30, size: 7, font: bold, color: COLORS.muted });
    page.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - 40 }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 40 }, thickness: 0.7, color: COLORS.line });
    y = PAGE_HEIGHT - 62;
  };

  const ensureSpace = (height: number, section: string) => {
    if (y - height < FOOTER_HEIGHT + 12) addContinuationPage(section);
  };

  y = drawFilterSummary(page, y, report, filters, regular, bold);
  y -= 18;
  ensureSpace(76, "Ringkasan laporan");
  y = drawSectionHeading(page, y, "Ringkasan laporan", "Performa pada filter terpilih", regular, bold);
  y = drawSummaryCards(page, y, report.summary, regular, bold);

  const studentRows = buildStudentRows(report, filters);
  y -= 20;
  ensureSpace(74, "Ringkasan siswa");
  y = drawSectionHeading(page, y, "Ringkasan siswa", "Rekap performa per siswa", regular, bold);
  y = drawStudentTable({
    page,
    y,
    rows: studentRows,
    regular,
    bold,
    onPageBreak: () => {
      addContinuationPage("Ringkasan siswa");
      return { page, y };
    },
  });

  if (report.weekly.length > 0) {
    y -= 20;
    ensureSpace(170, "Perkembangan mingguan");
    y = drawSectionHeading(page, y, "Perkembangan mingguan", "Skor rata-rata dan jumlah sesi", regular, bold);
    y = drawWeeklyChart(page, y, report.weekly, regular, bold);
  }

  y -= 20;
  ensureSpace(75, "Evaluasi teknik");
  y = drawSectionHeading(page, y, "Evaluasi teknik", "Kesalahan yang paling sering terjadi", regular, bold);
  y = drawCommonIssues({
    page,
    y,
    rows: report.commonIssues,
    regular,
    bold,
    onPageBreak: () => {
      addContinuationPage("Evaluasi teknik");
      return { page, y };
    },
  });

  y -= 20;
  ensureSpace(78, "Detail aktivitas");
  y = drawSectionHeading(page, y, "Detail aktivitas", "Riwayat sesi latihan siswa", regular, bold);
  y = drawActivityTable({
    page,
    y,
    rows: report.rows,
    regular,
    bold,
    onPageBreak: () => {
      addContinuationPage("Detail aktivitas");
      return { page, y };
    },
  });

  y -= 22;
  ensureSpace(72, "Catatan laporan");
  page.drawRectangle({ x: MARGIN, y: y - 54, width: CONTENT_WIDTH, height: 54, color: COLORS.cloud });
  page.drawText("CATATAN", { x: MARGIN + 12, y: y - 17, size: 7, font: bold, color: COLORS.limeDeep });
  const note = "Laporan hanya memuat aktivitas setelah persetujuan siswa aktif. Nilai, repetisi, durasi, level, dan XP mengikuti data yang tersimpan pada saat laporan dibuat.";
  drawWrappedText(page, note, MARGIN + 12, y - 32, CONTENT_WIDTH - 24, 8, 11, regular, COLORS.charcoal, 2);

  drawFooters(pages, report.classroom.name, generatedAt, regular, bold);
  return document.save();
}

function addPage(document: PDFDocument, pages: PDFPage[]): PDFPage {
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  return page;
}

function drawCoverHeader(
  page: PDFPage,
  report: TeacherClassReport,
  generatedAt: Date,
  bold: PDFFont,
  regular: PDFFont,
): number {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 132, width: PAGE_WIDTH, height: 132, color: COLORS.ink });
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 132, width: 9, height: 132, color: COLORS.lime });
  page.drawText("KITMOTION", { x: MARGIN, y: PAGE_HEIGHT - 31, size: 10, font: bold, color: COLORS.lime });
  page.drawText("LAPORAN HASIL LATIHAN SISWA", { x: MARGIN, y: PAGE_HEIGHT - 59, size: 20, font: bold, color: COLORS.white });
  page.drawText(truncateText(report.classroom.name, bold, 15, 325), { x: MARGIN, y: PAGE_HEIGHT - 84, size: 15, font: bold, color: COLORS.white });
  page.drawText(`Tahun ajaran: ${safeText(report.classroom.school_year ?? "Tahun berjalan")}`, { x: MARGIN, y: PAGE_HEIGHT - 104, size: 8, font: regular, color: rgb(0.73, 0.75, 0.71) });
  page.drawText("Dibuat oleh", { x: 425, y: PAGE_HEIGHT - 56, size: 7, font: bold, color: rgb(0.65, 0.67, 0.63) });
  page.drawText(truncateText(report.teacher.full_name, bold, 9, 130), { x: 425, y: PAGE_HEIGHT - 72, size: 9, font: bold, color: COLORS.white });
  page.drawText(formatDateTime(generatedAt), { x: 425, y: PAGE_HEIGHT - 90, size: 7, font: regular, color: rgb(0.73, 0.75, 0.71) });
  return PAGE_HEIGHT - 156;
}

function drawFilterSummary(
  page: PDFPage,
  y: number,
  report: TeacherClassReport,
  filters: TeacherReportFilters,
  regular: PDFFont,
  bold: PDFFont,
): number {
  const selectedStudent = filters.student
    ? report.students.find((student) => student.id === filters.student)?.full_name ?? "Semua siswa"
    : "Semua siswa";
  const selectedExercise = filters.exercise
    ? report.exercises.find((exercise) => exercise.slug === filters.exercise)?.name ?? "Semua latihan"
    : "Semua latihan";
  const period = formatPeriod(filters.from, filters.to);
  page.drawRectangle({ x: MARGIN, y: y - 42, width: CONTENT_WIDTH, height: 42, color: COLORS.cloud, borderColor: COLORS.line, borderWidth: 0.6 });
  const items = [
    ["SISWA", selectedStudent],
    ["LATIHAN", selectedExercise],
    ["PERIODE", period],
  ] as const;
  const width = CONTENT_WIDTH / items.length;
  items.forEach(([label, value], index) => {
    const x = MARGIN + index * width + 12;
    if (index > 0) page.drawLine({ start: { x: MARGIN + index * width, y: y - 34 }, end: { x: MARGIN + index * width, y: y - 8 }, thickness: 0.6, color: COLORS.line });
    page.drawText(label, { x, y: y - 14, size: 6.5, font: bold, color: COLORS.muted });
    page.drawText(truncateText(value, regular, 8.5, width - 24), { x, y: y - 29, size: 8.5, font: regular, color: COLORS.ink });
  });
  return y - 42;
}

function drawSectionHeading(
  page: PDFPage,
  y: number,
  eyebrow: string,
  title: string,
  regular: PDFFont,
  bold: PDFFont,
): number {
  page.drawText(safeText(eyebrow).toUpperCase(), { x: MARGIN, y, size: 7, font: bold, color: COLORS.limeDeep });
  page.drawText(safeText(title), { x: MARGIN, y: y - 20, size: 15, font: bold, color: COLORS.ink });
  const titleWidth = bold.widthOfTextAtSize(safeText(title), 15);
  page.drawLine({ start: { x: Math.min(PAGE_WIDTH - MARGIN, MARGIN + titleWidth + 16), y: y - 16 }, end: { x: PAGE_WIDTH - MARGIN, y: y - 16 }, thickness: 0.6, color: COLORS.line });
  return y - 36;
}

function drawSummaryCards(
  page: PDFPage,
  y: number,
  summary: TeacherClassReport["summary"],
  regular: PDFFont,
  bold: PDFFont,
): number {
  const gap = 8;
  const width = (CONTENT_WIDTH - gap * 3) / 4;
  const cards = [
    ["TOTAL LATIHAN", String(summary.totalSessions)],
    ["HASIL VALID", formatValidResult(summary.totalReps, summary.validDurationSeconds)],
    ["RATA-RATA SKOR", String(summary.averageScore)],
    ["WAKTU LATIHAN", formatDuration(summary.durationSeconds)],
  ] as const;
  cards.forEach(([label, value], index) => {
    const x = MARGIN + index * (width + gap);
    const valueSize = fitTextSize(value, bold, width - 20, 17, 10);
    page.drawRectangle({ x, y: y - 58, width, height: 58, color: index === 0 ? COLORS.ink : COLORS.cloud });
    page.drawRectangle({ x, y: y - 3, width, height: 3, color: COLORS.lime });
    page.drawText(value, { x: x + 10, y: y - 30, size: valueSize, font: bold, color: index === 0 ? COLORS.white : COLORS.ink });
    page.drawText(label, { x: x + 10, y: y - 47, size: 6.2, font: regular, color: index === 0 ? rgb(0.72, 0.74, 0.7) : COLORS.muted });
  });
  return y - 58;
}

function buildStudentRows(
  report: TeacherClassReport,
  filters: TeacherReportFilters,
): StudentReportRow[] {
  const students = filters.student
    ? report.students.filter((student) => student.id === filters.student)
    : report.students;
  return students.map((student) => {
    const sessions = report.rows.filter((row) => row.user_id === student.id);
    return {
      id: student.id,
      name: student.full_name,
      sessions: sessions.length,
      validReps: sessions.reduce((sum, row) => sum + row.valid_reps, 0),
      validDurationSeconds: sessions.reduce((sum, row) => sum + row.validDurationSeconds, 0),
      averageScore: sessions.length
        ? Math.round(sessions.reduce((sum, row) => sum + Number(row.final_score ?? 0), 0) / sessions.length)
        : 0,
      durationSeconds: sessions.reduce((sum, row) => sum + row.duration_seconds, 0),
      level: student.level,
      xp: student.xp,
      challengesCompleted: student.challengesCompleted,
    };
  });
}

type BreakableTableArgs<T> = {
  page: PDFPage;
  y: number;
  rows: T[];
  regular: PDFFont;
  bold: PDFFont;
  onPageBreak: () => { page: PDFPage; y: number };
};

function drawStudentTable(args: BreakableTableArgs<StudentReportRow>): number {
  let { page, y } = args;
  const widths = [170, 48, 58, 58, 70, 111];
  const headers = ["SISWA", "SESI", "HASIL", "SKOR", "DURASI", "LEVEL / XP / TARGET"];
  const drawHeader = () => {
    y = drawTableRow(page, y, headers, widths, 22, args.bold, 6.3, COLORS.white, COLORS.ink);
  };
  drawHeader();
  if (args.rows.length === 0) {
    page.drawRectangle({ x: MARGIN, y: y - 32, width: CONTENT_WIDTH, height: 32, color: COLORS.cloud });
    page.drawText("Belum ada siswa pada filter ini.", { x: MARGIN + 8, y: y - 20, size: 8, font: args.regular, color: COLORS.muted });
    return y - 32;
  }
  args.rows.forEach((student, index) => {
    if (y - 24 < FOOTER_HEIGHT + 12) {
      ({ page, y } = args.onPageBreak());
      drawHeader();
    }
    const cells = [
      student.name,
      String(student.sessions),
      formatValidResult(student.validReps, student.validDurationSeconds, true),
      String(student.averageScore),
      formatDuration(student.durationSeconds),
      `Lv ${student.level} / ${student.xp} XP / ${student.challengesCompleted}`,
    ];
    y = drawTableRow(page, y, cells, widths, 24, args.regular, 7.3, COLORS.charcoal, index % 2 ? COLORS.cloud : COLORS.white, 0);
  });
  return y;
}

function drawWeeklyChart(
  page: PDFPage,
  y: number,
  weekly: TeacherClassReport["weekly"],
  regular: PDFFont,
  bold: PDFFont,
): number {
  const chartHeight = 92;
  const chartBottom = y - chartHeight;
  page.drawRectangle({ x: MARGIN, y: chartBottom - 18, width: CONTENT_WIDTH, height: chartHeight + 18, color: COLORS.cloud });
  page.drawLine({ start: { x: MARGIN + 24, y: chartBottom + 8 }, end: { x: PAGE_WIDTH - MARGIN - 12, y: chartBottom + 8 }, thickness: 0.7, color: COLORS.line });
  const gap = 10;
  const available = CONTENT_WIDTH - 48;
  const barWidth = Math.min(42, (available - gap * Math.max(0, weekly.length - 1)) / Math.max(1, weekly.length));
  const groupWidth = barWidth + gap;
  const totalWidth = weekly.length * barWidth + Math.max(0, weekly.length - 1) * gap;
  const startX = MARGIN + (CONTENT_WIDTH - totalWidth) / 2;
  weekly.forEach((week, index) => {
    const height = Math.max(5, (Math.min(100, week.averageScore) / 100) * 62);
    const x = startX + index * groupWidth;
    page.drawRectangle({ x, y: chartBottom + 8, width: barWidth, height, color: COLORS.limeDeep });
    const score = String(week.averageScore);
    page.drawText(score, { x: x + (barWidth - bold.widthOfTextAtSize(score, 7)) / 2, y: chartBottom + 12 + height, size: 7, font: bold, color: COLORS.ink });
    const label = formatShortDate(week.week);
    page.drawText(label, { x: x + (barWidth - regular.widthOfTextAtSize(label, 6)) / 2, y: chartBottom - 4, size: 6, font: regular, color: COLORS.muted });
    const sessions = `${week.sessions} sesi`;
    page.drawText(sessions, { x: x + (barWidth - regular.widthOfTextAtSize(sessions, 5.5)) / 2, y: chartBottom - 13, size: 5.5, font: regular, color: COLORS.muted });
  });
  return chartBottom - 18;
}

function drawCommonIssues(args: BreakableTableArgs<TeacherClassReport["commonIssues"][number]>): number {
  let { page, y } = args;
  if (args.rows.length === 0) {
    page.drawRectangle({ x: MARGIN, y: y - 36, width: CONTENT_WIDTH, height: 36, color: COLORS.cloud });
    page.drawText("Belum ada feedback kesalahan pada sesi terpilih.", { x: MARGIN + 12, y: y - 23, size: 8, font: args.regular, color: COLORS.muted });
    return y - 36;
  }
  args.rows.forEach((issue, index) => {
    const lines = wrapText(issue.message, args.regular, 8, CONTENT_WIDTH - 78).slice(0, 3);
    const height = Math.max(35, 18 + lines.length * 10);
    if (y - height < FOOTER_HEIGHT + 12) ({ page, y } = args.onPageBreak());
    page.drawRectangle({ x: MARGIN, y: y - height, width: CONTENT_WIDTH, height, color: index % 2 ? COLORS.cloud : COLORS.white, borderColor: COLORS.line, borderWidth: 0.5 });
    page.drawText(String(index + 1).padStart(2, "0"), { x: MARGIN + 10, y: y - 22, size: 11, font: args.bold, color: COLORS.limeDeep });
    page.drawText(`${issue.count}x`, { x: MARGIN + 41, y: y - 20, size: 7, font: args.bold, color: COLORS.danger });
    lines.forEach((line, lineIndex) => page.drawText(line, { x: MARGIN + 70, y: y - 18 - lineIndex * 10, size: 8, font: args.regular, color: COLORS.charcoal }));
    y -= height;
  });
  return y;
}

function drawActivityTable(args: BreakableTableArgs<TeacherClassReport["rows"][number]>): number {
  let { page, y } = args;
  const widths = [112, 88, 76, 50, 44, 60, 85];
  const headers = ["SISWA", "LATIHAN", "TANGGAL", "HASIL", "SKOR", "DURASI", "LEVEL / XP"];
  const drawHeader = () => {
    y = drawTableRow(page, y, headers, widths, 22, args.bold, 6.1, COLORS.white, COLORS.ink);
  };
  drawHeader();
  if (args.rows.length === 0) {
    page.drawRectangle({ x: MARGIN, y: y - 34, width: CONTENT_WIDTH, height: 34, color: COLORS.cloud });
    page.drawText("Belum ada aktivitas untuk filter ini.", { x: MARGIN + 8, y: y - 21, size: 8, font: args.regular, color: COLORS.muted });
    return y - 34;
  }
  args.rows.forEach((row, index) => {
    if (y - 24 < FOOTER_HEIGHT + 12) {
      ({ page, y } = args.onPageBreak());
      drawHeader();
    }
    y = drawTableRow(page, y, [
      row.studentName,
      row.exerciseName,
      formatDate(row.completed_at),
      formatValidResult(row.valid_reps, row.validDurationSeconds, true),
      String(Math.round(Number(row.final_score ?? 0))),
      formatDuration(row.duration_seconds),
      `Lv ${row.level} / ${row.xp}`,
    ], widths, 24, args.regular, 7.1, COLORS.charcoal, index % 2 ? COLORS.cloud : COLORS.white, 0);
  });
  return y;
}

function drawTableRow(
  page: PDFPage,
  y: number,
  cells: string[],
  widths: number[],
  height: number,
  font: PDFFont,
  fontSize: number,
  textColor: RGB,
  fillColor: RGB,
  borderWidth = 0.4,
): number {
  let x = MARGIN;
  page.drawRectangle({ x: MARGIN, y: y - height, width: CONTENT_WIDTH, height, color: fillColor, borderColor: COLORS.line, borderWidth });
  cells.forEach((rawCell, index) => {
    const width = widths[index] ?? 0;
    const cell = truncateText(rawCell, font, fontSize, width - 8);
    page.drawText(cell, { x: x + 4, y: y - height / 2 - fontSize / 3, size: fontSize, font, color: textColor });
    if (index > 0) page.drawLine({ start: { x, y: y - height }, end: { x, y }, thickness: borderWidth, color: COLORS.line });
    x += width;
  });
  return y - height;
}

function drawFooters(
  pages: PDFPage[],
  className: string,
  generatedAt: Date,
  regular: PDFFont,
  bold: PDFFont,
): void {
  pages.forEach((page, index) => {
    page.drawLine({ start: { x: MARGIN, y: 31 }, end: { x: PAGE_WIDTH - MARGIN, y: 31 }, thickness: 0.5, color: COLORS.line });
    page.drawText("KITMOTION", { x: MARGIN, y: 18, size: 6.5, font: bold, color: COLORS.ink });
    page.drawText(` / ${truncateText(className, regular, 6.5, 175)} / ${formatDateTime(generatedAt)}`, { x: MARGIN + 43, y: 18, size: 6.5, font: regular, color: COLORS.muted });
    const pageNumber = `Halaman ${index + 1} dari ${pages.length}`;
    page.drawText(pageNumber, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(pageNumber, 6.5), y: 18, size: 6.5, font: regular, color: COLORS.muted });
  });
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  lineHeight: number,
  font: PDFFont,
  color: RGB,
  maximumLines = Number.POSITIVE_INFINITY,
): number {
  const lines = wrapText(text, font, size, width).slice(0, maximumLines);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
}

function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = truncateText(word, font, size, width);
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function truncateText(value: unknown, font: PDFFont, size: number, width: number): string {
  const text = safeText(value);
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  const suffix = "...";
  let result = text;
  while (result.length > 0 && font.widthOfTextAtSize(`${result}${suffix}`, size) > width) result = result.slice(0, -1);
  return `${result.trimEnd()}${suffix}`;
}

function fitTextSize(value: string, font: PDFFont, width: number, preferred: number, minimum: number): number {
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(value, size) > width) size -= 0.5;
  return size;
}

function safeText(value: unknown): string {
  return String(value ?? "-")
    .replace(/[–—]/g, "-")
    .replace(/·/g, "/")
    .replace(/×/g, "x")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "-";
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(value).replace(".", ":");
}

function formatPeriod(from?: string, to?: string): string {
  const validFrom = /^\d{4}-\d{2}-\d{2}$/.test(from ?? "") ? from : null;
  const validTo = /^\d{4}-\d{2}-\d{2}$/.test(to ?? "") ? to : null;
  if (!validFrom && !validTo) return "Semua tanggal";
  if (validFrom && validTo) return `${formatDate(`${validFrom}T00:00:00Z`)} - ${formatDate(`${validTo}T00:00:00Z`)}`;
  if (validFrom) return `Mulai ${formatDate(`${validFrom}T00:00:00Z`)}`;
  return `Sampai ${formatDate(`${validTo}T00:00:00Z`)}`;
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  if (hours > 0) return `${hours}j ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainder}d`;
  return `${remainder}d`;
}

function formatValidResult(reps: number, seconds: number, compact = false): string {
  if (reps > 0 && seconds > 0) return compact ? `${reps}r/${seconds}d` : `${reps} rep / ${seconds} dtk`;
  if (seconds > 0) return compact ? `${seconds} dtk` : `${seconds} detik`;
  return compact ? `${reps} rep` : `${reps} repetisi`;
}
