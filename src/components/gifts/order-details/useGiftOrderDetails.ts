"use client";

import { useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import type { GiftOrder, GiftOrderCustomData, GiftOrderResponse } from "@/types/gifts";
import { exportElementToPdf } from "./exportPdf";

export type OrderNotification = { message: string; type: "success" | "error" } | null;

export interface GiftOrderEditForm {
  clientName: string;
  clientPhone: string;
  quantity: number | string;
  amount: number | string;
  advanceAmount: number | string;
  dueAmount: number;
  dueDate: string;
  paymentMode: string;
}

const errorMessage = (err: unknown, fallback: string) =>
  (err instanceof Error && err.message) || fallback;

function buildEditForm(order: GiftOrder): GiftOrderEditForm {
  return {
    clientName: order.clientName,
    clientPhone: order.clientPhone || "",
    quantity: order.quantity,
    amount: order.customData?.amount || 0,
    advanceAmount: order.customData?.advanceAmount || 0,
    dueAmount: Math.max(0, (Number(order.customData?.amount) || 0) - (order.transactions?.filter((t) => !t.deletedAt).reduce((sum, tx) => sum + tx.amount, 0) || Number(order.customData?.advanceAmount) || 0) - (Number(order.discountAmount) || Number(order.customData?.discountAmount) || 0)),
    dueDate: order.dueDate || "",
    paymentMode: order.customData?.paymentMode || "CASH",
  };
}

/**
 * Data + actions behind the gift order details panel. Mounted per order (the panel
 * keys its body by order id), so all transient UI state starts fresh for each order.
 */
export function useGiftOrderDetails(orderId: string | null, onDeleted?: () => void) {
  const { data, error, mutate } = useSWR<GiftOrderResponse>(orderId ? `/api/gifts/orders/${orderId}` : null, fetcher);
  const order = data?.order;

  // Custom notification state (kept for parity: it is set but not rendered anywhere yet)
  const [notification, setNotification] = useState<OrderNotification>(null);
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Editing state (no UI currently enters edit mode; startEditing seeds the form from the order)
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<GiftOrderEditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Exporting state
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [showDueCollection, setShowDueCollection] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [showRollbackWarning, setShowRollbackWarning] = useState<string | null>(null);
  const [collectionInput, setCollectionInput] = useState("");
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionSuccess, setCollectionSuccess] = useState(false);
  const [dueCollectionDate, setDueCollectionDate] = useState<string>("");
  const [pendingDiscountConfirm, setPendingDiscountConfirm] = useState<number | null>(null);

  const customData: GiftOrderCustomData = order?.customData || {};
  const totalAmount = Number(customData.amount) || 0;
  const advanceAmount = order?.transactions?.find((t) => !t.deletedAt && t.description?.startsWith('Advance'))?.amount ?? Number(customData.advanceAmount) ?? 0;
  const collectedAmount = order?.transactions?.filter((t) => !t.deletedAt).reduce((sum, tx) => sum + tx.amount, 0) || advanceAmount;
  const discountAmountValue = Number(order?.discountAmount) || Number(customData.discountAmount) || 0;
  const dueAmount = Math.max(0, totalAmount - collectedAmount - discountAmountValue);
  const progressPercent = totalAmount > 0 ? Math.round((collectedAmount / totalAmount) * 100) : 0;

  const startEditing = () => {
    if (!order) return;
    setEditForm(buildEditForm(order));
    setIsEditing(true);
  };

  const executeStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    setIsUpdatingStatus(newStatus);
    try {
      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      mutate();
    } catch {
      // Status stays unchanged; the tracker simply re-renders with the old value.
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order || newStatus === order.status) return;
    if (order.status === "DELIVERED") {
      setShowRollbackWarning(newStatus);
      return;
    }
    if (newStatus === "DELIVERED" && dueAmount > 0) {
      setCollectionInput(dueAmount.toString());
      const isBackdated = order.createdAt && new Date(order.createdAt).getTime() < new Date().setHours(0,0,0,0);
      setDueCollectionDate(isBackdated ? new Date(order.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setShowDueCollection(true);
      return;
    }
    await executeStatusUpdate(newStatus);
  };

  const handleConfirmRollback = async () => {
    if (!showRollbackWarning) return;
    await executeStatusUpdate(showRollbackWarning);
    setShowRollbackWarning(null);
  };

  const cancelDueCollection = () => {
    setShowDueCollection(false);
    setCollectionError(null);
  };

  const handleConfirmCollection = async () => {
    if (!order) return;
    const collectVal = pendingDiscountConfirm !== null ? pendingDiscountConfirm : (Number(collectionInput) || 0);
    if (collectVal <= 0) {
      setCollectionError("Please enter a valid amount.");
      return;
    }

    if (collectVal < dueAmount && pendingDiscountConfirm === null) {
      setPendingDiscountConfirm(collectVal);
      return;
    }

    setCollectionError(null);
    setIsCollecting(true);
    try {
      const txRes = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: collectVal,
          type: "INCOME",
          date: new Date(dueCollectionDate).toISOString(),
          createdAt: new Date(dueCollectionDate).toISOString(),
          category: "GIFTS_AND_FRAMES",
          paymentMode: customData.paymentMode || "Cash",
          status: "SETTLED",
          description: `Due Collection for Order ${order.orderNumber || `#MDorder-${order.id.slice(-6).toUpperCase()}`} - ${order.clientName} (${order.product?.name || 'Unknown Product'})`,
          productOrderId: order.id,
        })
      });
      if (!txRes.ok) throw new Error("Failed to create due collection transaction");
      const remainingToDiscount = Math.max(0, dueAmount - collectVal);
      const updatedDiscount = (Number(order.discountAmount) || Number(customData.discountAmount) || 0) + remainingToDiscount;
      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DELIVERED",
          discountAmount: updatedDiscount
        }),
      });
      if (!res.ok) throw new Error("Failed to update order status");
      mutate();
      globalMutate('/api/gifts/orders');
      setCollectionSuccess(true);
      setTimeout(() => { setShowDueCollection(false); setCollectionSuccess(false); }, 2000);
    } catch (err) {
      setCollectionError(errorMessage(err, "Failed to process collection."));
    } finally {
      setIsCollecting(false);
      setPendingDiscountConfirm(null);
    }
  };

  const handleDiscountCollection = async () => {
    if (!order) return;
    setCollectionError(null);
    setIsCollecting(true);
    try {
      const updatedDiscount = (Number(order.discountAmount) || Number(customData.discountAmount) || 0) + dueAmount;
      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DELIVERED",
          discountAmount: updatedDiscount
        }),
      });
      if (!res.ok) throw new Error("Failed to update order status");
      mutate();
      globalMutate('/api/gifts/orders');
      setCollectionSuccess(true);
      setTimeout(() => { setShowDueCollection(false); setCollectionSuccess(false); }, 2000);
    } catch (err) {
      setCollectionError(errorMessage(err, "Failed to apply discount."));
    } finally {
      setIsCollecting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!order || !editForm) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: editForm.clientName,
          clientPhone: editForm.clientPhone,
          quantity: Number(editForm.quantity),
          dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
          customData: { ...customData, amount: Number(editForm.amount), advanceAmount: Number(editForm.advanceAmount), dueAmount: Number(editForm.dueAmount), paymentMode: editForm.paymentMode },
        }),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      await mutate();
      setIsEditing(false);
      showNotification("Order updated successfully", "success");
    } catch {
      showNotification("Failed to save changes", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    try {
      const res = await fetch(`/api/gifts/orders/${order.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete order");
      globalMutate('/api/gifts/orders');
      onDeleted?.();
    } catch {
      showNotification("Failed to delete order", "error");
    }
  };

  const generateInvoice = async () => {
    if (!order) return;
    setIsGeneratingInvoice(true);
    // Give the off-screen invoice template a tick to render before rasterising it.
    setTimeout(async () => {
      try {
        const element = document.getElementById('gift-invoice-template');
        if (!element) return;
        await exportElementToPdf(element, `Invoice_${order.orderNumber || order.id.slice(-6).toUpperCase()}.pdf`);
        showNotification("Invoice generated successfully!", "success");
      } catch {
        showNotification("Failed to generate invoice", "error");
      } finally {
        setIsGeneratingInvoice(false);
      }
    }, 100);
  };

  const exportOrder = async () => {
    if (!order) return;
    setIsExporting(true);
    try {
      const element = document.getElementById('order-details-content');
      if (!element) return;
      await exportElementToPdf(element, `Order_Export_${order.orderNumber || order.id.slice(-6).toUpperCase()}.pdf`);
      showNotification("Order exported successfully!", "success");
    } catch {
      showNotification("Failed to export order", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return {
    order,
    error,
    customData,
    totals: { totalAmount, advanceAmount, collectedAmount, discountAmountValue, dueAmount, progressPercent },
    notification,
    edit: { isEditing, editForm, setEditForm, isSaving, startEditing, cancelEditing: () => setIsEditing(false), handleSaveEdit },
    exporting: { isGeneratingInvoice, isExporting, generateInvoice, exportOrder },
    status: { isUpdatingStatus, handleStatusChange, showRollbackWarning, setShowRollbackWarning, handleConfirmRollback },
    collection: {
      showDueCollection, cancelDueCollection, isCollecting,
      collectionInput, setCollectionInput, collectionError, collectionSuccess,
      dueCollectionDate, setDueCollectionDate,
      pendingDiscountConfirm, setPendingDiscountConfirm,
      handleConfirmCollection, handleDiscountCollection,
    },
    handleDelete,
  };
}

export type GiftOrderDetails = ReturnType<typeof useGiftOrderDetails>;
