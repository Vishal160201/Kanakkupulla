import { describe, expect, it } from "vitest";
import { matchSelfTransfers, passThroughSuggestions, scheduleSuggestions, type MatchAccount, type MatchTxn } from "@/lib/money/matching";
import { applyRules, ruleMatches, SEED_RULES, seedCardTarget, type RuleInput } from "@/lib/money/rules";
import { extractCounterparty, normaliseRef } from "@/lib/money/text";

const accounts: MatchAccount[] = [
  { id: "hdfc", type: "BANK", ownIdentifiers: ["HDFC0001234", "ME@OKHDFC"] },
  { id: "kvb", type: "BANK", ownIdentifiers: ["KVBL0001234", "HOLDER-KVB"] },
  { id: "kiwi", type: "CREDIT_CARD", ownIdentifiers: [] },
];

let n = 0;
const t = (o: Partial<MatchTxn> & Pick<MatchTxn, "accountId" | "txnDate" | "amount" | "direction">): MatchTxn => ({
  id: `t${++n}`, refNo: "", narration: "", kind: o.direction === "DEBIT" ? "EXPENSE" : "INCOME", linkedTxnId: null, ...o,
});

describe("self transfers (plan §12)", () => {
  it("pairs 4 HDFC→KVB transfers by reference: 8,000 in all", () => {
    const refs: [string, string, string][] = [
      ["100000000011", "1000.00", "2026-10-30"],
      ["100000000022", "2000.00", "2026-10-30"],
      ["100000000033", "300.00", "2026-10-31"],
      ["100000000044", "4700.00", "2026-11-01"],
    ];
    const txns = refs.flatMap(([ref, amount, date]) => [
      t({ accountId: "hdfc", txnDate: date, amount, direction: "DEBIT", refNo: normaliseRef(`0000${ref}`), narration: "UPI-ACCOUNT HOLDER-..." }),
      t({ accountId: "kvb", txnDate: date, amount, direction: "CREDIT", refNo: ref, narration: "UPI/CR/..." }),
    ]);
    // Same amount, other account, but a different reference and no mention: not a transfer
    txns.push(t({ accountId: "kvb", txnDate: "2026-10-31", amount: "300.00", direction: "CREDIT", refNo: "999999999999" }));
    const { pairs, unmatched } = matchSelfTransfers(txns, accounts);
    expect(pairs).toHaveLength(4);
    const total = pairs.reduce((s, [d]) => s + Number(txns.find((x) => x.id === d)?.amount), 0);
    expect(total).toBe(8000);
    expect(unmatched).toEqual([]);
  });

  it("matches KVB debits to HDFC credits on the same day", () => {
    const txns = [
      t({ accountId: "kvb", txnDate: "2026-09-14", amount: "1200.00", direction: "DEBIT", refNo: "200000000011" }),
      t({ accountId: "kvb", txnDate: "2026-09-14", amount: "1100.00", direction: "DEBIT", refNo: "200000000022" }),
      t({ accountId: "hdfc", txnDate: "2026-09-14", amount: "1100.00", direction: "CREDIT", refNo: "200000000022" }),
      t({ accountId: "hdfc", txnDate: "2026-09-14", amount: "1200.00", direction: "CREDIT", refNo: "200000000011" }),
    ];
    expect(matchSelfTransfers(txns, accounts).pairs).toEqual([
      [txns[0].id, txns[3].id],
      [txns[1].id, txns[2].id],
    ]);
  });

  it("falls back to a day apart plus the other account's identifier", () => {
    const d = t({ accountId: "hdfc", txnDate: "2026-11-05", amount: "2000.00", direction: "DEBIT", narration: "NEFT DR-KVBL0001234-HOLDER" });
    const c = t({ accountId: "kvb", txnDate: "2026-11-06", amount: "2000.00", direction: "CREDIT", narration: "NEFT CR" });
    const far = t({ accountId: "kvb", txnDate: "2026-11-09", amount: "2000.00", direction: "CREDIT", narration: "NEFT CR" });
    expect(matchSelfTransfers([d, far, c], accounts).pairs).toEqual([[d.id, c.id]]);
  });

  it("lists a transfer whose other side isn't imported yet", () => {
    const d = t({ accountId: "kvb", txnDate: "2026-11-07", amount: "300.00", direction: "DEBIT", narration: "UPI/DR/1/ME@OKHDFC" });
    expect(matchSelfTransfers([d], accounts)).toEqual({ pairs: [], unmatched: [d.id] });
  });

  it("never pairs within one account, already-linked rows or salary", () => {
    const a = t({ accountId: "hdfc", txnDate: "2026-11-01", amount: "100.00", direction: "DEBIT", refNo: "123456789" });
    const b = t({ accountId: "hdfc", txnDate: "2026-11-01", amount: "100.00", direction: "CREDIT", refNo: "123456789" });
    const c = t({ accountId: "kvb", txnDate: "2026-11-01", amount: "100.00", direction: "CREDIT", refNo: "123456789", kind: "SALARY" });
    expect(matchSelfTransfers([a, b, c], accounts).pairs).toEqual([]);
  });
});

describe("pass-through and commitment suggestions", () => {
  it("suggests a credit followed within 2 days by the same debit", () => {
    const c = t({ accountId: "hdfc", txnDate: "2026-11-01", amount: "5000.00", direction: "CREDIT" });
    const d = t({ accountId: "hdfc", txnDate: "2026-11-03", amount: "5000.00", direction: "DEBIT" });
    const late = t({ accountId: "hdfc", txnDate: "2026-11-09", amount: "500.00", direction: "DEBIT" });
    expect(passThroughSuggestions([c, d, late])).toEqual([{ creditId: c.id, debitId: d.id }]);
    expect(passThroughSuggestions([c, d], new Set([`${c.id}:${d.id}`]))).toEqual([]);
  });

  it("suggests a friend's 3,333.33 credit for their November entry", () => {
    const pay = t({ accountId: "kvb", txnDate: "2026-11-10", amount: "3333.33", direction: "CREDIT", narration: "UPI/CR/1/ARUN KUMAR/UTIB/" });
    const other = t({ accountId: "kvb", txnDate: "2026-11-10", amount: "3333.33", direction: "CREDIT", narration: "UPI/CR/2/SOMEONE" });
    expect(
      scheduleSuggestions([other, pay], [{ scheduleId: "s1", commitmentId: "c", dueDate: "2026-11-12", amount: "3333.33", direction: "CREDIT", matchPattern: "ARUN" }], new Set()),
    ).toEqual([{ scheduleId: "s1", txnId: pay.id }]);
  });
});

describe("rules", () => {
  const rules: RuleInput[] = [
    { id: "food", priority: 100, field: "NARRATION", pattern: "SWIGGY", isRegex: false, categoryId: "cat-food" },
    { id: "tea", priority: 100, field: "NARRATION", pattern: "\\bTEA\\b", isRegex: true, categoryId: "cat-food" },
    { id: "hdfccc", priority: 10, field: "NARRATION", pattern: "IB BILLPAY DR-HDFC", isRegex: false, direction: "DEBIT", categoryId: "cat-card", kind: "CARD_PAYMENT", targetAccountId: "maincc" },
    { id: "exc", priority: 10, field: "NARRATION", pattern: "EXC PYMT", isRegex: false, direction: "CREDIT", kind: "CARD_REFUND" },
    { id: "arun", priority: 50, field: "COUNTERPARTY", pattern: "ARUN KUMAR", isRegex: false, categoryId: "cat-friends" },
  ];

  it("marks IB BILLPAY DR-HDFC as a payment to the HDFC card", () => {
    expect(applyRules({ narration: "IB BILLPAY DR-HDFC7E1234567", direction: "DEBIT" }, rules)).toMatchObject({ categoryId: "cat-card", kind: "CARD_PAYMENT", counterAccountId: "maincc" });
  });

  it("respects direction, word boundaries and fields", () => {
    expect(applyRules({ narration: "EXC PYMT", direction: "DEBIT" }, rules).kind).toBe("EXPENSE");
    expect(applyRules({ narration: "EXC PYMT REV", direction: "CREDIT" }, rules).kind).toBe("CARD_REFUND");
    expect(applyRules({ narration: "STEAM GAMES", direction: "DEBIT" }, rules).categoryId).toBeNull();
    expect(applyRules({ narration: "MASALA TEA STALL", direction: "DEBIT" }, rules).categoryId).toBe("cat-food");
    expect(applyRules({ narration: "UPI-x", counterparty: "ARUN KUMAR", direction: "CREDIT" }, rules)).toMatchObject({ categoryId: "cat-friends", kind: "INCOME" });
    expect(applyRules({ narration: "swiggy order", direction: "DEBIT" }, rules).categoryId).toBe("cat-food");
  });

  it("ignores a broken regex instead of throwing", () => {
    expect(ruleMatches({ id: "x", priority: 1, field: "NARRATION", pattern: "(", isRegex: true }, { narration: "(", direction: "DEBIT" })).toBe(false);
  });

  it("seeds card-payment rules against your cards", () => {
    const accts = [
      { id: "maincc", type: "CREDIT_CARD", name: "Main CC", institution: "HDFC Bank" },
      { id: "kiwi", type: "CREDIT_CARD", name: "Kiwi", institution: "Yes Bank" },
      { id: "hdfc", type: "BANK", name: "HDFC savings", institution: "HDFC Bank" },
    ];
    expect(seedCardTarget("HDFC", accts)).toBe("maincc");
    expect(seedCardTarget("KIWI", accts)).toBe("kiwi");
    expect(SEED_RULES.some((r) => r.patterns.includes("SALARY"))).toBe(true);
  });
});

describe("counterparties from narrations", () => {
  it("reads HDFC, KVB, NEFT and IMPS formats", () => {
    expect(extractCounterparty("UPI-ARUN KUMAR-arun@okaxis-UTIB0001234-123456789012-EMI")).toEqual({ counterparty: "ARUN KUMAR", upiId: "arun@okaxis" });
    expect(extractCounterparty("UPI/CR/123456789012/Arun Kumar/UTIB/arun@okaxis/EMI").counterparty).toBe("ARUN KUMAR");
    expect(extractCounterparty("NEFT CR-UTIB0000123-ACME TRADERS PVT LTD-HOLDER-UTIBN123").counterparty).toBe("ACME TRADERS PVT LTD");
    expect(extractCounterparty("IMPS-123456789012-MEENA K-UTIB-XXXX1234-GIFT").counterparty).toBe("MEENA K");
    expect(extractCounterparty("INTEREST PAID TILL 30-SEP-2026")).toEqual({ counterparty: null, upiId: null });
    expect(extractCounterparty("UPI-AUTOPAY-APPLE MEDIA SERVICES-APPLESE RVICES@HDFCBANK-HDFC0MERUPI-1234").counterparty).toBe("APPLE MEDIA SERVICES");
    expect(normaliseRef("-")).toBe("");
  });
});
