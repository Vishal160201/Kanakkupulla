import { describe, expect, it } from "vitest";
import {
  bankBalance, cardCycles, cardOutstanding, cycleFor, dueDateAfter, forecast, lastWorkingDay,
  openingBalance, peopleLedger, periodReport, recurringPayments, salaryCycles, type AAccount, type ATxn,
} from "@/lib/money/analytics";

const acct = (o: Partial<AAccount> & Pick<AAccount, "id" | "type">): AAccount => ({
  name: o.id, isPool: false, lowBalanceAlert: "1000", manualBalance: null, manualBalanceAsOf: null, outstanding: null,
  outstandingAsOf: null, cycleStartDay: null, dueDay: null, creditLimit: null, ...o,
});
let n = 0;
const tx = (o: Partial<ATxn> & Pick<ATxn, "accountId" | "txnDate" | "amount" | "direction">): ATxn => ({
  id: `x${++n}`, txnTime: null, seq: n, kind: o.direction === "DEBIT" ? "EXPENSE" : "INCOME", categoryId: null, balanceAfter: null,
  narration: "", counterparty: null, counterAccountId: null, ...o,
});

const hdfc = acct({ id: "hdfc", type: "BANK" });
const kvb = acct({ id: "kvb", type: "BANK", isPool: true });

describe("cycle report: both banks, self transfers excluded", () => {
  const txns = [
    tx({ accountId: "hdfc", txnDate: "2026-10-29", amount: "100.00", direction: "DEBIT", balanceAfter: "5000.00" }),
    tx({ accountId: "kvb", txnDate: "2026-10-28", amount: "50.00", direction: "CREDIT", balanceAfter: "3000.00" }),
    // in range
    tx({ accountId: "hdfc", txnDate: "2026-10-30", amount: "10000.00", direction: "CREDIT", kind: "SALARY", balanceAfter: "15000.00" }),
    tx({ accountId: "hdfc", txnDate: "2026-10-30", amount: "4500.00", direction: "DEBIT", kind: "SELF_TRANSFER", balanceAfter: "10500.00" }),
    tx({ accountId: "kvb", txnDate: "2026-10-30", amount: "4500.00", direction: "CREDIT", kind: "SELF_TRANSFER", balanceAfter: "7500.00" }),
    tx({ accountId: "hdfc", txnDate: "2026-10-31", amount: "500.00", direction: "DEBIT", categoryId: "food", balanceAfter: "10000.00" }),
    tx({ accountId: "hdfc", txnDate: "2026-11-01", amount: "2000.00", direction: "DEBIT", kind: "CARD_PAYMENT", balanceAfter: "8000.00" }),
    // after range
    tx({ accountId: "kvb", txnDate: "2026-11-05", amount: "1.00", direction: "DEBIT", balanceAfter: "7499.00" }),
  ];

  it("opening + external in − external out = closing", () => {
    const r = periodReport([hdfc, kvb], txns, "2026-10-30", "2026-11-02");
    expect(r.combined).toMatchObject({ opening: "8000.00", closing: "15500.00", externalIn: "10000.00", externalOut: "2500.00", net: "7500.00", selfIn: "4500.00", selfOut: "4500.00", cardBillsPaid: "2000.00" });
    expect(Number(r.combined.opening) + Number(r.combined.net)).toBe(Number(r.combined.closing));
    expect(r.combined.spending).toEqual([{ categoryId: "food", amount: "500.00", count: 1 }]);
    expect(r.perAccount.find((p) => p.accountId === "kvb")).toMatchObject({ opening: "3000.00", closing: "7500.00", net: "0.00" });
  });

  it("works out an opening balance with no earlier rows", () => {
    expect(openingBalance(hdfc, txns.slice(2), "2026-10-30")).toBe("5000.00");
  });

  it("splits salary cycles", () => {
    const s = [
      tx({ accountId: "hdfc", txnDate: "2026-09-30", amount: "50000.00", direction: "CREDIT", kind: "SALARY" }),
      tx({ accountId: "hdfc", txnDate: "2026-10-30", amount: "50500.00", direction: "CREDIT", kind: "SALARY" }),
    ];
    expect(salaryCycles(s, "2026-11-10")).toEqual([
      { from: "2026-10-30", to: "2026-11-10", salary: "50500.00" },
      { from: "2026-09-30", to: "2026-10-29", salary: "50000.00" },
    ]);
  });
});

describe("balances", () => {
  it("uses the last statement row, unless a later manual balance was typed", () => {
    const rows = [tx({ accountId: "kvb", txnDate: "2026-11-01", amount: "1", direction: "DEBIT", balanceAfter: "21300.00" })];
    expect(bankBalance(kvb, rows)).toEqual({ balance: "21300.00", asOf: "2026-11-01", source: "statement" });
    const manual = { ...kvb, manualBalance: "25000.00", manualBalanceAsOf: "2026-11-10" };
    expect(bankBalance(manual, rows)).toEqual({ balance: "25000.00", asOf: "2026-11-10", source: "manual" });
    expect(bankBalance(manual, [])?.balance).toBe("25000.00");
    expect(bankBalance(kvb, [])).toBeNull();
  });

  it("adds spends you typed in after the statement's last day", () => {
    const rows = [
      tx({ accountId: "kvb", txnDate: "2026-11-10", amount: "15.00", direction: "DEBIT", balanceAfter: "3000.00" }),
      tx({ accountId: "kvb", txnDate: "2026-11-10", amount: "99.00", direction: "DEBIT" }), // same day: already in the statement
      tx({ accountId: "kvb", txnDate: "2026-11-11", amount: "1999.00", direction: "DEBIT" }),
      tx({ accountId: "kvb", txnDate: "2026-11-12", amount: "500.00", direction: "CREDIT" }),
    ];
    expect(bankBalance(kvb, rows)).toEqual({ balance: "1501.00", asOf: "2026-11-12", source: "statement" });
    expect(bankBalance(kvb, rows, "2026-11-11")?.balance).toBe("1001.00");
  });

  it("card used = typed amount + later spends − refunds − payments", () => {
    const kiwi = acct({ id: "kiwi", type: "CREDIT_CARD", outstanding: "30000.22", outstandingAsOf: "2026-11-10" });
    const rows = [
      tx({ accountId: "kiwi", txnDate: "2026-11-10", amount: "99.00", direction: "DEBIT" }), // already in the typed amount
      tx({ accountId: "kiwi", txnDate: "2026-11-11", amount: "500.00", direction: "DEBIT" }),
      tx({ accountId: "kiwi", txnDate: "2026-11-12", amount: "100.00", direction: "CREDIT" }),
      tx({ accountId: "kvb", txnDate: "2026-11-15", amount: "20000.00", direction: "DEBIT", kind: "CARD_PAYMENT", counterAccountId: "kiwi" }),
    ];
    expect(cardOutstanding(kiwi, rows)).toBe("10400.22");
  });
});

describe("card cycles", () => {
  it("finds the cycle and due date", () => {
    expect(cycleFor("2026-11-10", 20)).toEqual({ from: "2026-10-20", to: "2026-11-19" });
    expect(cycleFor("2026-11-25", 20)).toEqual({ from: "2026-11-20", to: "2026-12-19" });
    expect(cycleFor("2026-01-05", 20)).toEqual({ from: "2025-12-20", to: "2026-01-19" });
    expect(cycleFor("2026-11-10", null)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(cycleFor("2026-03-01", 31)).toEqual({ from: "2026-02-28", to: "2026-03-30" });
    expect(dueDateAfter("2026-11-19", 13)).toBe("2026-12-13");
    expect(dueDateAfter("2026-11-05", 13)).toBe("2026-11-13");
  });

  it("summarises spends, leaving large one-offs out of the daily average", () => {
    const card = acct({ id: "cc", type: "CREDIT_CARD", cycleStartDay: 1, dueDay: 20 });
    const rows = [
      tx({ accountId: "cc", txnDate: "2026-11-01", amount: "300.00", direction: "DEBIT", narration: "SWIGGY" }),
      tx({ accountId: "cc", txnDate: "2026-11-02", amount: "700.00", direction: "DEBIT", narration: "SWIGGY" }),
      tx({ accountId: "cc", txnDate: "2026-11-03", amount: "5000.00", direction: "DEBIT", narration: "MEENA" }),
      tx({ accountId: "cc", txnDate: "2026-11-04", amount: "200.00", direction: "CREDIT", narration: "REFUND" }),
    ];
    const [current] = cardCycles(card, rows, "2026-11-05", { largeThreshold: "3000" });
    expect(current).toMatchObject({ from: "2026-11-01", to: "2026-11-30", spends: "6000.00", refunds: "200.00", billEstimate: "5800.00", dueDate: "2026-12-20", avgDailyExcludingLarge: "200.00", isOpen: true });
    expect(current.topMerchants[0]).toEqual({ name: "MEENA", amount: "5000.00" });
  });
});

describe("recurring and people", () => {
  it("spots a monthly payment", () => {
    const rows = ["2026-08-05", "2026-09-04", "2026-10-06", "2026-11-05"].map((d) =>
      tx({ accountId: "hdfc", txnDate: d, amount: d === "2026-10-06" ? "5100.00" : "5000.00", direction: "DEBIT", counterparty: "AMMA" }));
    rows.push(tx({ accountId: "hdfc", txnDate: "2026-11-06", amount: "50.00", direction: "DEBIT", counterparty: "TEA SHOP" }));
    const r = recurringPayments(rows);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ name: "AMMA", typicalAmount: "5000.00", usualDay: 5, months: 4 });
  });

  it("nets money sent and received per person", () => {
    const rows = [
      tx({ accountId: "kvb", txnDate: "2026-11-10", amount: "3333.33", direction: "CREDIT", counterparty: "ARUN" }),
      tx({ accountId: "kvb", txnDate: "2026-11-01", amount: "1000.00", direction: "DEBIT", counterparty: "ARUN" }),
      tx({ accountId: "kvb", txnDate: "2026-11-02", amount: "1.00", direction: "DEBIT", counterparty: "ME", kind: "SELF_TRANSFER" }),
    ];
    expect(peopleLedger(rows)).toEqual([{ name: "ARUN", sent: "1000.00", received: "3333.33", net: "2333.33", count: 2, lastDate: "2026-11-10" }]);
  });
});

describe("forecast", () => {
  it("projects the pool day by day and finds the lowest point", () => {
    const f = forecast({ date: "2026-11-10", balance: "25000.00" }, [
      { date: "2026-11-08", amount: "-100.00", label: "Overdue", kind: "bill" },
      { date: "2026-11-12", amount: "3333.33", label: "Arun", kind: "receivable" },
      { date: "2026-11-13", amount: "-3333.33", label: "Card EMI", kind: "emi" },
      { date: "2026-11-20", amount: "-30000.00", label: "Card bill", kind: "bill" },
      { date: "2026-11-30", amount: "50500.00", label: "Salary", kind: "salary" },
    ], 30);
    expect(f.points).toHaveLength(31);
    expect(f.points[0].balance).toBe("24900.00");
    expect(f.lowest).toEqual({ date: "2026-11-20", balance: "-5100.00" });
    expect(f.points.at(-1)?.balance).toBe("45400.00");
  });

  it("finds the last working day", () => {
    expect(lastWorkingDay(2026, 10)).toBe("2026-10-30");
    expect(lastWorkingDay(2026, 11)).toBe("2026-11-30");
    expect(lastWorkingDay(2026, 5)).toBe("2026-05-29");
  });
});
