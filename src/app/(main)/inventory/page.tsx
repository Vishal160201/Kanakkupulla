import { Suspense } from "react";
import { redirect } from "next/navigation";
import InventoryPage from "@/components/inventory/InventoryPage";
import InventorySkeleton from "@/components/inventory/InventorySkeleton";

// Credit and Produce used to be inventory tabs; they're their own pages now.
const MOVED_TABS: Record<string, string> = { credit: "/farmers", produce: "/produce" };

export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { tab } = await searchParams;
  const moved = typeof tab === "string" ? MOVED_TABS[tab] : undefined;
  if (moved) redirect(moved);

  // InventoryPage reads ?tab=, which needs a Suspense boundary.
  return (
    <Suspense fallback={<InventorySkeleton />}>
      <InventoryPage />
    </Suspense>
  );
}
