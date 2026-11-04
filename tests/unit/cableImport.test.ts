import { describe, expect, it } from "vitest";
import { matchRows, parseCsv, readSheet } from "@/lib/cableImport";

describe("parseCsv", () => {
  it("handles BOM, quotes, escaped quotes and CRLF", () => {
    expect(parseCsv('﻿A,B\r\n"x, ""y""",2\r\n')).toEqual([["﻿A", "B"], ['x, "y"', "2"], []]);
  });
});

describe("readSheet", () => {
  it("finds the heading row and maps known columns", () => {
    const rows = readSheet([
      ["Setbox list"],
      ["S.No", "Name (English)", "Name (Tamil)", "Old VC", "New VC", "Mobile"],
      ["1", "Murugan", "முருகன்", "3102 000001", "3102000002", "98765 43210"],
      ["", "", "", "", "", ""],
    ]);
    expect(rows).toEqual([{ sheet: null, line: 3, name: "Murugan", tamilName: "முருகன்", oldVcNumber: "3102000001", vcNumber: "3102000002", phone: "9876543210", groupName: null }]);
  });

  it("reads side-by-side lists with unheaded VC and mobile columns (Setbox layout)", () => {
    const row = (n: number, ta: string, en: string, vc: string, ph: string) => [String(n), ta, en, "", vc, ph];
    const rows = readSheet(
      [
        [],
        ["S.NO", "NAME", "NAME (English)", "", "", "", "S.NO", "NAME", "NAME (English)", "", "", ""],
        [...row(1, "முருகன்", "Murugan", "3102000001", "9876543210"), ...row(4, "காளி", "Kali", "3102000004", "919876500000")],
        [...row(2, "மணி", "Mani", "3102000002", ""), ...row(5, "ராஜா", "Raja", "3102000005", "9876500001")],
        [...row(3, "சேகர்", "Sekar", "3102000003", "9876543212"), ...row(6, "சிவா", "Siva", "", "9876500002")],
      ],
      "SHEET-A"
    );
    expect(rows.map((r) => [r.groupName, r.line, r.name, r.tamilName, r.vcNumber, r.phone])).toEqual([
      ["SHEET-A", 3, "Murugan", "முருகன்", "3102000001", "9876543210"],
      ["SHEET-A", 4, "Mani", "மணி", "3102000002", null],
      ["SHEET-A", 5, "Sekar", "சேகர்", "3102000003", "9876543212"],
      ["SHEET-A", 3, "Kali", "காளி", "3102000004", "9876500000"],
      ["SHEET-A", 4, "Raja", "ராஜா", "3102000005", "9876500001"],
      ["SHEET-A", 5, "Siva", "சிவா", null, "9876500002"],
    ]);
  });

  it("refuses a sheet without a VC column", () => {
    expect(() => readSheet([["Name", "Mobile"]])).toThrow(/No VC number column/);
  });
});

describe("matchRows", () => {
  const subs = [
    { id: "a", vcNumber: "3100000001", status: "Active", goneAt: null },
    { id: "b", vcNumber: "3100000002", status: "Deactive", goneAt: null },
  ];
  const row = (vcNumber: string | null, oldVcNumber: string | null = null) => ({ line: 2, name: "X", tamilName: null, phone: null, vcNumber, oldVcNumber });

  it("matches by VC, then old VC, and reports box status", () => {
    const m = matchRows([row("3100000002"), row("3199999999", "3100000001"), row("3199999999"), row(null)], subs);
    expect(m.map((x) => [x.sub?.id ?? null, x.byOldVc, x.status])).toEqual([
      ["b", false, "Box deactivated"],
      ["a", true, "Box active"],
      [null, false, "Not found in TCCL"],
      [null, false, "No VC"],
    ]);
  });

  it("flags a subscriber claimed by two rows", () => {
    const m = matchRows([row("3100000001"), row(null, "3100000001")], subs);
    expect(m.every((x) => x.shared)).toBe(true);
  });
});
