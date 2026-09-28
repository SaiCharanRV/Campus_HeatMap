import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isStudentPage = req.nextUrl.pathname.startsWith("/student");
    const isStaffPage = req.nextUrl.pathname.startsWith("/staff");
    const isLoginPage = req.nextUrl.pathname === "/login";
    const isRegisterPage = req.nextUrl.pathname === "/register";

    if (isAuth) {
      if (isLoginPage || isRegisterPage) {
        if (token.role === "Student") {
          return NextResponse.redirect(new URL("/student/dashboard", req.url));
        }
        if (token.role === "Staff") {
          return NextResponse.redirect(new URL("/staff/dashboard", req.url));
        }
      }

      if (isStudentPage && token.role !== "Student") {
        return NextResponse.redirect(new URL("/staff/dashboard", req.url));
      }

      if (isStaffPage && token.role !== "Staff") {
        return NextResponse.redirect(new URL("/student/dashboard", req.url));
      }
    } else {
      if (isStudentPage || isStaffPage) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: () => true, // We handle auth logic in the middleware function above
    },
  }
);

export const config = {
  matcher: ["/student/:path*", "/staff/:path*", "/login", "/register"],
};
