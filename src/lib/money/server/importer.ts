import { createHash, randomBytes } from "crypto";
import type { MoneyAccount, MoneyImportSource, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { encryptOptional, encryptText, lookupHash } from "../crypto";
import { readPdfLines } from "../parsers/pdfText";
import { detectHdfc, parseHdfc } from "../parsers/hdfc";
import { detectKvb, parseKvb } from "../parsers/kvb";
import { parseCardCsv } from "../parsers/cardCsv";
import { parseAaJson } from "../parsers/aaJson";
import { validateStatement, type ValidationResult } from "../parsers/validate";
import { StatementParseError, type ParsedRow, type ParsedStatement } from "../parsers/types";
import { applyRules } from "../rules";
import { extractCounterparty, dateFromIso } from "../text";
import { loadAccounts, loadCategories, loadRules } from "./rows";
import { runSelfTransferMatching } from "./matching";

export type UploadKind = "pdf" | "csv" | "json" | "xlsx";

/** By content first (PDF and XLSX magic bytes), then by extension. */
export function uploadKind(name: string, bytes: Uint8Array): UploadKind | null {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf"; // %PDF
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return /\.xlsx$/i.test(name) ? "xlsx" : null; // PK zip
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
  if (ext === "json") return "json";
  if (ext === "csv" || ext === "txt") return "csv";
  return null;
}

export async function parseStatementFile(kind: Exclude<UploadKind, "xlsx">, bytes: Uint8Array, password?: string): Promise<ParsedStatement> {
  if (kind === "pdf") {
    const pages = await readPdfLines(bytes, password);
    if (detectHdfc(pages)) return parseHdfc(pages);
    if (detectKvb(pages)) return parseKvb(pages);
    throw new StatementParseError("This PDF doesn't look like an HDFC or KVB savings statement.", "UNSUPPORTED");
  }
  const text = new TextDecoder("utf-8").decode(bytes);
  return kind === "csv" ? parseCardCsv(text) : parseAaJson(text);
}

const SOURCE_TYPE: Record<ParsedStatement["source"], MoneyImportSource> = { HDFC_PDF: "PDF", KVB_PDF: "PDF", CARD_CSV: "CSV", AA_JSON: "AA_JSON" };

/**
 * Same transaction -> same key, so re-importing (or overlapping statements) can't add it twice.
 * Bank rows: date|ref|amount|direction|balance. Card rows: date|time|merchant|amount|direction.
 * Hashed with the tracker's key, so the stored key reveals nothing.
 */
export function dedupeKeyFor(row: ParsedRow, style: "bank" | "card"): string {
  const parts =
    style === "card"
      ? [row.txnDate, row.txnTime ?? "", row.narration.toUpperCase().replace(/\s+/g, " "), row.amount, row.direction]
      : [row.txnDate, row.refNo, row.amount, row.direction, row.balanceAfter ?? "", row.balanceAfter ? "" : row.narration.toUpperCase()];
  return lookupHash(parts.join("|"));
}

/** A key that never collides, for rows typed in by hand (two identical coffees are two rows). */
export const manualDedupeKey = () => lookupHash(`manual|${randomBytes(16).toString("hex")}`);

export const fileFingerprint = (bytes: Uint8Array) => lookupHash(createHash("sha256").update(bytes).digest("hex"));

/** The account a statement belongs to: the one you picked, else the one with the same last 4 digits. */
export function pickAccount(statement: ParsedStatement, accounts: MoneyAccount[], requestedId?: string | null): MoneyAccount | null {
  if (requestedId) return accounts.find((a) => a.id === requestedId) ?? null;
  const wantType = statement.source === "CARD_CSV" ? "CREDIT_CARD" : "BANK";
  const candidates = accounts.filter((a) => a.type === wantType);
  if (statement.accountLast4) {
    const byLast4 = candidates.find((a) => a.last4 === statement.accountLast4);
    if (byLast4) return byLast4;
  }
  if (statement.institution) {
    const word = statement.institution.split(" ")[0].toLowerCase();
    const byBank = candidates.filter((a) => a.institution.toLowerCase().includes(word));
    if (byBank.length === 1) return byBank[0];
  }
  return null;
}

export interface StatementPreview {
  type: "statement";
  source: ParsedStatement["source"];
  institution: string;
  accountLast4: string | null;
  accountId: string | null;
  alreadyImported: boolean;
  periodFrom: string | null;
  periodTo: string | null;
  openingBalance: string | null;
  closingBalance: string | null;
  validation: ValidationResult;
  rows: (ParsedRow & { duplicate: boolean })[];
  newCount: number;
  duplicateCount: number;
}

export async function previewStatement(userId: string, statement: ParsedStatement, bytes: Uint8Array, accountId?: string | null): Promise<StatementPreview> {
  const accounts = await loadAccounts(userId);
  const account = pickAccount(statement, accounts, accountId);
  const style = statement.source === "CARD_CSV" ? "card" : "bank";
  const keys = statement.rows.map((r) => dedupeKeyFor(r, style));
  let existing = new Set<string>();
  let alreadyImported = false;
  if (account) {
    const [found, imp] = await Promise.all([
      prisma.moneyTransaction.findMany({ where: { userId, accountId: account.id, dedupeKey: { in: keys } }, select: { dedupeKey: true } }),
      prisma.moneyImport.findFirst({ where: { userId, accountId: account.id, fileHash: fileFingerprint(bytes) }, select: { id: true } }),
    ]);
    existing = new Set(found.map((f) => f.dedupeKey));
    alreadyImported = !!imp;
  }
  // Duplicates inside the file itself count once
  const seen = new Set<string>();
  const rows = statement.rows.map((r, i) => {
    const dup = existing.has(keys[i]) || seen.has(keys[i]);
    seen.add(keys[i]);
    return { ...r, duplicate: dup };
  });
  const duplicateCount = rows.filter((r) => r.duplicate).length;
  return {
    type: "statement",
    source: statement.source,
    institution: statement.institution,
    accountLast4: statement.accountLast4,
    accountId: account?.id ?? null,
    alreadyImported,
    periodFrom: statement.periodFrom,
    periodTo: statement.periodTo,
    openingBalance: statement.openingBalance,
    closingBalance: statement.closingBalance,
    validation: validateStatement(statement),
    rows,
    newCount: rows.length - duplicateCount,
    duplicateCount,
  };
}

export class ImportError extends Error {
  constructor(message: string, readonly status = 422) {
    super(message);
  }
}

/** Saves a statement: one import record, the new rows (rules applied, text encrypted), then matching. */
export async function commitStatement(
  userId: string,
  statement: ParsedStatement,
  bytes: Uint8Array,
  opts: { accountId: string | null; filename: string },
): Promise<{ importId: string; inserted: number; skipped: number; selfTransfers: number; status: "OK" | "NEEDS_REVIEW" }> {
  const accounts = await loadAccounts(userId);
  const account = pickAccount(statement, accounts, opts.accountId);
  if (!account) throw new ImportError("Choose which account this file belongs to.");
  if (statement.source !== "CARD_CSV" && account.type !== "BANK") throw new ImportError("Bank statements go into a bank account, not a card.");

  const fileHash = fileFingerprint(bytes);
  if (await prisma.moneyImport.findFirst({ where: { userId, accountId: account.id, fileHash }, select: { id: true } })) {
    throw new ImportError("This file was already imported into this account.", 409);
  }

  const validation = validateStatement(statement);
  const style = statement.source === "CARD_CSV" ? "card" : "bank";
  const [rules, categories] = await Promise.all([loadRules(userId), loadCategories(userId)]);
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  const seen = new Set<string>();
  const data: Prisma.MoneyTransactionCreateManyInput[] = [];
  statement.rows.forEach((row, i) => {
    const dedupeKey = dedupeKeyFor(row, style);
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    const parties = style === "card" ? { counterparty: row.narration.toUpperCase(), upiId: null } : extractCounterparty(row.narration);
    const ruled = applyRules({ narration: row.narration, counterparty: parties.counterparty, upiId: parties.upiId, direction: row.direction }, rules);
    const csvCategory = row.category ? categoryByName.get(row.category.toLowerCase()) ?? null : null;
    data.push({
      userId,
      accountId: account.id,
      txnDate: dateFromIso(row.txnDate),
      txnTime: row.txnTime ?? null,
      seq: i,
      valueDate: row.valueDate ? dateFromIso(row.valueDate) : null,
      narration: encryptText(row.narration),
      refNo: row.refNo,
      amount: row.amount,
      direction: row.direction,
      balanceAfter: row.balanceAfter,
      counterparty: encryptOptional(parties.counterparty),
      upiId: encryptOptional(parties.upiId),
      categoryId: csvCategory ?? ruled.categoryId,
      kind: style === "card" ? (row.direction === "DEBIT" ? "EXPENSE" : "INCOME") : ruled.kind,
      counterAccountId: ruled.counterAccountId,
      dedupeKey,
    });
  });

  const result = await prisma.$transaction(async (tx) => {
    const imp = await tx.moneyImport.create({
      data: {
        userId,
        accountId: account.id,
        sourceType: SOURCE_TYPE[statement.source],
        filename: encryptOptional(opts.filename),
        fileHash,
        periodFrom: statement.periodFrom ? dateFromIso(statement.periodFrom) : null,
        periodTo: statement.periodTo ? dateFromIso(statement.periodTo) : null,
        openingBalance: statement.openingBalance,
        closingBalance: statement.closingBalance,
        status: validation.ok ? "OK" : "NEEDS_REVIEW",
        warnings: validation.warnings as unknown as Prisma.InputJsonValue,
      },
    });
    const created = await tx.moneyTransaction.createMany({ data: data.map((d) => ({ ...d, importId: imp.id })), skipDuplicates: true });
    return { importId: imp.id, inserted: created.count, status: imp.status };
  });

  const selfTransfers = await runSelfTransferMatching(userId);
  return { ...result, skipped: statement.rows.length - result.inserted, selfTransfers };
}

/** Deletes an import and its rows; transfers they were paired with go back to unmatched. */
export async function deleteImport(userId: string, importId: string): Promise<boolean> {
  const imp = await prisma.moneyImport.findFirst({ where: { id: importId, userId }, select: { id: true } });
  if (!imp) return false;
  const rows = await prisma.moneyTransaction.findMany({ where: { importId, userId }, select: { id: true } });
  const ids = rows.map((r) => r.id);
  const otherSide: Prisma.MoneyTransactionWhereInput = { userId, linkedTxnId: { in: ids }, OR: [{ importId: null }, { importId: { not: importId } }] };
  await prisma.$transaction([
    // The other side of each pair becomes plain spending/income again
    prisma.moneyTransaction.updateMany({ where: { ...otherSide, direction: "DEBIT" }, data: { linkedTxnId: null, kind: "EXPENSE" } }),
    prisma.moneyTransaction.updateMany({ where: { ...otherSide, direction: "CREDIT" }, data: { linkedTxnId: null, kind: "INCOME" } }),
    prisma.moneyTransaction.updateMany({ where: { userId, id: { in: ids } }, data: { linkedTxnId: null } }),
    prisma.moneyCommitmentSchedule.updateMany({ where: { transactionId: { in: ids } }, data: { transactionId: null } }),
    prisma.moneyTransaction.deleteMany({ where: { userId, id: { in: ids } } }),
    prisma.moneyImport.delete({ where: { id: imp.id } }),
  ]);
  return true;
}
