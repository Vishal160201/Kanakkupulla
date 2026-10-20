"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { useShops } from "@/components/providers/ShopProvider";
import { PRODUCE_LEDGER_CATEGORIES, INVENTORY_LEDGER_CATEGORIES } from "@/lib/shopModules";
import { useCanManageInventory } from "./inventoryUtils";

/**
 * In a fertilizer shop, Daily Kanakku categories the inventory owns (Fertilizer Sales, Stock Purchase,
 * Credit Collection, and the produce ones) open the inventory flow instead of a plain ledger entry, so
 * stock, credit and produce dues stay right.
 * Returns a handler that takes a category and reports whether it took over.
 */
export function useInventoryLedgerShortcut(): (category: string) => boolean {
  const router = useRouter();
  const { activeShopType } = useShops();
  const { openInventoryBill } = useGlobalForm();
  const canManage = useCanManageInventory();

  return (category) => {
    if (activeShopType !== "FERTILIZER") return false;
    const isSale = category === INVENTORY_LEDGER_CATEGORIES.SALE;
    const isPurchase = category === INVENTORY_LEDGER_CATEGORIES.PURCHASE;
    const isProduce = (Object.values(PRODUCE_LEDGER_CATEGORIES) as string[]).includes(category);
    if (!isSale && !isPurchase && !isProduce && category !== INVENTORY_LEDGER_CATEGORIES.CREDIT_PAYMENT) return false;

    if (!canManage) {
      toast.error("You need Manage access to Fertilizer Inventory for this.", {
        description: `${category} is recorded from Fertilizer Inventory so stock stays correct.`,
      });
    } else if (isSale || isPurchase) {
      openInventoryBill(isSale ? "SALE" : "PURCHASE");
    } else if (isProduce) {
      toast.info("Record produce in Fertilizer Inventory", { description: "Collections, farmer payments and buyer sales keep produce stock and dues right." });
      router.push("/inventory?tab=produce");
    } else {
      toast.info("Collect credit from the customer's page", { description: "Their balance goes down and the amount is posted to Daily Kanakku." });
      router.push("/inventory?tab=credit");
    }
    return true;
  };
}
