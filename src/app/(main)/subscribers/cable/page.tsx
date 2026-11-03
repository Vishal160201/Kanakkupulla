import { Suspense } from "react";
import CablePage from "@/components/cable/CablePage";
import InventorySkeleton from "@/components/inventory/InventorySkeleton";

// TCCL (cable TV) view of the same shop; CablePage reads ?tab=, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense fallback={<InventorySkeleton />}>
      <CablePage provider="TCCL" />
    </Suspense>
  );
}
