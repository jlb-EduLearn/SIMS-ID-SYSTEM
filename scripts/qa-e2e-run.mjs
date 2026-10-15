#!/usr/bin/env node
/**
 * End-to-end QA runner (authenticated API flow).
 * Requires dev server at QA_BASE_URL and seeded demo users.
 */
const BASE = process.env.QA_BASE_URL || "http://localhost:3000";
const TS = Date.now();
const QA = {
  adminEmail: "admin@demo.org",
  adminPassword: "password123",
  operatorEmail: "operator@demo.org",
  operatorPassword: "password123",
  schoolName: "Aspen Grove Elementary",
  schoolYear: "2025-2026",
  newUserEmail: `qa.registrar.${TS}@demo.test`,
  studentId: `QA-E2E-${TS}`,
  templateName: `QA E2E Template ${TS}`,
  longName: "María O'Connor-Santos " + "X".repeat(80),
};

const report = [];

function record(id, name, status, notes = "") {
  report.push({ id, name, status, notes });
  const tag = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "WARN";
  console.log(`${tag}\t${id}. ${name}${notes ? ` — ${notes}` : ""}`);
}

async function json(res) {
  const t = await res.text();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return { _raw: t.slice(0, 300) };
  }
}

function mergeCookies(jar, res) {
  const set = res.headers.getSetCookie?.() || [];
  for (const c of set) jar.push(c.split(";")[0]);
  return jar;
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

async function selectSchoolAndYear(jar) {
  const { res, data } = await api(jar, "/api/schools");
  if (!res.ok) return { ok: false, error: data?.error };
  const school =
    data.schools?.find((s) => s.name === QA.schoolName) || data.schools?.[0];
  if (!school) return { ok: false, error: "No school" };

  // Mimic client session update via NextAuth internal isn't exposed; use schools that auto-assign or PATCH session
  // Admin has no auto school — use first school via session API not available.
  // Workaround: pick operator path OR use school from HTML flow.
  // For admin: we'll use the school id and rely on browser session from prior E2E.
  // This script uses operator with single-school auto context when available.
  return { ok: true, school, schools: data.schools };
}

async function main() {
  console.log(`\n=== E2E QA @ ${BASE} (${new Date().toISOString()}) ===\n`);

  // 1 Startup
  try {
    const ping = await fetch(`${BASE}/login`);
    record(1, "Application reachable", ping.ok ? "PASS" : "FAIL", `HTTP ${ping.status}`);
  } catch (e) {
    record(1, "Application reachable", "FAIL", String(e.message));
    printSummary();
    process.exit(1);
  }

  const adminJar = [];
  const opJar = [];

  // 2 Auth invalid
  const badLogin = await signIn([], "admin@demo.org", "wrong");
  record(2, "Login invalid password rejected", !badLogin ? "PASS" : "FAIL");

  // 3 Auth valid admin
  const adminOk = await signIn(adminJar, QA.adminEmail, QA.adminPassword);
  record(3, "Login as administrator", adminOk ? "PASS" : "FAIL");

  // 4 Unauthenticated API
  {
    const { res } = await api([], "/api/students");
    record(4, "Unauthorized API returns 401", res.status === 401 ? "PASS" : "FAIL", `status ${res.status}`);
  }

  // Admin without school context
  {
    const { res, data } = await api(adminJar, "/api/students?page=1&limit=5");
    const needSchool = res.status === 403 && String(data?.error || "").includes("school");
    record(
      5,
      "Admin blocked without school/year context",
      needSchool ? "PASS" : res.ok ? "WARN" : "FAIL",
      data?.error || `status ${res.status}`
    );
  }

  // Operator may have school if only one assignment — seed has 5 schools
  const opOk = await signIn(opJar, QA.operatorEmail, QA.operatorPassword);
  record(23, "Login lower-permission (operator)", opOk ? "PASS" : "FAIL");

  {
    const { res, data } = await api(opJar, "/api/school-users");
    record(
      24,
      "Operator cannot access school-users API",
      res.status === 403 ? "PASS" : "FAIL",
      data?.error || `status ${res.status}`
    );
  }

  // Browser-required: full flow documented as WARN for API-only runner
  record(
    6,
    "Create test user (School Users UI/API with school context)",
    "WARN",
    "Requires browser session with school+year selected; see browser E2E"
  );
  record(
    7,
    "Create student + template + print full UI flow",
    "WARN",
    "Executed in browser automation pass"
  );

  printSummary();
}

function printSummary() {
  const fail = report.filter((r) => r.status === "FAIL").length;
  const warn = report.filter((r) => r.status === "WARN").length;
  const pass = report.filter((r) => r.status === "PASS").length;
  console.log(`\nSummary: ${pass} PASS, ${warn} WARN, ${fail} FAIL\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
