import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Fixed-window rate limit kept in the database, so it holds across serverless instances.
 * Returns true when the call is allowed. (Same approach as the Add designer app.)
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  // Start a new window once the old one has passed, then count this call atomically
  await prisma.rateLimit.updateMany({
    where: { key, windowStart: { lt: new Date(now.getTime() - windowMs) } },
    data: { count: 0, windowStart: now },
  });
  const row = await prisma.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, windowStart: now },
    update: { count: { increment: 1 } },
  });
  return row.count <= limit;
}

/** Forgets a counter, e.g. after a successful sign-in. */
export async function clearRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/** Client IP from the proxy headers. Vercel overwrites x-forwarded-for with the real client IP; when self-hosted
 * without a proxy that does the same, the header can be spoofed (shortcut: fine on Vercel, revisit if self-hosting). */
export function clientIp(headers: Headers | Record<string, string | string[] | undefined> | undefined): string {
  const get = (name: string): string | undefined => {
    if (!headers) return undefined;
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  return get("x-forwarded-for")?.split(",")[0]?.trim() || get("x-real-ip") || "unknown";
}

export const MINUTE = 60 * 1000;

/** null when allowed, otherwise the 429 response to return. */
export async function limitRequest(request: Request, name: string, limit: number, windowMs: number): Promise<NextResponse | null> {
  if (await rateLimit(`${name}:ip:${clientIp(request.headers)}`, limit, windowMs)) return null;
  return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } });
}

/** Deletes finished windows; called by the daily purge cron. */
export async function purgeRateLimits(olderThanMs = 24 * 60 * MINUTE) {
  await prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - olderThanMs) } } });
}
