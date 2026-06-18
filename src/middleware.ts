import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "super-secret-fallback-key-for-development",
});

export const config = {
  matcher: ["/dashboard/:path*", "/bookings/:path*"],
};
