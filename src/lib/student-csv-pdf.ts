import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  STUDENT_CSV_LOCKED_HEADERS,
  STUDENT_CSV_EXPORT_LABELS,
  studentCsvHeaderLabels,
  studentRecordToCsvCells,
  type StudentCsvSource,
} from "@/lib/student-csv";

export type StudentExportPdfMeta = {
  title: string;
  subtitle?: string;
  generatedAt?: Date;
};

export function buildStudentsPdf(
  students: StudentCsvSource[],
  meta: StudentExportPdfMeta
): Buffer {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const marginX = 28;
  let startY = 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(meta.title, marginX, startY);
  startY += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (meta.subtitle) {
    doc.text(meta.subtitle, marginX, startY);
    startY += 14;
  }
  const stamp = (meta.generatedAt ?? new Date()).toLocaleString();
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated ${stamp} · ${students.length} record(s)`, marginX, startY);
  doc.setTextColor(0, 0, 0);
  startY += 16;

  const head = [studentCsvHeaderLabels()];
  const body = students.map((s) => studentRecordToCsvCells(s));
  const lockedCount = STUDENT_CSV_LOCKED_HEADERS.length;

  autoTable(doc, {
    head,
    body,
    startY,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 6.5,
      cellPadding: 2.5,
      overflow: "linebreak",
      minCellHeight: 10,
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: 255,
      fontSize: 7,
    },
    columnStyles: Object.fromEntries(
      Array.from({ length: lockedCount }, (_, i) => [
        i,
        { fontStyle: "bold", fillColor: [241, 245, 249] },
      ])
    ),
    didParseCell(data) {
      if (data.section === "head" && data.column.index < lockedCount) {
        data.cell.styles.fillColor = [30, 58, 95];
        data.cell.styles.fontStyle = "bold";
      }
    },
    showHead: "everyPage",
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Page ${page} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 16,
      { align: "center" }
    );
  }

  doc.setProperties({
    title: meta.title,
    subject: STUDENT_CSV_EXPORT_LABELS.studentId,
  });

  return Buffer.from(doc.output("arraybuffer"));
}
