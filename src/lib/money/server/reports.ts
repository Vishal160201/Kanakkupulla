import { peopleLedger, periodReport, recurringPayments, salaryCycles } from "../analytics";
import { addDays } from "../text";
import { loadAccounts, loadCategories, loadTxns, toAAccount } from "./rows";
import { cardsView, todayIso } from "./overview";

/** Analyzer reports (plan §9). */
export async function reportsView(userId: string, opts: { type: "cycle" | "cards" | "recurring" | "people"; from?: string; to?: string }) {
  const today = todayIso();
  if (opts.type === "cards") return { type: "cards" as const, cards: await cardsView(userId) };

  const [accounts, txns, categories] = await Promise.all([loadAccounts(userId), loadTxns(userId), loadCategories(userId)]);
  if (opts.type === "recurring") return { type: "recurring" as const, rows: recurringPayments(txns.filter((t) => t.txnDate >= addDays(today, -200))) };
  if (opts.type === "people") return { type: "people" as const, rows: peopleLedger(txns) };

  const cycles = salaryCycles(txns, today);
  const from = opts.from ?? cycles[0]?.from ?? addDays(today, -29);
  const to = opts.to ?? cycles[0]?.to ?? today;
  const report = periodReport(accounts.map(toAAccount), txns, from, to);
  const cat = new Map(categories.map((c) => [c.id, c]));
  const withNames = <T extends { categoryId: string | null }>(rows: T[]) =>
    rows.map((r) => ({ ...r, name: r.categoryId ? cat.get(r.categoryId)?.name ?? "Uncategorised" : "Uncategorised", color: r.categoryId ? cat.get(r.categoryId)?.color ?? "#94a3b8" : "#94a3b8" }));
  return {
    type: "cycle" as const,
    cycles,
    from,
    to,
    combined: { ...report.combined, spending: withNames(report.combined.spending) },
    perAccount: report.perAccount.map((p) => ({ ...p, spending: withNames(p.spending) })),
  };
}
