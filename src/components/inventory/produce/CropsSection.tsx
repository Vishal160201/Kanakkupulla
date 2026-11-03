"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tooltip } from "@/components/ui/Tooltip";
import type { ProduceItem } from "@/types/inventory";
import { ConfirmDialog, EmptyState, ErrorState, ListSkeleton, cardClass, primaryButtonClass } from "../InventoryUI";
import { errorMessage, sendJson, useCanManageInventory, useRevalidateInventory } from "../inventoryUtils";
import { useProduceItems } from "../useInventoryData";
import CropFormDialog from "./CropFormDialog";
import { formatQuantity } from "./produceShared";
import { cn } from "@/lib/utils";

const iconBtn = "h-8 w-8 flex items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800";

export default function CropsSection({ shopId }: { shopId: string }) {
  const canManage = useCanManageInventory();
  const revalidate = useRevalidateInventory();
  const { data, error, isLoading, mutate } = useProduceItems(shopId);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<ProduceItem | "new" | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProduceItem | null>(null);
  const [busy, setBusy] = useState(false);
  const all = data?.items ?? [];
  const archivedCount = all.filter((i) => i.isArchived).length;
  const items = all.filter((i) => i.isArchived === showArchived);

  const toggleArchive = async (item: ProduceItem) => {
    setBusy(true);
    try {
      await sendJson(`/api/inventory/produce/items/${encodeURIComponent(item.id)}`, "PUT", { isArchived: !item.isArchived });
      toast.success(item.isArchived ? `${item.name} restored` : `${item.name} archived`, {
        description: item.isArchived ? "It's back in the crop pickers." : "Hidden from new collections and sales.",
      });
      setArchiveTarget(null);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(cardClass, "p-4 sm:p-5")}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-950 tracking-tight">Your crops</h2>
          <p className="text-xs font-medium text-slate-400">Crops you buy from farmers. Quantities and rates use each crop&apos;s unit.</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          {archivedCount > 0 && (
            <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 h-11" role="radiogroup" aria-label="Crop status">
              {[false, true].map((archived) => (
                <button
                  key={String(archived)}
                  type="button"
                  role="radio"
                  aria-checked={showArchived === archived}
                  onClick={() => setShowArchived(archived)}
                  className={cn("px-3 rounded-lg text-xs sm:text-sm font-bold transition-all", showArchived === archived ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                >
                  {archived ? `Archived (${archivedCount})` : "Active"}
                </button>
              ))}
            </div>
          )}
          {canManage && (
            <button type="button" onClick={() => setEditing("new")} className={cn(primaryButtonClass, "flex-1 sm:flex-none")}>
              <i className="ph-bold ph-plus" /> Add crop
            </button>
          )}
        </div>
      </div>
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <ListSkeleton rows={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="plant"
          title={showArchived ? "No archived crops" : "No crops yet"}
          message={showArchived ? undefined : "Add the crops farmers bring you, with the unit you weigh them in."}
          action={!showArchived && canManage && (
            <button type="button" onClick={() => setEditing("new")} className={primaryButtonClass}>
              <i className="ph-bold ph-plus" /> Add crop
            </button>
          )}
        />
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="group flex items-center justify-between gap-3 rounded-2xl border border-transparent p-3 transition-all hover:border-slate-200 hover:bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", item.isArchived ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-600")}>
                  <i className="ph-bold ph-plant text-lg" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 truncate">{item.name}</div>
                  <div className="text-[11px] font-semibold text-slate-400 truncate">Rates per {item.unit}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="text-right mr-1">
                  <div className={cn("text-sm font-extrabold whitespace-nowrap", item.stock > 0 ? "text-slate-900" : "text-slate-400")}>{formatQuantity(item.stock, item.unit)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In stock</div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {!item.isArchived && (
                      <Tooltip content="Edit">
                        <button type="button" aria-label={`Edit ${item.name}`} className={iconBtn} onClick={() => setEditing(item)}>
                          <i className="ph-bold ph-pencil-simple" />
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip content={item.isArchived ? "Restore" : "Archive"}>
                      <button
                        type="button"
                        aria-label={`${item.isArchived ? "Restore" : "Archive"} ${item.name}`}
                        className={iconBtn}
                        disabled={busy}
                        onClick={() => (item.isArchived ? void toggleArchive(item) : setArchiveTarget(item))}
                      >
                        <i className={`ph-bold ${item.isArchived ? "ph-arrow-counter-clockwise" : "ph-archive"}`} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <CropFormDialog shopId={shopId} item={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!archiveTarget}
        title={`Archive ${archiveTarget?.name ?? "crop"}?`}
        message="It's hidden from new collections and sales. Past records stay. You can restore it any time."
        confirmLabel="Archive"
        busyLabel="Archiving…"
        icon="archive"
        tone="neutral"
        busy={busy}
        onConfirm={() => archiveTarget && void toggleArchive(archiveTarget)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
