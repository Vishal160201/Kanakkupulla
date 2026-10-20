"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { fetcher } from "@/lib/fetcher";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { useShops } from "@/components/providers/ShopProvider";
import type {
  EditableTransaction,
  TransactionEditResponse,
  TransactionFormState,
  TransactionLayoutResponse,
} from "@/types/transactions";
import {
  applyRecordDate,
  buildCategoryPayloads,
  buildDefaultFormState,
  buildEditFormState,
  splitSelection,
  textValue,
  uploadPayloadFiles,
  validateTransactionForm,
} from "./transactionFormUtils";

const isTransactionKey = (key: unknown) => typeof key === 'string' && key.startsWith('/api/transactions');
/** Shop-aware views derived from the ledger (keys carry date / shop query params). */
const isLedgerDerivedKey = (key: unknown) =>
  typeof key === 'string' && (key.startsWith('/api/dashboard/overview') || key.startsWith('/api/analytics'));

/** State, data loading and submission for the global add/edit transaction modal. */
export function useTransactionForm() {
  const { isTransactionFormOpen, transactionToEditId, transactionInitialData, closeTransactionForm } = useGlobalForm();

  const isBulkEdit = typeof transactionToEditId === 'string' && transactionToEditId.startsWith('grp_');
  const fetchUrl = transactionToEditId
    ? (isBulkEdit ? `/api/transactions/bulk/${transactionToEditId}` : `/api/transactions/${transactionToEditId}`)
    : null;

  const { data: fetchRes, isLoading: isTxLoading } = useSWR<TransactionEditResponse>(
    fetchUrl,
    fetcher
  );

  const fetchedTransaction: EditableTransaction | undefined = fetchRes?.transaction || transactionInitialData;
  const editTransaction = transactionToEditId ? fetchedTransaction : null;

  const searchParams = useSearchParams();
  const isOpen = isTransactionFormOpen;

  const onClose = () => {
    closeTransactionForm();
  };

  const onSuccess = () => {
    mutate(
      isTransactionKey,
      undefined,
      { revalidate: true }
    );
    mutate(isLedgerDerivedKey);
    closeTransactionForm();
  };

  const [form, setForm] = useState<TransactionFormState>({ type: "INCOME", status: "SETTLED" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: driveStatus } = useSWR<{ connected: boolean }>("/api/integrations/google", fetcher);

  const { data: layoutRes } = useSWR<TransactionLayoutResponse>("/api/settings/layouts/TRANSACTION_FORM", fetcher);
  const layoutSchema = layoutRes?.schema;

  const isEditMode = !!editTransaction;

  // New entries start in the shop being viewed; "All Shops" (with several shops) leaves it unset.
  const { shops, activeShopId, isReady: shopsReady } = useShops();
  const presetShopId = activeShopId !== "all" ? activeShopId : (shops.length === 1 ? shops[0].id : "");
  const originalShopId = editTransaction?.shopId ?? null;

  // Re-seed the form whenever the modal opens or its source data arrives.
  // Done during render (instead of in an effect) by remembering the inputs it
  // was last seeded from, so the stale form is never committed to the screen.
  const seedInputs = [isOpen, editTransaction, isTxLoading, layoutSchema, searchParams, transactionInitialData, shopsReady];
  const [seededFrom, setSeededFrom] = useState<unknown[] | null>(null);
  if (seededFrom === null || seedInputs.some((input, i) => !Object.is(input, seededFrom[i]))) {
    setSeededFrom(seedInputs);
    if (isOpen && !isTxLoading) {
      if (editTransaction) {
        setForm(buildEditFormState(editTransaction));
      } else if (layoutSchema?.sections) {
        setForm({
          ...buildDefaultFormState(
            layoutSchema,
            searchParams.get('type') || transactionInitialData?.type,
            searchParams.get('category') || transactionInitialData?.category,
            new Date()
          ),
          shopId: presetShopId,
        });
      }
      setErrors({});
    }
  }

  const setField = (key: string) => (value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const errs = validateTransactionForm(form, layoutSchema);
    // Shop is required whenever shops exist (the server would otherwise silently use the default).
    if (shops.length > 0 && !form.shopId) errs.shopId = "Choose which shop this entry belongs to.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setIsSubmitting(true);

    const payload: TransactionFormState = { ...form };
    if (!payload.shopId) delete payload.shopId;
    if (payload.amount) payload.amount = parseFloat(String(payload.amount));

    try {
      await uploadPayloadFiles(payload);
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Failed to upload file");
      setIsSubmitting(false);
      return;
    }

    // Apply isRecordDate logic
    applyRecordDate(payload, layoutSchema);

    try {
      let res: Response;
      const selectedCategoryArray = splitSelection(payload.category);

      if (selectedCategoryArray.length > 1 && !isEditMode) {
        // Bulk creation
        res = await fetch("/api/transactions/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildCategoryPayloads(payload, selectedCategoryArray)),
        });
      } else if (isEditMode && editTransaction) {
        const isGroupEdit = typeof editTransaction.id === 'string' && editTransaction.id.startsWith('grp_');
        if (isGroupEdit) {
          res = await fetch(`/api/transactions/bulk/${editTransaction.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildCategoryPayloads(payload, selectedCategoryArray)),
          });
        } else {
          res = await fetch(`/api/transactions/${editTransaction.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      } else {
        res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const recordedOn = new Date((form.date as string | undefined) || Date.now()).toLocaleDateString("en-IN");
        toast.success(isEditMode ? "Transaction updated!" : (selectedCategoryArray.length > 1 ? "Transactions recorded!" : "Transaction recorded!"), {
          description: selectedCategoryArray.length > 1
            ? `Recorded ${selectedCategoryArray.length} items on ${recordedOn}`
            : `₹${parseFloat(textValue(form.amount) || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${typeof form.type === 'string' ? form.type.toLowerCase() : undefined} on ${recordedOn}`,
        });

        // Revalidate SWR caches for transactions
        mutate(isTransactionKey);

        onSuccess();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 422 && data.errors) {
          setErrors(data.errors);
          toast.error("Please fix the highlighted fields.");
        } else {
          toast.error(data.error || "Failed to save. Please try again.");
        }
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isOpen,
    isEditMode,
    layoutSchema,
    driveStatus,
    originalShopId,
    form,
    errors,
    isSubmitting,
    setField,
    handleSubmit,
    onClose,
  };
}
