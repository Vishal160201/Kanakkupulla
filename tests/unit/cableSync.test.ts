import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { diffSubscribers, parsePortalDate, ticRowToSubscriber, type SubscriberFields } from "@/lib/cableSync";

const row = (overrides: Record<string, string> = {}) => ({
  "User ID": "kumar@",
  Name: "Kumar  S",
  Phone: "9000000001",
  "Alternative Phone": "",
  Status: "Active",
  Plan: "TIC_GOLD_75MBPS_UL_499",
  MACID: "aa:bb",
  "Create Date": "03 Sep 2024 12:00 AM",
  "Activation Date": "28 Oct 2026 12:00 AM",
  "Renewal Date": "28 Oct 2026 12:13 PM",
  "Expiry Date": "26 Nov 2026 11:59 PM",
  Address: "1, Main St",
  "Service Area": "Zone 2",
  LocationLevel1: "Tenkasi",
  LocationLevel2: "SANKARANKOVIL",
  LocationLevel3: "",
  LocationLevel4: "",
  ...overrides,
});

const sub = (overrides: Record<string, string> = {}) => ticRowToSubscriber(row(overrides)) as SubscriberFields;

describe("parsePortalDate", () => {
  it("reads portal dates as India time", () => {
    expect(parsePortalDate("26 Nov 2026 11:59 PM")?.toISOString()).toBe("2026-11-26T18:29:00.000Z");
    expect(parsePortalDate("28 Oct 2026 12:00 AM")?.toISOString()).toBe("2026-10-27T18:30:00.000Z");
    expect(parsePortalDate("28 Oct 2026 12:13 PM")?.toISOString()).toBe("2026-10-28T06:43:00.000Z");
    expect(parsePortalDate("05 May 2026")?.toISOString()).toBe("2026-05-04T18:30:00.000Z");
  });

  it("returns null for blanks and other formats", () => {
    expect(parsePortalDate("")).toBeNull();
    expect(parsePortalDate(undefined)).toBeNull();
    expect(parsePortalDate("2026-11-26")).toBeNull();
    expect(parsePortalDate("26 Foo 2026")).toBeNull();
  });
});

describe("ticRowToSubscriber", () => {
  it("maps the report columns", () => {
    const s = sub();
    expect(s).toMatchObject({ externalId: "kumar@", name: "Kumar S", altPhone: null, status: "Active", area: "SANKARANKOVIL" });
    expect(s.expiresAt?.toISOString()).toBe("2026-11-26T18:29:00.000Z");
  });

  it("skips rows without a user id", () => {
    expect(ticRowToSubscriber(row({ "User ID": "  " }))).toBeNull();
  });
});

describe("diffSubscribers", () => {
  const existing = (s: SubscriberFields, extra: { goneAt?: Date | null } = {}) => ({ ...s, id: `id-${s.externalId}`, goneAt: null, ...extra });

  it("creates new subscribers and leaves unchanged ones alone", () => {
    const d = diffSubscribers([existing(sub())], [sub(), sub({ "User ID": "new@" })]);
    expect(d.creates.map((s) => s.externalId)).toEqual(["new@"]);
    expect(d.updates).toEqual([]);
    expect(d.renewals).toEqual([]);
    expect(d.goneIds).toEqual([]);
  });

  it("records a renewal when the expiry moves forward", () => {
    const renewed = sub({ "Expiry Date": "26 Dec 2026 11:59 PM", "Renewal Date": "25 Nov 2026 10:00 AM" });
    const d = diffSubscribers([existing(sub())], [renewed]);
    expect(d.updates).toHaveLength(1);
    expect(d.renewals).toEqual([
      { subscriberId: "id-kumar@", plan: renewed.plan, renewedAt: renewed.renewedAt, previousExpiry: sub().expiresAt, expiresAt: renewed.expiresAt },
    ]);
  });

  it("updates without a renewal when only details change", () => {
    const d = diffSubscribers([existing(sub())], [sub({ Status: "Inactive" })]);
    expect(d.updates).toHaveLength(1);
    expect(d.renewals).toEqual([]);
  });

  it("marks missing subscribers gone once, and brings returning ones back", () => {
    const gone = existing(sub({ "User ID": "old@" }));
    const alreadyGone = existing(sub({ "User ID": "left@" }), { goneAt: new Date() });
    const back = existing(sub(), { goneAt: new Date() });
    const d = diffSubscribers([gone, alreadyGone, back], [sub(), sub()]);
    expect(d.goneIds).toEqual(["id-old@"]);
    expect(d.updates.map((u) => u.id)).toEqual(["id-kumar@"]);
    expect(d.creates).toEqual([]);
  });
});
