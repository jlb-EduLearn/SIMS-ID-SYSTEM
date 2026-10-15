import { formatWiegandDisplay } from "@/lib/hardware/wiegand";

export type AccessExportRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  grade?: string | null;
  section?: string | null;
  department?: string | null;
  cardUid?: string | null;
  wiegandFacilityCode?: string | null;
  wiegandCardNumber?: string | null;
};

/** WG5000 / generic access software import (CSV). Adjust mapping in vendor import wizard if needed. */
export function buildAccessControlCsv(
  rows: AccessExportRow[],
  options: { wiegandFormat?: "26" | "34"; includeWithoutCard?: boolean } = {}
): string {
  const { wiegandFormat = "26", includeWithoutCard = false } = options;
  const header = [
    "CardNo",
    "Facility",
    "Name",
    "Department",
    "UserID",
    "CardUID",
    "Wiegand",
    "Status",
  ];
  const lines = [header.join(",")];

  for (const row of rows) {
    const cardNo =
      row.wiegandCardNumber?.trim() ||
      row.cardUid?.trim() ||
      row.studentId.trim();
    if (!includeWithoutCard && !row.wiegandCardNumber?.trim() && !row.cardUid?.trim()) {
      continue;
    }
    const name = [row.lastName, row.firstName, row.middleName]
      .filter(Boolean)
      .join(", ");
    const dept =
      row.department?.trim() ||
      [row.grade, row.section].filter(Boolean).join(" ") ||
      "";
    const wiegand = formatWiegandDisplay(
      row.wiegandFacilityCode,
      row.wiegandCardNumber,
      wiegandFormat
    );
    lines.push(
      [
        csvEscape(cardNo),
        csvEscape(row.wiegandFacilityCode || ""),
        csvEscape(name),
        csvEscape(dept),
        csvEscape(row.studentId),
        csvEscape(row.cardUid || ""),
        csvEscape(wiegand === "—" ? "" : wiegand),
        csvEscape("Active"),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
