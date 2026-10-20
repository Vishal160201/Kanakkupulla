import { Suspense } from "react";
import FarmersPage from "@/components/inventory/farmers/FarmersPage";
import InventorySkeleton from "@/components/inventory/InventorySkeleton";

export default function Page() {
  // FarmersPage reads ?filter=, which needs a Suspense boundary.
  return (
    <Suspense fallback={<InventorySkeleton />}>
      <FarmersPage />
    </Suspense>
  );
}
