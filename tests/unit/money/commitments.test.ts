import { describe, expect, it } from "vitest";
import { buildMonthGrid, computeBalForEmi, splitAmount, type CommitmentInput } from "@/lib/money/commitments";

/**
 * A made-up sheet with the same shape as the plan's (§12): a card EMI paid back by a friend,
 * two savings goals, a card bill and expected income. Real figures are checked separately
 * against your own sheet in realFixtures.test.ts (gitignored data).
 */
function sheet(opts: { pool: string; friendPaid?: string; emiPaid?: string }) {
  const parts = splitAmount("10000", 3); // 3333.33, 3333.33, 3333.34
  const commitments: CommitmentInput[] = [
    {
      id: "friend", name: "Arun", type: "RECEIVABLE", status: "ACTIVE", totalAmount: "10000", linkedCommitmentId: "emi",
      schedule: ["2026-11-12", "2026-12-12", "2027-01-12"].map((d, i) => ({ id: `f${i}`, dueDate: d, amount: parts[i], paidAmount: i === 0 && opts.friendPaid ? opts.friendPaid : "0" })),
    },
    {
      id: "emi", name: "Card EMI", type: "CARD_EMI", status: "ACTIVE", totalAmount: "10000",
      schedule: ["2026-11-13", "2026-12-13", "2027-01-13"].map((d, i) => ({ id: `e${i}`, dueDate: d, amount: parts[i], paidAmount: i === 0 && opts.emiPaid ? opts.emiPaid : "0" })),
    },
    {
      id: "ins", name: "Insurance", type: "SAVINGS_GOAL", status: "ACTIVE", totalAmount: "12000",
      schedule: ["06", "07", "08", "09", "10"].map((m) => ({ id: `i${m}`, dueDate: `2026-${m}-01`, amount: "2000", paidAmount: "2000" })),
    },
    {
      id: "fest", name: "Festival", type: "SAVINGS_GOAL", status: "ACTIVE", totalAmount: "7000",
      schedule: [
        ["2026-03-01", "1500"], ["2026-04-01", "1500"], ["2026-06-01", "500"], ["2026-07-01", "500"],
        ["2026-08-01", "500"], ["2026-09-01", "500"], ["2026-10-01", "500"],
        ["2026-11-01", "0"], ["2026-12-01", "0"], ["2027-01-01", "0"],
      ].map(([d, paid], i) => ({ id: `x${i}`, dueDate: d, amount: paid === "0" ? "500" : paid, paidAmount: paid })),
    },
    { id: "bill", name: "Card bill", type: "CARD_BILL", status: "ACTIVE", totalAmount: "30000", schedule: [{ id: "b1", dueDate: "2026-11-20", amount: "30000", paidAmount: "0" }] },
    { id: "inc", name: "Incoming", type: "EXPECTED_INCOME", status: "ACTIVE", totalAmount: "15000", schedule: [{ id: "n1", dueDate: "2026-11-30", amount: "15000", paidAmount: "0" }] },
  ];
  return computeBalForEmi({ pool: [{ name: "Savings", balance: opts.pool }], commitments });
}

describe("Bal for EMI", () => {
  it("pool + incoming − (my outstanding + bills + savings held)", () => {
    const r = sheet({ pool: "25000" });
    expect(r.balForEmi).toBe("-5500.00");
    expect(r.cashPosition).toBe("-5500.00");
    expect(r).toMatchObject({ poolMoney: "25000.00", incoming: "15000.00", bills: "30000.00", savingsHeld: "15500.00", myOutstanding: "0.00" });
  });

  it("doesn't move when the friend pays their part into the pool (no double counting)", () => {
    const r = sheet({ pool: "28333.33", friendPaid: "3333.33" });
    expect(r.balForEmi).toBe("-5500.00");
    expect(r.myOutstanding).toBe("3333.33");
    expect(r.cashPosition).toBe("-5500.00");
  });

  it("doesn't move after that part is paid to the card", () => {
    const r = sheet({ pool: "25000", friendPaid: "3333.33", emiPaid: "3333.33" });
    expect(r.balForEmi).toBe("-5500.00");
    expect(r.pairs[0]).toMatchObject({ emiRemaining: "6666.67", receivableRemaining: "6666.67", myOutstanding: "0.00" });
    expect(r.cashPosition).toBe("-5500.00");
  });

  it("paying the card before the friend pays: same Bal for EMI, lower cash position", () => {
    const r = sheet({ pool: "21666.67", emiPaid: "3333.33" });
    expect(r.balForEmi).toBe("-5500.00");
    expect(r.frontedForOthers).toBe("3333.33");
    expect(r.cashPosition).toBe("-8833.33");
  });

  it("ignores completed commitments", () => {
    const r = computeBalForEmi({
      pool: [{ name: "Savings", balance: "1000" }],
      commitments: [{ id: "a", name: "Old bill", type: "CARD_BILL", status: "COMPLETED", totalAmount: "500", schedule: [] }],
    });
    expect(r.balForEmi).toBe("1000.00");
  });
});

describe("month grid", () => {
  it("totals every month column, including the last ones", () => {
    const grid = buildMonthGrid(
      [{
        id: "fest", name: "Festival", type: "SAVINGS_GOAL", status: "ACTIVE", totalAmount: "7000",
        schedule: [
          { id: "1", dueDate: "2026-03-01", amount: "1500", paidAmount: "1500" },
          { id: "2", dueDate: "2026-12-01", amount: "500", paidAmount: "500" },
          { id: "3", dueDate: "2027-01-01", amount: "500", paidAmount: "500" },
        ],
      }],
      { from: "2026-03-01", to: "2027-01-01" },
    );
    expect(grid.months).toHaveLength(11);
    expect(grid.months[0]).toBe("2026-03");
    expect(grid.months.at(-1)).toBe("2027-01");
    expect(grid.rows[0]).toMatchObject({ totalReceived: "2500.00", target: "7000.00", balance: "4500.00" });
    expect(grid.rows[0].cells.at(-1)?.paid).toBe("500.00");
  });
});

describe("splitAmount", () => {
  it("splits in paise with the remainder on the last part", () => {
    expect(splitAmount("10000", 3)).toEqual(["3333.33", "3333.33", "3333.34"]);
    expect(splitAmount("100", 3)).toEqual(["33.33", "33.33", "33.34"]);
    expect(splitAmount("10", 1)).toEqual(["10.00"]);
    expect(splitAmount("10", 0)).toEqual([]);
  });
});
