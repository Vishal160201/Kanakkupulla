import ExcelJS from "exceljs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { moneyRoute } from "@/lib/money/server/route";
import { commitmentsView } from "@/lib/money/server/overview";
import { loadAccounts, loadCategories, loadTxns } from "@/lib/money/server/rows";
import { commitmentWorkbook } from "@/lib/money/sheet";
import { buildMonthGrid } from "@/lib/money/commitments";
import { dateFromIso } from "@/lib/money/text";
import { parseSearchParams } from "@/lib/validations/http";

export const dynamic = "force-dynamic";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const query = z.object({ what: z.enum(["transactions", "commitments"]), format: z.enum(["xlsx", "csv"]).default("xlsx"), from: day.optional(), to: day.optional(), accountId: z.string().max(64).optional() });

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** GET /api/money/export?what=transactions|commitments&format=xlsx|csv — a download, never cached. */
export const GET = moneyRoute("GET /api/money/export", async ({ user, request }) => {
  const parsed = parseSearchParams(request, query);
  if (parsed.error) return parsed.error;
  const q = parsed.data;
  const headers = (name: string, type: string) => ({ "Content-Type": type, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" });

  if (q.what === "commitments") {
    const view = await commitmentsView(user.id);
    const months = view.grid.months;
    const grid = buildMonthGrid(view.commitments.filter((c) => c.schedule.length > 0), months.length ? { from: `${months[0]}-01`, to: `${months.at(-1)}-01` } : undefined);
    const pool = view.balances.find((b) => b.isPool)?.name ?? "Available money";
    const buf = await commitmentWorkbook(grid, view.bal, pool);
    return new NextResponse(new Uint8Array(buf), { headers: headers("commitments.xlsx", XLSX) });
  }

  const [accounts, categories, txns] = await Promise.all([
    loadAccounts(user.id),
    loadCategories(user.id),
    loadTxns(user.id, {
      ...(q.accountId ? { accountId: q.accountId } : {}),
      ...(q.from || q.to ? { txnDate: { ...(q.from ? { gte: dateFromIso(q.from) } : {}), ...(q.to ? { lte: dateFromIso(q.to) } : {}) } } : {}),
    }),
  ]);
  const acct = new Map(accounts.map((a) => [a.id, `${a.name}${a.last4 ? ` ••${a.last4}` : ""}`]));
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const head = ["Date", "Time", "Account", "Narration", "Counterparty", "Reference", "Debit", "Credit", "Balance", "Category", "Kind", "Note"];
  const rows = txns.map((t) => [
    t.txnDate, t.txnTime ?? "", acct.get(t.accountId) ?? "", t.narration, t.counterparty ?? "", t.refNo,
    t.direction === "DEBIT" ? Number(t.amount) : "", t.direction === "CREDIT" ? Number(t.amount) : "",
    t.balanceAfter == null ? "" : Number(t.balanceAfter), t.categoryId ? cat.get(t.categoryId) ?? "" : "", t.kind, t.note ?? "",
  ]);

  if (q.format === "csv") {
    const body = [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    return new NextResponse(`﻿${body}`, { headers: headers("transactions.csv", "text/csv; charset=utf-8") });
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Transactions");
  ws.addRow(head).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c, i) => (c.width = i === 3 ? 60 : 14));
  [7, 8, 9].forEach((i) => (ws.getColumn(i).numFmt = "#,##,##0.00"));
  return new NextResponse(new Uint8Array(await wb.xlsx.writeBuffer()), { headers: headers("transactions.xlsx", XLSX) });
});
