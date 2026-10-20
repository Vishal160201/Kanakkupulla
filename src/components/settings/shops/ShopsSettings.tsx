"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useShops } from "@/components/providers/ShopProvider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Shop, ShopInput } from "@/types/shops";
import ShopFormDialog from "./ShopFormDialog";
import ShopRow from "./ShopRow";

interface ApiResult {
  ok: boolean;
  status: number;
  data: { error?: string; errors?: Record<string, string> } & Record<string, unknown>;
}

async function shopRequest(url: string, method: "POST" | "PUT" | "DELETE", body?: ShopInput): Promise<ApiResult> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Ledger views whose numbers depend on which shops exist / are archived. */
const revalidateShopViews = () =>
  mutate(
    (key) => typeof key === "string" && (
      key.startsWith("/api/transactions") ||
      key.startsWith("/api/dashboard/overview") ||
      key.startsWith("/api/analytics")
    )
  );

/** Settings → Shops (admin only): studio-wide shops that ledger entries belong to. */
export default function ShopsSettings() {
  const { allShops, isLoading, refreshShops } = useShops();
  // `undefined` = closed, `null` = adding a new shop
  const [editing, setEditing] = useState<Shop | null | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Shop | null>(null);

  // Entry counts change as transactions are recorded; refresh when the section opens.
  useEffect(() => {
    refreshShops();
  }, [refreshShops]);

  const activeCount = allShops.filter((s) => !s.isArchived).length;

  const closeForm = () => {
    setEditing(undefined);
    setServerErrors({});
  };

  const handleSave = async (input: ShopInput) => {
    setIsSaving(true);
    setServerErrors({});
    try {
      const result = editing
        ? await shopRequest(`/api/shops/${editing.id}`, "PUT", input)
        : await shopRequest("/api/shops", "POST", input);
      if (result.ok) {
        toast.success(editing ? "Shop updated" : `"${input.name}" added`);
        await refreshShops();
        revalidateShopViews();
        closeForm();
      } else {
        if (result.status === 422 && result.data.errors) setServerErrors(result.data.errors);
        if (result.status === 409 && result.data.error) setServerErrors({ name: result.data.error });
        toast.error(result.data.error || "Failed to save the shop.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  /** PUT a single change (default / archive) and report the API's message on failure. */
  const updateShop = async (shop: Shop, input: ShopInput, successMessage: string) => {
    setBusyId(shop.id);
    try {
      const result = await shopRequest(`/api/shops/${shop.id}`, "PUT", input);
      if (result.ok) {
        toast.success(successMessage);
        await refreshShops();
        revalidateShopViews();
      } else {
        toast.error(result.data.error || "Failed to update the shop.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteShop = async (shop: Shop) => {
    setBusyId(shop.id);
    try {
      const result = await shopRequest(`/api/shops/${shop.id}`, "DELETE");
      if (result.ok) {
        toast.success(`"${shop.name}" deleted`);
        setConfirmDelete(null);
        await refreshShops();
        revalidateShopViews();
      } else {
        // e.g. 409: "X" has N ledger entries ... Archive it instead.
        toast.error(result.data.error || "Failed to delete the shop.");
        setConfirmDelete(null);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  // Shops with entries can't be deleted; let the API explain why instead of asking to confirm.
  const requestDelete = (shop: Shop) => {
    if (shop.transactionCount > 0) deleteShop(shop);
    else setConfirmDelete(shop);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[calc(100vh-140px)]">
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Shops</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">
            Split the Daily Kanakku ledger by shop. Categories are shared by every shop.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-[0.85rem] hover:bg-orange-600 transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0"
        >
          <i className="ph-bold ph-plus" />
          Add Shop
        </button>
      </div>

      <div className="flex-1 p-4 sm:p-6 bg-slate-50/50 space-y-3">
        {isLoading && allShops.length === 0 ? (
          [1, 2].map((i) => <div key={i} className="h-[76px] rounded-2xl bg-white border border-slate-100 animate-pulse" />)
        ) : allShops.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <i className="ph ph-storefront text-3xl text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-500">No shops yet</p>
            <p className="text-xs text-slate-400 mt-1">Add a shop to start splitting the ledger.</p>
          </div>
        ) : (
          allShops.map((shop) => (
            <ShopRow
              key={shop.id}
              shop={shop}
              isBusy={busyId === shop.id}
              isLastActive={!shop.isArchived && activeCount <= 1}
              onEdit={() => setEditing(shop)}
              onSetDefault={() => updateShop(shop, { isDefault: true }, `"${shop.name}" is now the default shop`)}
              onToggleArchive={() =>
                updateShop(
                  shop,
                  { isArchived: !shop.isArchived },
                  shop.isArchived ? `"${shop.name}" restored` : `"${shop.name}" archived`
                )
              }
              onDelete={() => requestDelete(shop)}
            />
          ))
        )}

        <p className="text-[11px] font-semibold text-slate-400 px-1 pt-2 leading-relaxed">
          New entries from bookings and gift orders go to the default shop. Archived shops keep their history but
          can&apos;t receive new entries. A shop can only be deleted when it has no ledger entries.
        </p>
      </div>

      {editing !== undefined && (
        <ShopFormDialog
          shop={editing}
          isSaving={isSaving}
          serverErrors={serverErrors}
          onSubmit={handleSave}
          onClose={closeForm}
        />
      )}

      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && !busyId && setConfirmDelete(null)}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[400px] rounded-3xl border-0 bg-white p-7 text-center shadow-2xl"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <i className="ph-fill ph-trash text-3xl" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900">Delete {confirmDelete?.name}?</DialogTitle>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">This shop has no ledger entries. It will be removed permanently.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              disabled={!!busyId}
              className="h-11 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => confirmDelete && deleteShop(confirmDelete)}
              disabled={!!busyId}
              className="h-11 rounded-xl bg-rose-500 font-bold text-white hover:bg-rose-600 disabled:opacity-60"
            >
              {busyId ? "Deleting…" : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
