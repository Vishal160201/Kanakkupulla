"use client";

import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { useShops } from "@/components/providers/ShopProvider";
import { useCanManageInventory } from "../inventoryUtils";
import BillFormDialog from "./BillFormDialog";

/** The Fertilizer Inventory sale/purchase form, opened from Daily Kanakku in a fertilizer shop. */
export default function InventoryBillModal() {
  const { inventoryBillKind, closeInventoryBill } = useGlobalForm();
  const { activeShop, activeShopType } = useShops();
  const canManage = useCanManageInventory();

  if (!inventoryBillKind || !activeShop || activeShopType !== "FERTILIZER" || !canManage) return null;
  return <BillFormDialog key={`${activeShop.id}-${inventoryBillKind}`} shopId={activeShop.id} kind={inventoryBillKind} onClose={closeInventoryBill} />;
}
