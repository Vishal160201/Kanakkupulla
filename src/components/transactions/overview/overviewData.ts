// Pure derivations for the transactions overview page.
import type {
  TodayTransactionGroup,
  TodayTransactionItem,
  Transaction,
  TransactionLayoutResponse,
  TransactionType,
} from "@/types/transactions";
import {
  CATEGORY_ICONS,
  getCategoryColorClasses,
  getConsistentColorClasses,
  getRelatableIcon,
  type CategoryColorClasses,
} from "../categoryStyles";
import { INVENTORY_LEDGER_CATEGORIES, type ShopTypeName } from "@/lib/shopModules";

/** Circumference of the r=40 donut rings used on the overview (2 * pi * 40). */
export const DONUT_DASHARRAY = 251.2;

export interface CategoryShare {
  category: string;
  amount: number;
  pct: number;
}

export interface HeatmapSegment extends CategoryShare {
  dasharray: number;
  dashoffset: number;
  rotation: number;
  color: CategoryColorClasses;
  icon: string;
}

export interface TodaySegment extends CategoryShare {
  dashoffset: number;
  rotation: number;
  color: CategoryColorClasses;
}

export interface QuickAddCategory {
  label: string;
  icon: string;
  color: string;
  bg: string;
  type: TransactionType;
}

const INCOME_CATEGORIES = ["Photography Session", "Booking Advance", "Passport Photo", "Frame Sales", "Editing Charges", "Album Payment", "PP", "Xerox", "Printout", "E-Sevai", "Others"];
const FERTILIZER_INCOME_CATEGORIES: string[] = [INVENTORY_LEDGER_CATEGORIES.SALE, INVENTORY_LEDGER_CATEGORIES.CREDIT_PAYMENT];

const toShares = (totals: Record<string, number>, total: number): CategoryShare[] =>
  Object.entries(totals)
    .map(([category, amount]) => ({ category, amount, pct: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);

/** Year-to-date expense split, largest first, as donut segments. */
export function buildHeatmapSegments(expensesByCategory: Record<string, number>, totalExpenses: number): HeatmapSegment[] {
  const segments: HeatmapSegment[] = [];
  let cumulativePct = 0;
  for (const share of toShares(expensesByCategory, totalExpenses)) {
    segments.push({
      ...share,
      dasharray: DONUT_DASHARRAY,
      dashoffset: DONUT_DASHARRAY - (share.pct * DONUT_DASHARRAY),
      rotation: cumulativePct * 360,
      color: getCategoryColorClasses(share.category),
      icon: CATEGORY_ICONS[share.category] || getRelatableIcon(share.category),
    });
    cumulativePct += share.pct;
  }
  return segments;
}

/** Today's totals per category for one transaction type, largest first. */
export function sumTodayByCategory(todayTransactions: Transaction[], type: TransactionType, total: number): CategoryShare[] {
  const totals: Record<string, number> = {};
  todayTransactions.filter(t => t.type === type).forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return toShares(totals, total);
}

export function buildTodaySegments(shares: CategoryShare[]): TodaySegment[] {
  const segments: TodaySegment[] = [];
  let cumulativePct = 0;
  for (const share of shares) {
    segments.push({
      ...share,
      dashoffset: DONUT_DASHARRAY - (share.pct * DONUT_DASHARRAY),
      rotation: cumulativePct * 360 - 90, // Start from top
      color: getConsistentColorClasses(share.category),
    });
    cumulativePct += share.pct;
  }
  return segments;
}

/** Net (income minus expense) of today's transactions for one payment mode. */
export const netForMode = (todayTransactions: Transaction[], mode: string) =>
  todayTransactions
    .filter(t => t.paymentMode?.toLowerCase() === mode)
    .reduce((acc, t) => acc + (t.type === 'INCOME' ? t.amount : -t.amount), 0);

export interface WeeklyFlow {
  dayLabels: string[];
  actualFlow: number[];
  maxFlow: number;
  netValues: number[];
  netMin: number;
  netMax: number;
  netPoints: { x: number; y: number; value: number }[];
  netZeroY: number;
  netPath: string;
  netAreaPath: string;
}

/** Income and net movement per day of the current week (Monday to Sunday). */
export function buildWeeklyFlow(transactions: Transaction[], today: Date): WeeklyFlow {
  const last7Dates: Date[] = [];
  const currentDayOfWeek = today.getDay();
  const daysToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    last7Dates.push(d);
  }
  const dateKey = (d: Date) => d.toDateString();
  const dayLabels = last7Dates.map(d =>
    d.toLocaleDateString('en-IN', { weekday: 'short' })
  );

  const actualFlow: number[] = new Array(7).fill(0);
  const expenseFlow: number[] = new Array(7).fill(0);

  const dateIndexMap = new Map<string, number>();
  last7Dates.forEach((d, i) => dateIndexMap.set(dateKey(d), i));

  transactions.forEach(t => {
    const idx = dateIndexMap.get(dateKey(new Date(t.date)));
    if (idx === undefined) return;
    if (t.type === 'INCOME') {
      actualFlow[idx] += t.amount;
    } else if (t.type === 'EXPENSE') {
      expenseFlow[idx] += t.amount;
    }
  });

  const netFlow = actualFlow.map((income, idx) => income - expenseFlow[idx]);
  const maxFlow = Math.max(...actualFlow, 1);
  const netValues: number[] = netFlow.length > 0 ? netFlow : new Array(7).fill(0);
  const netMin = Math.min(...netValues, 0);
  const netMax = Math.max(...netValues, 0);
  const netRange = Math.max(netMax - netMin, 1);
  const netPoints = netValues.map((value, idx) => {
    const x = 20 + (idx * 240) / 6;
    const y = 20 + ((netMax - value) / netRange) * 65;
    return { x, y, value };
  });
  const netZeroY = 20 + ((netMax - 0) / netRange) * 65;
  const netPath = netPoints.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const netAreaPath = `${netPath} L ${netPoints[netPoints.length - 1]?.x.toFixed(1) ?? 260} ${netZeroY.toFixed(1)} L ${netPoints[0]?.x.toFixed(1) ?? 20} ${netZeroY.toFixed(1)} Z`;

  return { dayLabels, actualFlow, maxFlow, netValues, netMin, netMax, netPoints, netZeroY, netPath, netAreaPath };
}

/** Collapses entries sharing a groupId into one row (single-item groups stay plain). */
export function groupTodayTransactions(todayTransactions: Transaction[]): TodayTransactionItem[] {
  const processed: TodayTransactionItem[] = [];
  const grouped = new Map<string, TodayTransactionGroup>();
  todayTransactions.forEach(tx => {
    if (tx.groupId) {
      const group = grouped.get(tx.groupId);
      if (!group) {
        const newGroup: TodayTransactionGroup = {
          isGroup: true,
          id: tx.groupId,
          groupId: tx.groupId,
          category: tx.category,
          type: tx.type,
          amount: tx.amount,
          date: tx.date,
          paymentMode: tx.paymentMode,
          shop: tx.shop,
          children: [tx]
        };
        grouped.set(tx.groupId, newGroup);
        processed.push(newGroup);
      } else {
        group.children.push(tx);
        group.amount += tx.amount;
        group.category += ' + ' + tx.category;
      }
    } else {
      processed.push(tx);
    }
  });
  return processed.map(item =>
    'isGroup' in item && item.children.length === 1 ? item.children[0] : item
  );
}

/**
 * Category list for the quick-add strip, from the shop type's form layout when available.
 * Studio shops fall back to the built-in studio categories; other types wait for their layout.
 */
export function buildQuickAddCategories(
  layoutRes: TransactionLayoutResponse | undefined,
  shopType: ShopTypeName = "STUDIO"
): QuickAddCategory[] {
  const layoutSchema = layoutRes?.schema;
  let dynamicCategories: string[] = [];
  if (layoutSchema?.sections) {
    for (const sec of layoutSchema.sections) {
      for (const f of sec.fields) {
        if (f.id === "fld_tx_category" && f.options) {
          dynamicCategories = f.options as string[];
        }
      }
    }
  }

  const fallback = shopType === "STUDIO" ? Object.keys(CATEGORY_ICONS) : [];
  const baseCategories = dynamicCategories.length > 0 ? dynamicCategories : fallback;
  const incomeCategories = shopType === "STUDIO" ? INCOME_CATEGORIES : FERTILIZER_INCOME_CATEGORIES;

  return baseCategories.map(cat => {
    const isIncome = incomeCategories.includes(cat);
    const classes = getCategoryColorClasses(cat);

    return {
      label: cat,
      icon: CATEGORY_ICONS[cat] || getRelatableIcon(cat),
      color: classes.text,
      bg: classes.bg,
      type: isIncome ? "INCOME" : "EXPENSE"
    };
  });
}
