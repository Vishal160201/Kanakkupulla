/**
 * Bank and card SMS alerts -> one transaction. Pure: no database, no logging of the text.
 *
 * Every GPay / PhonePe / Paytm payment comes out of a bank account, and Kiwi spends go on the
 * Yes Bank card, so the bank's alert is the one message that sees them all. Formats differ by bank
 * and change often, so this reads the parts any alert has (amount, debit or credit, account or card
 * digits, date, who, reference) instead of matching whole templates.
 */

export interface SmsTxn {
  amount: string; // "250.00"
  direction: "DEBIT" | "CREDIT";
  /** Last 4 digits of the account or card the alert is about */
  last4: string | null;
  isCard: boolean;
  /** HDFC, KVB, YES, KIWI, … from the text */
  bank: string | null;
  /** yyyy-mm-dd from the text, when it's a believable date near when the SMS arrived */
  date: string | null;
  counterparty: string | null;
  upiId: string | null;
  refNo: string | null;
  /** The account is paying a card bill (the card's own alert is ignored, see below) */
  cardPayment: boolean;
}

export type SmsParse = { ok: true; txn: SmsTxn } | { ok: false; reason: string };

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

const NOT_A_PAYMENT: [RegExp, string][] = [
  [/\bOTP\b|one[- ]time password|verification code|\bcode is\b/i, "a one-time password"],
  [/\b(failed|declined|unsuccessful|not processed|could not be processed|rejected)\b/i, "a failed payment"],
  [/\bwill be (debited|credited|deducted|charged)\b|\bis due\b|\bdue (date|on|by)\b|\bminimum (amount )?due\b|\bstatement (is |has been )?generated\b/i, "a reminder, not a payment"],
  [/\b(collect request|has requested|requested (money|rs|inr)|payment request|request of)\b/i, "a payment request"],
  [/\bmandate\b|\bauto[- ]?pay\b.*\b(set ?up|registered|created|scheduled|activated)\b|\be-?mandate\b/i, "an autopay set-up"],
  [/\b(offer|cashback upto|pre-?approved|apply now|win|voucher|loan of up to|limit increase)\b/i, "an offer"],
];

const CARD_PAYMENT_RECEIVED = /\bpayment (of .{0,30})?(has been |is )?(received|credited|successful)|thank you for (your |the )?payment|payment towards your .{0,30}card/i;

/** Credit words and debit words; whichever appears first decides. */
const CREDIT = /\b(credited|received|deposited|refund(ed)?|reversed|reversal|cashback (of|credited))\b/i;
const DEBIT = /\b(debited|sent|spent|paid|withdrawn|purchase|txn of|transaction of|used for|deducted|charged)\b/i;

const AMOUNT = /(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;

function moneyString(raw: string): string | null {
  const clean = raw.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, frac = ""] = clean.split(".");
  const value = `${String(Number(whole))}.${(frac + "00").slice(0, 2)}`;
  return value === "0.00" ? null : value;
}

/** The account or card the alert is about, and which of the two it is. */
function findAccount(text: string): { last4: string | null; card: boolean | null } {
  const masked = /(a\/?c|acct|account|card)(?:\s*(?:no\.?|number|ending(?:\s*with)?))?\s*[:.-]?\s*(?:[x*•#]+|\.{2,})\s*(\d{3,6})\b/i.exec(text);
  if (masked) return { last4: masked[2].slice(-4), card: /card/i.test(masked[1]) ? !isDebitCard(text, masked.index) : false };
  const plainCard = /\bcard\s+(?:no\.?\s*|ending\s*(?:with\s*)?)?(\d{4})\b/i.exec(text);
  if (plainCard) return { last4: plainCard[1], card: !isDebitCard(text, plainCard.index) };
  const bare = /\b[xX*]{2,}(\d{4})\b/.exec(text);
  return { last4: bare ? bare[1] : null, card: null };
}

/** "Debit Card ending 1234" is the bank account's card, not a credit card. */
const isDebitCard = (text: string, at: number) => /debit\s*$/i.test(text.slice(Math.max(0, at - 8), at));

function findBank(text: string): string | null {
  const t = text.toUpperCase();
  if (/\bKIWI\b/.test(t)) return "KIWI";
  if (/\bYES ?BANK\b/.test(t)) return "YES";
  if (/\bHDFC\b/.test(t)) return "HDFC";
  if (/\bKVB\b|KARUR VYSYA/.test(t)) return "KVB";
  for (const b of ["SBI", "ICICI", "AXIS", "KOTAK", "IOB", "CANARA", "INDIAN BANK", "FEDERAL", "IDFC", "AU BANK"]) if (t.includes(b)) return b.replace(/ BANK$/, "");
  return null;
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

function findDate(text: string, received: string): string | null {
  const candidates: string[] = [];
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) candidates.push(iso(+m[1], +m[2], +m[3]));
  for (const m of text.matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/g)) candidates.push(iso(fullYear(+m[3]), +m[2], +m[1]));
  for (const m of text.matchAll(/\b(\d{1,2})[\s-]?([A-Za-z]{3,4})[\s-,]*(\d{2,4})\b/g)) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) candidates.push(iso(fullYear(+m[3]), month, +m[1]));
  }
  const receivedMs = Date.parse(`${received}T00:00:00Z`);
  for (const c of candidates) {
    const ms = Date.parse(`${c}T00:00:00Z`);
    if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== c) continue; // 31/02 etc.
    const days = (receivedMs - ms) / 86_400_000;
    if (days >= -1 && days <= 40) return c;
  }
  return null;
}

function findRef(text: string): string | null {
  const labelled = /(?:ref(?:erence)?(?:\s*no\.?|\s*number)?|upi(?:\s*ref(?:\s*no\.?)?)?|rrn|txn\s*(?:id|no\.?))\s*[:.#-]?\s*(\d{9,18})\b/i.exec(text);
  if (labelled) return labelled[1];
  const slashed = /\bUPI\/(?:[A-Z]{2}\/)?(\d{9,18})\b/i.exec(text);
  return slashed ? slashed[1] : null;
}

function findUpiId(text: string): string | null {
  const m = /\b([a-z0-9][a-z0-9._-]{1,63}@[a-z][a-z0-9]{1,30})\b/i.exec(text);
  return m && !/\.(com|in|net|org)$/i.test(m[1]) ? m[1].toLowerCase() : null;
}

const STOP = /\s+(?:on|ref|refno|upi|via|avl|available|bal|not you|info|for|thru|through|using|dated|at\s+\d)\b|\s+\d{1,2}[-/:]\d|\s*[.(,;\n]|\s+-\s|$/i;
const VPA = /\b[a-z0-9][a-z0-9._-]{1,63}@[a-z][a-z0-9]{1,30}\b/gi;

function findCounterparty(original: string, upiId: string | null): string | null {
  // A UPI ID is kept separately; hide it so "to VPA a.b@okaxis" isn't read as a name
  const text = original.replace(VPA, "§");
  // "To SWIGGY" on its own line (HDFC), "to <name> on", "at <merchant> on", "@UPI_SWIGGY", "from <name>"
  const patterns = [
    /(?:^|\n)\s*(?:to|from)\s+([^\n]{2,50})/gi,
    /@\s*UPI[_-]([A-Z0-9 &._-]{2,40})/gi,
    /\b(?:to|towards|at|from|by)\s+(?:vpa\s+)?([A-Za-z][A-Za-z0-9 &.'_-]{1,50})/gi,
  ];
  for (const p of patterns) {
    for (const m of text.matchAll(p)) {
      let name = m[1];
      const stop = STOP.exec(name);
      if (stop) name = name.slice(0, stop.index);
      name = name.replace(/\s+/g, " ").trim();
      if (!name || /^(your|the|a\/?c|account|card|beneficiary|vpa|rs|inr)\b/i.test(name)) continue;
      if (/\b(a\/?c|account|bank)\b/i.test(name)) continue; // "From HDFC Bank A/C *1234" is you
      return name.toUpperCase().slice(0, 60);
    }
  }
  return upiId ? upiId.split("@")[0].replace(/[._-]+/g, " ").toUpperCase() : null;
}

/** `received`: the day the SMS arrived (yyyy-mm-dd, India), used when the text has no date. */
export function parseBankSms(raw: string, received: string): SmsParse {
  const text = raw.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  if (!text) return { ok: false, reason: "an empty message" };
  for (const [re, reason] of NOT_A_PAYMENT) if (re.test(text)) return { ok: false, reason };

  const amountMatch = AMOUNT.exec(text);
  const amount = amountMatch ? moneyString(amountMatch[1]) : null;
  if (!amount) return { ok: false, reason: "no amount in it" };

  const credit = CREDIT.exec(text);
  const debit = DEBIT.exec(text);
  if (!credit && !debit) return { ok: false, reason: "not a debit or credit alert" };
  const direction: "DEBIT" | "CREDIT" = credit && (!debit || credit.index < debit.index) ? "CREDIT" : "DEBIT";

  const account = findAccount(text);
  const isCard = account.card ?? (/\bkiwi\b|\bcredit card\b/i.test(text) && !/\bdebit card\b/i.test(text));
  if (isCard && direction === "CREDIT" && CARD_PAYMENT_RECEIVED.test(text)) {
    return { ok: false, reason: "a card bill payment (counted from the bank's alert)" };
  }

  const upiId = findUpiId(text);
  return {
    ok: true,
    txn: {
      amount,
      direction,
      last4: account.last4,
      isCard,
      bank: findBank(text),
      date: findDate(text, received),
      counterparty: findCounterparty(text, upiId),
      upiId,
      refNo: findRef(text),
      cardPayment: !isCard && direction === "DEBIT" && /\bcredit ?card\b|\bcard (bill|payment)\b|\bcred\b|\bkiwi\b|billdesk.*card/i.test(text),
    },
  };
}
