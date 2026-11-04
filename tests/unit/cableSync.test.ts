import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { diffSubscribers, parsePortalDate, parseTcclDate, tcclCharges, tcclRowToSubscriber, ticRowToSubscriber, type SubscriberFields } from "@/lib/cableSync";

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

  it("keeps a name and phone the shop edited instead of the portal's", () => {
    const edited = { ...existing(sub()), name: "Kumar (shop)", phone: "9876543210", customName: "Kumar (shop)", customPhone: "9876543210" };
    expect(diffSubscribers([edited], [sub()]).updates).toEqual([]);
    const d = diffSubscribers([edited], [sub({ Status: "Inactive" })]);
    expect(d.updates[0].data).toMatchObject({ name: "Kumar (shop)", phone: "9876543210", status: "Inactive" });
  });
});

describe("TCCL", () => {
  const tccl = (o: Record<string, string> = {}) => ({
    account_number: "C2128032",
    customer_name: "Murugan",
    mobile_no: "919000000001",
    city: "TENKASI",
    installation_address: "North street",
    vc_number: "0123456789",
    serial_number: "SN12345678",
    installation_date: "20-02-2019  15:43:40",
    Created_Date: "20-02-2019  15:43:40",
    total_bill_amount: "12345.00",
    total_paid_amount: "12045.00",
    "STB Status": "Active",
    ...o,
  });

  it("reads Ezybill dates as India time", () => {
    expect(parseTcclDate("20-02-2019  15:43:40")?.toISOString()).toBe("2019-02-20T10:13:40.000Z");
    expect(parseTcclDate("05-11-2026")?.toISOString()).toBe("2026-11-04T18:30:00.000Z");
    expect(parseTcclDate("")).toBeNull();
  });

  it("maps a customer row", () => {
    const s = tcclRowToSubscriber(tccl());
    expect(s).toMatchObject({ externalId: "C2128032", name: "Murugan", status: "Active", vcNumber: "0123456789", macId: "SN12345678", area: "TENKASI", billed: 12345, paid: 12045, expiresAt: null });
    expect(tcclRowToSubscriber(tccl({ account_number: "" }))).toBeNull();
  });

  it("carries the TCCL balance over once, then charges each rise in the billed total", () => {
    const first = tcclCharges([], [tcclRowToSubscriber(tccl())!]);
    expect(first.charges).toEqual([{ externalId: "C2128032", kind: "OPENING", amount: 300 }]);
    expect(first.billedTotals.get("C2128032")).toBe(12345);

    // Next month TCCL bills 250 more; payments are now kept in Kanakkupulla, so TCCL's paid doesn't matter
    const later = tcclCharges([{ externalId: "C2128032", billedTotal: 12345 }], [tcclRowToSubscriber(tccl({ total_bill_amount: "12595.00" }))!]);
    expect(later.charges).toEqual([{ externalId: "C2128032", kind: "BILL", amount: 250 }]);

    const same = tcclCharges([{ externalId: "C2128032", billedTotal: 12345 }], [tcclRowToSubscriber(tccl())!]);
    expect(same.charges).toEqual([]);
  });

  it("skips a zero opening balance and keeps an advance as a negative one", () => {
    expect(tcclCharges([], [tcclRowToSubscriber(tccl({ total_paid_amount: "12345.00" }))!]).charges).toEqual([]);
    expect(tcclCharges([], [tcclRowToSubscriber(tccl({ total_paid_amount: "12445.00" }))!]).charges).toEqual([{ externalId: "C2128032", kind: "OPENING", amount: -100 }]);
  });
});
