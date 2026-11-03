import { Suspense } from "react";
import CablePage from "@/components/cable/CablePage";
import InventorySkeleton from "@/components/inventory/InventorySkeleton";

// TIC Fiber (internet) view; CablePage reads ?tab=, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense fallback={<InventorySkeleton />}>
      <CablePage provider="TIC_FIBER" />
    </Suspense>
  );
}
