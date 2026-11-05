import { createHash, randomBytes } from "node:crypto";
import prisma, { toNumber } from "@/lib/prisma";
import type { Tx } from "@/lib/inventory";
import { monthlyChargeRows, monthsToCharge, toMonth } from "@/lib/cableMonthly";
import { can, type SessionUser } from "@/lib/authz";
import type { AccessLevel } from "@/lib/access";
import { getAccessibleShop, ShopError } from "@/lib/shops";

export const TIC_FIBER = "TIC_FIBER";
export const TCCL = "TCCL";
export const CABLE_PROVIDERS = [TIC_FIBER, TCCL] as const;
export type CableProvider = (typeof CABLE_PROVIDERS)[number];

/** The portal fields a subscriber is kept in step with. */
export interface SubscriberFields {
  externalId: string;
  name: string;
  phone: string | null;
  altPhone: string | null;
  status: string;
  plan: string | null;
  macId: string | null;
  vcNumber: string | null;
  address: string | null;
  area: string | null;
  createdOn: Date | null;
  activatedAt: Date | null;
  renewedAt: Date | null;
  expiresAt: Date | null;
}

/** TCCL rows also carry the customer's running bill totals (they become charges, not fields). */
export type SyncedSubscriber = SubscriberFields & { billed?: number; paid?: number };

const SYNCED_FIELDS = ["name", "phone", "altPhone", "status", "plan", "macId", "vcNumber", "address", "area", "createdOn", "activatedAt", "renewedAt", "expiresAt"] as const;

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

/** "20-02-2019  15:43:40" (India time, as the TCCL portal shows it) → Date; null when blank or unreadable. */
export function parseTcclDate(raw: string | undefined): Date | null {
  const m = raw?.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0)) - 330 * 60_000);
  return Number.isNaN(d.getTime()) ? null : d;
}

const money = (value: string | undefined) => {
  const n = Number((value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

/** One customer of the TCCL (Ezybill) customer list, as the extension sends it, as subscriber fields. */
export function tcclRowToSubscriber(row: Record<string, string>): SyncedSubscriber | null {
  const externalId = text(row.account_number);
  if (!externalId) return null;
  const name = text(row.customer_name) ?? text([row.first_name, row.last_name].filter(Boolean).join(" ")) ?? externalId;
  return {
    externalId,
    name,
    phone: text(row.mobile_no),
    altPhone: null,
    // The extension marks each customer by their set-top box: Active / Deactive
    status: text(row["STB Status"]) ?? "Active",
    plan: null,
    macId: text(row.serial_number),
    vcNumber: text(row.vc_number),
    address: text(row.installation_address),
    area: text(row.city),
    createdOn: parseTcclDate(row.Created_Date ?? row.signup_date),
    activatedAt: parseTcclDate(row.installation_date),
    renewedAt: null,
    expiresAt: null,
    // Missing for customers only the STB list shows: their balance waits for the customer list
    billed: row.total_bill_amount === undefined ? undefined : money(row.total_bill_amount),
    paid: row.total_paid_amount === undefined ? undefined : money(row.total_paid_amount),
  };
}

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
    vcNumber: null,
    address: text(row["Address"]),
    // Most specific location the portal has (town / village); "Service Area" is a broad zone
    area: text(row["LocationLevel4"]) ?? text(row["LocationLevel3"]) ?? text(row["LocationLevel2"]) ?? text(row["LocationLevel1"]) ?? text(row["Service Area"]),
    createdOn: parsePortalDate(row["Create Date"]),
    activatedAt: parsePortalDate(row["Activation Date"]),
    renewedAt: parsePortalDate(row["Renewal Date"]),
    expiresAt: parsePortalDate(row["Expiry Date"]),
  };
}

type Existing = SubscriberFields & { id: string; goneAt: Date | null; billedTotal?: { toString(): string } | number | null; customName?: string | null; customPhone?: string | null };

const same = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);

const pickFields = (s: SubscriberFields): SubscriberFields => Object.fromEntries((["externalId", ...SYNCED_FIELDS] as const).map((f) => [f, s[f]])) as unknown as SubscriberFields;

/**
 * TCCL bills customers monthly itself; Kanakkupulla keeps the collections. A customer seen for the first time
 * brings over what TCCL says they owe (billed − paid) as an opening balance; after that, each rise in TCCL's
 * billed total is charged as a monthly bill. Returns the charges and the billed totals to remember.
 */
export function tcclCharges(existing: { externalId: string; billedTotal: number | null }[], incoming: SyncedSubscriber[]) {
  const known = new Map(existing.map((e) => [e.externalId, e.billedTotal]));
  const charges: { externalId: string; kind: "OPENING" | "BILL"; amount: number }[] = [];
  const billedTotals = new Map<string, number>();
  for (const s of incoming) {
    if (s.billed === undefined || billedTotals.has(s.externalId)) continue;
    billedTotals.set(s.externalId, s.billed);
    const before = known.get(s.externalId);
    if (before === undefined || before === null) {
      const opening = Math.round((s.billed - (s.paid ?? 0)) * 100) / 100;
      if (opening !== 0) charges.push({ externalId: s.externalId, kind: "OPENING", amount: opening });
    } else if (s.billed > before) {
      charges.push({ externalId: s.externalId, kind: "BILL", amount: Math.round((s.billed - before) * 100) / 100 });
    }
  }
  return { charges, billedTotals };
}

/** What a sync must write: new subscribers, changed ones, renewals (expiry moved forward) and ones gone from the portal. */
export function diffSubscribers<T extends SubscriberFields>(existing: Existing[], incoming: T[]) {
  const byId = new Map(existing.map((s) => [s.externalId, s]));
  const seen = new Set<string>();
  const creates: T[] = [];
  const updates: { id: string; data: SubscriberFields }[] = [];
  const renewals: { subscriberId: string; plan: string | null; renewedAt: Date | null; previousExpiry: Date; expiresAt: Date }[] = [];

  for (const raw of incoming) {
    if (seen.has(raw.externalId)) continue;
    seen.add(raw.externalId);
    const old = byId.get(raw.externalId);
    if (!old) {
      creates.push(raw);
      continue;
    }
    // A name / phone the shop typed in wins over the portal's
    const sub = { ...raw, name: old.customName ?? raw.name, phone: old.customPhone ?? raw.phone };
    if (old.goneAt || SYNCED_FIELDS.some((f) => !same(old[f], sub[f]))) updates.push({ id: old.id, data: pickFields(sub) });
    if (old.expiresAt && sub.expiresAt && sub.expiresAt > old.expiresAt) {
      renewals.push({ subscriberId: old.id, plan: sub.plan, renewedAt: sub.renewedAt, previousExpiry: old.expiresAt, expiresAt: sub.expiresAt });
    }
  }
  const goneIds = existing.filter((s) => !seen.has(s.externalId) && !s.goneAt).map((s) => s.id);
  return { creates, updates, renewals, goneIds };
}

/**
 * Writes a full portal snapshot for a shop. The snapshot must be the whole list: anyone missing is marked gone.
 * TIC Fiber: new plan names get a (priceless) plan row and renewals are charged at their plan's price.
 * TCCL: opening balances and monthly bills come from its billed totals. `wallet` is the partner wallet balance.
 */
export async function applySubscriberSync(shopId: string, provider: CableProvider, incoming: SyncedSubscriber[], wallet: number | null = null) {
  const now = new Date();
  return prisma.$transaction(
    async (tx) => {
      // One sync per shop at a time (the minute timer and "Sync now" can overlap)
      await tx.$queryRaw`SELECT "id" FROM "Shop" WHERE "id" = ${shopId} FOR UPDATE`;
      const existing = await tx.cableSubscriber.findMany({ where: { shopId, provider } });
      const { creates, updates, renewals, goneIds } = diffSubscribers(existing, incoming);

      const planNames = [...new Set(incoming.map((s) => s.plan).filter((p) => p !== null))];
      if (planNames.length) await tx.cablePlan.createMany({ data: planNames.map((name) => ({ shopId, provider, name })), skipDuplicates: true });
      const prices = new Map((await tx.cablePlan.findMany({ where: { shopId, provider } })).map((p) => [p.name, p.price]));

      const created = creates.length
        ? await tx.cableSubscriber.createManyAndReturn({ data: creates.map((s) => ({ ...pickFields(s), shopId, provider, billedTotal: s.billed ?? null })), skipDuplicates: true, select: { id: true, externalId: true } })
        : [];
      for (const u of updates) await tx.cableSubscriber.update({ where: { id: u.id }, data: { ...u.data, goneAt: null } });
      if (renewals.length) {
        await tx.cableRenewal.createMany({ data: renewals.map((r) => ({ ...r, amount: (r.plan && prices.get(r.plan)) ?? null })), skipDuplicates: true });
      }

      let charged = 0;
      let tcclBill = {};
      if (provider === TCCL) {
        // With a fixed monthly amount, dues are the shop's monthly charges rather than TCCL's bills
        const monthly = (await tx.shop.findUnique({ where: { id: shopId }, select: { cableMonthlyFee: true } }))?.cableMonthlyFee != null;
        const idOf = new Map([...existing.map((e) => [e.externalId, e.id] as const), ...created.map((c) => [c.externalId, c.id] as const)]);
        const { charges, billedTotals } = tcclCharges(
          existing.map((e) => ({ externalId: e.externalId, billedTotal: e.billedTotal === null ? null : Number(e.billedTotal) })),
          incoming
        );
        const rows = charges.flatMap((c) => {
          const subscriberId = idOf.get(c.externalId);
          return subscriberId ? [{ subscriberId, kind: c.kind, amount: c.amount, plan: c.kind === "OPENING" ? "Opening balance from TCCL" : "Cable TV bill", renewedAt: now }] : [];
        });
        if (rows.length && !monthly) await tx.cableRenewal.createMany({ data: rows });
        charged = monthly ? await addMonthlyCharges(tx, shopId, now) : rows.length;
        // TCCL's bills this month (paid to TCCL on the 15th): bill rises, and new connections' first bills
        const billedNow = round2(charges.filter((c) => c.kind === "BILL" || existing.length > 0).reduce((sum, c) => sum + Math.max(0, c.amount), 0));
        if (billedNow > 0) {
          const shop = await tx.shop.findUnique({ where: { id: shopId }, select: { tcclBillMonth: true, tcclBillAmount: true } });
          const month = toMonth(now);
          tcclBill = { tcclBillMonth: month, tcclBillAmount: round2((shop?.tcclBillMonth === month ? toNumber(shop.tcclBillAmount) : 0) + billedNow) };
        }
        // New customers got their billed total when created; remember changes for the others
        for (const e of existing) {
          const billed = billedTotals.get(e.externalId);
          if (billed !== undefined && (e.billedTotal === null || Number(e.billedTotal) !== billed)) {
            await tx.cableSubscriber.update({ where: { id: e.id }, data: { billedTotal: billed } });
          }
        }
      }

      if (goneIds.length) await tx.cableSubscriber.updateMany({ where: { id: { in: goneIds } }, data: { goneAt: now } });
      const walletData = wallet === null ? {} : provider === TCCL ? { tcclWalletBalance: wallet, tcclWalletSyncedAt: now } : { walletBalance: wallet, walletSyncedAt: now };
      await tx.shop.update({ where: { id: shopId }, data: { ...(provider === TCCL ? { tcclSyncedAt: now } : { syncedAt: now }), ...walletData, ...tcclBill } });
      return { created: creates.length, updated: updates.length, renewals: renewals.length, charges: charged, gone: goneIds.length, syncedAt: now };
    },
    { timeout: 60_000 }
  );
}

/**
 * Charges the month's fixed amount to every cable house with the box on that isn't charged for it yet (and
 * catches up months no sync ran in). Runs on every sync, inside the caller's transaction; returns how many.
 */
export async function addMonthlyCharges(db: Tx, shopId: string, now = new Date()) {
  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { cableMonthlyFee: true, cableNodeFee: true, cableBillingFrom: true, cableBilledMonth: true } });
  if (!shop || shop.cableMonthlyFee === null || !shop.cableBillingFrom) return 0;
  const current = toMonth(now);
  const periods = monthsToCharge(shop.cableBillingFrom, shop.cableBilledMonth, current);
  if (periods.length === 0) return 0;
  const [houses, charged] = await Promise.all([
    db.cableSubscriber.findMany({ where: { shopId, provider: "TCCL", goneAt: null, status: "Active" }, select: { id: true, status: true, monthlyFee: true, nodeHouse: true } }),
    db.cableRenewal.findMany({ where: { period: { in: periods }, subscriber: { shopId } }, select: { subscriberId: true, period: true } }),
  ]);
  const done = new Set(charged.map((c) => `${c.subscriberId}|${c.period}`));
  const rows = monthlyChargeRows(
    { monthlyFee: toNumber(shop.cableMonthlyFee), nodeFee: shop.cableNodeFee === null ? null : toNumber(shop.cableNodeFee) },
    houses.map((h) => ({ ...h, monthlyFee: h.monthlyFee === null ? null : toNumber(h.monthlyFee) })),
    periods,
    now
  ).filter((r) => !done.has(`${r.subscriberId}|${r.period}`));
  // Two requests at once can both try a row: the unique (subscriber, month) keeps one
  if (rows.length) await db.cableRenewal.createMany({ data: rows, skipDuplicates: true });
  if (shop.cableBilledMonth !== current) await db.shop.update({ where: { id: shopId }, data: { cableBilledMonth: current } });
  return rows.length;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

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
