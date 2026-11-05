// Subscriber sheets (xlsx / csv) in and out of the Subscribers tab. Pure helpers shared by the browser
// (reading the file) and the import route (matching rows to the synced TCCL subscribers by VC number).

export interface ImportRow {
  /** Sheet name (Excel files with several sheets), for messages */
  sheet?: string | null;
  /** Spreadsheet row number, for messages */
  line: number;
  name: string | null;
  tamilName: string | null;
  vcNumber: string | null;
  oldVcNumber: string | null;
  phone: string | null;
  /** Area / line group; an Excel sheet's name when the file has no Group column */
  groupName?: string | null;
}

/** Column headings we understand (lower-case, letters and digits only) → field. Our own export uses the first ones. */
const HEADERS: Record<string, keyof Omit<ImportRow, "line" | "sheet">> = {
  nameenglish: "name", name: "name", englishname: "name", subscriber: "name", customername: "name",
  nametamil: "tamilName", tamilname: "tamilName", tamil: "tamilName",
  vcnumber: "vcNumber", newvc: "vcNumber", vc: "vcNumber", newvcnumber: "vcNumber", setboxno: "vcNumber",
  oldvc: "oldVcNumber", oldvcnumber: "oldVcNumber",
  mobile: "phone", phone: "phone", mobileno: "phone", phoneno: "phone", phonenumber: "phone", mobilenumber: "phone",
  group: "groupName", groupname: "groupName", areagroup: "groupName", sheet: "groupName", line: "groupName",
};
const TEMP_HEADERS = new Set(["tempvc", "tempvcnumber"]);
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

const NO_VC = 'No VC number column found. Name the columns like an export: "Name (English)", "Name (Tamil)", "VC number", "Old VC", "Mobile".';
const isVc = (v: string) => /^3\d{9}$/.test(digits(v));
const isMobile = (v: string) => /^(\+?91)?[6-9]\d{9}$/.test(digits(v));
const isTamil = (v: string) => /[஀-௿]/.test(v);

/** Which field each column of one block holds: by heading, else by what's in it (unheaded VC / mobile columns). */
function blockFields(head: string[], data: string[][], from: number, to: number) {
  const fields: (keyof Omit<ImportRow, "line" | "sheet"> | undefined)[] = [];
  const taken = new Set<string>();
  const values = (c: number) => data.map((r) => (r[c] ?? "").trim()).filter(Boolean);
  // A column counts as VC / mobile when most of it looks like one and it isn't nearly empty
  const mostly = (c: number, test: (v: string) => boolean) => {
    const v = values(c);
    return v.length >= Math.max(2, data.length * 0.3) && v.filter(test).length >= v.length * 0.6;
  };
  // Our export: "VC number" is the customer's own box and "Temp VC" the one lent meanwhile (TCCL's)
  const hasTemp = head.slice(from, to).some((h) => TEMP_HEADERS.has(key(h)));
  for (let c = from; c < to; c++) {
    const h = key(head[c] ?? "");
    let f = hasTemp && TEMP_HEADERS.has(h) ? "vcNumber" : HEADERS[h];
    if (hasTemp && f === "vcNumber" && !TEMP_HEADERS.has(h)) f = "oldVcNumber";
    // "NAME" over Tamil text is the Tamil name (sheets with NAME + NAME (English))
    if (f === "name" && values(c).filter(isTamil).length > values(c).length / 2) f = "tamilName";
    if (f && !taken.has(f)) { fields[c] = f; taken.add(f); }
  }
  for (let c = from; c < to; c++) {
    if (fields[c] || HEADERS[key(head[c] ?? "")] || TEMP_HEADERS.has(key(head[c] ?? ""))) continue;
    const f = mostly(c, isVc) ? "vcNumber" : mostly(c, isMobile) ? "phone" : undefined;
    if (f && !taken.has(f)) { fields[c] = f; taken.add(f); }
  }
  return fields;
}

/**
 * Finds the heading row (within the first 10) and reads every row under it. A heading row with several "S.No"
 * columns holds side-by-side lists; each is read on its own. Throws a message for the user when no VC column
 * is found. Formula cells should be passed in blank: they are copies, not data.
 */
export function readSheet(cells: string[][], sheet: string | null = null): ImportRow[] {
  const known = (r: string[]) => r.filter((h) => HEADERS[key(h)] || key(h) === "sno").length;
  const scored = cells.slice(0, 10).map(known);
  const headAt = scored.indexOf(Math.max(0, ...scored));
  if (headAt < 0 || scored[headAt] === 0) throw new Error(NO_VC);
  const head = cells[headAt];
  const data = cells.slice(headAt + 1);
  const width = Math.max(head.length, ...data.map((r) => r.length));
  const starts = head.flatMap((h, c) => (key(h) === "sno" ? [c] : []));
  const blocks = starts.length > 1 ? starts.map((s, i) => [i === 0 ? 0 : s, starts[i + 1] ?? width]) : [[0, width]];

  const out: ImportRow[] = [];
  let foundVc = false;
  for (const [from, to] of blocks) {
    const fields = blockFields(head, data, from, to);
    if (fields.includes("vcNumber") || fields.includes("oldVcNumber")) foundVc = true;
    data.forEach((r, i) => {
      const row: ImportRow = { sheet, line: headAt + i + 2, name: null, tamilName: null, vcNumber: null, oldVcNumber: null, phone: null, groupName: null };
      for (let c = from; c < to; c++) {
        const f = fields[c];
        const v = (r[c] ?? "").trim();
        if (f && v && row[f] === null) row[f] = f === "vcNumber" || f === "oldVcNumber" || f === "phone" ? digits(v) : v;
      }
      // Two VC numbers for one person: the first is their own box, the second a temp one (TCCL's for now)
      const second = row.vcNumber && !row.oldVcNumber ? r.slice(from, to).map((v, c) => (fields[from + c] ? "" : digits(v ?? "").trim())).find((v) => isVc(v) && v !== row.vcNumber) : undefined;
      if (second) [row.oldVcNumber, row.vcNumber] = [row.vcNumber, second];
      if (row.phone?.length === 12 && row.phone.startsWith("91")) row.phone = row.phone.slice(2);
      // Hand-typed sheets leave "Murugan -" / "மணி." behind
      row.name = row.name?.replace(/[\s.\-]+$/, "") || null;
      row.tamilName = row.tamilName?.replace(/[\s.\-]+$/, "") || null;
      if (key(row.name ?? "") === "total") return;
      row.groupName ??= sheet;
      if (row.name || row.vcNumber || row.oldVcNumber) out.push(row);
    });
  }
  if (!foundVc) throw new Error(NO_VC);
  return out;
}

export type BoxStatus = "Box active" | "Box deactivated" | "Not in TCCL" | "Not found in TCCL" | "No VC";

/** TCCL's box when it's a temp one, lent while the customer's own box (old VC, the stable number) is repaired. */
export const tempVc = (s: { vcNumber: string | null; oldVcNumber: string | null }) => (s.oldVcNumber && s.vcNumber && s.oldVcNumber !== s.vcNumber ? s.vcNumber : null);

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
