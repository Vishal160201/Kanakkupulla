// Export the Subscribers list as xlsx / csv / pdf, and read an imported xlsx / csv into rows.
import type { CableSubscriberRow } from "@/types/cable";
import { boxStatus, parseCsv, readSheet, type ImportRow } from "@/lib/cableImport";

export type ExportFormat = "xlsx" | "csv" | "pdf";

const HEAD = ["Name (English)", "Name (Tamil)", "Account", "VC number", "Old VC", "Mobile", "Box status", "Due", "Area"];
const toRow = (s: CableSubscriberRow) => [s.name, s.tamilName ?? "", s.externalId, s.vcNumber ?? "", s.oldVcNumber ?? "", s.phone ?? "", boxStatus(s), s.due, s.area ?? ""];
const fileName = (ext: string) => `tccl-subscribers-${new Date().toISOString().slice(0, 10)}.${ext}`;

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const html = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function exportSubscribers(subs: CableSubscriberRow[], format: ExportFormat) {
  const rows = subs.map(toRow);
  if (format === "csv") {
    // BOM so Excel opens the Tamil names as UTF-8
    return download(new Blob(["﻿" + [HEAD, ...rows].map((r) => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), fileName("csv"));
  }
  if (format === "xlsx") {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Subscribers");
    ws.columns = HEAD.map((header, i) => ({ header, width: [22, 22, 12, 14, 14, 14, 16, 10, 18][i] }));
    // VC / mobile stay text so Excel doesn't turn them into 3.10E+09
    rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    const buf = await wb.xlsx.writeBuffer();
    return download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName("xlsx"));
  }
  // PDF through the browser's print-to-PDF: jsPDF can't shape Tamil, the browser can
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${fileName("pdf").replace(/\.pdf$/, "")}</title><style>
    @page{size:A4 landscape;margin:12mm} body{font:10px system-ui,sans-serif;color:#0f172a}
    h1{font-size:14px;margin:0 0 6px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #cbd5e1;padding:3px 5px;text-align:left}
    th{background:#f1f5f9} tr{break-inside:avoid}</style></head><body>
    <h1>TCCL subscribers · ${rows.length} · ${new Date().toLocaleDateString("en-IN")}</h1>
    <table><thead><tr>${HEAD.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>
    ${rows.map((r) => `<tr>${r.map((c) => `<td>${html(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
  doc.close();
  frame.contentWindow!.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => frame.contentWindow!.print(), 100);
}

/** Rows of an .xlsx (first sheet) or .csv file. Throws a message the user can act on. */
export async function readSubscriberFile(file: File): Promise<ImportRow[]> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "csv") return readSheet(parseCsv(await file.text()));
  if (ext !== "xlsx") throw new Error("Choose an Excel (.xlsx) or CSV file.");
  const buf = await file.arrayBuffer();
  // A password-protected workbook is an OLE container (D0 CF 11 E0), not a zip
  if (new Uint8Array(buf, 0, 4).join() === "208,207,17,224") throw new Error("This Excel file has a password. Open it in Excel, remove the password and save it again.");
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf);
  } catch {
    throw new Error("Couldn't read this Excel file. Open it in Excel and save it again (or save it as CSV), then import that.");
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("The Excel file has no sheets.");
  const cells: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    cells[n - 1] = Array.from({ length: ws.columnCount }, (_, c) => row.getCell(c + 1).text ?? "");
  });
  return readSheet(Array.from(cells, (r) => r ?? []));
}
