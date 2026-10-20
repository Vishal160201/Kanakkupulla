"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import type { RecycleBinResponse } from "@/types/settings";

const PAGE_SIZE = 20;

const revalidateTransactions = () =>
  globalMutate((key) => typeof key === "string" && key.startsWith("/api/transactions"), undefined, { revalidate: true });

/** Data + actions for the studio (non-personal) recycle bin. */
export function useStudioRecycleBin() {
  const [page, setPage] = useState(0);
  const limit = PAGE_SIZE;
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const query = new URLSearchParams();
  query.append("limit", limit.toString());
  query.append("offset", (page * limit).toString());
  if (sourceFilter) query.append("source", sourceFilter);

  const { data, mutate, isLoading } = useSWR<RecycleBinResponse>(`/api/recycle-bin?${query.toString()}`, fetcher);

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const [confirmEmptyBin, setConfirmEmptyBin] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isDeletingEmpty, setIsDeletingEmpty] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const withoutId = (id: string) => {
    const newSet = new Set(selectedIds);
    newSet.delete(id);
    return newSet;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const changeSourceFilter = (val: string) => {
    setSourceFilter(val);
    setPage(0);
    setSelectedIds(new Set());
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/recycle-bin/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to restore");
      toast.success("Item restored");
      mutate();
      revalidateTransactions();
      setSelectedIds(withoutId(id));
    } catch {
      toast.error("Error restoring item");
    }
  };

  const handlePermanentDeleteConfirm = async (id: string) => {
    setIsDeletingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/recycle-bin/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Item permanently deleted");
      mutate();
      setSelectedIds(withoutId(id));
    } catch {
      setActionError("Error deleting item");
    } finally {
      setIsDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch(`/api/recycle-bin/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Failed to bulk restore");
      toast.success(`Restored ${selectedIds.size} items`);
      setSelectedIds(new Set());
      mutate();
      revalidateTransactions();
    } catch {
      toast.error("Error restoring items");
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.size === 0) return;
    setIsDeletingBulk(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/recycle-bin`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Failed to bulk delete");
      toast.success(`Permanently deleted ${selectedIds.size} items`);
      setSelectedIds(new Set());
      mutate();
    } catch {
      setActionError("Error deleting items");
    } finally {
      setIsDeletingBulk(false);
      setConfirmBulkDelete(false);
    }
  };

  const handleEmptyBinConfirm = async () => {
    setIsDeletingEmpty(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/recycle-bin/empty`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to empty bin");
      toast.success("Recycle bin emptied");
      setSelectedIds(new Set());
      mutate();
    } catch {
      setActionError("Error emptying bin");
    } finally {
      setIsDeletingEmpty(false);
      setConfirmEmptyBin(false);
    }
  };

  return {
    page,
    setPage,
    limit,
    sourceFilter,
    changeSourceFilter,
    selectedIds,
    items,
    total,
    totalPages,
    isLoading,
    actionError,
    confirmEmptyBin,
    setConfirmEmptyBin,
    confirmBulkDelete,
    setConfirmBulkDelete,
    confirmDeleteId,
    setConfirmDeleteId,
    isDeletingEmpty,
    isDeletingBulk,
    isDeletingId,
    handleSelectAll,
    handleSelect,
    handleRestore,
    handlePermanentDeleteConfirm,
    handleBulkRestore,
    handleBulkDeleteConfirm,
    handleEmptyBinConfirm,
  };
}

export type StudioRecycleBinState = ReturnType<typeof useStudioRecycleBin>;
