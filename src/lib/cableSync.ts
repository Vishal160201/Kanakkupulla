import { createHash, randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { can, type SessionUser } from "@/lib/authz";
import type { AccessLevel } from "@/lib/access";
import { getAccessibleShop, ShopError } from "@/lib/shops";

export const TIC_FIBER = "TIC_FIBER";

/** The portal fields a subscriber is kept in step with. */
export interface SubscriberFields {
  externalId: string;
  name: string;
  phone: string | null;
  altPhone: string | null;
  status: string;
  plan: string | null;
  macId: string | null;
  address: string | null;
  area: string | null;
  createdOn: Date | null;
  activatedAt: Date | null;
  renewedAt: Date | null;
  expiresAt: Date | null;
}

const SYNCED_FIELDS = ["name", "phone", "altPhone", "status", "plan", "macId", "address", "area", "createdOn", "activatedAt", "renewedAt", "expiresAt"] as const;

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** "28 Oct 2026 12:13 PM" (India time, as the TIC Fiber portal shows it) → Date; null when blank or unreadable. */
export function parsePortalDate(raw: string | undefined): Date | null {
  const m = raw?.trim().match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})(?: (\d{1,2}):(\d{2}) ?(AM|PM))?$/i);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  let hour = m[4] ? Number(m[4]) % 12 : 0;
  if (m[6]?.toUpperCase() === "PM") hour += 12;
  // IST is UTC+5:30 with no daylight saving
  return new Date(Date.UTC(Number(m[3]), month, Number(m[1]), hour, Number(m[5] ?? 0)) - 330 * 60_000);
}

const text = (value: string | undefined) => value?.replace(/\s+/g, " ").trim() || null;

/** One row of the portal's "Account Profile Wise Report" (column heading → cell text) as subscriber fields. */
export function ticRowToSubscriber(row: Record<string, string>): SubscriberFields | null {
  const externalId = text(row["User ID"]);
  if (!externalId) return null;
  return {
    externalId,
    name: text(row["Name"]) ?? externalId,
    phone: text(row["Phone"]),
    altPhone: text(row["Alternative Phone"]),
    status: text(row["Status"]) ?? "Unknown",
    plan: text(row["Plan"]),
    macId: text(row["MACID"]),
    address: text(row["Address"]),
    // Most specific location the portal has (town / village); "Service Area" is a broad zone
    area: text(row["LocationLevel4"]) ?? text(row["LocationLevel3"]) ?? text(row["LocationLevel2"]) ?? text(row["LocationLevel1"]) ?? text(row["Service Area"]),
    createdOn: parsePortalDate(row["Create Date"]),
    activatedAt: parsePortalDate(row["Activation Date"]),
    renewedAt: parsePortalDate(row["Renewal Date"]),
    expiresAt: parsePortalDate(row["Expiry Date"]),
  };
}

type Existing = SubscriberFields & { id: string; goneAt: Date | null };

const same = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);

/** What a sync must write: new subscribers, changed ones, renewals (expiry moved forward) and ones gone from the portal. */
export function diffSubscribers(existing: Existing[], incoming: SubscriberFields[]) {
  const byId = new Map(existing.map((s) => [s.externalId, s]));
  const seen = new Set<string>();
  const creates: SubscriberFields[] = [];
  const updates: { id: string; data: SubscriberFields }[] = [];
  const renewals: { subscriberId: string; plan: string | null; renewedAt: Date | null; previousExpiry: Date; expiresAt: Date }[] = [];

  for (const sub of incoming) {
    if (seen.has(sub.externalId)) continue;
    seen.add(sub.externalId);
    const old = byId.get(sub.externalId);
    if (!old) {
      creates.push(sub);
      continue;
    }
    if (old.goneAt || SYNCED_FIELDS.some((f) => !same(old[f], sub[f]))) updates.push({ id: old.id, data: sub });
    if (old.expiresAt && sub.expiresAt && sub.expiresAt > old.expiresAt) {
      renewals.push({ subscriberId: old.id, plan: sub.plan, renewedAt: sub.renewedAt, previousExpiry: old.expiresAt, expiresAt: sub.expiresAt });
    }
  }
  const goneIds = existing.filter((s) => !seen.has(s.externalId) && !s.goneAt).map((s) => s.id);
  return { creates, updates, renewals, goneIds };
}

/**
 * Writes a full portal snapshot for a shop. The snapshot must be the whole list: anyone missing is marked gone.
 * New plan names get a (priceless) plan row; renewals are charged at their plan's price. `wallet` is the
 * partner wallet balance when the extension could read it.
 */
export async function applySubscriberSync(shopId: string, provider: string, incoming: SubscriberFields[], wallet: number | null = null) {
  const now = new Date();
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.cableSubscriber.findMany({ where: { shopId, provider } });
      const { creates, updates, renewals, goneIds } = diffSubscribers(existing, incoming);
      const planNames = [...new Set(incoming.map((s) => s.plan).filter((p) => p !== null))];
      if (planNames.length) await tx.cablePlan.createMany({ data: planNames.map((name) => ({ shopId, provider, name })), skipDuplicates: true });
      const prices = new Map((await tx.cablePlan.findMany({ where: { shopId, provider } })).map((p) => [p.name, p.price]));

      if (creates.length) await tx.cableSubscriber.createMany({ data: creates.map((s) => ({ ...s, shopId, provider })), skipDuplicates: true });
      for (const u of updates) await tx.cableSubscriber.update({ where: { id: u.id }, data: { ...u.data, goneAt: null } });
      if (renewals.length) {
        await tx.cableRenewal.createMany({ data: renewals.map((r) => ({ ...r, amount: (r.plan && prices.get(r.plan)) ?? null })), skipDuplicates: true });
      }
      if (goneIds.length) await tx.cableSubscriber.updateMany({ where: { id: { in: goneIds } }, data: { goneAt: now } });
      await tx.shop.update({ where: { id: shopId }, data: { syncedAt: now, ...(wallet !== null ? { walletBalance: wallet, walletSyncedAt: now } : {}) } });
      return { created: creates.length, updated: updates.length, renewals: renewals.length, gone: goneIds.length, syncedAt: now };
    },
    { timeout: 30_000 }
  );
}

export const hashSyncKey = (key: string) => createHash("sha256").update(key).digest("hex");

export const newSyncKey = () => `kks_${randomBytes(24).toString("base64url")}`;

/** The cable shop a sync key belongs to, or null (wrong / revoked key, archived or non-cable shop). */
export async function shopForSyncKey(key: string) {
  const shop = await prisma.shop.findUnique({ where: { syncKeyHash: hashSyncKey(key) }, select: { id: true, type: true, isArchived: true } });
  return shop && shop.type === "CABLE" && !shop.isArchived ? shop : null;
}

/** The shop behind a cable request: accessible, a cable shop, and the user's role there allows `level`. */
export async function getCableShop(user: SessionUser, shopId: string, level: AccessLevel = "VIEW") {
  const shop = await getAccessibleShop(user, shopId);
  if (shop.type !== "CABLE") throw new ShopError("Subscribers are only available for cable & internet shops.", 422);
  if (!(await can(user, "cable", level, shopId))) {
    throw new ShopError(level === "MANAGE" ? "You can view this shop's subscribers but not change its settings." : "You don't have access to this shop's subscribers.", 403);
  }
  return shop;
}
