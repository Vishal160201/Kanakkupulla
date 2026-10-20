"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog, ErrorState, InfoTile, InventoryDialog, ListSkeleton, Pill, secondaryButtonClass } from "../InventoryUI";
import { errorMessage, formatDate, formatINR, formatQty, packLabel, quantityUnit, sendJson, useCanManageInventory, useRevalidateInventory } from "../inventoryUtils";
import { useInventoryBill } from "../useInventoryData";

interface BillDetailDialogProps {
  billId: string;
  onClose: () => void;
}

/** A sale / purchase bill with its lines, and the "Void bill" action. Mount only while open. */
export default function BillDetailDialog({ billId, onClose }: BillDetailDialogProps) {
  const { data, error, isLoading, mutate } = useInventoryBill(billId);
  const revalidate = useRevalidateInventory();
  const [confirmVoid, setConfirmVoid] = useState(false);
  const canManage = useCanManageInventory();
  const [voiding, setVoiding] = useState(false);

  const bill = data?.bill;
  const isSale = bill?.kind === "SALE";

  const voidBill = async () => {
    if (!bill) return;
    setVoiding(true);
    try {
      await sendJson(`/api/inventory/bills/${encodeURIComponent(bill.id)}/void`, "POST");
      toast.success(`Bill ${bill.billNumber} voided`, { description: "Stock and the Daily Kanakku entry were reversed." });
      setConfirmVoid(false);
      await mutate();
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setVoiding(false);
    }
  };

  return (
    <InventoryDialog
      open
      onClose={onClose}
      busy={voiding}
      size="lg"
      eyebrow={bill ? (isSale ? "Sale bill" : "Purchase bill") : "Bill"}
      title={bill ? bill.billNumber : "Loading bill…"}
      subtitle={bill ? formatDate(bill.date) : undefined}
      footer={
        bill && !bill.voidedAt && canManage ? (
          <button type="button" onClick={() => setConfirmVoid(true)} className={`${secondaryButtonClass} text-rose-600 hover:bg-rose-50 hover:border-rose-200`}>
            <i className="ph-bold ph-prohibit" /> Void bill
          </button>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
      ) : isLoading || !bill ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="space-y-5">
          {bill.voidedAt && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <i className="ph-bold ph-prohibit text-lg mt-0.5" aria-hidden="true" />
              <div>
                <div className="font-bold">Voided on {formatDate(bill.voidedAt)}</div>
                <div className="text-xs font-medium text-rose-600/80">Stock and the Daily Kanakku entry for this bill were reversed.</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <InfoTile label={isSale ? "Customer" : "Supplier"} value={isSale ? bill.customer?.name ?? "Walk-in" : bill.supplierName || "-"} />
            <InfoTile label="Payment" value={bill.paymentMode || "-"} />
            <InfoTile label="Total" value={formatINR(bill.totalAmount)} />
            {isSale ? (
              <InfoTile label={bill.dueAmount > 0 ? "Credit" : "Paid"} value={bill.dueAmount > 0 ? formatINR(bill.dueAmount) : formatINR(bill.paidAmount)} tone={bill.dueAmount > 0 ? "red" : "green"} />
            ) : (
              <InfoTile label="Items" value={bill.lines.length} />
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_90px_110px_120px] gap-3 bg-slate-50 px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">
              <span>Product</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Amount</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {bill.lines.map((line) => (
                <li key={line.id} className="px-4 py-3 sm:grid sm:grid-cols-[1fr_90px_110px_120px] sm:gap-3 sm:items-center">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{line.product.name}</div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate">{packLabel(line.product)}</div>
                  </div>
                  <div className="flex items-center justify-between sm:contents mt-1 sm:mt-0">
                    <span className="text-xs sm:text-sm font-semibold text-slate-500 sm:text-right">
                      {formatQty(line.quantity)} {quantityUnit(line.product, line.quantity)}
                      <span className="sm:hidden"> × {formatINR(line.unitPrice)}</span>
                    </span>
                    <span className="hidden sm:block text-sm font-semibold text-slate-500 text-right">{formatINR(line.unitPrice)}</span>
                    <span className="text-sm font-extrabold text-slate-900 text-right">{formatINR(line.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between font-extrabold text-slate-900">
                <span>Total</span>
                <span>{formatINR(bill.totalAmount)}</span>
              </div>
              {isSale && (
                <>
                  <div className="flex justify-between font-semibold text-slate-500">
                    <span>Paid now</span>
                    <span>{formatINR(bill.paidAmount)}</span>
                  </div>
                  {bill.dueAmount > 0 && (
                    <div className="flex justify-between font-bold text-rose-600">
                      <span>Added to credit</span>
                      <span>{formatINR(bill.dueAmount)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {bill.notes && (
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400 mb-1">Notes</div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{bill.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {bill.voidedAt ? <Pill tone="red" icon="prohibit">Voided</Pill> : <Pill tone="green" icon="check-circle">Active</Pill>}
            <Pill tone="slate" icon="notebook">Posted to Daily Kanakku</Pill>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmVoid}
        title={`Void ${bill?.billNumber ?? "bill"}?`}
        message={
          isSale
            ? "The sold quantity goes back into stock, any credit from this bill is removed from the customer's balance and its Daily Kanakku entry is deleted."
            : "The purchased quantity is taken out of stock and its Daily Kanakku entry is deleted."
        }
        confirmLabel="Void bill"
        busyLabel="Voiding…"
        icon="prohibit"
        busy={voiding}
        onConfirm={() => void voidBill()}
        onCancel={() => setConfirmVoid(false)}
      />
    </InventoryDialog>
  );
}
