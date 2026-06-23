import { PERF_CONFIG } from './perf.config.js';

export interface AuthSession {
  cookie: string;
  userId: string;
  email: string;
}

export interface RegisterResult {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

const CSRF_COOKIE_NAME = 'next-auth.csrf-token';
const SESSION_COOKIE_NAME = 'next-auth.session-token';

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  for (const cookie of cookieHeader.split(',')) {
    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.trim().split('=');
    if (name && value) {
      cookies[name] = value;
    }
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

export async function registerTestUser(baseUrl: string, email: string, password: string, name: string): Promise<RegisterResult> {
  try {
    const res = await fetch(`${baseUrl}${PERF_CONFIG.auth.registerEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });
    
    const data = await res.json().catch(() => ({}));
    
    if (res.ok && data.id) {
      return { success: true, userId: data.id, email: data.email };
    }
    
    return { success: false, error: data.error || `Registration failed: ${res.status}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Registration error' };
  }
}

export async function loginTestUser(baseUrl: string, email: string, password: string): Promise<AuthSession | null> {
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
      console.warn('Session cookie not found, set-cookie:', altCookie);
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
    console.error('Login failed:', error);
    return null;
  }
}

export async function createAuthenticatedUser(baseUrl: string): Promise<AuthSession | null> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const email = `perf_test_${timestamp}_${random}@kanakku.test`;
  const password = 'PerfTest123!';
  const name = `Perf Test User ${timestamp}`;
  
  const registerResult = await registerTestUser(baseUrl, email, password, name);
  if (!registerResult.success) {
    console.error('Registration failed:', registerResult.error);
    return null;
  }
  
  console.log(`Registered test user: ${email}`);
  
  const session = await loginTestUser(baseUrl, email, password);
  if (!session) {
    console.error('Login failed for:', email);
    return null;
  }
  
  console.log(`Authenticated user: ${session.email} (${session.userId})`);
  return session;
}

export async function createMultipleUsers(baseUrl: string, count: number): Promise<AuthSession[]> {
  const sessions: AuthSession[] = [];
  
  for (let i = 0; i < count; i++) {
    const session = await createAuthenticatedUser(baseUrl);
    if (session) {
      sessions.push(session);
    } else {
      console.warn(`Failed to create user ${i + 1}/${count}`);
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  return sessions;
}

export async function validateSession(baseUrl: string, cookie: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}${PERF_CONFIG.auth.sessionEndpoint}`, {
      headers: { Cookie: cookie },
    });
    const session = await res.json();
    return !!session?.user?.email;
  } catch {
    return false;
  }
}

export async function cleanupTestUser(baseUrl: string, session: AuthSession): Promise<void> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.transaction.deleteMany({
      where: { userId: session.userId },
    });
    
    await prisma.booking.deleteMany({
      where: { createdById: session.userId },
    });
    
    await prisma.user.delete({
      where: { id: session.userId },
    }).catch(() => {});
    
    await prisma.$disconnect();
    console.log(`Cleaned up test user: ${session.email}`);
  } catch (error) {
    console.warn('Cleanup failed:', error);
  }
}