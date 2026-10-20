"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Download, Loader2, Receipt } from "lucide-react";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useGiftOrderDetails } from "./order-details/useGiftOrderDetails";
import { STATUS_OPTIONS } from "./order-details/orderDetailsConstants";
import OrderStatusTracker from "./order-details/OrderStatusTracker";
import { DueCollectionPanel, RollbackWarning } from "./order-details/OrderInlinePanels";
import OrderInfoCard from "./order-details/OrderInfoCard";
import FinancialsCard from "./order-details/FinancialsCard";
import AttachmentsCard, { hasAttachments } from "./order-details/AttachmentsCard";
import GiftInvoiceTemplate from "./order-details/GiftInvoiceTemplate";
import DiscountConfirmDialog from "./order-details/DiscountConfirmDialog";
import { useAccess } from "@/hooks/useAccess";

/** Panel contents for one order. Keyed by order id so transient UI state resets per order. */
function OrderDetailsBody({ orderId }: { orderId: string | null }) {
  const { closeGiftOrderDetails, openTransactionDetails } = useGlobalForm();
  const details = useGiftOrderDetails(orderId, closeGiftOrderDetails);
  const { order, error, customData, totals, edit, exporting, status, collection } = details;
  // Status changes, edits and payment collection need Gifts Manage.
  const canManage = useAccess().can("gifts", "MANAGE");

  if (!order && !error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 min-h-[400px]">
        <Loader2 className="h-10 w-10 text-orange-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 min-h-[400px]">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Error Loading Order</h3>
        <p className="text-slate-500">Could not fetch order details. Please try again.</p>
        <button type="button" onClick={() => closeGiftOrderDetails()} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">Close</button>
      </div>
    );
  }

  const currentStatusIndex = STATUS_OPTIONS.findIndex(s => s.value === order.status);
  const editForm = edit.isEditing && canManage ? edit.editForm : null;
  const setEditForm = edit.setEditForm;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col w-full mx-auto h-full overflow-hidden"
    >
      {/* Minimal Header */}
      <header className="shrink-0 sticky top-0 z-40 bg-[#F5F6F8] px-4 md:px-8 py-5 md:py-6 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <button aria-label="Close order details"
            type="button"
            onClick={() => closeGiftOrderDetails()}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all hover:-translate-x-0.5 hover:shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">{order.orderNumber || `Order #${order.id.slice(-6).toUpperCase()}`}</h1>
            <p className="text-xs text-slate-500 font-medium">Viewing order details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exporting.exportOrder}
            disabled={exporting.isExporting}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {exporting.isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export PDF
          </button>
          <button
            type="button"
            onClick={exporting.generateInvoice}
            disabled={exporting.isGeneratingInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B1E40] text-white hover:bg-[#152a55] rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {exporting.isGeneratingInvoice ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Receipt className="w-4 h-4" />} Invoice
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="order-details-content" className="flex-1 overflow-y-auto px-4 md:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <OrderStatusTracker
            currentStatusIndex={currentStatusIndex}
            isUpdatingStatus={status.isUpdatingStatus}
            onStatusChange={canManage ? status.handleStatusChange : undefined}
          />

          {/* Inline Panels */}
          {canManage && status.showRollbackWarning && (
            <RollbackWarning
              isUpdatingStatus={status.isUpdatingStatus}
              onCancel={() => status.setShowRollbackWarning(null)}
              onConfirm={status.handleConfirmRollback}
            />
          )}

          {canManage && collection.showDueCollection && (
            <DueCollectionPanel dueAmount={totals.dueAmount} collection={collection} />
          )}

          {/* Client & Product Info */}
          <OrderInfoCard order={order} customData={customData} editForm={editForm} setEditForm={setEditForm} />

          {/* Financial Summary */}
          <FinancialsCard
            order={order}
            customData={customData}
            totals={totals}
            editForm={editForm}
            setEditForm={setEditForm}
            onOpenTransaction={openTransactionDetails}
          />

          {/* Custom Attachments Section */}
          {hasAttachments(customData) && <AttachmentsCard customData={customData} />}
        </div>
      </main>

      {/* Off-screen Invoice Template */}
      <GiftInvoiceTemplate order={order} customData={customData} />

      {/* Discount Confirmation Dialog */}
      <DiscountConfirmDialog
        pendingAmount={collection.pendingDiscountConfirm}
        dueAmount={totals.dueAmount}
        isCollecting={collection.isCollecting}
        onCancel={() => collection.setPendingDiscountConfirm(null)}
        onConfirm={collection.handleConfirmCollection}
      />
    </motion.div>
  );
}

export default function OrderDetailsPanel() {
  const { isGiftOrderDetailsOpen, giftOrderDetailsId, closeGiftOrderDetails } = useGlobalForm();

  return (
    <Dialog open={isGiftOrderDetailsOpen} onOpenChange={(open) => {
      if (!open) closeGiftOrderDetails();
    }}>
      <DialogContent className="max-w-[1200px] sm:max-w-[1200px] w-[95vw] p-0 bg-[#F5F6F8] overflow-hidden border-0 shadow-none h-[90vh] md:h-[95vh] flex flex-col rounded-[2rem]">
        <OrderDetailsBody key={giftOrderDetailsId ?? "none"} orderId={giftOrderDetailsId} />
      </DialogContent>
    </Dialog>
  );
}
