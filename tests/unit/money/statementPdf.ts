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
