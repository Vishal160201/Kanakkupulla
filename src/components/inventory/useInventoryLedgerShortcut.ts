"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { useShops } from "@/components/providers/ShopProvider";
import { PRODUCE_LEDGER_CATEGORIES, INVENTORY_LEDGER_CATEGORIES } from "@/lib/shopModules";
import { useCanManageInventory } from "./inventoryUtils";

/**
 * In a fertilizer shop, Daily Kanakku categories the inventory owns (Fertilizer Sales, Stock Purchase,
 * Credit Collection, and the produce ones) open their own flow instead of a plain ledger entry, so
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
      const isFarmerPayment = category === PRODUCE_LEDGER_CATEGORIES.FARMER_PAYMENT;
      toast.info(isFarmerPayment ? "Pay the farmer from their page" : "Record produce from Produce", {
        description: isFarmerPayment
          ? "What you owe them goes down and the amount is posted to Daily Kanakku."
          : "Collections and buyer sales keep produce stock and dues right.",
      });
      router.push(isFarmerPayment ? "/farmers?filter=you-owe" : "/produce");
    } else {
      toast.info("Record the repayment from the farmer's page", { description: "Their credit goes down and the amount is posted to Daily Kanakku." });
      router.push("/farmers?filter=owe-you");
    }
    return true;
  };
}
