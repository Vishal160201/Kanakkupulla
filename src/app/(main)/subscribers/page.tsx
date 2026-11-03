import { Suspense } from "react";
import CablePage from "@/components/cable/CablePage";
import InventorySkeleton from "@/components/inventory/InventorySkeleton";

export default function Page() {
  // CablePage reads ?tab=, which needs a Suspense boundary.
  return (
    <Suspense fallback={<InventorySkeleton />}>
      <CablePage />
    </Suspense>
  );
}
