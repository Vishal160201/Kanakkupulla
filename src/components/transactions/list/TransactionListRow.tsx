"use client";

import type { Transaction, TransactionListGroup, TransactionListItem } from "@/types/transactions";
import { getConsistentColorClasses, getGiftsBadgeInfo, getRelatableIcon } from "../categoryStyles";
import ShopBadge from "@/components/shops/ShopBadge";
import { Tooltip } from "@/components/ui/Tooltip";
import { LOCKED_ENTRY_MESSAGE, SourceBadge, isLockedEntry } from "../sourceLock";
import { useCanWriteTransaction } from "@/hooks/useAccess";

const isGroup = (tx: TransactionListItem): tx is TransactionListGroup => 'isGroup' in tx && tx.isGroup === true;

/** Collapses entries sharing a groupId into one row (single-item groups stay plain). */
export function groupLedgerTransactions(transactions: Transaction[]): TransactionListItem[] {
  const processed: TransactionListItem[] = [];
  const grouped = new Map<string, TransactionListGroup>();
  transactions.forEach(tx => {
    if (tx.groupId) {
      let group = grouped.get(tx.groupId);
      if (!group) {
        group = { ...tx, isGroup: true, children: [], totalAmount: 0, categoryNames: [], id: tx.groupId };
        grouped.set(tx.groupId, group);
        processed.push(group);
      }
      group.children.push(tx);
      group.totalAmount += Number(tx.amount) || 0;
      if (!group.categoryNames.includes(tx.category)) {
        group.categoryNames.push(tx.category);
      }
    } else {
      processed.push(tx);
    }
  });

  return processed.map(item => {
    if (!isGroup(item)) return item;
    // Convert back to single row
    if (item.children.length === 1) return item.children[0];
    return { ...item, amount: item.totalAmount, category: item.categoryNames.join('+'), description: '' };
  });
}

interface TransactionListRowProps {
  tx: TransactionListItem;
  isChild?: boolean;
  /** Show the entry's shop (the "All Shops" view). */
  showShop?: boolean;
  expandedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onOpenDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TransactionListRow({ tx, isChild = false, showShop = false, expandedGroups, onToggleGroup, onOpenDetails, onEdit, onDelete }: TransactionListRowProps) {
  const group = isGroup(tx) ? tx : null;
  const primaryCategory = group ? group.categoryNames[0] : tx.category;
  const colorClass = getConsistentColorClasses(primaryCategory);
  const iconClass = getRelatableIcon(primaryCategory);
  const { title, isGifts, isAdvance, isDue } = getGiftsBadgeInfo(
    tx,
    tx.description ? tx.description.split(' - ')[0] : tx.category
  );
  const isExpanded = group !== null && expandedGroups.has(tx.id);
  // Entries posted by Fertilizer Inventory can only be changed there.
  const isLocked = isLockedEntry(group ?? tx);
  // Edit / delete only for users allowed to change this entry (no buttons that would be refused).
  const canWrite = useCanWriteTransaction()({ shopId: tx.shopId ?? tx.shop?.id ?? null, bookingId: tx.bookingId, productOrderId: tx.productOrderId });

  return (
    <div className={`${isChild ? 'pl-8 border-l-2 border-slate-100 ml-6 relative before:content-[""] before:absolute before:left-[-2px] before:top-0 before:w-0.5 before:h-full before:bg-slate-100' : ''}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !group ? onOpenDetails(tx.id) : onToggleGroup(tx.id)}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            if (!group) onOpenDetails(tx.id); else onToggleGroup(tx.id);
          }
        }}
        className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 sm:p-4 group ${isChild ? 'bg-slate-50/50 my-1 py-2 sm:py-2.5 rounded-xl' : ''}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${colorClass.bg} ${colorClass.text} ${isChild ? 'w-10 h-10 rounded-lg' : ''}`}>
            <i className={`ph-bold ${iconClass} ${isChild ? 'text-lg' : 'text-xl'}`}></i>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold text-slate-900 text-sm mb-1">
              {title}
            </div>
            <div className="flex min-w-0 items-center gap-2 flex-wrap">
              <span className={`max-w-[110px] truncate text-[9px] font-extrabold px-2 py-0.5 rounded tracking-wider uppercase ${colorClass.bg} ${colorClass.text}`}>
                {isGifts ? 'GIFTS & FRAMES' : primaryCategory}
              </span>
              {group && group.categoryNames.length > 1 && (
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded tracking-wider uppercase bg-slate-100 text-slate-500 shrink-0`}>
                  +{group.categoryNames.length - 1} more
                </span>
              )}
              {isGifts && isAdvance && (
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-600 shrink-0">
                  ADV
                </span>
              )}
              {isGifts && isDue && (
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-red-50 text-red-600 shrink-0">
                  DUE
                </span>
              )}
              {!group && <SourceBadge source={tx.source} />}
              {showShop && !isChild && <ShopBadge shop={tx.shop} />}
              <span className="truncate text-[11px] text-slate-400 font-medium shrink-0">{new Date(tx.date).toLocaleDateString('en-GB')} &middot; {tx.paymentMode}</span>
              {!group && <span className="hidden sm:inline text-[10px] text-slate-300 font-mono shrink-0">{tx.transactionId}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-right sm:gap-2">
          <div className="sm:min-w-[100px] text-right">
            <div className={`text-sm font-bold sm:text-base ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {tx.type === 'EXPENSE' ? '-' : ''}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {isLocked ? (
          <div className="hidden sm:flex items-center gap-1 w-[64px] justify-end">
            <Tooltip content={LOCKED_ENTRY_MESSAGE}>
              <span
                tabIndex={0}
                role="img"
                aria-label={LOCKED_ENTRY_MESSAGE}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                className="h-8 w-8 items-center justify-center rounded-full text-slate-300 hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              >
                <i aria-hidden="true" className="ph-bold ph-lock-simple"></i>
              </span>
            </Tooltip>
          </div>
          ) : !canWrite ? (
          <div className="hidden sm:block w-[64px]" aria-hidden="true" />
          ) : (
          <div className="hidden sm:flex items-center gap-1 w-[64px] justify-end">
            <Tooltip content={group ? "Delete Group" : "Delete Transaction"}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(tx.id);
                }}
                className={group
                  ? `h-8 w-8 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-rose-100 hover:text-rose-600 hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100`
                  : `h-8 w-8 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-rose-100 hover:text-rose-600 hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100 ${tx.productOrderId || tx.bookingId ? 'invisible' : 'visible'}`}
                aria-label={group ? "Delete Group" : "Delete Transaction"}
              >
                <i className="ph-bold ph-trash"></i>
              </button>
            </Tooltip>
            <Tooltip content={group ? "Edit Group" : "Edit Transaction"}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(tx.id);
                }}
                className={group
                  ? `h-8 w-8 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-orange-100 hover:text-orange-600 hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100`
                  : `h-8 w-8 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-orange-100 hover:text-orange-600 hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100 ${tx.productOrderId || tx.bookingId ? 'invisible' : 'visible'}`}
                aria-label={group ? "Edit Group" : "Edit Transaction"}
              >
                <i className="ph-bold ph-pencil-simple"></i>
              </button>
            </Tooltip>
          </div>
          )}

          {group ? (
            <button
              type="button"
              aria-label={isExpanded ? "Collapse group" : "Expand group"}
              aria-expanded={isExpanded}
              onClick={(event) => { event.stopPropagation(); onToggleGroup(tx.id); }}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-transform"
            >
              <i className={`ph-bold ph-caret-down transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          ) : !isChild ? (
            <button
              type="button"
              aria-label="View transaction details"
              onClick={(event) => {
                event.stopPropagation();
                onOpenDetails(tx.id);
              }}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-indigo-50 hover:text-indigo-600"
            >
              <i className="ph-bold ph-caret-right" />
            </button>
          ) : null}
        </div>
      </div>
      {group && isExpanded && (
        <div className="animate-slide-down">
          {group.children.map((childTx) => (
            <TransactionListRow
              key={childTx.id}
              tx={childTx}
              isChild
              expandedGroups={expandedGroups}
              onToggleGroup={onToggleGroup}
              onOpenDetails={onOpenDetails}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
