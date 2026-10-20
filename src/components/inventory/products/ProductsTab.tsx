"use client";

import { useMemo, useState } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import type { InventoryProduct } from "@/types/inventory";
import { EmptyState, ErrorState, ListSkeleton, Pill, SearchInput, cardClass, primaryButtonClass } from "../InventoryUI";
import { LOW_STOCK_THRESHOLD, errorMessage, formatINR, formatQty, packLabel, quantityUnit, useCanManageInventory } from "../inventoryUtils";
import { useInventoryProducts } from "../useInventoryData";
import ProductFormDialog from "./ProductFormDialog";
import AdjustStockDialog from "./AdjustStockDialog";
import ProductDetailDialog from "./ProductDetailDialog";
import ArchiveProductDialog from "./ArchiveProductDialog";
import { cn } from "@/lib/utils";

type ProductDialog =
  | { kind: "form"; product: InventoryProduct | null }
  | { kind: "adjust"; product: InventoryProduct }
  | { kind: "archive"; product: InventoryProduct }
  | { kind: "detail"; productId: string }
  | null;

export function StockPill({ product }: { product: Pick<InventoryProduct, "stock" | "unit"> }) {
  if (product.stock <= 0) return <Pill tone="red" icon="warning-circle">Out of stock</Pill>;
  if (product.stock <= LOW_STOCK_THRESHOLD) return <Pill tone="amber">Low</Pill>;
  return null;
}

const iconBtn =
  "h-8 w-8 flex items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800";

export default function ProductsTab({ shopId }: { shopId: string }) {
  const { data, error, isLoading, mutate } = useInventoryProducts(shopId);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState<ProductDialog>(null);
  const canManage = useCanManageInventory();

  const products = useMemo(() => data?.products ?? [], [data]);
  const archivedCount = products.filter((p) => p.isArchived).length;
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => p.isArchived === showArchived)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || packLabel(p).toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search, showArchived]);

  return (
    <div className={cn(cardClass, "p-4 sm:p-5")}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search products" />
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 h-11" role="radiogroup" aria-label="Product status">
            {[false, true].map((archived) => (
              <button
                key={String(archived)}
                type="button"
                role="radio"
                aria-checked={showArchived === archived}
                onClick={() => setShowArchived(archived)}
                className={cn(
                  "px-3 rounded-lg text-xs sm:text-sm font-bold transition-all",
                  showArchived === archived ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {archived ? `Archived${archivedCount ? ` (${archivedCount})` : ""}` : "Active"}
              </button>
            ))}
          </div>
          {canManage && (
            <button type="button" onClick={() => setDialog({ kind: "form", product: null })} className={cn(primaryButtonClass, "flex-1 sm:flex-none")}>
              <i className="ph-bold ph-plus" /> Add product
            </button>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <ListSkeleton />
      ) : visible.length === 0 ? (
        search ? (
          <EmptyState icon="magnifying-glass" title="No matching products" message={`Nothing matches "${search}".`} />
        ) : showArchived ? (
          <EmptyState icon="archive" title="No archived products" message="Products you archive are kept here with their history." />
        ) : (
          <EmptyState
            icon="package"
            title="No products yet"
            message="Add the fertilizers, seeds and pesticides you sell: how they're packed (bottle, packet, bag, loose) and the price."
            action={
              canManage && (
                <button type="button" onClick={() => setDialog({ kind: "form", product: null })} className={primaryButtonClass}>
                  <i className="ph-bold ph-plus" /> Add product
                </button>
              )
            }
          />
        )
      ) : (
        <ul className="space-y-1">
          {visible.map((product) => (
            <li key={product.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setDialog({ kind: "detail", productId: product.id })}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setDialog({ kind: "detail", productId: product.id });
                  }
                }}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-transparent p-3 cursor-pointer transition-all hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", product.stock <= 0 ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600")}>
                    <i className="ph-bold ph-package text-lg" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{product.name}</div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate">
                      {packLabel(product)} &middot; {formatINR(product.price)}{product.unit === "Loose" ? "" : " each"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className={cn("text-sm font-extrabold", product.stock <= 0 ? "text-rose-600" : "text-slate-900")}>
                      {formatQty(product.stock)} <span className="text-xs font-bold text-slate-400">{quantityUnit(product, product.stock)}</span>
                    </div>
                    <div className="flex justify-end mt-0.5"><StockPill product={product} /></div>
                  </div>
                  {canManage && (
                  <div className="hidden sm:flex items-center gap-0.5 ml-1">
                    {!product.isArchived && (
                      <Tooltip content="Adjust stock">
                        <button type="button" aria-label={`Adjust stock of ${product.name}`} className={iconBtn} onClick={(e) => { e.stopPropagation(); setDialog({ kind: "adjust", product }); }}>
                          <i className="ph-bold ph-sliders-horizontal" />
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip content="Edit product">
                      <button type="button" aria-label={`Edit ${product.name}`} className={iconBtn} onClick={(e) => { e.stopPropagation(); setDialog({ kind: "form", product }); }}>
                        <i className="ph-bold ph-pencil-simple" />
                      </button>
                    </Tooltip>
                    <Tooltip content={product.isArchived ? "Restore product" : "Archive product"}>
                      <button
                        type="button"
                        aria-label={product.isArchived ? `Restore ${product.name}` : `Archive ${product.name}`}
                        className={iconBtn}
                        onClick={(e) => { e.stopPropagation(); setDialog({ kind: "archive", product }); }}
                      >
                        <i className={`ph-bold ${product.isArchived ? "ph-arrow-counter-clockwise" : "ph-archive"}`} />
                      </button>
                    </Tooltip>
                  </div>
                  )}
                  <i className="ph-bold ph-caret-right text-slate-300 sm:hidden" aria-hidden="true" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && dialog?.kind === "form" && <ProductFormDialog shopId={shopId} product={dialog.product} onClose={() => setDialog(null)} />}
      {canManage && dialog?.kind === "adjust" && <AdjustStockDialog shopId={shopId} product={dialog.product} onClose={() => setDialog(null)} />}
      {dialog?.kind === "detail" && <ProductDetailDialog shopId={shopId} productId={dialog.productId} onClose={() => setDialog(null)} />}
      <ArchiveProductDialog product={dialog?.kind === "archive" ? dialog.product : null} onClose={() => setDialog(null)} />
    </div>
  );
}
