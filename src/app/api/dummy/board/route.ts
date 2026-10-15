import { NextResponse } from "next/server";

/**
 * Dummy info-board API for UI / integration testing (no DB, no auth).
 *
 * GET  /api/dummy/board
 * POST /api/dummy/board  body: { scenario?: "welcome" | "staff" | "unknown" | "inactive", code?: string }
 */
const SCENARIOS = {
  welcome: {
    found: true,
    message: "Welcome",
    student: {
      id: "dummy-student-1",
      studentId: "DEMO-0001",
      fullName: "Juan Dela Cruz",
      recordType: "STUDENT",
      gradeLabel: "Grade 5",
      section: "Section A",
      photoUrl: null as string | null,
      schoolYearName: "2025-2026",
      allowed: true,
    },
  },
  staff: {
    found: true,
    message: "Welcome",
    student: {
      id: "dummy-staff-1",
      studentId: "T-1001",
      fullName: "Ana Reyes",
      recordType: "TEACHER",
      gradeLabel: "Faculty",
      section: "Mathematics",
      photoUrl: null as string | null,
      schoolYearName: "2025-2026",
      allowed: true,
    },
  },
  inactive: {
    found: true,
    message: "Inactive",
    student: {
      id: "dummy-inactive-1",
      studentId: "DEMO-0099",
      fullName: "Inactive Learner",
      recordType: "STUDENT",
      gradeLabel: "Grade 3",
      section: "B",
      photoUrl: null as string | null,
      schoolYearName: "2025-2026",
      allowed: false,
    },
  },
  unknown: {
    found: false,
    message: "No matching student or card",
    student: null,
  },
} as const;

export type DummyBoardScenario = keyof typeof SCENARIOS;

function resolveScenario(
  raw: unknown,
  code?: string
): DummyBoardScenario {
  if (typeof raw === "string" && raw in SCENARIOS) {
    return raw as DummyBoardScenario;
  }
  if (code) {
    const c = code.trim().toUpperCase();
    if (c.includes("STAFF") || c.startsWith("T-")) return "staff";
    if (c.includes("INACTIVE") || c === "DENIED") return "inactive";
    if (c.includes("MISS") || c === "UNKNOWN" || c === "FAIL") return "unknown";
  }
  return "welcome";
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "SIMS dummy info-board API",
    usage: {
      get: "GET /api/dummy/board — this help + sample scenarios",
      post: 'POST /api/dummy/board { "scenario": "welcome" | "staff" | "unknown" | "inactive" }',
      byCode:
        'POST /api/dummy/board { "code": "DEMO-0001" } — also accepts STAFF / UNKNOWN / INACTIVE in the code',
    },
    scenarios: Object.keys(SCENARIOS),
    sample: SCENARIOS.welcome,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const scenario = resolveScenario(body?.scenario, body?.code);
  const payload = SCENARIOS[scenario];

  return NextResponse.json({
    ...payload,
    dummy: true,
    scenario,
    scannedCode:
      typeof body?.code === "string" && body.code.trim()
        ? body.code.trim()
        : scenario === "welcome"
          ? "DEMO-0001"
          : scenario,
  });
}
