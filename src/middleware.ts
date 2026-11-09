import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    const isDashboard = pathname.startsWith("/dashboard");
    const isSelectSchool = pathname === "/select-school";
    const isSelectYear = pathname === "/select-school-year";
    const isScanner = pathname.startsWith("/scanner");

    if (token?.role === "SCANNER" && (isDashboard || isSelectSchool || isSelectYear || pathname === "/login")) {
      return NextResponse.redirect(new URL("/scanner", req.url));
    }

    // Dashboard accounts stay on /login — scanner credentials use /scanner only.
    if (token && token.role !== "SCANNER" && isScanner) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (!isScanner && !token?.currentSchoolId && (isDashboard || isSelectYear)) {
      return NextResponse.redirect(new URL("/select-school", req.url));
    }

    if (
      !isScanner &&
      token?.currentSchoolId &&
      !token?.currentSchoolYearId &&
      isDashboard
    ) {
      return NextResponse.redirect(new URL("/select-school-year", req.url));
    }

    if (isSelectSchool && token?.currentSchoolId && !isSelectYear) {
      // Allow re-selecting school
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        if (pathname === "/login") return true;
        // Scanner page has its own login UI for unauthenticated stations.
        if (pathname.startsWith("/scanner")) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/select-school",
    "/select-school-year",
    "/login",
    "/scanner",
    "/scanner/:path*",
  ],
};
