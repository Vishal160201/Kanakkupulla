import { describe, expect, it } from "vitest";
import { houseFee, monthLabel, monthlyChargeRows, monthsToBill, monthsToCharge, nextMonth } from "@/lib/cableMonthly";

const rates = { monthlyFee: 250, nodeFee: 150 };
const house = (over: Partial<{ id: string; status: string; monthlyFee: number | null; nodeHouse: boolean }> = {}) => ({ id: "a", status: "Active", monthlyFee: null, nodeHouse: false, ...over });

describe("houseFee", () => {
  it("uses the house's own amount, else the node amount, else the usual one", () => {
    expect(houseFee(rates, house())).toBe(250);
    expect(houseFee(rates, house({ nodeHouse: true }))).toBe(150);
    expect(houseFee({ monthlyFee: 250, nodeFee: null }, house({ nodeHouse: true }))).toBe(250);
    expect(houseFee(rates, house({ nodeHouse: true, monthlyFee: 0 }))).toBe(0);
    expect(houseFee(rates, house({ monthlyFee: 200 }))).toBe(200);
  });
  it("is null while monthly billing is off", () => {
    expect(houseFee({ monthlyFee: null, nodeFee: 150 }, house({ monthlyFee: 200 }))).toBeNull();
  });
});

describe("monthsToBill", () => {
  it("lists the months after the last billed one, across a year end", () => {
    expect(monthsToBill("2026-11", "2026-11")).toEqual([]);
    expect(monthsToBill("2026-11", "2026-12")).toEqual(["2026-12"]);
    expect(monthsToBill("2026-11", "2027-02")).toEqual(["2026-12", "2027-01", "2027-02"]);
  });
});

describe("monthsToCharge", () => {
  it("charges nothing before billing starts, then the current month on every run", () => {
    expect(nextMonth("2026-12")).toBe("2027-01");
    expect(monthsToCharge("2026-12", null, "2026-11")).toEqual([]);
    expect(monthsToCharge("2026-12", null, "2026-12")).toEqual(["2026-12"]);
    // Every sync in the month tops it up (a box switched on mid-month pays the full month)
    expect(monthsToCharge("2026-12", "2026-12", "2026-12")).toEqual(["2026-12"]);
  });
  it("catches up months no sync ran in", () => {
    expect(monthsToCharge("2026-12", "2026-12", "2027-02")).toEqual(["2027-01", "2027-02"]);
  });
});

describe("monthlyChargeRows", () => {
  it("charges houses with the box on, skipping box-off and free houses", () => {
    const now = new Date("2026-12-01T01:00:00Z");
    const rows = monthlyChargeRows(rates, [house({ id: "on" }), house({ id: "off", status: "Deactive" }), house({ id: "free", monthlyFee: 0 }), house({ id: "node", nodeHouse: true })], ["2026-12"], now);
    expect(rows.map((r) => [r.subscriberId, r.amount])).toEqual([["on", 250], ["node", 150]]);
    expect(rows[0]).toMatchObject({ kind: "MONTHLY", period: "2026-12", plan: "Cable TV · Dec 2026" });
  });
  it("labels months", () => {
    expect(monthLabel("2027-01")).toBe("Jan 2027");
  });
});
