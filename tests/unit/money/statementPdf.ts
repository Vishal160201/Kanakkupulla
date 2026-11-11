import { jsPDF } from "jspdf";

/** Builds HDFC- and KVB-shaped statement PDFs for parser tests (synthetic data). */

type Row = string[];

function table(doc: jsPDF, headers: { text: string; x: number; align?: "right" }[], rows: Row[][], startY: number, lineH = 4.2) {
  doc.setFontSize(8);
  headers.forEach((h) => doc.text(h.text, h.x, startY, { align: h.align ?? "left" }));
  let y = startY + 6;
  for (const lines of rows) {
    lines.forEach((cells, li) => {
      cells.forEach((cell, ci) => {
        if (cell) doc.text(cell, headers[ci].x, y + li * lineH, { align: headers[ci].align ?? "left" });
      });
    });
    y += lines.length * lineH + 1.5;
  }
  return y;
}

export interface HdfcRow {
  date: string;
  narration: string[];
  ref: string;
  valueDate: string;
  withdrawal?: string;
  deposit?: string;
  balance: string;
}

const HDFC_HEADERS = [
  { text: "Date", x: 10 },
  { text: "Narration", x: 28 },
  { text: "Chq./Ref.No.", x: 92 },
  { text: "Value Dt", x: 122 },
  { text: "Withdrawal Amt.", x: 160, align: "right" as const },
  { text: "Deposit Amt.", x: 182, align: "right" as const },
  { text: "Closing Balance", x: 204, align: "right" as const },
];

export function hdfcPdf(opts: { rows: HdfcRow[]; perPage?: number; summary?: string[]; password?: string; from: string; to: string }): Uint8Array {
  const doc = new jsPDF(opts.password ? { encryption: { userPassword: opts.password, ownerPassword: `${opts.password}-owner`, userPermissions: ["print"] } } : {});
  const perPage = opts.perPage ?? 25;
  for (let p = 0; p * perPage < opts.rows.length || p === 0; p++) {
    if (p > 0) doc.addPage();
    doc.setFontSize(10);
    doc.text("HDFC BANK Ltd.", 10, 12);
    doc.setFontSize(8);
    doc.text("Account No : 50100123451111", 10, 18);
    doc.text(`Statement From : ${opts.from} To : ${opts.to}`, 10, 23);
    const rows = opts.rows.slice(p * perPage, (p + 1) * perPage).map((r) =>
      r.narration.map((n, i) => (i === 0 ? [r.date, n, r.ref, r.valueDate, r.withdrawal ?? "", r.deposit ?? "", r.balance] : ["", n, "", "", "", "", ""])),
    );
    const end = table(doc, HDFC_HEADERS, rows, 32);
    doc.setFontSize(7);
    doc.text("HDFC BANK LIMITED  *Closing balance includes funds earmarked for hold and uncleared funds", 10, Math.max(end + 6, 280));
  }
  if (opts.summary) {
    doc.setFontSize(8);
    doc.text("STATEMENT SUMMARY :-", 10, 250);
    doc.text("Opening Balance   Dr Count   Cr Count   Debits   Credits   Closing Bal", 10, 256);
    doc.text(opts.summary.join("   "), 10, 262);
  }
  return new Uint8Array(doc.output("arraybuffer"));
}

export interface KvbRow {
  date: string;
  time: string;
  valueDate: string;
  particulars: string[];
  ref: string;
  debit?: string;
  credit?: string;
  balance: string;
}

const KVB_HEADERS = [
  { text: "Txn Date", x: 10 },
  { text: "Value Date", x: 32 },
  { text: "Particulars", x: 56 },
  { text: "Ref. No.", x: 118 },
  { text: "Debit", x: 160, align: "right" as const },
  { text: "Credit", x: 182, align: "right" as const },
  { text: "Balance", x: 204, align: "right" as const },
];

export function kvbPdf(opts: { opening: string; openingDate: string; rows: KvbRow[]; from: string; to: string }): Uint8Array {
  const doc = new jsPDF();
  doc.setFontSize(10);
  doc.text("The Karur Vysya Bank Ltd", 10, 12);
  doc.setFontSize(8);
  doc.text("Account Number : 1234567890122222", 10, 18);
  doc.text(`Statement of account for the period ${opts.from} to ${opts.to}`, 10, 23);
  // Diagonal watermark
  doc.setFontSize(60);
  doc.setTextColor(220);
  doc.text("KVB", 60, 180, { angle: 45 });
  doc.setTextColor(0);
  const rows: Row[][] = [[[opts.openingDate, opts.openingDate, "B/F ...", "", "", "", opts.opening]]];
  for (const r of opts.rows) {
    rows.push(r.particulars.map((p, i) => (i === 0 ? [r.date, r.valueDate, p, r.ref, r.debit ?? "", r.credit ?? "", r.balance] : [i === 1 ? r.time : "", "", p, "", "", "", ""])));
  }
  table(doc, KVB_HEADERS, rows, 32);
  return new Uint8Array(doc.output("arraybuffer"));
}

/**
 * KVB's real layout: each transaction is printed over 4 staggered lines (reference just above the
 * date, then the date with the start of the particulars, then value date and amounts, then the
 * time with the rest of the particulars). Synthetic data, real geometry (PDF points).
 */
export function kvbStaggeredPdf(opts: { opening: string; rows: KvbRow[]; pageBreakAfter?: number }): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const header = (y: number) => {
    doc.setFontSize(8);
    [["Txn Date", 44], ["Value Date", 103], ["Particulars", 163], ["Ref. No.", 318], ["Debit", 378], ["Credit", 438], ["Balance", 498]].forEach(([t, x]) => doc.text(String(t), Number(x), y));
  };
  doc.setFontSize(15);
  doc.text("ACCOUNT STATEMENT", 32, 60);
  doc.setFontSize(10);
  doc.text("Acc.No.", 340, 110);
  doc.text(": 1273000000002222", 403, 110);
  doc.text("8-12 SAMPLE STREET", 36, 122);
  doc.text("St. Period", 340, 180);
  doc.text(": 01-Sep-2026 to 11-Nov-2026", 403, 180);
  doc.text("SB - KVB SAVINGS", 403, 195);
  header(345);
  doc.setFontSize(8);
  doc.text("01-SEP-2026", 43, 377);
  doc.text("01-SEP-2026", 105, 377);
  doc.text("B/F...", 165, 377);
  doc.text(opts.opening, 536, 377, { align: "right" });
  let y = 405;
  opts.rows.forEach((r, i) => {
    if (opts.pageBreakAfter && i === opts.pageBreakAfter) {
      doc.setFontSize(10);
      doc.text("Note: This is a computer-generated statement.", 20, 800);
      doc.addPage();
      header(110);
      y = 140;
    }
    doc.setFontSize(8);
    doc.text(r.ref, 322, y - 4);
    doc.text(r.date.toUpperCase(), 43, y);
    doc.text(r.particulars[0], 165, y);
    doc.text(r.valueDate.toUpperCase(), 105, y + 5);
    doc.text(r.debit ?? "0.00", r.debit ? 411 : 396, y + 5, { align: "right" });
    doc.text(r.credit ?? "0.00", r.credit ? 476 : 456, y + 5, { align: "right" });
    doc.text(r.balance, 536, y + 5, { align: "right" });
    doc.text(r.time, 43, y + 10);
    if (r.particulars[1]) doc.text(r.particulars[1], 163, y + 10);
    y += 30;
  });
  doc.setFontSize(10);
  doc.text("Note: This is a computer-generated statement.", 20, 800);
  return new Uint8Array(doc.output("arraybuffer"));
}
