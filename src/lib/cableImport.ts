// Subscriber sheets (xlsx / csv) in and out of the Subscribers tab. Pure helpers shared by the browser
// (reading the file) and the import route (matching rows to the synced TCCL subscribers by VC number).

export interface ImportRow {
  /** Spreadsheet row number, for messages */
  line: number;
  name: string | null;
  tamilName: string | null;
  vcNumber: string | null;
  oldVcNumber: string | null;
  phone: string | null;
}

/** Column headings we understand (lower-case, letters and digits only) → field. Our own export uses the first ones. */
const HEADERS: Record<string, keyof Omit<ImportRow, "line">> = {
  nameenglish: "name", name: "name", englishname: "name", subscriber: "name", customername: "name",
  nametamil: "tamilName", tamilname: "tamilName", tamil: "tamilName",
  vcnumber: "vcNumber", newvc: "vcNumber", vc: "vcNumber", newvcnumber: "vcNumber", setboxno: "vcNumber",
  oldvc: "oldVcNumber", oldvcnumber: "oldVcNumber",
  mobile: "phone", phone: "phone", mobileno: "phone", phoneno: "phone", phonenumber: "phone", mobilenumber: "phone",
};
const key = (h: string) => h.replace(/^﻿/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const digits = (v: string) => v.replace(/[\s-]/g, "");

/** RFC 4180 CSV (quoted fields, "" escapes, CRLF) → rows of cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [[]];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { rows[rows.length - 1].push(field); field = ""; }
    else if (c === "\n") { rows[rows.length - 1].push(field.replace(/\r$/, "")); field = ""; rows.push([]); }
    else field += c;
  }
  if (field || rows[rows.length - 1].length) rows[rows.length - 1].push(field);
  return rows;
}

/**
 * Finds the heading row (within the first 10) and reads every row under it. Throws a message for the user
 * when no VC column is found.
 */
export function readSheet(cells: string[][]): ImportRow[] {
  const headAt = cells.slice(0, 10).findIndex((r) => r.some((h) => HEADERS[key(h)] === "vcNumber" || HEADERS[key(h)] === "oldVcNumber"));
  if (headAt < 0) throw new Error('No VC number column found. Name the columns like an export: "Name (English)", "Name (Tamil)", "VC number", "Old VC", "Mobile".');
  const cols = cells[headAt].map((h) => HEADERS[key(h)]);
  const out: ImportRow[] = [];
  cells.slice(headAt + 1).forEach((r, i) => {
    const row: ImportRow = { line: headAt + i + 2, name: null, tamilName: null, vcNumber: null, oldVcNumber: null, phone: null };
    cols.forEach((f, c) => {
      const v = (r[c] ?? "").trim();
      if (f && v && row[f] === null) row[f] = f === "vcNumber" || f === "oldVcNumber" || f === "phone" ? digits(v) : v;
    });
    if (row.name || row.vcNumber || row.oldVcNumber) out.push(row);
  });
  return out;
}

export type BoxStatus = "Box active" | "Box deactivated" | "Not in TCCL" | "Not found in TCCL" | "No VC";

export const boxStatus = (s: { status: string; goneAt: string | Date | null }): BoxStatus => (s.goneAt ? "Not in TCCL" : s.status === "Active" ? "Box active" : "Box deactivated");

interface Sub {
  id: string;
  vcNumber: string | null;
  status: string;
  goneAt: Date | string | null;
}

/** Each row's subscriber: by its VC number, else its old VC. One subscriber matched by two rows is `shared` (not saved). */
export function matchRows<S extends Sub>(rows: ImportRow[], subs: S[]) {
  const byVc = new Map(subs.filter((s) => s.vcNumber).map((s) => [s.vcNumber!.trim(), s]));
  const found = rows.map((row) => {
    const sub = (row.vcNumber && byVc.get(row.vcNumber)) || (row.oldVcNumber && byVc.get(row.oldVcNumber)) || null;
    return { row, sub, byOldVc: !!sub && sub.vcNumber !== row.vcNumber };
  });
  const claims = new Map<string, number>();
  for (const f of found) if (f.sub) claims.set(f.sub.id, (claims.get(f.sub.id) ?? 0) + 1);
  return found.map((f) => ({
    ...f,
    shared: !!f.sub && claims.get(f.sub.id)! > 1,
    status: (f.sub ? boxStatus(f.sub) : f.row.vcNumber || f.row.oldVcNumber ? "Not found in TCCL" : "No VC") as BoxStatus,
  }));
}
