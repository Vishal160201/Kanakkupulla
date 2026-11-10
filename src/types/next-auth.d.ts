import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "OWNER" | "MEMBER";
      status?: "ACTIVE" | "PENDING" | "INACTIVE";
      /** Can open the personal money tracker (/money); the allowed email itself stays server-side */
      moneyTracker?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "OWNER" | "MEMBER";
    status?: "ACTIVE" | "PENDING" | "INACTIVE";
    refreshedAt?: number;
    /** When this session signed in; a later password change ends it */
    signedInAt?: number;
  }
}
