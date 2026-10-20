import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DEFAULT_MATRIX, isRole, type AppRole, type Permission } from "@/lib/permissions";

export type SessionUser = {
  id: string;
  role: AppRole;
  email: string | null;
  name: string | null;
};

type AuthResult =
  | { user: SessionUser; error?: undefined }
  | { user?: undefined; error: NextResponse };

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

/** Returns the signed-in, active user, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || user.status === "INACTIVE" || !isRole(user.role)) return null;
  return { id: user.id, role: user.role, email: user.email ?? null, name: user.name ?? null };
}

/** Resolves a permission for a role: DB override first, then the default matrix. ADMIN always passes. */
export async function roleHasPermission(role: AppRole, permission: Permission): Promise<boolean> {
  if (role === "ADMIN") return true;
  const override = await prisma.rolePermission.findUnique({
    where: { role_permission: { role, permission } },
    select: { enabled: true },
  });
  return override ? override.enabled : DEFAULT_MATRIX[role][permission];
}

export async function requireUser(): Promise<AuthResult> {
  const user = await getSessionUser();
  return user ? { user } : { error: unauthorized() };
}

export async function requireAdmin(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() };
  return user.role === "ADMIN" ? { user } : { error: forbidden() };
}

/** Passes when the user holds at least one of the given permissions. */
export async function requirePermission(...permissions: Permission[]): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() };
  for (const permission of permissions) {
    if (await roleHasPermission(user.role, permission)) return { user };
  }
  return { error: forbidden() };
}

/** For server actions: throws instead of returning a response. */
export async function assertPermission(...permissions: Permission[]): Promise<SessionUser> {
  const result = await requirePermission(...permissions);
  if (result.error) throw new Error(result.error.status === 401 ? "Unauthorized" : "Forbidden");
  return result.user;
}

/** Cron endpoints: require `Authorization: Bearer $CRON_SECRET`. Fails closed when the secret is unset. */
export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const ok =
    !!secret &&
    header.length === expected.length &&
    timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  return ok ? null : forbidden();
}

/**
 * Transactions: `manage_transactions` may write any entry; `manage_bookings` may also write
 * entries linked to a booking or product order (booking advances, gift order payments).
 */
export async function canWriteTransaction(
  user: SessionUser,
  tx: { bookingId?: string | null; productOrderId?: string | null }
): Promise<boolean> {
  if (await roleHasPermission(user.role, "manage_transactions")) return true;
  return !!(tx.bookingId || tx.productOrderId) && (await roleHasPermission(user.role, "manage_bookings"));
}

export function forbiddenResponse() {
  return forbidden();
}
