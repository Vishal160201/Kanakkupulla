import { Suspense } from "react";
import InventoryPage from "@/components/inventory/InventoryPage";
import InventorySkeleton from "@/components/inventory/InventorySkeleton";

export default function Page() {
  // InventoryPage reads ?tab=, which needs a Suspense boundary.
  return (
    <Suspense fallback={<InventorySkeleton />}>
      <InventoryPage />
    </Suspense>
  );
}
