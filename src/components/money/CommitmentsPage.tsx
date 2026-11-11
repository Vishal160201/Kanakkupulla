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
import Checkbox from "@/components/ui/Checkbox";
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
      <div className="flex justify-end gap-2">
        <Link href="/money/import" aria-label="Import your sheet" className={`${secondaryButton} px-3`}><i aria-hidden="true" className="ph-bold ph-microsoft-excel-logo" /><span className="hidden sm:inline">Import your sheet</span></Link>
        <a href="/api/money/export?what=commitments" aria-label="Export to Excel" className={`${secondaryButton} px-3`}><i aria-hidden="true" className="ph-bold ph-download-simple" /><span className="hidden sm:inline">Export to Excel</span></a>
        <button type="button" onClick={() => setEditing("new")} className={primaryButton}><i aria-hidden="true" className="ph-bold ph-plus" /> Add<span className="hidden sm:inline"> commitment</span></button>
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
          <>
          {/* Phone: one card per commitment, months scroll sideways */}
          <ul className="md:hidden space-y-3">
            {grid.rows.map((row) => {
              const c = byId.get(row.id);
              if (!c) return null;
              const t = COMMITMENT_TYPES[row.type];
              const pct = Number(row.target) > 0 ? Math.min(100, (Number(row.totalReceived) / Number(row.target)) * 100) : 0;
              const months = row.cells.filter((x) => x.entries.length > 0);
              return (
                <li key={row.id} className={`rounded-2xl border border-slate-100 p-3.5 ${row.status === "COMPLETED" ? "opacity-60" : ""}`}>
                  <button type="button" onClick={() => setEditing(c)} className="flex w-full items-center gap-3 text-left">
                    <span className="w-10 h-10 shrink-0 rounded-xl text-white flex items-center justify-center text-lg" style={{ backgroundColor: t.color }}><i aria-hidden="true" className={`ph-fill ${t.icon}`} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-slate-800">{row.name}</span>
                      <span className="block truncate text-[11px] font-semibold text-slate-400">
                        {t.label}
                        {row.status === "COMPLETED" ? (c.paidOutOn ? ` · paid out ${formatMoneyDate(c.paidOutOn).slice(0, 6)}` : " · done") : row.status === "PAUSED" ? " · paused" : ""}
                        {row.status === "ACTIVE" && c.payoutDate ? ` · goes out ${formatMoneyDate(c.payoutDate).slice(0, 6)}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-extrabold tabular-nums text-slate-900">{formatINR(row.totalReceived)}</span>
                      <span className="block text-[10px] font-bold text-slate-400">of {formatINR(row.target)}</span>
                    </span>
                  </button>
                  <div className="mt-2.5 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: t.color }} />
                  </div>
                  {months.length > 0 && (
                    <div className="-mx-3.5 mt-3 flex gap-1.5 overflow-x-auto px-3.5 pb-0.5" style={{ scrollbarWidth: "none" }}>
                      {months.map((cellData) => {
                        const paid = Number(cellData.paid);
                        const full = paid >= Number(cellData.due);
                        return (
                          <button
                            key={cellData.month}
                            type="button"
                            onClick={() => setCell({ commitment: c, month: cellData.month })}
                            className={`shrink-0 rounded-xl px-2.5 py-1.5 text-left ${full ? "bg-emerald-50 text-emerald-700" : paid > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"}`}
                          >
                            <span className="block text-[10px] font-extrabold uppercase">{monthLabel(cellData.month)}</span>
                            <span className="block text-xs font-extrabold tabular-nums">
                              {formatINR(paid > 0 ? cellData.paid : cellData.due, { symbol: false }).replace(/\.00$/, "")}
                              {cellData.entries.some((e) => e.transactionId) && <i aria-hidden="true" className="ph-bold ph-link ml-1 text-[9px]" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {Number(row.balance) > 0 && row.status !== "COMPLETED" && <p className="mt-2 text-[11px] font-bold text-rose-600">{formatINR(row.balance)} still to go</p>}
                </li>
              );
            })}
          </ul>
          <div className="hidden md:block overflow-x-auto">
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
                            <span className="block text-[10px] font-bold text-slate-400 whitespace-nowrap">
                              {t.label}
                              {row.status !== "ACTIVE" ? ` · ${row.status === "PAUSED" ? "Paused" : c.paidOutOn ? `Paid out ${formatMoneyDate(c.paidOutOn)}` : "Done"}` : ""}
                              {row.status === "ACTIVE" && c.payoutDate ? ` · goes out ${formatMoneyDate(c.payoutDate)}${c.repeatMonths ? `, every ${c.repeatMonths} months` : ""}` : ""}
                            </span>
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
          </>
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
          commitment={editing === "new" ? null : byId.get(editing.id) ?? editing}
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
  const [payoutDate, setPayoutDate] = useState(commitment?.payoutDate ?? "");
  const [repeatMonths, setRepeatMonths] = useState(commitment?.repeatMonths ? String(commitment.repeatMonths) : "");
  const [payingOut, setPayingOut] = useState(false);
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
      payoutDate: type === "SAVINGS_GOAL" ? payoutDate || null : null,
      repeatMonths: type === "SAVINGS_GOAL" && payoutDate && repeatMonths ? Number(repeatMonths) : null,
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
          {onDelete && <button type="button" aria-label="Delete commitment" onClick={onDelete} className="h-11 rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-600 hover:bg-rose-50"><i aria-hidden="true" className="ph-bold ph-trash" /></button>}
          {commitment && commitment.type === "SAVINGS_GOAL" && commitment.status !== "COMPLETED" && (
            <button type="button" onClick={() => setPayingOut(true)} className="h-11 rounded-xl border border-emerald-200 px-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1.5">
              <i aria-hidden="true" className="ph-bold ph-hand-coins" /> Paid out
            </button>
          )}
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
          {type !== "CARD_BILL" && type !== "CARD_EMI" && accountId && accounts.find((a) => a.id === accountId && !a.isPool) && (
            <p className="mt-1.5 text-[11px] font-semibold text-amber-600">This account isn&apos;t counted as available money, so this stays out of Bal for EMI.</p>
          )}
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
      {type === "SAVINGS_GOAL" && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-extrabold text-slate-800">When the money goes out</p>
          <p className="text-[11px] font-semibold text-slate-400">Like an insurance premium or festival shopping. It shows in the forecast, and once you mark it paid out the savings stop counting as held.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className={labelClass}>Goes out on</span>
              <DatePickerInput value={payoutDate || null} onChange={setPayoutDate} placeholder="No date" />
              {payoutDate && <button type="button" onClick={() => setPayoutDate("")} className="mt-1 text-[11px] font-bold text-slate-400 hover:text-rose-600">Clear date</button>}
            </div>
            <div>
              <span className={labelClass}>Repeats</span>
              <CustomDropdown
                options={[{ value: "", label: "Doesn't repeat" }, ...[1, 3, 6, 12].map((n) => ({ value: String(n), label: n === 1 ? "Every month" : `Every ${n} months` }))]}
                value={payoutDate ? repeatMonths : ""}
                onChange={setRepeatMonths}
                placeholder="Doesn't repeat"
              />
              {repeatMonths && payoutDate && <p className="mt-1 text-[11px] font-semibold text-slate-400">After each pay-out, the next round starts with {repeatMonths} monthly parts.</p>}
            </div>
          </div>
        </div>
      )}
      {commitment && <ScheduleEditor commitment={commitment} onChanged={onSaved} />}
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
      {payingOut && commitment && <PayoutDialog goal={commitment} onClose={() => setPayingOut(false)} onDone={() => { onSaved(); onClose(); }} />}
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

/** Months of a commitment: remove one, or add one (for example a month you saved but the sheet left blank). */
function ScheduleEditor({ commitment, onChanged }: { commitment: CommitmentDTO; onChanged: () => void }) {
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const add = async () => {
    const value = normaliseMoney(amount);
    if (!date) return setError("Pick the month's date.");
    if (!value || Number(value) <= 0) return setError("Enter an amount like 2000.");
    setError("");
    setBusy(true);
    const res = await send(`/api/money/commitments/${commitment.id}/entries`, "POST", { dueDate: date, amount: value, paidAmount: paid ? value : "0", paidOn: paid ? date : null });
    setBusy(false);
    if (res.ok) {
      toast.success("Month added");
      setDate("");
      setAmount("");
      onChanged();
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    const res = await send(`/api/money/commitments/entries/${id}`, "DELETE");
    setBusy(false);
    setRemoving(null);
    if (res.ok) {
      toast.success("Month removed");
      onChanged();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <p className="text-sm font-extrabold text-slate-800">Months</p>
      {commitment.schedule.length === 0 ? (
        <p className="mt-1 text-xs font-semibold text-slate-400">No months yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-50">
          {commitment.schedule.map((s) => {
            const isPaid = Number(s.paidAmount) >= Number(s.amount);
            return (
              <li key={s.id} className="flex items-center gap-2 py-1.5 text-xs">
                <span className="w-24 shrink-0 font-bold text-slate-600">{formatMoneyDate(s.dueDate)}</span>
                <span className="flex-1 font-extrabold tabular-nums text-slate-900">{formatINR(s.amount)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isPaid ? "bg-emerald-50 text-emerald-600" : Number(s.paidAmount) > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                  {isPaid ? "Paid" : Number(s.paidAmount) > 0 ? `${formatINR(s.paidAmount)} paid` : "Not yet"}
                </span>
                {removing === s.id ? (
                  <>
                    <button type="button" disabled={busy} onClick={() => remove(s.id)} className="h-7 rounded-lg bg-rose-500 px-2 text-[11px] font-bold text-white">Remove</button>
                    <button type="button" onClick={() => setRemoving(null)} className="h-7 rounded-lg border border-slate-200 px-2 text-[11px] font-bold text-slate-500">Keep</button>
                  </>
                ) : (
                  <button type="button" aria-label={`Remove ${formatMoneyDate(s.dueDate)}`} onClick={() => setRemoving(s.id)} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center">
                    <i aria-hidden="true" className="ph-bold ph-trash" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <span className={labelClass}>Add a month</span>
          <DatePickerInput value={date || null} onChange={setDate} placeholder="Date" />
        </div>
        <div>
          <span className={labelClass}>Amount</span>
          <MoneyInput id={`add-${commitment.id}`} value={amount} onChange={setAmount} placeholder="2000" error={!!error} />
        </div>
        <button type="button" disabled={busy} onClick={add} className={primaryButton}><i aria-hidden="true" className="ph-bold ph-plus" /> Add</button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Checkbox checked={paid} onChange={setPaid} label="Already paid / saved" tone="green" size="sm" />
      </div>
      <FieldError message={error} />
    </div>
  );
}

/** A savings goal's money went out: pick the date (and the transaction, if it's in a statement). */
function PayoutDialog({ goal, onClose, onDone }: { goal: CommitmentDTO; onClose: () => void; onDone: () => void }) {
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const around = goal.payoutDate ?? today;
  const [paidOn, setPaidOn] = useState(goal.payoutDate && goal.payoutDate <= today ? goal.payoutDate : today);
  const [txnId, setTxnId] = useState("");
  const [busy, setBusy] = useState(false);
  const { data } = useSWR<{ rows: TxnDTO[] }>(`/api/money/transactions?from=${addMonths(around, -1)}&to=${addMonths(around, 1)}&pageSize=200`, fetcher);
  const debits = (data?.rows ?? []).filter((t) => t.direction === "DEBIT" && t.kind !== "SELF_TRANSFER");
  const saved = goal.schedule.reduce((sum, s) => sum + Number(s.paidAmount), 0);
  return (
    <FormDialog
      eyebrow="Pay out"
      title={`${goal.name}: money went out`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={onClose} className={`flex-1 ${secondaryButton}`}>Cancel</button>
          <button
            type="button"
            disabled={busy}
            className={`flex-1 ${primaryButton}`}
            onClick={async () => {
              setBusy(true);
              const res = await send<{ nextId: string | null }>(`/api/money/commitments/${goal.id}/payout`, "POST", { paidOn, transactionId: txnId || null });
              setBusy(false);
              if (res.ok) {
                toast.success(res.data.nextId ? `${goal.name} paid out, next round started` : `${goal.name} paid out`);
                onDone();
              }
            }}
          >
            {busy && <i aria-hidden="true" className="ph-bold ph-circle-notch animate-spin" />} Mark paid out
          </button>
        </>
      }
    >
      <p className="text-sm font-semibold text-slate-600">
        {formatINR(saved.toFixed(2))} saved of {formatINR(goal.totalAmount)}. Once it&apos;s paid out, this money stops counting as savings held, so it isn&apos;t counted as both spent and saved.
        {goal.repeatMonths ? ` A new round starts, going out ${goal.repeatMonths} months after ${goal.payoutDate ? formatMoneyDate(goal.payoutDate) : "the pay-out"}.` : ""}
      </p>
      <div>
        <span className={labelClass}>Paid out on</span>
        <DatePickerInput value={paidOn} onChange={setPaidOn} disableFutureDates />
      </div>
      <div>
        <span className={labelClass}>The payment in your statement</span>
        <CustomDropdown
          options={[{ value: "", label: "Not in a statement / several payments" }, ...debits.map((t) => ({ value: t.id, label: `${formatMoneyDate(t.txnDate).slice(0, 6)} · ${formatINR(t.amount)} · ${(t.counterparty ?? t.narration).slice(0, 28)}` }))]}
          value={txnId}
          onChange={setTxnId}
          placeholder="Not in a statement / several payments"
        />
      </div>
    </FormDialog>
  );
}
