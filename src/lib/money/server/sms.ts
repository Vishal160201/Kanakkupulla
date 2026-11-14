import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { MoneyAccount, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { canUseMoneyTracker } from "../access";
import { encryptOptional, encryptText, lookupHash } from "../crypto";
import { applyRules } from "../rules";
import { parseBankSms, type SmsTxn } from "../parsers/sms";
import { dateFromIso } from "../text";
import { todayInIndia } from "../accounts";
import { loadRules } from "./rows";
import { runSelfTransferMatching } from "./matching";

/**
 * Bank SMS forwarded from the phone (an iPhone Shortcuts automation) become typed-in entries.
 * The phone signs in with its own key, shown once; only a SHA-256 of it is stored. The SMS text
 * itself is kept only encrypted, on the entry it made. Messages that aren't payments are dropped.
 * When the statement arrives its rows replace these entries (replaceTypedEntries).
 */

const TOKEN_KEY = (userId: string) => `money_sms_token:${userId}`;
const LOG_KEY = (userId: string) => `money_sms_log:${userId}`;
const sha = (v: string) => createHash("sha256").update(v).digest("hex");

interface TokenRow {
  hash: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface SmsLogEntry {
  at: string;
  outcome: "added" | "duplicate" | "skipped" | "no-account";
  detail: string;
  amount?: string;
  direction?: "DEBIT" | "CREDIT";
  account?: string;
}

const asToken = (v: unknown): TokenRow | null =>
  v && typeof v === "object" && typeof (v as TokenRow).hash === "string" ? (v as TokenRow) : null;

export async function smsConnection(userId: string) {
  const [token, log] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: TOKEN_KEY(userId) } }),
    prisma.systemSetting.findUnique({ where: { key: LOG_KEY(userId) } }),
  ]);
  const t = asToken(token?.value);
  return {
    connected: !!t,
    createdAt: t?.createdAt ?? null,
    lastUsedAt: t?.lastUsedAt ?? null,
    log: (Array.isArray(log?.value) ? (log.value as unknown as SmsLogEntry[]) : []).slice(0, 20),
  };
}

/** A new key for the phone (the old one stops working). Returned once, never stored. */
export async function createSmsToken(userId: string): Promise<string> {
  const token = `kkm_${randomBytes(24).toString("base64url")}`;
  const value: TokenRow = { hash: sha(token), createdAt: new Date().toISOString(), lastUsedAt: null };
  await prisma.systemSetting.upsert({
    where: { key: TOKEN_KEY(userId) },
    create: { key: TOKEN_KEY(userId), value: value as unknown as Prisma.InputJsonValue },
    update: { value: value as unknown as Prisma.InputJsonValue },
  });
  return token;
}

export async function revokeSmsToken(userId: string): Promise<void> {
  await prisma.systemSetting.deleteMany({ where: { key: TOKEN_KEY(userId) } });
}

/** The tracker user a phone key belongs to, or null. */
export async function userForSmsToken(token: string): Promise<{ id: string } | null> {
  if (!/^kkm_[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const want = Buffer.from(sha(token));
  const rows = await prisma.systemSetting.findMany({ where: { key: { startsWith: "money_sms_token:" } } });
  for (const r of rows) {
    const t = asToken(r.value);
    if (!t || t.hash.length !== want.length || !timingSafeEqual(Buffer.from(t.hash), want)) continue;
    const userId = r.key.slice("money_sms_token:".length);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, status: true } });
    if (!user || user.status === "INACTIVE" || !canUseMoneyTracker(user.email)) return null;
    await prisma.systemSetting.update({ where: { key: r.key }, data: { value: { ...t, lastUsedAt: new Date().toISOString() } as unknown as Prisma.InputJsonValue } });
    return { id: user.id };
  }
  return null;
}

async function log(userId: string, entry: SmsLogEntry) {
  const row = await prisma.systemSetting.findUnique({ where: { key: LOG_KEY(userId) } });
  const list = [entry, ...(Array.isArray(row?.value) ? (row.value as unknown as SmsLogEntry[]) : [])].slice(0, 20);
  const value = list as unknown as Prisma.InputJsonValue;
  await prisma.systemSetting.upsert({ where: { key: LOG_KEY(userId) }, create: { key: LOG_KEY(userId), value }, update: { value } });
}

const BANK_WORDS: Record<string, RegExp> = {
  HDFC: /hdfc/i,
  KVB: /kvb|karur/i,
  YES: /yes|kiwi/i,
  KIWI: /kiwi|yes/i,
};

/** Which of your accounts an alert is about: same last 4 digits, else the only account of that bank and kind. */
export function matchSmsAccount(txn: SmsTxn, accounts: Pick<MoneyAccount, "id" | "name" | "institution" | "type" | "last4">[]) {
  const kind = txn.isCard ? "CREDIT_CARD" : "BANK";
  if (txn.last4) {
    const same = accounts.filter((a) => a.last4 === txn.last4);
    if (same.length === 1) return same[0];
    const sameKind = same.filter((a) => a.type === kind);
    if (sameKind.length === 1) return sameKind[0];
  }
  const word = txn.bank ? BANK_WORDS[txn.bank] ?? new RegExp(txn.bank, "i") : null;
  if (word) {
    const byBank = accounts.filter((a) => a.type === kind && (word.test(a.institution) || word.test(a.name)));
    if (byBank.length === 1) return byBank[0];
  }
  return null;
}

/** What a forwarded SMS would do, without saving anything (the "try a message" box). */
export async function previewSms(userId: string, text: string) {
  const received = todayInIndia().toISOString().slice(0, 10);
  const parsed = parseBankSms(text, received);
  if (!parsed.ok) return { ok: false as const, reason: parsed.reason };
  const accounts = await prisma.moneyAccount.findMany({ where: { userId } });
  const account = matchSmsAccount(parsed.txn, accounts);
  return { ok: true as const, txn: { ...parsed.txn, date: parsed.txn.date ?? received }, account: account ? { id: account.id, name: account.name } : null };
}

export async function ingestSms(userId: string, text: string): Promise<SmsLogEntry> {
  const received = todayInIndia().toISOString().slice(0, 10);
  const at = new Date().toISOString();
  const parsed = parseBankSms(text, received);
  if (!parsed.ok) {
    const entry: SmsLogEntry = { at, outcome: "skipped", detail: `Skipped: ${parsed.reason}` };
    await log(userId, entry);
    return entry;
  }
  const t = parsed.txn;
  const accounts = await prisma.moneyAccount.findMany({ where: { userId } });
  const account = matchSmsAccount(t, accounts);
  if (!account) {
    const entry: SmsLogEntry = {
      at, outcome: "no-account", amount: t.amount, direction: t.direction,
      detail: t.last4 ? `No account or card ending ${t.last4}. Add its last 4 digits in Accounts.` : "Couldn't tell which account this was. Add the last 4 digits to your accounts.",
    };
    await log(userId, entry);
    return entry;
  }

  const isCard = account.type === "CREDIT_CARD";
  const who = t.counterparty ?? t.upiId ?? null;
  const narration = `${t.direction === "DEBIT" ? (isCard ? "Card spend" : "Paid") : "Received"}${who ? ` ${t.direction === "DEBIT" ? "to" : "from"} ${who}` : ""} (SMS)`;
  // A bank debit for a card bill: link it to the card when the text names one of your cards
  const paidCard = !isCard && t.cardPayment
    ? accounts.find((a) => a.type === "CREDIT_CARD" && ((a.last4 && text.includes(a.last4)) || new RegExp(`\\b${a.name.replace(/[^A-Za-z0-9]/g, "")}\\b`, "i").test(text))) ?? null
    : null;
  const ruled = applyRules({ narration: `${who ?? ""} ${t.upiId ?? ""} ${text}`.trim(), counterparty: who, upiId: t.upiId, direction: t.direction }, await loadRules(userId));

  try {
    await prisma.moneyTransaction.create({
      data: {
        userId,
        accountId: account.id,
        txnDate: dateFromIso(t.date ?? received),
        seq: 0,
        narration: encryptText(narration),
        refNo: t.refNo ?? "",
        amount: t.amount,
        direction: t.direction,
        counterparty: encryptOptional(who),
        upiId: encryptOptional(t.upiId),
        categoryId: ruled.categoryId,
        kind: paidCard ? "CARD_PAYMENT" : isCard ? (t.direction === "DEBIT" ? "EXPENSE" : "CARD_REFUND") : ruled.kind,
        counterAccountId: paidCard ? paidCard.id : isCard ? null : ruled.counterAccountId,
        note: encryptOptional(text.slice(0, 480)),
        // The same SMS forwarded twice (two automations, a retry) is saved once
        dedupeKey: lookupHash(`sms|${text.replace(/\s+/g, " ").trim().toLowerCase()}`),
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const entry: SmsLogEntry = { at, outcome: "duplicate", detail: "Already added from this SMS", amount: t.amount, direction: t.direction, account: account.name };
      await log(userId, entry);
      return entry;
    }
    throw error;
  }
  if (!isCard) await runSelfTransferMatching(userId);
  const entry: SmsLogEntry = { at, outcome: "added", detail: narration.replace(/ \(SMS\)$/, ""), amount: t.amount, direction: t.direction, account: account.name };
  await log(userId, entry);
  return entry;
}
