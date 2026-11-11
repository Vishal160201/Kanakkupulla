import type { PdfItem, PdfLine, PdfPage } from "./pdfText";
import { isAmountToken } from "../text";

export interface ColumnSpec {
  key: string;
  /** Matches the header item that starts this column */
  header: RegExp;
  numeric?: boolean;
}

interface Column extends ColumnSpec {
  x: number;
  right: number;
}

export interface RawRow {
  cells: Record<string, string[]>;
  /** Text of the lines after the first, per column (continuations) */
  page: number;
}

/** Finds the header line on a page and where each column sits. */
export function findHeader(lines: PdfLine[], specs: ColumnSpec[]): { index: number; columns: Column[] } | null {
  for (let i = 0; i < lines.length; i++) {
    const items = lines[i].items;
    const found: { spec: ColumnSpec; idx: number }[] = [];
    for (const spec of specs) {
      const idx = items.findIndex((it, n) => spec.header.test(it.str.trim()) && !found.some((f) => f.idx === n));
      if (idx >= 0) found.push({ spec, idx });
    }
    // Every column but at most one optional must be present
    if (found.length < specs.length - 1) continue;
    found.sort((a, b) => items[a.idx].x - items[b.idx].x);
    const columns: Column[] = found.map((f, n) => {
      const next = found[n + 1];
      const end = next ? next.idx : items.length;
      const own = items.slice(f.idx, Math.max(f.idx + 1, end));
      return { ...f.spec, x: items[f.idx].x, right: Math.max(...own.map((it) => it.right)) };
    });
    return { index: i, columns };
  }
  return null;
}

/** Which column an item belongs to: numbers by right edge (they're right-aligned), text by where it starts. */
export function columnOf(item: PdfItem, columns: Column[]): Column | null {
  const numericCols = columns.filter((c) => c.numeric);
  if (isAmountToken(item.str) && numericCols.length > 0) {
    const nearest = numericCols.reduce((best, c) => (Math.abs(c.right - item.right) < Math.abs(best.right - item.right) ? c : best));
    if (Math.abs(nearest.right - item.right) < 60 || item.x >= numericCols[0].x - 30) return nearest;
  }
  // A text column's area starts where the previous heading ends: headings can be centred
  // (HDFC's "Narration") while the text under them starts further left.
  let chosen: Column | null = columns[0] ?? null;
  for (let i = 1; i < columns.length; i++) {
    if (item.x >= columns[i - 1].right + 1) chosen = columns[i];
  }
  return chosen;
}

/**
 * Rows of a statement table. A row starts on a line whose `startKey` cell passes `isRowStart`;
 * lines in between whose text sits only in `continuationKeys` columns are folded into the
 * row (wrapped narrations). Any other line ends the table until the next header.
 */
export function extractRows(
  pages: PdfPage[],
  specs: ColumnSpec[],
  opts: {
    startKey: string;
    isRowStart: (cell: string) => boolean;
    continuationKeys: string[];
    stopAt?: RegExp;
    /** A line that ends this page's part of the table (the page footer) */
    endPageAt?: RegExp;
    /**
     * Lines closer than this (PDF units) are one transaction printed over several lines.
     * KVB staggers each row: reference above, date, value date and amounts, then time.
     */
    mergeWithin?: number;
  },
): RawRow[] {
  const rows: RawRow[] = [];
  let columns: Column[] | null = null;
  let stopped = false;

  pages.forEach((page, pageIndex) => {
    if (stopped) return;
    const header = findHeader(page.lines, specs);
    if (header) columns = header.columns;
    if (!columns) return;
    let current: RawRow | null = null;
    const start = header ? header.index + 1 : 0;

    const lines = opts.mergeWithin ? mergeClose(page.lines.slice(start), opts.mergeWithin) : page.lines.slice(start);
    for (const line of lines) {
      if (opts.stopAt?.test(line.text)) {
        stopped = true;
        return;
      }
      if (opts.endPageAt?.test(line.text)) break;
      // Page numbers ("4", "Page 2 of 5") sit between rows and belong to none of them
      if (PAGE_NUMBER.test(line.text)) continue;
      const cells: Record<string, string[]> = {};
      for (const item of line.items) {
        const col = columnOf(item, columns);
        if (!col) continue;
        (cells[col.key] ??= []).push(item.str.trim());
      }
      const startCell = (cells[opts.startKey] ?? []).join(" ");
      if (opts.isRowStart(startCell)) {
        current = { cells, page: pageIndex };
        rows.push(current);
        continue;
      }
      const keys = Object.keys(cells);
      const isContinuation = current && keys.length > 0 && keys.every((k) => opts.continuationKeys.includes(k));
      if (isContinuation && current) {
        for (const k of keys) (current.cells[k] ??= []).push(...cells[k]);
      } else {
        current = null; // footer, page totals, legal text…
      }
    }
  });
  return rows;
}

const PAGE_NUMBER = /^\s*(page\s*(no\.?)?\s*:?\s*)?\d{1,3}(\s*(of|\/)\s*\d{1,3})?\s*$/i;

/** Joins runs of lines that sit within `gap` of each other into one line (items kept top to bottom). */
function mergeClose(lines: PdfLine[], gap: number): PdfLine[] {
  const out: PdfLine[] = [];
  for (const line of lines) {
    const last = out.at(-1);
    const prevY = last ? (last as PdfLine & { lastY?: number }).lastY ?? last.y : null;
    if (last && prevY != null && prevY - line.y <= gap) {
      last.items = [...last.items, ...line.items];
      last.text = `${last.text} ${line.text}`;
      (last as PdfLine & { lastY?: number }).lastY = line.y;
    } else {
      out.push({ ...line, items: [...line.items] });
    }
  }
  return out;
}

export const cellText = (row: RawRow, key: string) => (row.cells[key] ?? []).join(" ").replace(/\s+/g, " ").trim();
