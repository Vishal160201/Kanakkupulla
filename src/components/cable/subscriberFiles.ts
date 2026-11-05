// Export the Subscribers list as xlsx / csv / pdf, and read an imported xlsx / csv into rows.
import type { CableSubscriberRow } from "@/types/cable";
import { boxStatus, parseCsv, readSheet, tempVc, type ImportRow } from "@/lib/cableImport";

export type ExportFormat = "xlsx" | "csv" | "pdf";

const HEAD = ["Group", "Name (English)", "Name (Tamil)", "Account", "VC number", "Temp VC", "Mobile", "Box status", "Due", "Area"];
const toRow = (s: CableSubscriberRow) => [s.groupName ?? "", s.name, s.tamilName ?? "", s.externalId, s.oldVcNumber ?? s.vcNumber ?? "", tempVc(s) ?? "", s.phone ?? "", boxStatus(s), s.due, s.area ?? ""];
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
    ws.columns = HEAD.map((header, i) => ({ header, width: [14, 22, 22, 12, 14, 14, 14, 16, 10, 18][i] }));
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

/** Thrown when an .xlsx has a password: the dialog asks for it and reads the file again. */
export class PasswordNeeded extends Error {
  constructor(message = "This Excel file has a password.") {
    super(message);
  }
}

/** Each sheet of an .xlsx as rows of cell text. Formula cells come back blank: in subscriber sheets they're copies. */
export async function xlsxSheets(buf: ArrayBuffer) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf).catch(() => {
    throw new Error("Couldn't read this Excel file. Open it in Excel and save it again (or save it as CSV), then import that.");
  });
  const xml = async (path: string) => {
    const f = zip.file(path);
    return f ? new DOMParser().parseFromString(await f.async("string"), "application/xml") : null;
  };
  const byTag = (n: Document | Element | null, tag: string) => (n ? Array.from(n.getElementsByTagName(tag)) : []);
  const attr = (el: Element, local: string) => Array.from(el.attributes).find((a) => a.localName === local)?.value ?? null;

  const shared = byTag(await xml("xl/sharedStrings.xml"), "si").map((si) => byTag(si, "t").map((t) => t.textContent ?? "").join(""));
  const targets = new Map(byTag(await xml("xl/_rels/workbook.xml.rels"), "Relationship").map((r) => [attr(r, "Id"), attr(r, "Target") ?? ""]));
  const col = (ref: string) => ref.replace(/\d+$/, "").split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

  const sheets: { name: string; cells: string[][] }[] = [];
  for (const s of byTag(await xml("xl/workbook.xml"), "sheet")) {
    const target = targets.get(attr(s, "id")) ?? "";
    const doc = await xml(target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
    const cells: string[][] = [];
    for (const row of byTag(doc, "row")) {
      const r = Number(attr(row, "r")) - 1;
      const out: string[] = (cells[r] = []);
      for (const c of byTag(row, "c")) {
        if (byTag(c, "f").length) continue;
        const t = attr(c, "t");
        const v = byTag(c, "v")[0]?.textContent ?? "";
        out[col(attr(c, "r") ?? "A")] = t === "s" ? (shared[Number(v)] ?? "") : t === "inlineStr" ? byTag(c, "t").map((x) => x.textContent).join("") : v.replace(/\.0+$/, "");
      }
    }
    sheets.push({ name: attr(s, "name") ?? `Sheet ${sheets.length + 1}`, cells: Array.from(cells, (r) => Array.from(r ?? [], (v) => v ?? "")) });
  }
  return sheets;
}

/** Rows of an .xlsx (every sheet) or .csv file. Throws a message the user can act on, or PasswordNeeded. */
export async function readSubscriberFile(file: File, password?: string): Promise<ImportRow[]> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "csv") return readSheet(parseCsv(await file.text()));
  if (ext !== "xlsx") throw new Error("Choose an Excel (.xlsx) or CSV file.");
  let buf = await file.arrayBuffer();
  // A password-protected workbook is an OLE container (D0 CF 11 E0), not a zip
  if (new Uint8Array(buf, 0, 4).join() === "208,207,17,224") {
    if (!password) throw new PasswordNeeded();
    const form = new FormData();
    form.set("file", file);
    form.set("password", password);
    const res = await fetch("/api/cable/subscribers/decrypt", { method: "POST", body: form });
    if (!res.ok) {
      const message = ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Couldn't open this file.";
      throw res.status === 400 && /password is wrong/.test(message) ? new PasswordNeeded(message) : new Error(message);
    }
    buf = await res.arrayBuffer();
  }
  const rows: ImportRow[] = [];
  let firstError: unknown = null;
  for (const s of await xlsxSheets(buf)) {
    try {
      rows.push(...readSheet(s.cells, s.name));
    } catch (err) {
      firstError ??= err; // a sheet without a VC column (notes, totals) is skipped
    }
  }
  if (rows.length === 0 && firstError) throw firstError;
  return rows;
}
