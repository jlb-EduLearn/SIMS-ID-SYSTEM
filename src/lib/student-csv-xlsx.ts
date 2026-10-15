import * as XLSX from "xlsx";
import {
  STUDENT_CSV_EXPORT_LABELS,
  STUDENT_CSV_HEADERS,
  STUDENT_CSV_LOCKED_HEADERS,
  studentCsvHeaderLabels,
  studentRecordToCsvCells,
  type StudentCsvSource,
} from "@/lib/student-csv";

export function buildStudentsXlsx(students: StudentCsvSource[]): Buffer {
  const headerRow = studentCsvHeaderLabels();
  const dataRows = students.map((s) => studentRecordToCsvCells(s));
  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

  const lockedCount = STUDENT_CSV_LOCKED_HEADERS.length;
  ws["!views"] = [
    {
      state: "frozen",
      xSplit: lockedCount,
      ySplit: 1,
      topLeftCell: XLSX.utils.encode_cell({ r: 1, c: lockedCount }),
      activeCell: XLSX.utils.encode_cell({ r: 1, c: lockedCount }),
    },
  ];
  ws["!cols"] = STUDENT_CSV_HEADERS.map((h, index) => ({
    wch:
      index < lockedCount
        ? 22
        : Math.min(28, STUDENT_CSV_EXPORT_LABELS[h].length + 2),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  return Buffer.from(
    XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer
  );
}
