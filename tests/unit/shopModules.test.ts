import { describe, expect, it } from "vitest";
import { isPathAllowedForShopType, modulesForShopType, moduleForPath } from "@/lib/shopModules";
import { accessModuleForPath, firstViewablePath } from "@/components/shops/moduleAccess";

describe("fertilizer shop pages", () => {
  it("gives fertilizer shops Farmers and Produce, in sidebar order", () => {
    expect(modulesForShopType("FERTILIZER")).toEqual(["transactions", "inventory", "farmers", "produce", "settings"]);
  });

  it("maps the new paths to their modules", () => {
    expect(moduleForPath("/farmers")).toBe("farmers");
    expect(moduleForPath("/produce")).toBe("produce");
    expect(moduleForPath("/farmersmarket")).toBeNull();
  });

  it("keeps Farmers and Produce out of studio shops", () => {
    expect(isPathAllowedForShopType("/farmers", "FERTILIZER")).toBe(true);
    expect(isPathAllowedForShopType("/produce", "FERTILIZER")).toBe(true);
    expect(isPathAllowedForShopType("/farmers", "STUDIO")).toBe(false);
    expect(isPathAllowedForShopType("/produce", "STUDIO")).toBe(false);
  });

  it("guards Farmers and Produce with the inventory permission", () => {
    expect(accessModuleForPath("/farmers")).toBe("inventory");
    expect(accessModuleForPath("/produce")).toBe("inventory");
    expect(accessModuleForPath("/inventory")).toBe("inventory");
  });

  it("lands on Daily Kanakku, or the inventory, for fertilizer shop members", () => {
    const allowed = modulesForShopType("FERTILIZER");
    expect(firstViewablePath(() => true, allowed)).toBe("/transactions/overview");
    expect(firstViewablePath((m) => m === "inventory", allowed)).toBe("/inventory");
    expect(firstViewablePath(() => false, allowed)).toBe("/settings");
  });
});
