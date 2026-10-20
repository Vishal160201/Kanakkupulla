import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    // Deactivated users lose access as soon as their token refreshes its status
    const isAuth = !!token && token.status !== "INACTIVE";
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
    
    // Personal Expense Tracker Guard
    const isPersonalRoute = req.nextUrl.pathname.startsWith('/personal') || req.nextUrl.pathname.startsWith('/api/personal');
    if (isPersonalRoute && (!process.env.PERSONAL_TRACKER_EMAIL || token?.email !== process.env.PERSONAL_TRACKER_EMAIL)) {
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { 'content-type': 'application/json' } });
      }
      return NextResponse.redirect(new URL('/dashboard/overview', req.url));
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // Let the proxy function handle the logic
    },
    pages: {
      signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET as string,
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/bookings/:path*", "/transactions/:path*", "/analytics/:path*", "/gifts/:path*", "/settings/:path*", "/login", "/personal/:path*", "/api/personal/:path*"],
};
