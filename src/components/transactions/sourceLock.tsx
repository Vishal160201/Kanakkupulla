"use client";

import type { TransactionSource } from "@/types/transactions";
import { Tooltip } from "@/components/ui/Tooltip";

/** Shown wherever editing or deleting an inventory-created entry is blocked. */
export const LOCKED_ENTRY_MESSAGE = "Created by Fertilizer Inventory, Farmers or Produce — change or void it there";

const SOURCE_META: Record<TransactionSource["kind"], { label: string; icon: string; page: string }> = {
  SALE: { label: "Sale", icon: "ph-shopping-cart-simple", page: "Fertilizer Inventory" },
  PURCHASE: { label: "Purchase", icon: "ph-truck", page: "Fertilizer Inventory" },
  CREDIT_PAYMENT: { label: "Credit repayment", icon: "ph-hand-coins", page: "Farmers" },
  PRODUCE_SALE: { label: "Produce sale", icon: "ph-scales", page: "Produce" },
  PRODUCE_PAYMENT: { label: "Produce payment", icon: "ph-hand-arrow-up", page: "Farmers" },
  PRODUCE_RECEIPT: { label: "Produce dues", icon: "ph-hand-coins", page: "Produce" },
};

/** True when another module posted the entry and it can't be changed from the ledger. */
export function isLockedEntry(tx: { source?: TransactionSource | null; children?: { source?: TransactionSource | null }[] }): boolean {
  return !!tx.source || (tx.children?.some((child) => !!child.source) ?? false);
}

/** "Sale S-0003", "Purchase P-0001", "Produce sale PS-0002" or "Credit repayment". */
export function sourceLabel(source: TransactionSource): string {
  const { label } = SOURCE_META[source.kind];
  return source.billNumber ? `${label} ${source.billNumber}` : label;
}

/** Page the entry was recorded in (where it can be changed or voided). */
export function sourcePage(source: TransactionSource): string {
  return SOURCE_META[source.kind].page;
}

export function sourceIcon(source: TransactionSource): string {
  return SOURCE_META[source.kind].icon;
}

interface SourceBadgeProps {
  source: TransactionSource | null | undefined;
  /** "dark" for rows drawn on the dark "Today's Transactions" panel. */
  tone?: "light" | "dark";
  className?: string;
}

/** Small badge marking an entry created by Fertilizer Inventory. */
export function SourceBadge({ source, tone = "light", className = "" }: SourceBadgeProps) {
  if (!source) return null;
  const toneClass = tone === "dark"
    ? "bg-lime-400/10 text-lime-300 border-lime-300/20"
    : "bg-lime-50 text-lime-700 border-lime-200";
  return (
    <Tooltip content={LOCKED_ENTRY_MESSAGE}>
      <span
        className={`inline-flex min-w-0 max-w-full sm:max-w-[160px] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${toneClass} ${className}`}
      >
        <i aria-hidden="true" className={`ph-bold ${sourceIcon(source)} text-[11px]`} />
        <span className="truncate">{sourceLabel(source)}</span>
        <i aria-hidden="true" className="ph-bold ph-lock-simple text-[10px] opacity-70" />
      </span>
    </Tooltip>
  );
}
