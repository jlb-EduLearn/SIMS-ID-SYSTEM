import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    const isDashboard = pathname.startsWith("/dashboard");
    const isSelectSchool = pathname === "/select-school";
    const isSelectYear = pathname === "/select-school-year";

    if (!token?.currentSchoolId && (isDashboard || isSelectYear)) {
      return NextResponse.redirect(new URL("/select-school", req.url));
    }

    if (
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
  ],
};
