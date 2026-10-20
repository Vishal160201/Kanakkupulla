"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CreditPayment, ProduceCollection, ProducePayment } from "@/types/inventory";
import { ConfirmDialog, EmptyState, ErrorState, InfoTile, InventoryDialog, ListSkeleton, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import { errorMessage, formatINR, roundMoney, sendJson, useCanManageInventory, useRevalidateInventory } from "../inventoryUtils";
import { useCreditCustomer, useProduceFarmer } from "../useInventoryData";
import BillRow from "../bills/BillRow";
import BillDetailDialog from "../bills/BillDetailDialog";
import BillFormDialog from "../bills/BillFormDialog";
import CollectionFormDialog from "../produce/CollectionFormDialog";
import { CollectionRow, FarmerPaymentRow, formatQuantity } from "../produce/produceShared";
import FarmerFormDialog from "./FarmerFormDialog";
import { CreditPaymentRow, PayFarmerForm, RecordRepaymentForm } from "./farmerForms";
import { cn } from "@/lib/utils";

type HistoryTab = "sales" | "repayments" | "collections" | "payments";

type VoidTarget =
  | { kind: "repayment"; item: CreditPayment }
  | { kind: "collection"; item: ProduceCollection }
  | { kind: "payment"; item: ProducePayment }
  | null;

const VOID_URL: Record<NonNullable<VoidTarget>["kind"], string> = {
  repayment: "/api/inventory/payments",
  collection: "/api/inventory/produce/collections",
  payment: "/api/inventory/produce/payments",
};

/**
 * One farmer: the fertilizer credit they owe the shop and the produce dues the shop owes them,
 * with both histories and every action (repayment, pay farmer, new sale, collect produce).
 * Mount only while open.
 */
export default function FarmerDetailDialog({ shopId, customerId, onClose }: { shopId: string; customerId: string; onClose: () => void }) {
  const credit = useCreditCustomer(customerId);
  const produce = useProduceFarmer(customerId);
  const revalidate = useRevalidateInventory();
  const canManage = useCanManageInventory();
  const [form, setForm] = useState<"repayment" | "pay" | null>(null);
  const [editing, setEditing] = useState(false);
  const [selling, setSelling] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [tab, setTab] = useState<HistoryTab>("sales");
  const [openBillId, setOpenBillId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<VoidTarget>(null);
  const [busy, setBusy] = useState(false);

  const customer = credit.data?.customer;
  const p = produce.data;
  const error = credit.error ?? produce.error;
  const fertilizerCredit = credit.data?.balance ?? 0;
  const produceDue = p?.produceDue ?? 0;
  // Positive: the farmer owes the shop; negative: the shop owes the farmer.
  const net = roundMoney(fertilizerCredit - produceDue);
  const bills = credit.data?.bills ?? [];
  const repayments = credit.data?.payments ?? [];

  const doVoid = async () => {
    if (!voidTarget) return;
    setBusy(true);
    try {
      await sendJson(`${VOID_URL[voidTarget.kind]}/${encodeURIComponent(voidTarget.item.id)}/void`, "POST");
      toast.success(
        { repayment: "Repayment voided", collection: "Collection voided", payment: "Payment voided" }[voidTarget.kind],
        {
          description: {
            repayment: "The amount is back on the farmer's fertilizer credit.",
            collection: "Its amount no longer counts as owed.",
            payment: "The amount is owed to the farmer again.",
          }[voidTarget.kind],
        }
      );
      setVoidTarget(null);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!customer) return;
    setBusy(true);
    try {
      await sendJson(`/api/inventory/customers/${encodeURIComponent(customer.id)}`, "PUT", { isArchived: true });
      toast.success(`${customer.name} archived`, { description: "Hidden from the farmer list and pickers. Past records stay." });
      revalidate();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setArchiving(false);
    } finally {
      setBusy(false);
    }
  };

  const contact = customer ? (
    customer.phone || customer.place ? (
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 font-bold text-sky-700 hover:underline">
            <i className="ph-bold ph-phone" aria-hidden="true" />
            {customer.phone}
          </a>
        )}
        {customer.phone && customer.place && <span>&middot;</span>}
        {customer.place && <span className="inline-flex items-center gap-1"><i className="ph-bold ph-map-pin" aria-hidden="true" />{customer.place}</span>}
      </span>
    ) : (
      "No contact details"
    )
  ) : undefined;

  const tabs: { id: HistoryTab; label: string; count: number }[] = [
    { id: "sales", label: "Fertilizer sales", count: bills.length },
    { id: "repayments", label: "Repayments", count: repayments.length },
    { id: "collections", label: "Produce collected", count: p?.collections.length ?? 0 },
    { id: "payments", label: "Produce payments", count: p?.payments.length ?? 0 },
  ];

  return (
    <InventoryDialog
      open
      onClose={onClose}
      size="lg"
      eyebrow="Farmer"
      title={customer?.name ?? "Loading…"}
      subtitle={contact}
      footer={
        customer && canManage ? (
          <>
            <div className="flex gap-2 w-full sm:w-auto sm:mr-auto">
              <button type="button" onClick={() => setEditing(true)} className={cn(secondaryButtonClass, "flex-1 sm:flex-none")}>
                <i className="ph-bold ph-pencil-simple" /> Edit
              </button>
              <button type="button" onClick={() => setArchiving(true)} className={cn(secondaryButtonClass, "flex-1 sm:flex-none")}>
                <i className="ph-bold ph-archive" /> Archive
              </button>
            </div>
            <button type="button" onClick={() => setSelling(true)} className={cn(secondaryButtonClass, "flex-1 sm:flex-none")}>
              <i className="ph-bold ph-shopping-cart" /> New sale
            </button>
            <button type="button" onClick={() => setCollecting(true)} className={cn(secondaryButtonClass, "flex-1 sm:flex-none")}>
              <i className="ph-bold ph-basket" /> Collect produce
            </button>
          </>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState
          message={errorMessage(error)}
          onRetry={() => {
            void credit.mutate();
            void produce.mutate();
          }}
        />
      ) : !customer || !p ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <InfoTile label="Fertilizer credit" value={formatINR(fertilizerCredit)} tone={fertilizerCredit > 0 ? "red" : undefined} />
            <InfoTile label="Produce due" value={formatINR(produceDue)} tone={produceDue > 0 ? "red" : undefined} />
            <div className="col-span-2 sm:col-span-1">
              <InfoTile
                label={net > 0 ? "Net: owes you" : net < 0 ? "Net: you owe" : "Net"}
                value={net === 0 ? "Settled" : formatINR(Math.abs(net))}
                tone={net === 0 ? "green" : undefined}
              />
            </div>
          </div>

          {canManage && (fertilizerCredit > 0 || produceDue > 0) && !form && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {fertilizerCredit > 0 && (
                <button type="button" onClick={() => setForm("repayment")} className={cn(primaryButtonClass, "w-full bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}>
                  <i className="ph-bold ph-hand-coins" /> Record repayment
                </button>
              )}
              {produceDue > 0 && (
                <button type="button" onClick={() => setForm("pay")} className={cn(primaryButtonClass, "w-full")}>
                  <i className="ph-bold ph-hand-arrow-up" /> Pay farmer
                </button>
              )}
            </div>
          )}

          {form === "repayment" && canManage && fertilizerCredit > 0 && (
            <RecordRepaymentForm customerId={customer.id} balance={fertilizerCredit} onDone={() => setForm(null)} />
          )}
          {form === "pay" && canManage && produceDue > 0 && (
            <PayFarmerForm
              customerId={customer.id}
              name={customer.name}
              produceDue={produceDue}
              fertilizerCredit={p.fertilizerCredit}
              maxDeduction={p.maxCreditDeduction}
              onDone={() => setForm(null)}
            />
          )}

          {p.maxCreditDeduction > 0 && form !== "pay" && (
            <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-xs sm:text-sm text-sky-800">
              <i className="ph-bold ph-info text-base mt-0.5" aria-hidden="true" />
              <span>
                Produce due {formatINR(produceDue)} − fertilizer credit {formatINR(p.maxCreditDeduction)} ={" "}
                <span className="font-extrabold">pay {formatINR(roundMoney(produceDue - p.maxCreditDeduction))}</span> to settle both.
              </span>
            </div>
          )}

          {p.crops.length > 0 && (
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-3.5 py-2 bg-slate-50 text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">Produce by crop</div>
              <ul className="divide-y divide-slate-100">
                {p.crops.map((c) => (
                  <li key={c.itemId} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <span className="flex items-center gap-2 min-w-0">
                      <i className="ph-bold ph-plant text-emerald-600 shrink-0" aria-hidden="true" />
                      <span className="text-sm font-bold text-slate-900 truncate">{c.name}</span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0 text-sm">
                      <span className="font-semibold text-slate-500 whitespace-nowrap">{formatQuantity(c.quantity, c.unit)}</span>
                      <span className="font-extrabold text-slate-900 whitespace-nowrap">{formatINR(c.amount)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div role="tablist" aria-label="Farmer history" className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 mb-3">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "min-w-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all truncate",
                    tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            {tab === "sales" &&
              (bills.length === 0 ? (
                <EmptyState icon="receipt" title="No fertilizer sales yet" message="Sales billed to this farmer will appear here." className="py-8" />
              ) : (
                <ul className="space-y-1">
                  {bills.map((bill) => (
                    <li key={bill.id}><BillRow bill={bill} onOpen={setOpenBillId} /></li>
                  ))}
                </ul>
              ))}
            {tab === "repayments" &&
              (repayments.length === 0 ? (
                <EmptyState icon="hand-coins" title="No repayments yet" message="Money the farmer pays back against fertilizer credit will appear here." className="py-8" />
              ) : (
                <ul className="rounded-2xl border border-slate-100 divide-y divide-slate-100">
                  {repayments.map((r) => (
                    <CreditPaymentRow key={r.id} payment={r} onVoid={canManage ? (item) => setVoidTarget({ kind: "repayment", item }) : undefined} />
                  ))}
                </ul>
              ))}
            {tab === "collections" &&
              (p.collections.length === 0 ? (
                <EmptyState icon="basket" title="No produce collected yet" message="Crops you buy from this farmer will appear here." className="py-8" />
              ) : (
                <ul className="space-y-1">
                  {p.collections.map((c) => (
                    <li key={c.id}>
                      <CollectionRow collection={c} showFarmer={false} onVoid={canManage ? () => setVoidTarget({ kind: "collection", item: c }) : undefined} />
                    </li>
                  ))}
                </ul>
              ))}
            {tab === "payments" &&
              (p.payments.length === 0 ? (
                <EmptyState icon="hand-arrow-up" title="No produce payments yet" message="What you pay this farmer for produce will appear here." className="py-8" />
              ) : (
                <ul className="space-y-1">
                  {p.payments.map((pay) => (
                    <li key={pay.id}>
                      <FarmerPaymentRow payment={pay} onVoid={canManage ? () => setVoidTarget({ kind: "payment", item: pay }) : undefined} />
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        </div>
      )}

      {editing && customer && <FarmerFormDialog shopId={shopId} customer={customer} onClose={() => setEditing(false)} />}
      {selling && customer && <BillFormDialog shopId={shopId} kind="SALE" defaultCustomerId={customer.id} onClose={() => setSelling(false)} />}
      {collecting && customer && <CollectionFormDialog shopId={shopId} defaultCustomerId={customer.id} onClose={() => setCollecting(false)} />}
      {openBillId && <BillDetailDialog billId={openBillId} onClose={() => setOpenBillId(null)} />}
      <ConfirmDialog
        open={archiving}
        title={`Archive ${customer?.name ?? "farmer"}?`}
        message="They're hidden from the farmer list and pickers. Past bills and produce stay. Settle any credit or produce dues first."
        confirmLabel="Archive"
        busyLabel="Archiving…"
        icon="archive"
        tone="neutral"
        busy={busy}
        onConfirm={() => void archive()}
        onCancel={() => setArchiving(false)}
      />
      <ConfirmDialog
        open={!!voidTarget}
        title={voidTarget?.kind === "collection" ? "Void this collection?" : voidTarget?.kind === "payment" ? "Void this produce payment?" : "Void this repayment?"}
        message={
          voidTarget?.kind === "repayment" ? (
            <>
              {formatINR(voidTarget.item.amount)} goes back on {customer?.name ?? "the farmer"}&apos;s fertilizer credit and its Credit Collection entry is removed from Daily Kanakku.
            </>
          ) : voidTarget?.kind === "collection" ? (
            <>
              {formatQuantity(voidTarget.item.quantity, voidTarget.item.item.unit)} of {voidTarget.item.item.name} ({formatINR(voidTarget.item.amount)}) comes off what you owe{" "}
              {customer?.name ?? "the farmer"} and out of stock.
            </>
          ) : voidTarget?.kind === "payment" ? (
            <>
              {formatINR(voidTarget.item.amount)} is owed to {customer?.name ?? "the farmer"} again
              {voidTarget.item.cashAmount > 0 && <>, its Produce Payment entry is removed from Daily Kanakku</>}
              {voidTarget.item.creditDeducted > 0 && <> and {formatINR(voidTarget.item.creditDeducted)} goes back on their fertilizer credit</>}.
            </>
          ) : null
        }
        confirmLabel="Void"
        busyLabel="Voiding…"
        icon="prohibit"
        busy={busy}
        onConfirm={() => void doVoid()}
        onCancel={() => setVoidTarget(null)}
      />
    </InventoryDialog>
  );
}
