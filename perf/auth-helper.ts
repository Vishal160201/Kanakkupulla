import 'dotenv/config';
import { PERF_CONFIG } from './perf.config.js';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const CSRF_COOKIE_NAME = 'next-auth.csrf-token';
const SESSION_COOKIE_NAME = 'next-auth.session-token';
const DEFAULT_PASSWORD = 'PerfTest123!';

export interface AuthSession {
  cookie: string;
  userId: string;
  email: string;
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const cookie of cookieHeader.split(',')) {
    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.trim().split('=');
    if (name && value) cookies[name] = value;
  }
  return cookies;
}

function extractCookie(headers: Headers, name: string): string | null {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return null;
  const cookies = parseCookies(setCookie);
  return cookies[name] || null;
}

function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

export async function loginUser(baseUrl: string, email: string, password: string): Promise<AuthSession | null> {
  try {
    const csrfRes = await fetch(`${baseUrl}${PERF_CONFIG.auth.csrfEndpoint}`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;

    const csrfCookie = extractCookie(csrfRes.headers, CSRF_COOKIE_NAME);
    if (!csrfToken || !csrfCookie) {
      throw new Error('Failed to get CSRF token/cookie');
    }

    const cookies: Record<string, string> = { [CSRF_COOKIE_NAME]: csrfCookie };

    const formData = new URLSearchParams({
      csrfToken,
      email,
      password,
      json: 'true',
    });

    const signinRes = await fetch(`${baseUrl}${PERF_CONFIG.auth.signinEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: buildCookieHeader(cookies),
      },
      body: formData.toString(),
      redirect: 'manual',
    });

    const sessionCookie = extractCookie(signinRes.headers, SESSION_COOKIE_NAME);
    if (!sessionCookie) {
      const altCookie = signinRes.headers.get('set-cookie');
      console.warn('Session cookie not found. set-cookie:', altCookie);
      return null;
    }

    cookies[SESSION_COOKIE_NAME] = sessionCookie;

    const sessionRes = await fetch(`${baseUrl}${PERF_CONFIG.auth.sessionEndpoint}`, {
      headers: { Cookie: buildCookieHeader(cookies) },
    });
    const session = await sessionRes.json();
    if (!session?.user?.email) {
      throw new Error('Session validation failed');
    }

    return {
      cookie: buildCookieHeader(cookies),
      userId: (session.user as any).id,
      email: session.user.email,
    };
  } catch (error) {
    console.error(`Login failed for ${email}:`, error);
    return null;
  }
}

function createPrisma() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}

export async function createUserInDb(email: string, password: string, name: string, role = 'STAFF'): Promise<string | null> {
  const { prisma, pool } = createPrisma();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return existing.id;

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email, name,
        password: hashedPassword,
        role: role as any,
        status: 'ACTIVE' as any,
      },
    });
    return user.id;
  } catch (error) {
    console.error(`Failed to create user ${email}:`, error);
    return null;
  } finally {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  }
}

export async function createAuthenticatedUsers(count: number): Promise<AuthSession[]> {
  const baseUrl = PERF_CONFIG.baseUrl;
  const sessions: AuthSession[] = [];

  for (let i = 0; i < count; i++) {
    const email = `perf_test_runner_${i}_${Date.now()}@kanakku.test`;
    const password = DEFAULT_PASSWORD;
    const name = `Perf Test Runner ${i}`;

    const userId = await createUserInDb(email, password, name);
    if (!userId) {
      console.warn(`Failed to create user ${i + 1}/${count}`);
      continue;
    }

    const session = await loginUser(baseUrl, email, password);
    if (session) {
      sessions.push(session);
      console.log(`✅ User ${i + 1}/${count}: ${email} authenticated`);
    } else {
      console.warn(`Failed to login user ${i + 1}/${count}: ${email}`);
    }
  }

  return sessions;
}

export async function validateSession(cookie: string): Promise<boolean> {
  try {
    const res = await fetch(`${PERF_CONFIG.baseUrl}${PERF_CONFIG.auth.sessionEndpoint}`, {
      headers: { Cookie: cookie },
    });
    const session = await res.json();
    return !!session?.user?.email;
  } catch {
    return false;
  }
}

export async function cleanupUser(userId: string): Promise<void> {
  const { prisma, pool } = createPrisma();
  try {
    await prisma.transaction.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.booking.deleteMany({ where: { createdById: userId } }).catch(() => {});
    await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.account.deleteMany({ where: { userId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  } catch (error) {
    console.warn(`Cleanup failed for user ${userId}:`, error);
  } finally {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  }
}