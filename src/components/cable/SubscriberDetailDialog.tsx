"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CablePayment, CableRenewal, CableShopInfo } from "@/types/cable";
import { ConfirmDialog, ErrorState, InventoryDialog, ListSkeleton, MoneyInput, Pill, primaryButtonClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage, formatDate, formatINR, parseDecimal, roundMoney, sanitizeDecimal, sendJson } from "@/components/inventory/inventoryUtils";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { expiryLabel } from "./cableShared";
import { useCanManageCable, useRevalidateCable, useSubscriber } from "./useCableData";
import CollectPaymentForm from "./CollectPaymentForm";
import EditSubscriberForm from "./EditSubscriberForm";
import ComplaintForm, { ComplaintRow } from "./ComplaintForm";
import WhatsAppDialog from "./WhatsAppDialog";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800 break-words">{value || "—"}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400 mb-2">{children}</h3>;
}

/** A renewal and what it's charged; managers can change the amount (0 waives it). */
function RenewalRow({ renewal, canManage }: { renewal: CableRenewal; canManage: boolean }) {
  const revalidate = useRevalidateCable();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(renewal.amount === null ? "" : String(renewal.amount));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const amount = parseDecimal(value);
    if (!Number.isFinite(amount) || amount < 0) return toast.error("Enter 0 or more.");
    setSaving(true);
    try {
      await sendJson(`/api/cable/renewals/${encodeURIComponent(renewal.id)}`, "PATCH", { amount: roundMoney(amount) });
      setEditing(false);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
      <div className="min-w-0">
        <div className="font-bold text-slate-800 truncate">
          {renewal.kind === "RENEWAL" ? (renewal.plan ?? "Plan not shown") : renewal.kind === "BILL" ? "Cable TV bill" : "Opening balance from TCCL"}
        </div>
        <div className="text-[11px] font-semibold text-slate-400">
          {renewal.kind === "RENEWAL" ? (
            <>
              Renewed {formatDate(renewal.renewedAt ?? renewal.createdAt)} · {renewal.previousExpiry ? `${formatDate(renewal.previousExpiry)} → ` : ""}
              {formatDate(renewal.expiresAt)}
            </>
          ) : (
            <>Added {formatDate(renewal.renewedAt ?? renewal.createdAt)}{renewal.amount !== null && renewal.amount < 0 && " · paid in advance"}</>
          )}
        </div>
      </div>
      {editing ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <MoneyInput value={value} onChange={(v) => setValue(sanitizeDecimal(v, 2))} className="w-28" ariaLabel="Renewal amount" />
          <button type="button" onClick={save} disabled={saving} aria-label="Save amount" className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50">
            <i className={saving ? "ph ph-circle-notch animate-spin" : "ph-bold ph-check"} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center">
            <i className="ph-bold ph-x" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          {renewal.amount === null ? <Pill tone="amber">No price</Pill> : <span className="font-extrabold text-slate-800">{formatINR(renewal.amount)}</span>}
          {canManage && (
            <Tooltip content="Change amount">
              <button type="button" onClick={() => setEditing(true)} aria-label="Change amount" className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center">
                <i className="ph-bold ph-pencil-simple" aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </div>
      )}
    </li>
  );
}

function PaymentRow({ payment, onVoid }: { payment: CablePayment; onVoid?: () => void }) {
  const voided = !!payment.voidedAt;
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <div className={cn("text-sm font-bold", voided ? "text-slate-400 line-through" : "text-slate-900")}>{formatINR(payment.amount)}</div>
        <div className="text-[11px] font-semibold text-slate-400 truncate">
          {formatDate(payment.date)} · {payment.paymentMode}
          {payment.collectedBy && <> · by {payment.collectedBy}</>}
          {payment.notes && <> · {payment.notes}</>}
        </div>
      </div>
      {voided ? (
        <Pill tone="slate" icon="prohibit">Voided</Pill>
      ) : (
        onVoid && (
          <Tooltip content="Void payment">
            <button type="button" aria-label={`Void payment of ${formatINR(payment.amount)}`} onClick={onVoid} className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600">
              <i className="ph-bold ph-prohibit" aria-hidden="true" />
            </button>
          </Tooltip>
        )
      )}
    </li>
  );
}

/** A subscriber's portal details, what they owe, and everything done for them. */
export default function SubscriberDetailDialog({ subscriberId, shop, onClose }: { subscriberId: string; shop: CableShopInfo; onClose: () => void }) {
  const { data, error, mutate } = useSubscriber(subscriberId);
  const revalidate = useRevalidateCable();
  const canManage = useCanManageCable();
  const [panel, setPanel] = useState<"collect" | "complaint" | "edit" | null>(null);
  const [chat, setChat] = useState<{ paid?: number } | null>(null);
  const [voiding, setVoiding] = useState<CablePayment | null>(null);
  const [busy, setBusy] = useState(false);
  const s = data?.subscriber;
  const isCable = s?.provider === "TCCL";

  const doVoid = async () => {
    if (!voiding) return;
    setBusy(true);
    try {
      await sendJson(`/api/cable/payments/${encodeURIComponent(voiding.id)}/void`, "POST");
      toast.success("Payment voided", { description: "Its Daily Kanakku entry was removed." });
      setVoiding(null);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <InventoryDialog open onClose={onClose} eyebrow={isCable ? "TCCL cable TV" : "TIC Fiber internet"} title={s ? (s.tamilName ? `${s.name} (${s.tamilName})` : s.name) : "Subscriber"} subtitle={s ? [s.externalId, s.area].filter(Boolean).join(" · ") : undefined} size="lg">
        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
        ) : !s ? (
          <ListSkeleton rows={3} />
        ) : (
          <div className="space-y-6">
            {s.goneAt && (
              <p className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
                <i className="ph-bold ph-info mr-1.5" aria-hidden="true" />
                Not in the TIC Fiber report since {formatDate(s.goneAt)}.
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">{s.due < 0 ? "Paid in advance" : "Due"}</div>
                <div className={cn("text-2xl font-black", s.due > 0 ? "text-rose-600" : s.due < 0 ? "text-emerald-700" : "text-slate-900")}>{formatINR(Math.abs(s.due))}</div>
              </div>
              <div className={cn("grid sm:flex gap-2", canManage ? "grid-cols-4" : "grid-cols-1")}>
                <button type="button" onClick={() => setChat({})} className={cn(secondaryButtonClass, "px-3")}>
                  <i className="ph-fill ph-whatsapp-logo text-emerald-600" aria-hidden="true" /> <span className="hidden sm:inline">WhatsApp</span>
                </button>
                {canManage && (
                  <>
                    <button type="button" onClick={() => setPanel(panel === "edit" ? null : "edit")} aria-label="Edit subscriber" className={cn(secondaryButtonClass, "px-3")}>
                      <i className="ph-bold ph-pencil-simple" aria-hidden="true" /> <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button type="button" onClick={() => setPanel(panel === "complaint" ? null : "complaint")} className={cn(secondaryButtonClass, "px-3")}>
                      <i className="ph-bold ph-wrench" aria-hidden="true" /> <span className="hidden sm:inline">Complaint</span>
                    </button>
                    <button type="button" onClick={() => setPanel(panel === "collect" ? null : "collect")} className={cn(primaryButtonClass, "px-3 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}>
                      <i className="ph-bold ph-hand-coins" aria-hidden="true" /> Collect
                    </button>
                  </>
                )}
              </div>
            </div>

            {panel === "collect" && (
              <CollectPaymentForm
                subscriberId={s.id}
                due={s.due}
                isCable={isCable}
                onDone={(paid) => {
                  setPanel(null);
                  if (paid) setChat({ paid });
                }}
              />
            )}
            {panel === "complaint" && <ComplaintForm subscriberId={s.id} onDone={() => setPanel(null)} />}
            {panel === "edit" && <EditSubscriberForm key={`${s.id}-${s.name}-${s.phone}`} s={s} onDone={() => setPanel(null)} />}

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label={isCable ? "Set-top box" : "Status"} value={<Pill tone={s.status === "Active" ? "green" : "slate"}>{s.status}</Pill>} />
              {isCable ? (
                <>
                  <Field label="VC number" value={s.vcNumber} />
                  <Field label="Old VC number" value={s.oldVcNumber} />
                  <Field label="STB serial" value={s.macId} />
                </>
              ) : (
                <>
                  <Field label="Plan" value={s.plan} />
                  <Field label="Expiry" value={s.expiresAt && `${formatDate(s.expiresAt)} · ${expiryLabel(s.expiresAt)}`} />
                </>
              )}
              <Field label="Phone" value={s.phone && <a className="text-orange-600 hover:underline" href={`tel:${s.phone}`}>{s.phone}</a>} />
              <Field label="Alternative phone" value={s.altPhone} />
              <Field label="Area" value={s.area} />
              {!isCable && <Field label="Last renewal" value={s.renewedAt && formatDate(s.renewedAt)} />}
              <Field label="Activated" value={s.activatedAt && formatDate(s.activatedAt)} />
              <Field label="Customer since" value={s.createdOn && formatDate(s.createdOn)} />
              {!isCable && <Field label="MAC ID" value={s.macId} />}
              <div className="col-span-2">
                <Field label="Address" value={s.address} />
              </div>
            </dl>

            {s.complaints.length > 0 && (
              <section>
                <SectionTitle>Complaints</SectionTitle>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {s.complaints.map((c) => (
                    <ComplaintRow key={c.id} complaint={c} canManage={canManage} />
                  ))}
                </ul>
              </section>
            )}

            <section>
              <SectionTitle>{isCable ? "Bills" : "Renewals"}</SectionTitle>
              {s.renewals.length === 0 ? (
                <p className="text-sm font-medium text-slate-400">
                  {isCable ? "None yet. A bill is added when TCCL's billed total goes up." : "None yet. A renewal is added when a sync sees the expiry date move forward."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {s.renewals.map((r) => (
                    <RenewalRow key={`${r.id}-${r.amount}`} renewal={r} canManage={canManage} />
                  ))}
                </ul>
              )}
            </section>

            <section>
              <SectionTitle>Payments</SectionTitle>
              {s.payments.length === 0 ? (
                <p className="text-sm font-medium text-slate-400">No payments collected yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {s.payments.map((p) => (
                    <PaymentRow key={p.id} payment={p} onVoid={canManage ? () => setVoiding(p) : undefined} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </InventoryDialog>

      {chat && s && <WhatsAppDialog key={`${s.id}-${chat.paid ?? ""}`} target={{ id: s.id, provider: s.provider, vcNumber: s.vcNumber, name: s.name, phone: s.phone, plan: s.plan, expiresAt: s.expiresAt, due: Math.max(0, s.due - (chat.paid ?? 0)), paid: chat.paid }} shop={shop} onClose={() => setChat(null)} />}
      <ConfirmDialog
        open={!!voiding}
        title="Void this payment?"
        message={voiding && <>{formatINR(voiding.amount)} is owed by {s?.name ?? "the subscriber"} again and its {isCable ? "Cable Collection" : "Internet Renewal"} entry is removed from Daily Kanakku.</>}
        confirmLabel="Void"
        busyLabel="Voiding…"
        icon="prohibit"
        busy={busy}
        onConfirm={() => void doVoid()}
        onCancel={() => setVoiding(null)}
      />
    </>
  );
}
