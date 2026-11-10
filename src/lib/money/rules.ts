import { containsLoose } from "./text";
import type { Kind } from "./matching";

/** Auto-categorisation (plan §6.2 and §10). Pure: rules and rows already decrypted. */

export type RuleField = "NARRATION" | "COUNTERPARTY" | "UPI_ID" | "MERCHANT";

export interface RuleInput {
  id: string;
  priority: number;
  field: RuleField;
  pattern: string;
  isRegex: boolean;
  direction?: "DEBIT" | "CREDIT" | null;
  categoryId?: string | null;
  kind?: Kind | null;
  targetAccountId?: string | null;
}

export interface RuleTarget {
  narration: string;
  counterparty?: string | null;
  upiId?: string | null;
  direction: "DEBIT" | "CREDIT";
}

const regexCache = new Map<string, RegExp | null>();
function toRegex(pattern: string): RegExp | null {
  if (!regexCache.has(pattern)) {
    try {
      regexCache.set(pattern, new RegExp(pattern, "i"));
    } catch {
      regexCache.set(pattern, null);
    }
  }
  return regexCache.get(pattern) ?? null;
}

export function isValidRegex(pattern: string): boolean {
  return toRegex(pattern) != null;
}

export function ruleMatches(rule: RuleInput, txn: RuleTarget): boolean {
  if (rule.direction && rule.direction !== txn.direction) return false;
  const value =
    rule.field === "COUNTERPARTY" ? txn.counterparty ?? "" : rule.field === "UPI_ID" ? txn.upiId ?? "" : txn.narration; // MERCHANT = card narration
  if (!value) return false;
  if (rule.isRegex) return toRegex(rule.pattern)?.test(value) ?? false;
  return containsLoose(value, rule.pattern);
}

export const defaultKind = (direction: "DEBIT" | "CREDIT"): Kind => (direction === "DEBIT" ? "EXPENSE" : "INCOME");

/**
 * Lowest priority number first. The first matching rule that sets a category gives the category;
 * the first that sets a kind gives the kind (and, for card payments, the card being paid).
 */
export function applyRules(txn: RuleTarget, rules: RuleInput[]): { categoryId: string | null; kind: Kind; counterAccountId: string | null; matched: string[] } {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  let categoryId: string | null = null;
  let kind: Kind | null = null;
  let counterAccountId: string | null = null;
  const matched: string[] = [];
  for (const rule of sorted) {
    if (!ruleMatches(rule, txn)) continue;
    matched.push(rule.id);
    if (!categoryId && rule.categoryId) categoryId = rule.categoryId;
    if (!kind && rule.kind) {
      kind = rule.kind;
      counterAccountId = rule.targetAccountId ?? null;
    }
    if (categoryId && kind) break;
  }
  return { categoryId, kind: kind ?? defaultKind(txn.direction), counterAccountId, matched };
}

// ---------------------------------------------------------------------------
// Seeds (plan §10): created the first time the tracker opens
// ---------------------------------------------------------------------------

export const SEED_CATEGORIES: { name: string; color: string; icon: string }[] = [
  { name: "Food & Drinks", color: "#f97316", icon: "ph-fork-knife" },
  { name: "Travel", color: "#0ea5e9", icon: "ph-train" },
  { name: "Fuel", color: "#eab308", icon: "ph-gas-pump" },
  { name: "Shopping", color: "#ec4899", icon: "ph-shopping-bag" },
  { name: "Jewellery", color: "#a855f7", icon: "ph-diamond" },
  { name: "Entertainment", color: "#f43f5e", icon: "ph-film-slate" },
  { name: "Rent & Utilities", color: "#14b8a6", icon: "ph-house-line" },
  { name: "Family Support", color: "#10b981", icon: "ph-users-three" },
  { name: "Subscriptions", color: "#6366f1", icon: "ph-repeat" },
  { name: "Card Bills", color: "#64748b", icon: "ph-credit-card" },
  { name: "Friends/Splits", color: "#8b5cf6", icon: "ph-handshake" },
  { name: "Salary", color: "#22c55e", icon: "ph-briefcase" },
  { name: "Interest", color: "#84cc16", icon: "ph-percent" },
  { name: "Other", color: "#94a3b8", icon: "ph-tag" },
];

export interface SeedRule {
  patterns: string[];
  isRegex?: boolean;
  category: string;
  kind?: Kind;
  direction?: "DEBIT" | "CREDIT";
  priority: number;
  /** Which card a card-payment rule pays: matched against your card accounts */
  card?: "HDFC" | "KIWI";
}

export const SEED_RULES: SeedRule[] = [
  { patterns: ["IB BILLPAY DR-HDFC"], category: "Card Bills", kind: "CARD_PAYMENT", direction: "DEBIT", priority: 10, card: "HDFC" },
  { patterns: ["GOKIWI TECH.*CREDIT CA"], isRegex: true, category: "Card Bills", kind: "CARD_PAYMENT", direction: "DEBIT", priority: 10, card: "KIWI" },
  { patterns: ["CRED.CLUB", "CRED.UTILITY"], category: "Card Bills", kind: "CARD_PAYMENT", direction: "DEBIT", priority: 10 },
  { patterns: ["EXC PYMT"], category: "Card Bills", kind: "CARD_REFUND", direction: "CREDIT", priority: 10 },
  { patterns: ["SALARY"], category: "Salary", kind: "SALARY", direction: "CREDIT", priority: 20 },
  { patterns: ["INTEREST PAID", "Credit Interest Capitalised"], category: "Interest", kind: "INTEREST", direction: "CREDIT", priority: 20 },
  { patterns: ["INDIAN RAILWAYS", "REDBUS"], category: "Travel", priority: 100 },
  { patterns: ["\\bUTS\\b"], isRegex: true, category: "Travel", priority: 100 },
  { patterns: ["AUTO DIES", "PETROL"], category: "Fuel", priority: 100 },
  { patterns: ["SWIGGY", "DOMINOS", "BRIYANI", "BHAVAN", "FAST FOOD", "COFFEE"], category: "Food & Drinks", priority: 100 },
  { patterns: ["\\bCAFE\\b", "\\bJUICE\\b", "\\bTEA\\b"], isRegex: true, category: "Food & Drinks", priority: 100 },
  { patterns: ["DISTRICT", "CINEM", "MULTIPLEX"], category: "Entertainment", priority: 100 },
  { patterns: ["OPENAI", "APPLE MEDIA"], category: "Subscriptions", priority: 100 },
  { patterns: ["TANGEDCO", "WIFI"], category: "Rent & Utilities", priority: 100 },
  { patterns: ["CARAT LANE", "CARATLANE"], category: "Jewellery", priority: 100 },
];

/** Picks the card a seeded card-payment rule pays, from your accounts. */
export function seedCardTarget(card: SeedRule["card"], accounts: { id: string; type: string; name: string; institution: string }[]): string | null {
  if (!card) return null;
  const cards = accounts.filter((a) => a.type === "CREDIT_CARD");
  const hit = card === "KIWI"
    ? cards.find((a) => /kiwi/i.test(a.name) || /kiwi/i.test(a.institution))
    : cards.find((a) => /hdfc/i.test(a.institution) && !/kiwi/i.test(a.name));
  return hit?.id ?? null;
}
