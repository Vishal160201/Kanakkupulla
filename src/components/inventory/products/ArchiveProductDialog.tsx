"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { InventoryProduct } from "@/types/inventory";
import { ConfirmDialog } from "../InventoryUI";
import { errorMessage, sendJson, useRevalidateInventory } from "../inventoryUtils";

/** Confirms archiving / restoring a product. Render with `product` set to open it. */
export default function ArchiveProductDialog({ product, onClose }: { product: InventoryProduct | null; onClose: () => void }) {
  const revalidate = useRevalidateInventory();
  const [busy, setBusy] = useState(false);
  // Keep showing the last product while the dialog animates closed.
  const [shown, setShown] = useState(product);
  if (product && product !== shown) setShown(product);
  const archiving = !shown?.isArchived;

  const confirm = async () => {
    if (!product) return;
    setBusy(true);
    try {
      await sendJson(`/api/inventory/products/${encodeURIComponent(product.id)}`, "PUT", { isArchived: archiving });
      toast.success(archiving ? `${product.name} archived` : `${product.name} restored`);
      revalidate();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={!!product}
      title={archiving ? `Archive ${shown?.name ?? "product"}?` : `Restore ${shown?.name ?? "product"}?`}
      message={
        archiving
          ? "It will be hidden from new sales and purchases. Its stock and history are kept and you can restore it any time."
          : "It will be available again for new sales and purchases."
      }
      confirmLabel={archiving ? "Archive" : "Restore"}
      busyLabel={archiving ? "Archiving…" : "Restoring…"}
      icon={archiving ? "archive" : "arrow-counter-clockwise"}
      tone={archiving ? "danger" : "neutral"}
      busy={busy}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    />
  );
}
