"use client";

import { useState } from "react";
import type { StockMovement, StockMovementType } from "@/types/inventory";
import { EmptyState, ErrorState, InfoTile, InventoryDialog, ListSkeleton, Pill, type PillTone, secondaryButtonClass } from "../InventoryUI";
import { errorMessage, formatDate, formatINR, formatQty, packLabel, quantityUnit, useCanManageInventory } from "../inventoryUtils";
import { useProductMovements } from "../useInventoryData";
import BillDetailDialog from "../bills/BillDetailDialog";
import AdjustStockDialog from "./AdjustStockDialog";
import ProductFormDialog from "./ProductFormDialog";
import ArchiveProductDialog from "./ArchiveProductDialog";
import { cn } from "@/lib/utils";

const MOVEMENT_STYLES: Record<StockMovementType, { label: string; tone: PillTone; icon: string }> = {
  PURCHASE: { label: "Purchase", tone: "blue", icon: "truck" },
  SALE: { label: "Sale", tone: "orange", icon: "shopping-cart" },
  ADJUSTMENT: { label: "Adjustment", tone: "violet", icon: "sliders-horizontal" },
};

interface ProductDetailDialogProps {
  shopId: string;
  productId: string;
  onClose: () => void;
}

function MovementRow({ movement, unit, onOpenBill }: { movement: StockMovement; unit: string; onOpenBill: (id: string) => void }) {
  const style = MOVEMENT_STYLES[movement.type] ?? MOVEMENT_STYLES.ADJUSTMENT;
  const positive = movement.quantity > 0;
  return (
    <li className="flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone={style.tone} icon={style.icon}>{style.label}</Pill>
          {movement.bill && (
            <button
              type="button"
              onClick={() => onOpenBill(movement.bill!.id)}
              className="text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline font-mono"
            >
              {movement.bill.billNumber}
            </button>
          )}
        </div>
        <div className="mt-1 text-[11px] font-semibold text-slate-400 truncate">
          {formatDate(movement.date)}
          {movement.unitPrice != null && movement.type !== "ADJUSTMENT" && <> &middot; {formatINR(movement.unitPrice)}/{unit}</>}
          {movement.notes && <> &middot; {movement.notes}</>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={cn("text-sm font-extrabold", positive ? "text-emerald-600" : "text-rose-600")}>
          {positive ? "+" : "-"}{formatQty(Math.abs(movement.quantity))} {unit}
        </div>
        <div className="text-[11px] font-semibold text-slate-400">Balance {formatQty(movement.balanceAfter)}</div>
      </div>
    </li>
  );
}

/** Product summary + stock movement history. Mount only while open. */
export default function ProductDetailDialog({ shopId, productId, onClose }: ProductDetailDialogProps) {
  const { data, error, isLoading, mutate } = useProductMovements(productId);
  const [mode, setMode] = useState<"edit" | "adjust" | "archive" | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const canManage = useCanManageInventory();

  const product = data?.product;
  const movements = data?.movements ?? [];

  return (
    <InventoryDialog
      open
      onClose={onClose}
      size="lg"
      eyebrow="Product"
      title={product?.name ?? "Loading…"}
      subtitle={product ? `${packLabel(product)} · ${formatINR(product.price)} per ${quantityUnit(product)}` : undefined}
      footer={
        product && canManage ? (
          <>
            <button type="button" onClick={() => setMode("archive")} className={`${secondaryButtonClass} sm:mr-auto`}>
              <i className={`ph-bold ${product.isArchived ? "ph-arrow-counter-clockwise" : "ph-archive"}`} /> {product.isArchived ? "Restore" : "Archive"}
            </button>
            <button type="button" onClick={() => setMode("edit")} className={secondaryButtonClass}>
              <i className="ph-bold ph-pencil-simple" /> Edit
            </button>
            {!product.isArchived && (
              <button type="button" onClick={() => setMode("adjust")} className={secondaryButtonClass}>
                <i className="ph-bold ph-sliders-horizontal" /> Adjust stock
              </button>
            )}
          </>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading || !product ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2.5">
            <InfoTile label="In stock" value={`${formatQty(product.stock)} ${quantityUnit(product, product.stock)}`} tone={product.stock <= 0 ? "red" : undefined} />
            <InfoTile label="Price" value={formatINR(product.price)} />
            <InfoTile label="Stock value" value={formatINR(Math.max(0, product.stock) * product.price)} />
          </div>
          {product.isArchived && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 flex items-center gap-2">
              <i className="ph-bold ph-archive" aria-hidden="true" /> Archived — hidden from new bills.
            </div>
          )}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-2">Stock history</h3>
            {movements.length === 0 ? (
              <EmptyState icon="clock-counter-clockwise" title="No stock movements yet" message="Purchases, sales and adjustments of this product will appear here." className="py-8" />
            ) : (
              <ul className="rounded-2xl border border-slate-100 divide-y divide-slate-100">
                {movements.map((m) => (
                  <MovementRow key={m.id} movement={m} unit={quantityUnit(product)} onOpenBill={setBillId} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {product && mode === "edit" && <ProductFormDialog shopId={shopId} product={product} onClose={() => setMode(null)} />}
      {product && mode === "adjust" && <AdjustStockDialog shopId={shopId} product={product} onClose={() => setMode(null)} />}
      <ArchiveProductDialog product={product && mode === "archive" ? product : null} onClose={() => setMode(null)} />
      {billId && <BillDetailDialog billId={billId} onClose={() => setBillId(null)} />}
    </InventoryDialog>
  );
}
