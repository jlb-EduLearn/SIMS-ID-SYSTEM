import {
  IMPORT_TEMPLATE_CATEGORY_OPTIONS,
  IMPORT_TEMPLATE_GENDER_OPTIONS,
  IMPORT_TEMPLATE_GRADE_OPTIONS,
  IMPORT_TEMPLATE_SUFFIX_OPTIONS,
  dropdownKindForHeader,
  importTemplateHeaderLabels,
  resolveImportTemplateHeaders,
  type ImportTemplateDropdownKind,
} from "@/lib/student-import-template";
import type { StudentCsvHeader } from "@/lib/student-csv";

const TEMPLATE_DATA_ROWS = 500;
const LIST_SHEET = "_lists";

const EXAMPLE: Partial<Record<StudentCsvHeader, string>> = {
  studentId: "2024-0001",
  firstName: "Juan",
  middleName: "Santos",
  lastName: "Dela Cruz",
  suffix: "Jr.",
  dateOfBirth: "2010-05-15",
  gender: "Male",
  learnerReferenceNumber: "123456789012",
  studentNumber: "2024-0001",
  grade: "Grade 5",
  emergencyContactPerson: "Maria Dela Cruz",
  emergencyPhone: "09179876543",
  address: "123 Main St, Quezon City",
};

function writeListColumn(
  sheet: import("exceljs").Worksheet,
  col: number,
  values: readonly string[]
) {
  values.forEach((v, i) => {
    sheet.getCell(i + 1, col).value = v;
  });
  const colLetter = sheet.getColumn(col).letter;
  return `'${LIST_SHEET}'!$${colLetter}$1:$${colLetter}$${values.length}`;
}

export async function buildStudentImportTemplateXlsx(
  optionalKeys: string[] = []
): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIMS";

  const lists = workbook.addWorksheet(LIST_SHEET);
  lists.state = "veryHidden";

  const listRanges: Record<ImportTemplateDropdownKind, string> = {
    gender: writeListColumn(lists, 1, IMPORT_TEMPLATE_GENDER_OPTIONS),
    suffix: writeListColumn(lists, 2, IMPORT_TEMPLATE_SUFFIX_OPTIONS),
    category: writeListColumn(lists, 3, IMPORT_TEMPLATE_CATEGORY_OPTIONS),
    grade: writeListColumn(lists, 4, IMPORT_TEMPLATE_GRADE_OPTIONS),
  };

  const headers = resolveImportTemplateHeaders(optionalKeys);
  const labels = importTemplateHeaderLabels(optionalKeys);

  const ws = workbook.addWorksheet("Import", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.addRow(labels);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", wrapText: true };

  ws.addRow(
    headers.map((h) => {
      const v = EXAMPLE[h];
      return v ?? "";
    })
  );

  headers.forEach((key, index) => {
    const col = index + 1;
    const label = labels[index] ?? key;
    ws.getColumn(col).width = Math.min(36, Math.max(14, label.length + 2));
    if (key === "dateOfBirth") {
      ws.getColumn(col).numFmt = "yyyy-mm-dd";
    }
  });

  const dropdownByCol = new Map<number, ImportTemplateDropdownKind>();
  headers.forEach((key, index) => {
    const kind = dropdownKindForHeader(key, optionalKeys);
    if (kind) dropdownByCol.set(index + 1, kind);
  });

  for (let row = 2; row <= TEMPLATE_DATA_ROWS; row++) {
    for (const [col, kind] of dropdownByCol) {
      ws.getCell(row, col).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [listRanges[kind]],
        showErrorMessage: true,
        errorTitle: "Invalid value",
        error: "Choose a value from the dropdown list.",
      };
    }
  }

  const help = workbook.addWorksheet("How to use");
  help.addRow(["SIMS student import template"]);
  help.addRow([]);
  help.addRow(["Required", "Student ID, First Name, Last Name"]);
  help.addRow([
    "Dropdowns",
    "Suffix, Gender, Grade, and Category (if added) — click the cell arrow in Excel.",
  ]);
  help.addRow(["Birthdate", "Use YYYY-MM-DD (example: 2010-05-15)."]);
  help.addRow([
    "Import",
    "Save this file, then upload .xlsx or .csv under Students → Import.",
  ]);
  help.getColumn(1).width = 18;
  help.getColumn(2).width = 72;

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
