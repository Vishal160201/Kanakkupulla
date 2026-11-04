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
    expect(rows).toEqual([{ line: 3, name: "Murugan", tamilName: "முருகன்", oldVcNumber: "3102000001", vcNumber: "3102000002", phone: "9876543210" }]);
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
