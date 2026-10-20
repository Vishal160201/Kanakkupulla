import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "OWNER" | "MEMBER";
      status?: "ACTIVE" | "PENDING" | "INACTIVE";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "OWNER" | "MEMBER";
    status?: "ACTIVE" | "PENDING" | "INACTIVE";
    refreshedAt?: number;
  }
}
