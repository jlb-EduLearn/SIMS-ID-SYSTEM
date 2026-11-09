import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  levelLabel,
  personTypeLabel,
  type BoardEntryLogDto,
} from "@/lib/board-entry-log-query";

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildBoardEntryLogsCsv(rows: BoardEntryLogDto[]): string {
  const headers = [
    "Date & time",
    "Person type",
    "Name",
    "Level / role",
    "Section",
    "Department",
    "Display ID",
    "Scan code",
    "Recognized",
  ];
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        new Date(row.createdAt).toLocaleString(),
        personTypeLabel(row.personType, row.found),
        row.fullName || "",
        levelLabel(row),
        row.section || "",
        row.department || "",
        row.displayId || "",
        row.scanCode || "",
        row.found ? "Yes" : "No",
      ]
        .map((v) => csvCell(String(v)))
        .join(",")
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function buildBoardEntryLogsPdf(
  rows: BoardEntryLogDto[],
  meta: { title: string; subtitle?: string; generatedAt?: Date }
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
    const split = doc.splitTextToSize(meta.subtitle, doc.internal.pageSize.getWidth() - marginX * 2);
    doc.text(split, marginX, startY);
    startY += split.length * 12 + 4;
  }
  const stamp = (meta.generatedAt ?? new Date()).toLocaleString();
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated ${stamp} · ${rows.length} entry(ies)`, marginX, startY);
  doc.setTextColor(0, 0, 0);
  startY += 16;

  const head = [
    [
      "When",
      "Type",
      "Name",
      "Level / role",
      "Section",
      "ID",
      "Scan",
    ],
  ];
  const body = rows.map((row) => [
    new Date(row.createdAt).toLocaleString(),
    personTypeLabel(row.personType, row.found),
    row.fullName || "—",
    levelLabel(row) || "—",
    row.section || "—",
    row.displayId || "—",
    row.scanCode || "—",
  ]);

  autoTable(doc, {
    head,
    body,
    startY,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: 255,
      fontSize: 7.5,
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

  doc.setProperties({ title: meta.title, subject: "Board entry logs" });
  return Buffer.from(doc.output("arraybuffer"));
}
