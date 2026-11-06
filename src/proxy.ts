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

    // "/" is prerendered with the dashboard shell, so send signed-in users on before anything renders
    if (req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard/overview', req.url));
    }

    // Module access (analytics, inventory, …) is per shop role: enforced by the APIs and the
    // client route guard, since it needs the database.

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
  matcher: ["/", "/dashboard/:path*", "/inventory/:path*", "/inventory", "/farmers/:path*", "/farmers", "/produce/:path*", "/produce", "/subscribers/:path*", "/subscribers", "/bookings/:path*", "/transactions/:path*", "/analytics/:path*", "/gifts/:path*", "/settings/:path*", "/invoice", "/login"],
};
