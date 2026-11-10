"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { formatINR, formatMoneyDate, normaliseMoney } from "@/lib/money/format";
import type { commitmentsView } from "@/lib/money/server/overview";
import type { CommitmentDTO, TxnDTO } from "@/lib/money/server/rows";
import { accountOption, useMoneyAccounts } from "./hooks";
import { COMMITMENT_TYPES, ConfirmDialog, EmptyState, FieldError, FormDialog, MoneyInput, Panel, Segmented, inputClass, labelClass, primaryButton, secondaryButton, send } from "./ui";

export type CommitmentsData = Awaited<ReturnType<typeof commitmentsView>>;
type Entry = CommitmentDTO["schedule"][number];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(2, 4)}`;

export default function CommitmentsPage({ initial }: { initial: CommitmentsData }) {
  const { data = initial, mutate } = useSWR<CommitmentsData>("/api/money/commitments", fetcher, { fallbackData: initial });
  const [editing, setEditing] = useState<CommitmentDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<CommitmentDTO | null>(null);
  const [cell, setCell] = useState<{ commitment: CommitmentDTO; month: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { bal, grid, commitments } = data;
  const byId = new Map(commitments.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/money/import" className={secondaryButton}><i aria-hidden="true" className="ph-bold ph-microsoft-excel-logo" /> Import your sheet</Link>
        <a href="/api/money/export?what=commitments" className={secondaryButton}><i aria-hidden="true" className="ph-bold ph-download-simple" /> Export to Excel</a>
        <button type="button" onClick={() => setEditing("new")} className={primaryButton}><i aria-hidden="true" className="ph-bold ph-plus" /> Add commitment</button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Panel className="xl:col-span-3" title="How Bal for EMI adds up" subtitle="Each payment is counted once." icon="ph-calculator">
          <ol className="space-y-2">
            {bal.lines.map((line) => (
              <li key={line.key} className="rounded-2xl border border-slate-100">
                <button type="button" onClick={() => setOpen(open === line.key ? null : line.key)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm font-extrabold ${line.sign === "+" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{line.sign === "+" ? "+" : "−"}</span>
                  <span className="flex-1 text-sm font-bold text-slate-700">{line.label}</span>
                  <span className="text-sm font-extrabold tabular-nums text-slate-900">{formatINR(line.amount)}</span>
                  <i aria-hidden="true" className={`ph-bold ph-caret-down text-slate-400 transition-transform ${open === line.key ? "rotate-180" : ""}`} />
                </button>
                {open === line.key && (
                  <ul className="border-t border-slate-50 px-4 py-2 space-y-1.5">
                    {line.items.length === 0 ? (
                      <li className="text-xs font-semibold text-slate-400">Nothing here.</li>
                    ) : (
                      line.items.map((item, i) => (
                        <li key={`${item.id ?? i}`} className="flex items-start justify-between gap-3 text-xs">
                          <span className="min-w-0">
                            <span className="font-bold text-slate-700">{item.name}</span>
                            {item.detail && <span className="block font-semibold text-slate-400">{item.detail}</span>}
                          </span>
                          <span className="font-extrabold tabular-nums text-slate-900">{formatINR(item.amount)}</span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ol>
          <div className={`mt-3 flex items-center justify-between rounded-2xl px-4 py-3 ${bal.balForEmi.startsWith("-") ? "bg-rose-500" : "bg-emerald-500"} text-white`}>
            <span className="text-sm font-extrabold">= Bal for EMI</span>
            <span className="text-xl font-extrabold tabular-nums">{formatINR(bal.balForEmi)}</span>
          </div>
        </Panel>

        <Panel className="xl:col-span-2" title="Cash position" subtitle="Bal for EMI, minus money you've paid for others that hasn't come back yet." icon="ph-wallet">
          <p className={`text-3xl font-extrabold tabular-nums ${bal.cashPosition.startsWith("-") ? "text-rose-600" : "text-slate-900"}`}>{formatINR(bal.cashPosition)}</p>
          {bal.pairs.length === 0 ? (
            <p className="mt-2 text-sm font-semibold text-slate-500">Link a card EMI to the person who pays it back to see this split.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {bal.pairs.map((p) => (
                <li key={p.emiId} className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                  <p className="text-sm font-extrabold text-slate-800">{p.emiName} ↔ {p.receivableName}</p>
                  <p className="mt-1">EMI left to pay {formatINR(p.emiRemaining)} · still to collect {formatINR(p.receivableRemaining)}</p>
                  <p className="mt-0.5">
                    {Number(p.fronted) > 0
                      ? `${formatINR(p.fronted)} paid for ${p.receivableName}, not yet received.`
                      : Number(p.myOutstanding) > 0
                        ? `${formatINR(p.myOutstanding)} collected but not yet paid to the card.`
                        : "In step: nothing collected or fronted."}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Month by month" subtitle="Like your sheet: tap a month to mark it paid or link the real transaction. Totals include every month." icon="ph-table">
        {commitments.length === 0 ? (
          <EmptyState icon="ph-calendar-check" title="No commitments yet" text="Import your EMI sheet, or add savings goals, card EMIs, money someone owes you and card bills by hand." action={<Link href="/money/import" className={primaryButton}>Import the sheet</Link>} />
        ) : (
          <div className="-mx-5 md:mx-0 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left">Commitment</th>
                  {grid.months.map((m) => <th key={m} className="px-2 py-2 text-right whitespace-nowrap">{monthLabel(m)}</th>)}
                  <th className="px-3 py-2 text-right whitespace-nowrap">Received</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Target</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Balance</th>
                </tr>
              </thead>
              <tbody>
                {grid.rows.map((row) => {
                  const c = byId.get(row.id);
                  if (!c) return null;
                  const t = COMMITMENT_TYPES[row.type];
                  return (
                    <tr key={row.id} className={`border-t border-slate-50 ${row.status === "COMPLETED" ? "opacity-50" : ""}`}>
                      <td className="sticky left-0 z-10 bg-white px-3 py-2">
                        <button type="button" onClick={() => setEditing(c)} className="flex items-center gap-2 text-left">
                          <span className="w-7 h-7 shrink-0 rounded-lg text-white flex items-center justify-center" style={{ backgroundColor: t.color }}><i aria-hidden="true" className={`ph-fill ${t.icon}`} /></span>
                          <span>
                            <span className="block text-sm font-extrabold text-slate-800 whitespace-nowrap">{row.name}</span>
                            <span className="block text-[10px] font-bold text-slate-400 whitespace-nowrap">{t.label}{row.status !== "ACTIVE" ? ` · ${row.status === "PAUSED" ? "Paused" : "Done"}` : ""}</span>
                          </span>
                        </button>
                      </td>
                      {row.cells.map((cellData) => {
                        const paid = Number(cellData.paid);
                        const due = Number(cellData.due);
                        const has = cellData.entries.length > 0;
                        const full = has && paid >= due;
                        return (
                          <td key={cellData.month} className="px-1 py-1 text-right">
                            {has ? (
                              <button
                                type="button"
                                onClick={() => setCell({ commitment: c, month: cellData.month })}
                                className={`w-full min-w-[76px] rounded-lg px-2 py-1.5 text-right font-extrabold tabular-nums transition ${full ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : paid > 0 ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                              >
                                {formatINR(paid > 0 ? cellData.paid : cellData.due, { symbol: false })}
                                {cellData.entries.some((e) => e.transactionId) && <i aria-hidden="true" className="ph-bold ph-link ml-1 text-[10px]" />}
                              </button>
                            ) : null}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-extrabold tabular-nums text-slate-900 whitespace-nowrap">{formatINR(row.totalReceived, { symbol: false })}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-600 whitespace-nowrap">{formatINR(row.target, { symbol: false })}</td>
                      <td className="px-3 py-2 text-right font-extrabold tabular-nums text-rose-600 whitespace-nowrap">{formatINR(row.balance, { symbol: false })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {commitments.some((c) => c.schedule.length === 0) && (
          <p className="mt-3 text-xs font-semibold text-slate-400">
            Without a schedule: {commitments.filter((c) => c.schedule.length === 0).map((c) => (
              <button key={c.id} type="button" onClick={() => setEditing(c)} className="ml-1 font-bold text-emerald-600">{c.name}</button>
            ))}
          </p>
        )}
      </Panel>

      {editing && (
        <CommitmentForm
          commitment={editing === "new" ? null : editing}
          all={commitments}
          onClose={() => setEditing(null)}
          onSaved={() => void mutate()}
          onDelete={editing !== "new" ? () => { setDeleting(editing); setEditing(null); } : undefined}
        />
      )}
      {cell && <MonthDialog commitment={cell.commitment} month={cell.month} onClose={() => setCell(null)} onSaved={() => void mutate()} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          text="Its schedule goes too. Linked transactions stay, just unlinked."
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const res = await send(`/api/money/commitments/${deleting.id}`, "DELETE");
            if (res.ok) {
              toast.success("Commitment deleted");
              setDeleting(null);
              void mutate();
            }
          }}
        />
      )}
    </div>
  );
}

const addMonths = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
};

/** Splits in paise, the last part taking the rounding (100 / 3 -> 33.33, 33.33, 33.34). */
function splitParts(total: string, parts: number): string[] {
  const paise = Math.round(Number(total) * 100);
  const each = Math.floor(paise / parts);
  return Array.from({ length: parts }, (_, i) => ((i === parts - 1 ? paise - each * (parts - 1) : each) / 100).toFixed(2));
}

function CommitmentForm({ commitment, all, onClose, onSaved, onDelete }: { commitment: CommitmentDTO | null; all: CommitmentDTO[]; onClose: () => void; onSaved: () => void; onDelete?: () => void }) {
  const { accounts } = useMoneyAccounts();
  const [type, setType] = useState<CommitmentDTO["type"]>(commitment?.type ?? "SAVINGS_GOAL");
  const [name, setName] = useState(commitment?.name ?? "");
  const [total, setTotal] = useState(commitment?.totalAmount ?? "");
  const [accountId, setAccountId] = useState(commitment?.accountId ?? "");
  const [status, setStatus] = useState<CommitmentDTO["status"]>(commitment?.status ?? "ACTIVE");
  const [notes, setNotes] = useState(commitment?.notes ?? "");
  const [matchPattern, setMatchPattern] = useState(commitment?.matchPattern ?? "");
  const linkedNow = commitment ? commitment.linkedCommitmentId ?? all.find((c) => c.linkedCommitmentId === commitment.id)?.id ?? "" : "";
  const [linkId, setLinkId] = useState(linkedNow);
  const [firstDue, setFirstDue] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [parts, setParts] = useState("1");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const linkType = type === "CARD_EMI" ? "RECEIVABLE" : type === "RECEIVABLE" ? "CARD_EMI" : null;
  const linkOptions = linkType ? all.filter((c) => c.type === linkType && c.id !== commitment?.id) : [];
  const preview = useMemo(() => {
    const value = normaliseMoney(total);
    if (commitment || !value || Number(value) <= 0) return [];
    const n = Math.max(1, Number(parts));
    return splitParts(value, n).map((amount, i) => ({ dueDate: addMonths(firstDue, i), amount }));
  }, [commitment, total, parts, firstDue]);

  const accountChoices = accounts.filter((a) => (type === "CARD_BILL" || type === "CARD_EMI" ? a.type === "CREDIT_CARD" : a.type === "BANK"));

  const save = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required.";
    const value = normaliseMoney(total);
    if (!value || Number(value) <= 0) e.totalAmount = "Enter an amount like 12000.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const body = {
      name: name.trim(), type, status, accountId: accountId || null, totalAmount: value, notes: notes.trim() || null,
      matchPattern: matchPattern.trim() || null, linkedCommitmentId: linkType ? linkId || null : null,
      ...(commitment ? {} : { schedule: preview.map((p) => ({ ...p, paidAmount: "0" })) }),
    };
    const res = commitment ? await send(`/api/money/commitments/${commitment.id}`, "PUT", body) : await send("/api/money/commitments", "POST", body);
    setBusy(false);
    if (!res.ok) {
      if (res.errors) setErrors(res.errors);
      return;
    }
    toast.success(commitment ? "Commitment updated" : "Commitment added");
    onSaved();
    onClose();
  };

  const t = COMMITMENT_TYPES[type];
  return (
    <FormDialog
      eyebrow={commitment ? "Edit commitment" : "New commitment"}
      title={commitment ? `Edit ${commitment.name}` : "Add a commitment"}
      onClose={onClose}
      busy={busy}
      wide
      footer={
        <>
          {onDelete && <button type="button" onClick={onDelete} className="h-11 rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-600 hover:bg-rose-50"><i aria-hidden="true" className="ph-bold ph-trash" /></button>}
          <button type="button" onClick={onClose} disabled={busy} className={`flex-1 ${secondaryButton}`}>Cancel</button>
          <button type="button" onClick={save} disabled={busy} className={`flex-1 ${primaryButton}`}>{busy && <i aria-hidden="true" className="ph-bold ph-circle-notch animate-spin" />} Save</button>
        </>
      }
    >
      <div>
        <span className={labelClass}>Type</span>
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {Object.entries(COMMITMENT_TYPES).map(([value, info]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => setType(value as CommitmentDTO["type"])}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${type === value ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              <i aria-hidden="true" className={`ph-fill ${info.icon} text-base`} style={{ color: info.color }} /> {info.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-slate-400">{t.hint}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className={labelClass}>Name <span className="text-red-500">*</span></label>
          <input id="c-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. LIC" className={`${inputClass} ${errors.name ? "border-red-300" : ""}`} />
          <FieldError message={errors.name} />
        </div>
        <div>
          <label htmlFor="c-total" className={labelClass}>{type === "SAVINGS_GOAL" ? "Target" : "Total"} <span className="text-red-500">*</span></label>
          <MoneyInput id="c-total" value={total} onChange={setTotal} placeholder="20000" error={!!errors.totalAmount} />
          <FieldError message={errors.totalAmount} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <span className={labelClass}>{type === "CARD_BILL" || type === "CARD_EMI" ? "Card" : "Account"}</span>
          <CustomDropdown options={[{ value: "", label: "None" }, ...accountChoices.map(accountOption)]} value={accountId} onChange={setAccountId} placeholder="None" />
        </div>
        {linkType && (
          <div>
            <span className={labelClass}>{type === "CARD_EMI" ? "Paid back by" : "Pays for EMI"}</span>
            <CustomDropdown options={[{ value: "", label: "Not linked" }, ...linkOptions.map((c) => ({ value: c.id, label: c.name }))]} value={linkId} onChange={setLinkId} placeholder="Not linked" />
          </div>
        )}
      </div>
      {type !== "SAVINGS_GOAL" && (
        <div>
          <label htmlFor="c-match" className={labelClass}>Name or UPI ID in its payments</label>
          <input id="c-match" value={matchPattern} maxLength={80} onChange={(e) => setMatchPattern(e.target.value)} placeholder="e.g. ARUN" className={inputClass} />
          <p className="mt-1.5 text-[11px] font-semibold text-slate-400">Used to suggest the transaction that pays each month.</p>
        </div>
      )}
      {commitment ? (
        <div>
          <span className={labelClass}>Status</span>
          <Segmented label="Status" value={status} onChange={setStatus} options={[{ value: "ACTIVE", label: "Active" }, { value: "PAUSED", label: "Paused" }, { value: "COMPLETED", label: "Done" }]} />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-extrabold text-slate-800">Schedule</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className={labelClass}>First due date</span>
              <DatePickerInput value={firstDue} onChange={setFirstDue} />
            </div>
            <div>
              <span className={labelClass}>Monthly parts</span>
              <CustomDropdown options={Array.from({ length: 24 }, (_, i) => ({ value: String(i + 1), label: i === 0 ? "One payment" : `${i + 1} months` }))} value={parts} onChange={setParts} />
            </div>
          </div>
          {preview.length > 0 && <p className="mt-2 text-[11px] font-semibold text-slate-500">{preview.map((p) => `${formatMoneyDate(p.dueDate)} ${formatINR(p.amount)}`).join(" · ")}</p>}
        </div>
      )}
      <div>
        <label htmlFor="c-notes" className={labelClass}>Notes</label>
        <input id="c-notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={inputClass} />
      </div>
      {commitment && <p className="text-[11px] font-semibold text-slate-400">Change a month&apos;s amount or mark it paid from the grid.</p>}
    </FormDialog>
  );
}

function MonthDialog({ commitment, month, onClose, onSaved }: { commitment: CommitmentDTO; month: string; onClose: () => void; onSaved: () => void }) {
  const entries = commitment.schedule.filter((s) => s.dueDate.startsWith(month));
  const incoming = commitment.type === "RECEIVABLE" || commitment.type === "EXPECTED_INCOME";
  const from = `${month}-01`;
  const { data } = useSWR<{ rows: TxnDTO[] }>(`/api/money/transactions?from=${addMonths(from, -1)}&to=${addMonths(from, 2)}&pageSize=200`, fetcher);
  const candidates = (data?.rows ?? []).filter((t) => t.direction === (incoming ? "CREDIT" : "DEBIT") && t.kind !== "SELF_TRANSFER");
  return (
    <FormDialog eyebrow={monthLabel(month)} title={commitment.name} onClose={onClose} footer={<button type="button" onClick={onClose} className={`flex-1 ${secondaryButton}`}>Done</button>}>
      {entries.map((e) => <EntryEditor key={e.id} entry={e} candidates={candidates} onSaved={onSaved} />)}
    </FormDialog>
  );
}

function EntryEditor({ entry, candidates, onSaved }: { entry: Entry; candidates: TxnDTO[]; onSaved: () => void }) {
  const [paid, setPaid] = useState(entry.paidAmount === "0.00" ? "" : entry.paidAmount);
  const [paidOn, setPaidOn] = useState(entry.paidOn ?? entry.dueDate);
  const [txnId, setTxnId] = useState(entry.transactionId ?? "");
  const [busy, setBusy] = useState(false);
  const save = async (body: Record<string, unknown>, message: string) => {
    setBusy(true);
    const res = await send(`/api/money/commitments/entries/${entry.id}`, "PATCH", body);
    setBusy(false);
    if (res.ok) {
      toast.success(message);
      onSaved();
    }
  };
  const options = [{ value: "", label: "No transaction" }, ...candidates.map((t) => ({ value: t.id, label: `${formatMoneyDate(t.txnDate).slice(0, 6)} · ${formatINR(t.amount)} · ${(t.counterparty ?? t.narration).slice(0, 28)}` }))];
  return (
    <div className="rounded-2xl border border-slate-100 p-4 space-y-3">
      <p className="text-sm font-extrabold text-slate-800">{formatINR(entry.amount)} due {formatMoneyDate(entry.dueDate)}</p>
      <div>
        <span className={labelClass}>Paid by this transaction</span>
        <CustomDropdown options={options} value={txnId} onChange={setTxnId} placeholder="No transaction" />
      </div>
      {!txnId && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`paid-${entry.id}`} className={labelClass}>Paid amount</label>
            <MoneyInput id={`paid-${entry.id}`} value={paid} onChange={setPaid} placeholder={entry.amount} />
          </div>
          <div>
            <span className={labelClass}>Paid on</span>
            <DatePickerInput value={paidOn} onChange={setPaidOn} />
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className={primaryButton}
          onClick={() =>
            txnId
              ? save({ transactionId: txnId }, "Linked and marked paid")
              : save({ transactionId: null, paidAmount: normaliseMoney(paid || "0") ?? "0.00", paidOn: Number(normaliseMoney(paid || "0")) > 0 ? paidOn : null }, Number(normaliseMoney(paid || "0")) > 0 ? "Marked paid" : "Marked unpaid")
          }
        >
          Save
        </button>
        {entry.paidAmount !== entry.amount && !txnId && (
          <button type="button" disabled={busy} className={secondaryButton} onClick={() => save({ transactionId: null, paidAmount: entry.amount, paidOn }, "Marked paid")}>Paid in full</button>
        )}
      </div>
    </div>
  );
}
