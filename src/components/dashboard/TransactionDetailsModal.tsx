"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import type { TransactionDetailResponse } from "@/types/transactions";
import TransactionSummarySection from "@/components/transactions/details/TransactionSummarySection";
import TransactionImpactSection from "@/components/transactions/details/TransactionImpactSection";

export default function TransactionDetailsModal() {
  const { isTransactionDetailsOpen, transactionDetailsId, closeTransactionDetails, openTransactionForm, openBookingDetails, openGiftOrderDetails } = useGlobalForm();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data, error, isLoading } = useSWR<TransactionDetailResponse>(
    isTransactionDetailsOpen && transactionDetailsId ? `/api/transactions/${transactionDetailsId}` : null,
    fetcher
  );

  const transaction = data?.transaction;
  const isIncome = transaction?.type === "INCOME";

  const close = () => {
    closeTransactionDetails();
  };

  const handleNavigateToBooking = (bookingId?: string) => {
    if (!bookingId) return;
    closeTransactionDetails();
    setTimeout(() => {
      openBookingDetails(bookingId);
    }, 150);
  };

  const handleNavigateToOrder = (orderId?: string) => {
    if (!orderId) return;
    closeTransactionDetails();
    setTimeout(() => {
      openGiftOrderDetails(orderId);
    }, 150);
  };

  const receipt = useMemo(() => {
    const url = data?.transaction.attachmentUrl;
    if (!url) return null;
    const cleanUrl = url.split("?")[0];
    const rawName = cleanUrl.split("/").pop() || "Transaction receipt";
    return {
      url,
      name: decodeURIComponent(rawName),
      isImage: url.startsWith("data:image/") || /\.(png|jpe?g|webp|gif)$/i.test(cleanUrl),
    };
  }, [data?.transaction.attachmentUrl]);

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions/${transactionDetailsId}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Delete failed");
      }
      await mutate(
        (key) => typeof key === "string" && (
          key.startsWith("/api/transactions") ||
          key.startsWith("/api/gifts/orders") ||
          key.startsWith("/api/bookings")
        ),
        undefined,
        { revalidate: true }
      );
      toast.success("Transaction deleted");
      setShowDeleteConfirm(false);
      close();
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Could not delete the transaction");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyId = async () => {
    if (transaction?.transactionId || transactionDetailsId) {
      await navigator.clipboard.writeText(transaction?.transactionId ?? transactionDetailsId as string);
    }
    toast.success("Transaction ID copied");
  };

  return (
    <>
      <Dialog open={isTransactionDetailsOpen && !showDeleteConfirm} onOpenChange={(open) => !open && close()}>
        <DialogContent
          showCloseButton={false}
          className="!fixed !left-0 !right-0 !bottom-0 !top-auto !flex !w-full !max-w-none !translate-x-0 !translate-y-0 flex-col md:!left-1/2 md:!right-auto md:!top-1/2 md:!bottom-auto md:!-translate-x-1/2 md:!-translate-y-1/2 md:!max-w-[960px] max-h-[96dvh] md:max-h-[90vh] gap-0 overflow-hidden !rounded-t-[28px] !rounded-b-none md:!rounded-[28px] border-0 bg-white p-0 shadow-2xl"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 sm:px-7">
            <div>
              <DialogTitle className="text-lg font-black text-slate-950 sm:text-xl">
                Transaction Details
              </DialogTitle>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400 sm:hidden">
                Review the complete record
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              aria-label="Close transaction details"
            >
              <i className="ph-bold ph-x text-xl" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="grid min-h-[520px] place-items-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <i className="ph ph-circle-notch animate-spin text-3xl text-orange-500" />
                  <span className="text-sm font-bold">Loading transaction…</span>
                </div>
              </div>
            ) : error || !transaction || !data ? (
              <div className="grid min-h-[420px] place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                    <i className="ph-bold ph-warning-circle text-3xl" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Transaction unavailable</h3>
                  <p className="mt-2 text-sm text-slate-500">{error?.message || "This record could not be found."}</p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-[0.9fr_1.1fr]">
                <TransactionSummarySection
                  transaction={transaction}
                  isIncome={isIncome}
                  onNavigateToBooking={handleNavigateToBooking}
                  onNavigateToOrder={handleNavigateToOrder}
                  onCopyId={copyId}
                />
                <TransactionImpactSection
                  transaction={transaction}
                  impact={data.impact}
                  receipt={receipt}
                  isIncome={isIncome}
                />
              </div>
            )}
          </div>

          {!isLoading && transaction && (
            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-white p-3 sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="order-2 col-span-2 h-11 rounded-xl bg-rose-50 px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-100 sm:order-1 sm:col-span-1"
              >
                <i className="ph-bold ph-trash mr-2" />
                Delete
              </button>
              <div className="order-1 col-span-2 grid grid-cols-2 gap-2 sm:order-2 sm:col-span-1 sm:flex">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    openTransactionForm(transaction.id);
                  }}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <i className="ph-bold ph-pencil-simple mr-2" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="h-11 rounded-xl bg-orange-500 px-7 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[400px] rounded-3xl border-0 bg-white p-7 text-center shadow-2xl"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <i className="ph-fill ph-trash text-3xl" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900">Delete transaction?</DialogTitle>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            This permanently removes the transaction and updates your totals.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="h-11 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="h-11 rounded-xl bg-rose-500 font-bold text-white hover:bg-rose-600 disabled:opacity-60"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
