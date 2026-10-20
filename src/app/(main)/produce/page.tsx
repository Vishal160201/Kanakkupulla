import { Suspense } from "react";
import ProducePage from "@/components/inventory/produce/ProducePage";
import InventorySkeleton from "@/components/inventory/InventorySkeleton";

export default function Page() {
  // ProducePage reads ?section=, which needs a Suspense boundary.
  return (
    <Suspense fallback={<InventorySkeleton />}>
      <ProducePage />
    </Suspense>
  );
}
