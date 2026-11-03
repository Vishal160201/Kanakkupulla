import { describe, expect, it } from "vitest";
import { iconFontSize } from "@/components/ui/icons";

describe("iconFontSize", () => {
  it("prefers the size prop", () => expect(iconFontSize(18, "w-5 h-5")).toBe("18px"));
  it("reads Tailwind width/size classes", () => {
    expect(iconFontSize(undefined, "text-red-500 w-5 h-5")).toBe("1.25rem");
    expect(iconFontSize(undefined, "size-4")).toBe("1rem");
    expect(iconFontSize(undefined, "w-3.5 h-3.5")).toBe("0.875rem");
  });
  it("falls back to 24px like lucide did", () => {
    expect(iconFontSize(undefined, "text-slate-400")).toBe("24px");
    expect(iconFontSize(undefined, "max-w-5")).toBe("24px");
  });
});
