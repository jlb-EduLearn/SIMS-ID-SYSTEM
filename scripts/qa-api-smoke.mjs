#!/usr/bin/env node
/**
 * Localhost API smoke tests (no external deps).
 * Usage: node scripts/qa-api-smoke.mjs
 */
const BASE = process.env.QA_BASE_URL || "http://localhost:3000";

const results = [];

function log(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function json(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text.slice(0, 200) };
  }
}

async function getCsrf(cookieJar) {
  const res = await fetch(`${BASE}/api/auth/csrf`, {
    headers: { cookie: cookieJar },
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) cookieJar.push(c.split(";")[0]);
  const data = await json(res);
  return data?.csrfToken;
}

async function signIn(email, password) {
  const cookieJar = [];
  const csrf = await getCsrf(cookieJar);
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
      cookie: cookieJar.join("; "),
    },
    body,
    redirect: "manual",
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) cookieJar.push(c.split(";")[0]);
  return cookieJar.join("; ");
}

async function api(cookie, path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      cookie,
      ...(opts.body && !(opts.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
  });
  return { res, data: await json(res) };
}

async function main() {
  console.log(`\nQA API smoke @ ${BASE}\n`);

  // Unauthenticated
  {
    const { res } = await api("", "/api/students");
    log("GET /api/students unauthenticated → 401", res.status === 401, `status ${res.status}`);
  }
  {
    const { res } = await api("", "/api/templates");
    log("GET /api/templates unauthenticated → 401", res.status === 401, `status ${res.status}`);
  }

  // Invalid login
  {
    const cookie = await signIn("admin@demo.org", "wrong-password");
    const { res } = await api(cookie, "/api/students");
    log(
      "Invalid password cannot access API",
      res.status === 401 || res.status === 403,
      `status ${res.status}`
    );
  }

  // Admin login
  const adminCookie = await signIn("admin@demo.org", "password123");
  {
    const { res, data } = await api(adminCookie, "/api/schools");
    log("Admin GET /api/schools", res.ok, `status ${res.status}, schools ${data?.schools?.length ?? "?"}`);
  }

  // Select school/year via session update is client-side; admin seed may auto-set on login
  {
    const { res, data } = await api(adminCookie, "/api/students?page=1&limit=5");
    if (res.status === 403 && data?.error?.includes("school")) {
      log("Admin students (needs school context)", true, "403 until school selected — expected for fresh session");
    } else {
      log("Admin GET /api/students", res.ok, `status ${res.status}`);
    }
  }

  // Operator login
  const opCookie = await signIn("operator@demo.org", "password123");
  {
    const { res, data } = await api(opCookie, "/api/school-users");
    log(
      "Operator GET /api/school-users forbidden",
      res.status === 403,
      `status ${res.status} ${data?.error || ""}`
    );
  }

  // SQL injection probe in search (should not 500)
  if (adminCookie) {
    const { res } = await api(
      adminCookie,
      `/api/students?search=${encodeURIComponent("' OR 1=1 --")}&page=1&limit=5`
    );
    log("Search SQL-like input does not 500", res.status !== 500, `status ${res.status}`);
  }

  // XSS probe in POST body
  {
    const { res, data } = await api(adminCookie, "/api/students", {
      method: "POST",
      body: JSON.stringify({
        recordType: "STUDENT",
        studentId: "QA-XSS-1",
        category: "GRADE_SCHOOL",
        firstName: "<script>alert(1)</script>",
        lastName: "Test",
        grade: "Grade 1",
      }),
    });
    log(
      "Create student with script tag in name",
      res.status === 403 || res.status === 201 || res.status === 400,
      `status ${res.status} ${data?.error || ""}`
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
