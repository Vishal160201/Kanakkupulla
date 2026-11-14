import { encode } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { DEMO_MARKER_KEY, DEMO_OWNER_EMAIL, DEMO_OWNER_ID, isDemoServer } from "./mode";

/**
 * Nightly reset of the demo site: wipe every table, put the demo owner and the marker back, then
 * rebuild the sample shops through the app's own APIs (see seed.ts).
 *
 * Two locks keep this off any real database: the server must run with DEMO_MODE=1, and the database
 * must carry the demo marker, which only scripts/demo-init.ts writes (and only into an empty database).
 */
export class DemoResetRefused extends Error {}

export async function assertDemoDatabase(): Promise<void> {
  if (!isDemoServer()) throw new DemoResetRefused("Not the demo site (DEMO_MODE is not 1).");
  const marker = await prisma.systemSetting.findUnique({ where: { key: DEMO_MARKER_KEY } });
  if (!marker) throw new DemoResetRefused("This database isn't marked as the demo database.");
}

/** Every table except Prisma's migration history; settings keep only the marker, so a failed run can retry. */
async function wipeAll(): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename NOT IN ('_prisma_migrations', 'SystemSetting')`;
  if (rows.length > 0) {
    const list = rows.map((r) => `"${r.tablename.replace(/"/g, '""')}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
  await prisma.systemSetting.deleteMany({ where: { key: { not: DEMO_MARKER_KEY } } });
}

export async function writeDemoBase(): Promise<void> {
  await prisma.systemSetting.upsert({ where: { key: DEMO_MARKER_KEY }, update: {}, create: { key: DEMO_MARKER_KEY, value: { createdAt: new Date().toISOString() } } });
  await prisma.user.create({
    data: { id: DEMO_OWNER_ID, name: "Demo Owner", email: DEMO_OWNER_EMAIL, username: "demo", role: "OWNER", status: "ACTIVE", emailNotifications: false, pushNotifications: false },
  });
}

/** A session cookie for the demo owner, so the seeder can call the APIs like a signed-in visitor. */
export async function demoOwnerCookie(origin: string): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set.");
  const now = Date.now();
  const token = await encode({
    secret,
    token: { sub: DEMO_OWNER_ID, email: DEMO_OWNER_EMAIL, name: "Demo Owner", role: "OWNER", status: "ACTIVE", refreshedAt: now, signedInAt: now },
  });
  const secure = origin.startsWith("https://");
  return `${secure ? "__Secure-" : ""}next-auth.session-token=${token}`;
}

export async function resetDemo(origin: string, seed: (origin: string, cookie: string) => Promise<Record<string, number>>) {
  await assertDemoDatabase();
  await wipeAll();
  await writeDemoBase();
  const counts = await seed(origin, await demoOwnerCookie(origin));
  return counts;
}
