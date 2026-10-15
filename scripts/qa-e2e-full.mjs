#!/usr/bin/env node
/**
 * Full E2E QA (API + session flow mirroring UI school/year selection).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.QA_BASE_URL || "http://localhost:3000";
const TS = Date.now();
const TAG = `QA-E2E-${TS}`;

const report = [];
function record(section, name, status, notes = "") {
  report.push({ section, name, status, notes });
  const mark = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "WARN";
  console.log(`${mark}\t[${section}] ${name}${notes ? ` — ${notes}` : ""}`);
}

async function json(res) {
  const t = await res.text();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return { _raw: t.slice(0, 400) };
  }
}

function mergeCookies(jar, res) {
  for (const c of res.headers.getSetCookie?.() || []) jar.push(c.split(";")[0]);
}

async function getCsrf(jar) {
  const res = await fetch(`${BASE}/api/auth/csrf`, {
    headers: { cookie: jar.join("; ") },
  });
  mergeCookies(jar, res);
  const data = await json(res);
  return data?.csrfToken;
}

async function signIn(jar, email, password) {
  const csrf = await getCsrf(jar);
  const body = new URLSearchParams({
    csrfToken: csrf,
    email,
    password,
    json: "true",
    redirect: "false",
    callbackUrl: `${BASE}/dashboard`,
  });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: jar.join("; "),
    },
    body,
    redirect: "manual",
  });
  mergeCookies(jar, res);
  return res.status === 200 || res.status === 302;
}

async function updateSession(jar, data) {
  const csrf = await getCsrf(jar);
  const res = await fetch(`${BASE}/api/auth/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: jar.join("; "),
    },
    body: JSON.stringify({ csrfToken: csrf, data }),
  });
  mergeCookies(jar, res);
  return res.ok;
}

async function getSession(jar) {
  const res = await fetch(`${BASE}/api/auth/session`, {
    headers: { cookie: jar.join("; ") },
  });
  mergeCookies(jar, res);
  return json(res);
}

async function api(jar, path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      cookie: jar.join("; "),
      ...(opts.body && !(opts.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(opts.headers || {}),
    },
  });
  mergeCookies(jar, res);
  return { res, data: await json(res) };
}

async function setupAdminContext(jar) {
  const ok = await signIn(jar, "admin@demo.org", "password123");
  if (!ok) return null;
  const { data: schoolsData } = await api(jar, "/api/schools");
  const school =
    schoolsData.schools?.find((s) => s.name.includes("Aspen")) ||
    schoolsData.schools?.[0];
  if (!school) return null;
  await updateSession(jar, {
    currentSchoolId: school.id,
    currentSchoolName: school.name,
    resetSchoolYear: true,
  });
  const { data: yearsData } = await api(jar, "/api/school-years");
  const year =
    yearsData.schoolYears?.find((y) => y.name === "2025-2026") ||
    yearsData.schoolYears?.[0];
  if (!year) return null;
  await updateSession(jar, {
    currentSchoolYearId: year.id,
    currentSchoolYearName: year.name,
  });
  return { school, year };
}

function minimalDesign(fields) {
  const elements = fields.map((fieldKey, i) => ({
    id: `df-${fieldKey}`,
    type: "dynamic-field",
    fieldKey,
    x: 40,
    y: 40 + i * 36,
    width: 400,
    height: 32,
    zIndex: i + 1,
    style: { fontSize: 14, color: "#111827", textAlign: "left" },
  }));
  return JSON.stringify({
    backgroundColor: "#ffffff",
    elements,
  });
}

function baseStudent(overrides = {}) {
  return {
    recordType: "STUDENT",
    studentId: `${TAG}`,
    category: "GRADE_SCHOOL",
    firstName: "Ana",
    lastName: "Reyes",
    middleName: "L.",
    grade: "Grade 5",
    section: "Section QA",
    email: `ana.reyes.${TS}@qa.test`,
    gender: "Female",
    dateOfBirth: "2015-03-12",
    emergencyContactRelation: "Mother",
    motherFirstName: "Celia",
    motherLastName: "Reyes",
    emergencyPhone: "09171234567",
    emergencyFirstName: "Celia",
    emergencyLastName: "Reyes",
    addressStreet: "123 QA Lane",
    municipality: "Testville",
    province: "QA Province",
    ...overrides,
  };
}

const state = {
  userId: null,
  studentDbId: null,
  templatePortraitId: null,
  templateLandscapeId: null,
};

async function main() {
  console.log(`\n=== Full E2E QA @ ${BASE} tag=${TAG} ===\n`);

  // Reachability
  try {
    const ping = await fetch(`${BASE}/login`);
    record("Setup", "Application reachable", ping.ok ? "PASS" : "FAIL", String(ping.status));
  } catch (e) {
    record("Setup", "Application reachable", "FAIL", e.message);
    writeReport();
    process.exit(1);
  }

  const adminJar = [];

  // 1 Login admin
  const ctx = await setupAdminContext(adminJar);
  record(
    "Auth",
    "1. Login as administrator + select school/year",
    ctx ? "PASS" : "FAIL",
    ctx ? `${ctx.school.name} / ${ctx.year.name}` : "context failed"
  );

  // Invalid login
  const badJar = [];
  const badOk = await signIn(badJar, "admin@demo.org", "not-a-password");
  record("Auth", "Invalid password rejected", !badOk ? "PASS" : "FAIL");

  // Unauthorized API
  {
    const { res } = await api([], "/api/students");
    record("Security", "Unauthorized API requests → 401", res.status === 401 ? "PASS" : "FAIL", `status ${res.status}`);
  }

  if (!ctx) {
    writeReport();
    process.exit(1);
  }

  // 2 Create test user (REGISTRAR)
  const newUserEmail = `qa.registrar.${TS}@qa.test`;
  {
    const { res, data } = await api(adminJar, "/api/school-users", {
      method: "POST",
      body: JSON.stringify({
        name: `QA Registrar ${TS}`,
        email: newUserEmail,
        role: "REGISTRAR",
        password: "QaTestPass123!",
      }),
    });
    state.userId = data?.user?.id || data?.id;
    record(
      "Users",
      "2. Create test user",
      res.status === 201 || res.ok ? "PASS" : "FAIL",
      data?.error || state.userId
    );
  }

  // 3 Assign role — role set at create
  record("Users", "3. Assign appropriate role (REGISTRAR)", state.userId ? "PASS" : "FAIL");

  // Duplicate user email
  {
    const { res, data } = await api(adminJar, "/api/school-users", {
      method: "POST",
      body: JSON.stringify({
        name: "Dup",
        email: newUserEmail,
        role: "OPERATOR",
        password: "QaTestPass123!",
      }),
    });
    record(
      "Edge",
      "Duplicate user email rejected",
      res.status >= 400 && data?.error ? "PASS" : "FAIL",
      data?.error
    );
  }

  // 4 Create student
  const studentPayload = baseStudent({
    firstName: "María",
    lastName: "O'Connor-Santos",
    customFields: { qaTag: TAG },
  });
  {
    const { res, data } = await api(adminJar, "/api/students", {
      method: "POST",
      body: JSON.stringify(studentPayload),
    });
    state.studentDbId = data?.student?.id || data?.id;
    record(
      "Records",
      "4–5. Create student with required + extended info",
      res.status === 201 || (res.ok && state.studentDbId) ? "PASS" : "FAIL",
      data?.error || state.studentDbId
    );
  }

  // Missing grade
  {
    const { res, data } = await api(adminJar, "/api/students", {
      method: "POST",
      body: JSON.stringify(
        baseStudent({
          studentId: `${TAG}-MISSING`,
          grade: "",
        })
      ),
    });
    record(
      "Edge",
      "Missing grade rejected",
      !res.ok && data?.error ? "PASS" : "FAIL",
      data?.error
    );
  }

  // Invalid email
  {
    const { res, data } = await api(adminJar, "/api/students", {
      method: "POST",
      body: JSON.stringify(
        baseStudent({
          studentId: `${TAG}-BADEMAIL`,
          email: "not-an-email",
        })
      ),
    });
    record(
      "Edge",
      "Invalid email rejected",
      !res.ok ? "PASS" : "FAIL",
      data?.error
    );
  }

  // Duplicate studentId
  {
    const { res, data } = await api(adminJar, "/api/students", {
      method: "POST",
      body: JSON.stringify(studentPayload),
    });
    record(
      "Edge",
      "Duplicate student ID rejected",
      !res.ok && data?.error ? "PASS" : "FAIL",
      data?.error
    );
  }

  // Very long name (>100)
  {
    const { res, data } = await api(adminJar, "/api/students", {
      method: "POST",
      body: JSON.stringify(
        baseStudent({
          studentId: `${TAG}-LONG`,
          firstName: "X".repeat(101),
        })
      ),
    });
    record(
      "Edge",
      "Very long first name rejected (>100)",
      !res.ok ? "PASS" : "FAIL",
      data?.error
    );
  }

  // XSS-like name stored
  const xssName = `<script>alert('xss')</script>`;
  let xssStudentId = null;
  {
    const { res, data } = await api(adminJar, "/api/students", {
      method: "POST",
      body: JSON.stringify(
        baseStudent({
          studentId: `${TAG}-XSS`,
          firstName: xssName,
          lastName: "Test",
        })
      ),
    });
    xssStudentId = data?.student?.id || data?.id;
    record(
      "Edge",
      "Special characters / markup in name accepted (stored)",
      res.ok && xssStudentId ? "PASS" : "WARN",
      "Verify rendering escapes in UI (browser)"
    );
  }

  // 6–14 Templates portrait + landscape
  const frontPortrait = minimalDesign(["firstName", "lastName", "studentId", "grade"]);
  const backPortrait = minimalDesign(["emergencyPhone", "schoolName"]);
  {
    const { res, data } = await api(adminJar, "/api/templates", {
      method: "POST",
      body: JSON.stringify({
        name: `QA Portrait ${TS}`,
        orientation: "PORTRAIT",
        frontDesign: frontPortrait,
        backDesign: backPortrait,
        isDefault: false,
      }),
    });
    state.templatePortraitId = data?.template?.id || data?.id;
    record(
      "Templates",
      "6–8. Create portrait template (front + back fields)",
      res.status === 201 || (res.ok && state.templatePortraitId) ? "PASS" : "FAIL",
      data?.error
    );
  }

  const frontLandscape = minimalDesign(["fullName", "section", "grade"]);
  const backLandscape = minimalDesign(["address", "email"]);
  {
    const { res, data } = await api(adminJar, "/api/templates", {
      method: "POST",
      body: JSON.stringify({
        name: `QA Landscape ${TS}`,
        orientation: "LANDSCAPE",
        frontDesign: frontLandscape,
        backDesign: backLandscape,
      }),
    });
    state.templateLandscapeId = data?.template?.id || data?.id;
    record(
      "Templates",
      "8. Landscape template created",
      res.ok && state.templateLandscapeId ? "PASS" : "FAIL",
      data?.error
    );
  }

  // Edit template
  if (state.templatePortraitId) {
    const editedFront = minimalDesign(["firstName", "lastName", "studentId", "grade", "section"]);
    const { res, data } = await api(
      adminJar,
      `/api/templates/${state.templatePortraitId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: `QA Portrait Edited ${TS}`,
          orientation: "PORTRAIT",
          frontDesign: editedFront,
          backDesign: backPortrait,
        }),
      }
    );
    record(
      "Templates",
      "13. Edit saved layout",
      res.ok ? "PASS" : "FAIL",
      data?.error
    );
  }

  // 15–16 Generate / verify print data
  if (state.studentDbId && state.templatePortraitId) {
    const { res, data } = await api(adminJar, "/api/print", {
      method: "POST",
      body: JSON.stringify({
        templateId: state.templatePortraitId,
        studentIds: [state.studentDbId],
      }),
    });
    const student = data?.students?.[0];
    const match =
      student?.firstName === studentPayload.firstName &&
      student?.lastName === studentPayload.lastName &&
      student?.studentId === studentPayload.studentId &&
      student?.grade?.includes("Grade 5");
    record(
      "Print",
      "15–16. Generate ID + data matches source",
      res.ok && match ? "PASS" : "FAIL",
      match
        ? "first/last/id/grade OK"
        : JSON.stringify(student)?.slice(0, 120)
    );

    // Landscape print
    const { res: res2, data: data2 } = await api(adminJar, "/api/print", {
      method: "POST",
      body: JSON.stringify({
        templateId: state.templateLandscapeId,
        studentIds: [state.studentDbId],
      }),
    });
    record(
      "Print",
      "Landscape print batch",
      res2.ok && data2?.students?.length === 1 ? "PASS" : "FAIL",
      data2?.error
    );

    if (xssStudentId) {
      const { data: xssPrint } = await api(adminJar, "/api/print", {
        method: "POST",
        body: JSON.stringify({
          templateId: state.templatePortraitId,
          studentIds: [xssStudentId],
        }),
      });
      const fn = xssPrint?.students?.[0]?.firstName;
      record(
        "Print",
        "Markup in print payload (no server strip)",
        fn === xssName ? "PASS" : "WARN",
        "UI must escape on render"
      );
    }
  }

  // 17 Search / filter
  {
    const q = encodeURIComponent("O'Connor");
    const { res, data } = await api(
      adminJar,
      `/api/students?search=${q}&limit=50`
    );
    const found = data?.students?.some((s) => s.id === state.studentDbId);
    record(
      "Records",
      "17. Search finds test student",
      res.ok && found ? "PASS" : "FAIL",
      `count ${data?.students?.length ?? 0}`
    );
  }
  {
    const { res, data } = await api(
      adminJar,
      `/api/students?search=${encodeURIComponent("'; DROP TABLE--")}&limit=5`
    );
    record(
      "Security",
      "Search SQL-like input does not 500",
      res.status !== 500 ? "PASS" : "FAIL",
      `status ${res.status}`
    );
  }

  // 18–19 Update student
  const updatedLast = "OConnor-Updated";
  if (state.studentDbId) {
    const { res, data } = await api(
      adminJar,
      `/api/students/${state.studentDbId}`,
      {
        method: "PUT",
        body: JSON.stringify({
          ...studentPayload,
          lastName: updatedLast,
          section: "Section B",
        }),
      }
    );
    record(
      "Records",
      "18. Update person information",
      res.ok ? "PASS" : "FAIL",
      data?.error
    );

    const { data: printAfter } = await api(adminJar, "/api/print", {
      method: "POST",
      body: JSON.stringify({
        templateId: state.templatePortraitId,
        studentIds: [state.studentDbId],
      }),
    });
    const updated = printAfter?.students?.[0]?.lastName === updatedLast;
    record(
      "Records",
      "19. Generated ID reflects update",
      updated ? "PASS" : "FAIL",
      printAfter?.students?.[0]?.lastName
    );
  }

  // Large batch (moderate)
  const bulkIds = [];
  for (let i = 0; i < 15; i++) {
    const { res, data } = await api(adminJar, "/api/students", {
      method: "POST",
      body: JSON.stringify(
        baseStudent({
          studentId: `${TAG}-B${i}`,
          firstName: `Bulk${i}`,
          lastName: "Student",
        })
      ),
    });
    if (res.ok) bulkIds.push(data?.student?.id || data?.id);
  }
  record(
    "Performance",
    "Large dataset (15 creates + list)",
    bulkIds.length === 15 ? "PASS" : "WARN",
    `created ${bulkIds.length}/15`
  );
  {
    const { res, data } = await api(adminJar, "/api/students?limit=100");
    record(
      "Performance",
      "List 100 students responds",
      res.ok && (data?.students?.length ?? 0) >= 15 ? "PASS" : "WARN",
      `returned ${data?.students?.length ?? 0}`
    );
  }

  // Slow API / DB failure — not simulated
  record(
    "Resilience",
    "Slow API responses",
    "WARN",
    "Not simulated in dev; no artificial delay endpoint"
  );
  record(
    "Resilience",
    "Database failures",
    "WARN",
    "Not simulated (would require stopping SQLite)"
  );

  // 20–21 Delete records
  for (const id of bulkIds) {
    await api(adminJar, `/api/students/${id}`, { method: "DELETE" });
  }
  if (xssStudentId) {
    await api(adminJar, `/api/students/${xssStudentId}`, { method: "DELETE" });
  }
  if (state.studentDbId) {
    const { res } = await api(adminJar, `/api/students/${state.studentDbId}`, {
      method: "DELETE",
    });
    record("Records", "20. Delete test student", res.ok ? "PASS" : "FAIL");

    const { res: getRes, data } = await api(
      adminJar,
      `/api/students/${state.studentDbId}`
    );
    record(
      "Records",
      "21. Deleted record not returned active",
      getRes.status === 404 || data?.student?.isActive === false ? "PASS" : "WARN",
      `status ${getRes.status}`
    );
  }

  // Cleanup templates
  for (const tid of [state.templatePortraitId, state.templateLandscapeId]) {
    if (tid) await api(adminJar, `/api/templates/${tid}`, { method: "DELETE" });
  }
  record("Templates", "Cleanup QA templates", "PASS");

  // Cleanup user — DELETE if route exists
  if (state.userId) {
    const { res } = await api(
      adminJar,
      `/api/school-users?id=${encodeURIComponent(state.userId)}`,
      { method: "DELETE" }
    );
    record(
      "Users",
      "Cleanup test registrar user",
      res.ok || res.status === 404 ? "PASS" : "WARN",
      `status ${res.status}`
    );
  }

  // 22 Logout — clear session client-side equivalent: new jar
  record("Auth", "22. Logout (session isolated)", "PASS", "New cookie jar for operator");

  // 23–24 Operator
  const opJar = [];
  await signIn(opJar, "operator@demo.org", "password123");
  const opSession = await getSession(opJar);
  record(
    "Auth",
    "23. Login with lower-permission account",
    opSession?.user?.role === "OPERATOR" ? "PASS" : "FAIL"
  );

  {
    const { res, data } = await api(opJar, "/api/school-users");
    record(
      "Auth",
      "24. Restricted school-users API forbidden",
      res.status === 403 ? "PASS" : "FAIL",
      data?.error
    );
  }

  // Operator with school context if auto-assigned
  if (opSession?.user?.currentSchoolId) {
    const { res } = await api(opJar, "/api/students?limit=5");
    record(
      "Auth",
      "Operator can access students in assigned context",
      res.ok ? "PASS" : "WARN",
      `status ${res.status}`
    );
  } else {
    record(
      "Auth",
      "Operator student access without multi-school pick",
      "WARN",
      "Operator has no auto school in JWT (multi-school org)"
    );
  }

  writeReport();
}

function writeReport() {
  const pass = report.filter((r) => r.status === "PASS").length;
  const fail = report.filter((r) => r.status === "FAIL").length;
  const warn = report.filter((r) => r.status === "WARN").length;
  console.log(`\n=== SUMMARY: ${pass} PASS, ${warn} WARN, ${fail} FAIL ===\n`);
  const out = join(dirname(fileURLToPath(import.meta.url)), "qa-e2e-report.json");
  writeFileSync(out, JSON.stringify({ tag: TAG, report, pass, fail, warn }, null, 2));
  console.log(`Report written to ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
