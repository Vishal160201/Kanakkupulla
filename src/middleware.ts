import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login');
    
    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/dashboard/overview', req.url));
      }
      return NextResponse.next();
    }

    if (!isAuth) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Role-based Access Control
    const isAdminRoute = req.nextUrl.pathname.startsWith('/analytics');
    if (isAdminRoute && token?.role !== 'ADMIN') {
      // If a non-admin tries to access admin routes, redirect to dashboard overview
      return NextResponse.redirect(new URL('/dashboard/overview', req.url));
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // Let the middleware function handle the logic
    },
    pages: {
      signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET as string,
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/bookings/:path*", "/transactions/:path*", "/analytics/:path*", "/gifts/:path*", "/settings/:path*", "/login"],
};
