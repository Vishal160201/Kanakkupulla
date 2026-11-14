/**
 * One-time setup of the demo site's database (never the live one).
 *
 *   DEMO_DATABASE_URL='postgres://…demo…' npx tsx scripts/demo-init.ts
 *   DEMO_DATABASE_URL='…' DEMO_URL=https://your-demo.vercel.app CRON_SECRET=… npx tsx scripts/demo-init.ts
 *
 * Refuses unless the database is empty (no users, shops, clients, bookings or ledger rows) and
 * different from the DATABASE_URL in .env. Writes the demo marker and the demo owner; with DEMO_URL
 * and CRON_SECRET it then asks the demo site to fill in the sample data.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEMO_MARKER_KEY, DEMO_OWNER_EMAIL, DEMO_OWNER_ID } from "../src/lib/demo/mode";

const fail = (msg: string): never => {
  console.error(`demo-init: ${msg}`);
  process.exit(1);
};

const url = process.env.DEMO_DATABASE_URL ?? fail("set DEMO_DATABASE_URL to the demo database (not DATABASE_URL).");

const where = (u: string) => {
  const p = new URL(u);
  return `${p.hostname}${p.pathname}`;
};
let live: string | null = null;
try {
  const env = readFileSync(".env", "utf8");
  const m = /^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m.exec(env);
  live = m ? where(m[1]) : null;
} catch {
  /* no .env: nothing to compare against */
}
if (live && where(url) === live) fail("DEMO_DATABASE_URL is the same database as DATABASE_URL in .env. Use the new demo database.");

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url })) });

async function main() {
  const [users, shops, clients, bookings, txns] = await Promise.all([
    prisma.user.count({ where: { id: { not: DEMO_OWNER_ID } } }),
    prisma.shop.count(),
    prisma.client.count(),
    prisma.booking.count(),
    prisma.transaction.count(),
  ]);
  const marker = await prisma.systemSetting.findUnique({ where: { key: DEMO_MARKER_KEY } });
  if (!marker && users + shops + clients + bookings + txns > 0) {
    fail(`this database already has data (${users} users, ${shops} shops, ${clients} clients, ${bookings} bookings, ${txns} transactions). The demo needs a new, empty database.`);
  }
  await prisma.systemSetting.upsert({ where: { key: DEMO_MARKER_KEY }, update: {}, create: { key: DEMO_MARKER_KEY, value: { createdAt: new Date().toISOString() } } });
  await prisma.user.upsert({
    where: { id: DEMO_OWNER_ID },
    update: {},
    create: { id: DEMO_OWNER_ID, name: "Demo Owner", email: DEMO_OWNER_EMAIL, username: "demo", role: "OWNER", status: "ACTIVE", emailNotifications: false, pushNotifications: false },
  });
  console.log(`demo-init: ${where(url)} is marked as the demo database.`);

  const site = process.env.DEMO_URL;
  const secret = process.env.CRON_SECRET;
  if (!site || !secret) {
    console.log("demo-init: set DEMO_URL and CRON_SECRET to fill in the sample data now, or wait for the nightly reset.");
    return;
  }
  console.log(`demo-init: filling in sample data on ${site} …`);
  const res = await fetch(`${site.replace(/\/$/, "")}/api/cron/demo-reset`, { headers: { authorization: `Bearer ${secret}` } });
  const body = await res.text();
  if (!res.ok) fail(`the demo site answered ${res.status}: ${body.slice(0, 300)}`);
  console.log(`demo-init: done ${body}`);
}

main()
  .catch((e) => fail(e instanceof Error ? e.message : String(e)))
  .finally(() => prisma.$disconnect());
