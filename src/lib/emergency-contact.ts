import type { RecordFormState } from "@/lib/student-form";

export type EmergencyContactSource = "Father" | "Mother" | "Guardian";

export function formatEmergencyFullName(parts: {
  first?: string;
  middle?: string;
  last?: string;
  suffix?: string;
}): string {
  const name = [parts.first, parts.middle, parts.last]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" ");
  if (!name) return "";
  return parts.suffix?.trim() ? `${name} ${parts.suffix.trim()}` : name;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function namesMatch(
  a: { first: string; middle: string; last: string; suffix?: string },
  b: { first: string; middle: string; last: string; suffix?: string }
) {
  return (
    normalizeName(a.first) === normalizeName(b.first) &&
    normalizeName(a.middle) === normalizeName(b.middle) &&
    normalizeName(a.last) === normalizeName(b.last) &&
    normalizeName(a.suffix || "") === normalizeName(b.suffix || "")
  );
}

export function inferEmergencyContactSource(
  form: RecordFormState
): EmergencyContactSource | "" {
  if (form.emergencyContactRelation === "Father") return "Father";
  if (form.emergencyContactRelation === "Mother") return "Mother";
  if (form.emergencyContactRelation === "Guardian") return "Guardian";

  const emergency = {
    first: form.emergencyFirstName,
    middle: form.emergencyMiddleName,
    last: form.emergencyLastName,
  };
  if (!emergency.last && !emergency.first) return "";

  if (
    namesMatch(emergency, {
      first: form.fatherFirstName,
      middle: form.fatherMiddleName,
      last: form.fatherLastName,
      suffix: form.fatherSuffix,
    })
  ) {
    return "Father";
  }
  if (
    namesMatch(emergency, {
      first: form.motherFirstName,
      middle: form.motherMiddleName,
      last: form.motherLastName,
    })
  ) {
    return "Mother";
  }
  if (
    namesMatch(emergency, {
      first: form.guardianFirstName,
      middle: form.guardianMiddleName,
      last: form.guardianLastName,
    })
  ) {
    return "Guardian";
  }
  return "";
}

export function emergencyContactFromSource(
  form: RecordFormState,
  source: EmergencyContactSource
): Pick<
  RecordFormState,
  | "emergencyContactRelation"
  | "emergencyContactPerson"
  | "emergencyFirstName"
  | "emergencyMiddleName"
  | "emergencyLastName"
> {
  if (source === "Father") {
    const emergencyContactPerson = formatEmergencyFullName({
      first: form.fatherFirstName,
      middle: form.fatherMiddleName,
      last: form.fatherLastName,
      suffix: form.fatherSuffix,
    });
    return {
      emergencyContactRelation: "Father",
      emergencyContactPerson,
      emergencyFirstName: form.fatherFirstName,
      emergencyMiddleName: form.fatherMiddleName,
      emergencyLastName: form.fatherLastName,
    };
  }
  if (source === "Mother") {
    const emergencyContactPerson = formatEmergencyFullName({
      first: form.motherFirstName,
      middle: form.motherMiddleName,
      last: form.motherLastName,
    });
    return {
      emergencyContactRelation: "Mother",
      emergencyContactPerson,
      emergencyFirstName: form.motherFirstName,
      emergencyMiddleName: form.motherMiddleName,
      emergencyLastName: form.motherLastName,
    };
  }
  const emergencyContactPerson = formatEmergencyFullName({
    first: form.guardianFirstName,
    middle: form.guardianMiddleName,
    last: form.guardianLastName,
  });
  return {
    emergencyContactRelation: "Guardian",
    emergencyContactPerson,
    emergencyFirstName: form.guardianFirstName,
    emergencyMiddleName: form.guardianMiddleName,
    emergencyLastName: form.guardianLastName,
  };
}

export function parentNameFilled(
  form: RecordFormState,
  source: EmergencyContactSource
): boolean {
  if (source === "Father") {
    return Boolean(form.fatherLastName.trim() || form.fatherFirstName.trim());
  }
  if (source === "Mother") {
    return Boolean(form.motherLastName.trim() || form.motherFirstName.trim());
  }
  return Boolean(
    form.guardianLastName.trim() || form.guardianFirstName.trim()
  );
}
