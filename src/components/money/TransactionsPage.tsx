"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import CustomDropdown from "@/components/ui/CustomDropdown";
import CustomDateRangePicker from "@/components/ui/CustomDateRangePicker";
import Switch from "@/components/settings/common/Switch";
import { formatINR, formatMoneyDate } from "@/lib/money/format";
import type { TxnDTO } from "@/lib/money/server/rows";
import { accountOption, categoryOption, useMoneyAccounts, useMoneyCategories, type MoneyCategoryDTO } from "./hooks";
import ManualTxnDialog from "./ManualTxnDialog";
import { AccountChip, Amount, ConfirmDialog, EmptyState, FormDialog, KIND_LABELS, KIND_OPTIONS, KindBadge, Panel, Segmented, Skeleton, inputClass, labelClass, primaryButton, secondaryButton, send } from "./ui";

interface TxnPage {
  rows: TxnDTO[];
  total: number;
  page: number;
  pageSize: number;
  totals: { in: string; out: string };
  linked: Record<string, { id: string; accountId: string; txnDate: string; narration: string }>;
}

type Slim = { id: string; accountId: string; txnDate: string; amount: string; direction: "DEBIT" | "CREDIT"; narration: string; kind: string };
interface Suggestions {
  passThrough: { creditId: string; debitId: string; credit: Slim; debit: Slim }[];
  schedule: { scheduleId: string; txnId: string; commitmentName: string; dueDate: string; amount: string; txn: Slim }[];
  unmatched: Slim[];
  payout?: { commitmentId: string; commitmentName: string; payoutDate: string; amount: string; repeats: boolean; txn: Slim }[];
}

const iso = (d: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "");

export default function TransactionsPage() {
  const params = useSearchParams();
  const [view, setView] = useState<"all" | "suggestions" | "unmatched">((params.get("view") as "suggestions" | "unmatched") || "all");
  const [range, setRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [hideSelf, setHideSelf] = useState(false);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [always, setAlways] = useState<TxnDTO | null>(null);
  const [deleting, setDeleting] = useState<TxnDTO | null>(null);

  // Search after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { accounts, byId: accountById } = useMoneyAccounts();
  const { categories, byId: categoryById } = useMoneyCategories();

  const qs = useMemo(() => {
    const s = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (range.start) s.set("from", iso(range.start));
    if (range.end) s.set("to", iso(range.end));
    if (accountId) s.set("accountId", accountId);
    if (categoryId) s.set("categoryId", categoryId);
    if (kind) s.set("kind", kind);
    if (query) s.set("q", query);
    if (hideSelf) s.set("hideSelf", "1");
    if (view === "unmatched") s.set("view", "unmatched");
    return s.toString();
  }, [page, range, accountId, categoryId, kind, query, hideSelf, view]);

  const { data, mutate, isLoading } = useSWR<TxnPage>(view === "suggestions" ? null : `/api/money/transactions?${qs}`, fetcher, { keepPreviousData: true });
  const { data: suggestions, mutate: refreshSuggestions } = useSWR<Suggestions>("/api/money/suggestions", fetcher);
  const suggestionCount = (suggestions?.passThrough.length ?? 0) + (suggestions?.schedule.length ?? 0) + (suggestions?.unmatched.length ?? 0) + (suggestions?.payout?.length ?? 0);

  const patch = async (t: TxnDTO, body: Record<string, unknown>, message?: string) => {
    const res = await send<TxnDTO>(`/api/money/transactions/${t.id}`, "PATCH", body);
    if (res.ok) {
      if (message) toast.success(message);
      void mutate();
      void refreshSuggestions();
    }
  };

  const exportHref = (format: "csv" | "xlsx") => {
    const s = new URLSearchParams({ what: "transactions", format });
    if (range.start) s.set("from", iso(range.start));
    if (range.end) s.set("to", iso(range.end));
    if (accountId) s.set("accountId", accountId);
    return `/api/money/export?${s}`;
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          label="View"
          value={view}
          onChange={(v) => {
            setView(v);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All", icon: "ph-list-bullets" },
            { value: "suggestions", label: `Suggestions${suggestionCount ? ` (${suggestionCount})` : ""}`, icon: "ph-lightbulb" },
            { value: "unmatched", label: "Unmatched transfers", icon: "ph-arrows-left-right" },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <a href={exportHref("xlsx")} className={secondaryButton}><i aria-hidden="true" className="ph-bold ph-microsoft-excel-logo" /> Excel</a>
          <a href={exportHref("csv")} className={secondaryButton}><i aria-hidden="true" className="ph-bold ph-file-csv" /> CSV</a>
          <button type="button" onClick={() => setAdding(true)} className={primaryButton}><i aria-hidden="true" className="ph-bold ph-plus" /> Add spend</button>
        </div>
      </div>

      {view !== "suggestions" && (
        <Panel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <i aria-hidden="true" className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search narration, person, UPI ID, amount" className={`${inputClass} pl-9`} />
            </div>
            <CustomDateRangePicker value={range} onChange={(r) => { setRange(r); setPage(1); }} placeholder="Any date" />
            <CustomDropdown options={[{ value: "", label: "All accounts" }, ...accounts.map(accountOption)]} value={accountId} onChange={(v) => { setAccountId(v); setPage(1); }} placeholder="All accounts" />
            <CustomDropdown options={[{ value: "", label: "All categories" }, { value: "none", label: "Uncategorised" }, ...categories.map(categoryOption)]} value={categoryId} onChange={(v) => { setCategoryId(v); setPage(1); }} placeholder="All categories" />
            <CustomDropdown options={[{ value: "", label: "All kinds" }, ...KIND_OPTIONS]} value={kind} onChange={(v) => { setKind(v); setPage(1); }} placeholder="All kinds" />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <Switch checked={hideSelf} onChange={(v) => { setHideSelf(v); setPage(1); }} label="Hide self transfers" size="sm" /> Hide self transfers
            </label>
            {data && (
              <p className="text-xs font-bold text-slate-500">
                {data.total} transaction{data.total === 1 ? "" : "s"} · in <span className="text-emerald-600">{formatINR(data.totals.in)}</span> · out <span className="text-rose-600">{formatINR(data.totals.out)}</span>
                <span className="text-slate-400"> (self transfers left out)</span>
              </p>
            )}
          </div>
        </Panel>
      )}

      {view === "suggestions" ? (
        <SuggestionsPanel data={suggestions} accountById={accountById} onDone={() => { void refreshSuggestions(); void mutate(); }} />
      ) : !data && isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          icon={view === "unmatched" ? "ph-check-circle" : "ph-list-bullets"}
          title={view === "unmatched" ? "No unmatched transfers" : "No transactions here"}
          text={view === "unmatched" ? "Every transfer between your accounts has both sides imported." : "Import a statement, or change the filters."}
        />
      ) : (
        <div className="space-y-2">
          {data.rows.map((t) => {
            const linked = t.linkedTxnId ? data.linked[t.linkedTxnId] : undefined;
            const category = t.categoryId ? categoryById.get(t.categoryId) : undefined;
            const isManual = !t.importId;
            return (
              <article key={t.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-500">{formatMoneyDate(t.txnDate)}{t.txnTime ? ` · ${t.txnTime.slice(0, 5)}` : ""}</span>
                      <AccountChip account={accountById.get(t.accountId)} />
                      <KindBadge kind={t.kind} />
                      {t.kind === "CARD_PAYMENT" && t.counterAccountId && <span className="text-[11px] font-bold text-slate-400">to {accountById.get(t.counterAccountId)?.name}</span>}
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-800 break-words">{t.counterparty && t.counterparty !== t.narration.toUpperCase() ? t.counterparty : t.narration}</p>
                    {t.counterparty && t.counterparty !== t.narration.toUpperCase() && <p className="text-[11px] font-semibold text-slate-400 break-all">{t.narration}</p>}
                    {linked && (
                      <p className="mt-1 text-[11px] font-bold text-sky-600 flex items-center gap-1">
                        <i aria-hidden="true" className="ph-bold ph-arrows-left-right" /> {t.direction === "DEBIT" ? "Arrived in" : "Came from"} {accountById.get(linked.accountId)?.name ?? "another account"} on {formatMoneyDate(linked.txnDate)}
                      </p>
                    )}
                    <NoteEditor value={t.note} onSave={(note) => patch(t, { note })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:shrink-0 lg:justify-end">
                    <Amount value={t.amount} direction={t.direction} className="text-base mr-auto lg:mr-2 lg:min-w-[110px] lg:text-right whitespace-nowrap" />
                    <div className="w-[calc(50%-1.5rem)] sm:w-44">
                      <CustomDropdown
                        options={[{ value: "", label: "Uncategorised" }, ...categories.map(categoryOption)]}
                        value={t.categoryId ?? ""}
                        onChange={(v) => patch(t, { categoryId: v || null })}
                        placeholder={category?.name ?? "Uncategorised"}
                      />
                    </div>
                    <div className="w-[calc(50%-1.5rem)] sm:w-40">
                      <CustomDropdown options={KIND_OPTIONS} value={t.kind} onChange={(v) => patch(t, { kind: v }, `Marked as ${KIND_LABELS[v]?.label.toLowerCase()}`)} />
                    </div>
                    <button type="button" title="Always categorise like this" aria-label="Always categorise like this" onClick={() => setAlways(t)} className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center">
                      <i aria-hidden="true" className="ph-bold ph-magic-wand" />
                    </button>
                    {isManual && (
                      <button type="button" aria-label="Delete" onClick={() => setDeleting(t)} className="w-10 h-10 rounded-xl border border-slate-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center">
                        <i aria-hidden="true" className="ph-bold ph-trash" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={secondaryButton}><i aria-hidden="true" className="ph-bold ph-caret-left" /> Newer</button>
              <span className="text-sm font-bold text-slate-500">Page {page} of {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={secondaryButton}>Older <i aria-hidden="true" className="ph-bold ph-caret-right" /></button>
            </div>
          )}
        </div>
      )}

      {adding && <ManualTxnDialog onClose={() => setAdding(false)} onSaved={() => void mutate()} />}
      {always && <AlwaysDialog txn={always} categories={categories} onClose={() => setAlways(null)} onDone={() => void mutate()} />}
      {deleting && (
        <ConfirmDialog
          title="Delete this entry?"
          text="It was typed in or came from a CSV, so it can be removed on its own."
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const res = await send(`/api/money/transactions/${deleting.id}`, "DELETE");
            if (res.ok) {
              toast.success("Deleted");
              setDeleting(null);
              void mutate();
            }
          }}
        />
      )}
    </div>
  );
}

function NoteEditor({ value, onSave }: { value: string | null; onSave: (note: string | null) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? "");
  if (!editing) {
    return value ? (
      <button type="button" onClick={() => setEditing(true)} className="mt-1 text-left text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-start gap-1">
        <i aria-hidden="true" className="ph-bold ph-note-pencil mt-0.5" /> {value}
      </button>
    ) : (
      <button type="button" onClick={() => setEditing(true)} className="mt-1 text-[11px] font-bold text-slate-400 hover:text-emerald-600">Add a note</button>
    );
  }
  return (
    <form
      noValidate
      className="mt-2 flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave(text.trim() || null);
        setEditing(false);
      }}
    >
      <input autoFocus value={text} maxLength={500} onChange={(e) => setText(e.target.value)} className={`${inputClass} h-9`} placeholder="Note" />
      <button type="submit" className="h-9 rounded-xl bg-emerald-500 px-3 text-xs font-bold text-white">Save</button>
      <button type="button" onClick={() => setEditing(false)} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-500">Cancel</button>
    </form>
  );
}

function AlwaysDialog({ txn, categories, onClose, onDone }: { txn: TxnDTO; categories: MoneyCategoryDTO[]; onClose: () => void; onDone: () => void }) {
  const fields = [
    txn.counterparty ? { value: "COUNTERPARTY", label: `Counterparty: ${txn.counterparty}` } : null,
    txn.upiId ? { value: "UPI_ID", label: `UPI ID: ${txn.upiId}` } : null,
    { value: "NARRATION", label: `Narration contains: ${txn.narration.slice(0, 40)}` },
  ].filter(Boolean) as { value: string; label: string }[];
  const [field, setField] = useState(fields[0].value);
  const [categoryId, setCategoryId] = useState(txn.categoryId ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <FormDialog
      eyebrow="New rule"
      title="Always categorise as…"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={onClose} className={`flex-1 ${secondaryButton}`}>Cancel</button>
          <button
            type="button"
            disabled={busy || !categoryId}
            className={`flex-1 ${primaryButton}`}
            onClick={async () => {
              setBusy(true);
              const res = await send<{ applied: number }>("/api/money/rules/always", "POST", { txnId: txn.id, categoryId, field });
              setBusy(false);
              if (res.ok) {
                toast.success(`Rule added and applied to ${res.data.applied} transaction${res.data.applied === 1 ? "" : "s"}`);
                onDone();
                onClose();
              }
            }}
          >
            {busy && <i aria-hidden="true" className="ph-bold ph-circle-notch animate-spin" />} Save rule
          </button>
        </>
      }
    >
      <div>
        <span className={labelClass}>Match</span>
        <CustomDropdown options={fields} value={field} onChange={setField} />
      </div>
      <div>
        <span className={labelClass}>Category</span>
        <CustomDropdown options={categories.map(categoryOption)} value={categoryId} onChange={setCategoryId} placeholder="Choose a category" />
      </div>
      <p className="text-xs font-semibold text-slate-500">Past transactions that match get this category now, and new imports get it automatically. You can change the rule in Settings.</p>
    </FormDialog>
  );
}

function SuggestionsPanel({ data, accountById, onDone }: { data?: Suggestions; accountById: Map<string, { name: string; color: string; last4: string | null; type: string }>; onDone: () => void }) {
  if (!data) return <div className="space-y-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  const act = async (body: Record<string, unknown>, message: string) => {
    const res = await send("/api/money/suggestions", "POST", body);
    if (res.ok) {
      toast.success(message);
      onDone();
    }
  };
  const Row = ({ t }: { t: Slim }) => (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate font-semibold text-slate-600">{formatMoneyDate(t.txnDate)} · {accountById.get(t.accountId)?.name} · {t.narration}</span>
      <Amount value={t.amount} direction={t.direction} className="text-xs shrink-0" />
    </div>
  );
  const payouts = data.payout ?? [];
  const empty = data.passThrough.length + data.schedule.length + data.unmatched.length + payouts.length === 0;
  if (empty) return <EmptyState icon="ph-check-circle" title="Nothing to review" text="Pass-throughs, commitment payments and unmatched transfers will show up here after each import." />;
  return (
    <div className="space-y-4">
      {payouts.length > 0 && (
        <Panel title="Savings goals paying out" subtitle="A payment the size of the goal, near its pay-out date." icon="ph-piggy-bank">
          <ul className="space-y-2">
            {payouts.map((p) => (
              <li key={`${p.commitmentId}:${p.txn.id}`} className="rounded-2xl border border-slate-100 p-3">
                <p className="text-sm font-extrabold text-slate-800">{p.commitmentName}: {formatINR(p.amount)} going out {formatMoneyDate(p.payoutDate)}</p>
                <div className="mt-1"><Row t={p.txn} /></div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => act({ type: "payout", commitmentId: p.commitmentId, txnId: p.txn.id, action: "accept" }, p.repeats ? "Paid out, next round started" : "Paid out")} className="h-9 rounded-xl bg-emerald-500 px-3 text-xs font-bold text-white">That&apos;s the pay-out</button>
                  <button type="button" onClick={() => act({ type: "payout", commitmentId: p.commitmentId, txnId: p.txn.id, action: "dismiss" }, "Dismissed")} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-500">Not this one</button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {data.schedule.length > 0 && (
        <Panel title="Payments that match a commitment" subtitle="Confirm to mark the month paid." icon="ph-calendar-check">
          <ul className="space-y-2">
            {data.schedule.map((s) => (
              <li key={`${s.scheduleId}:${s.txnId}`} className="rounded-2xl border border-slate-100 p-3">
                <p className="text-sm font-extrabold text-slate-800">{s.commitmentName}: {formatINR(s.amount)} due {formatMoneyDate(s.dueDate)}</p>
                <div className="mt-1"><Row t={s.txn} /></div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => act({ type: "schedule", scheduleId: s.scheduleId, txnId: s.txnId, action: "accept" }, "Marked paid")} className="h-9 rounded-xl bg-emerald-500 px-3 text-xs font-bold text-white">Mark paid</button>
                  <button type="button" onClick={() => act({ type: "schedule", scheduleId: s.scheduleId, txnId: s.txnId, action: "dismiss" }, "Dismissed")} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-500">Not this one</button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {data.passThrough.length > 0 && (
        <Panel title="Money that passed through you" subtitle="A credit followed within 2 days by the same debit. Pass-throughs are left out of income and spending." icon="ph-arrow-bend-double-up-right">
          <ul className="space-y-2">
            {data.passThrough.map((p) => (
              <li key={`${p.creditId}:${p.debitId}`} className="rounded-2xl border border-slate-100 p-3 space-y-1">
                <Row t={p.credit} />
                <Row t={p.debit} />
                <div className="pt-1 flex gap-2">
                  <button type="button" onClick={() => act({ type: "passThrough", creditId: p.creditId, debitId: p.debitId, action: "accept" }, "Marked as pass-through")} className="h-9 rounded-xl bg-emerald-500 px-3 text-xs font-bold text-white">It&apos;s a pass-through</button>
                  <button type="button" onClick={() => act({ type: "passThrough", creditId: p.creditId, debitId: p.debitId, action: "dismiss" }, "Kept as they are")} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-500">Keep them separate</button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {data.unmatched.length > 0 && (
        <Panel title="Transfers with no other side" subtitle="These name another of your accounts, but that side isn't imported yet." icon="ph-arrows-left-right">
          <ul className="space-y-2">
            {data.unmatched.map((t) => (
              <li key={t.id} className="rounded-2xl border border-slate-100 p-3">
                <Row t={t} />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => act({ type: "unmatched", txnId: t.id, action: "markTransfer" }, "Marked as self transfer")} className="h-9 rounded-xl bg-sky-500 px-3 text-xs font-bold text-white">Mark as self transfer</button>
                  <button type="button" onClick={() => act({ type: "unmatched", txnId: t.id, action: "dismiss" }, "Kept as it is")} className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-500">It isn&apos;t one</button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
