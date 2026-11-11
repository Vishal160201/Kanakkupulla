"use client";

import { useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { formatINR, normaliseMoney } from "@/lib/money/format";
import { useMoneyAccounts, useMoneyCategories } from "./hooks";
import { send } from "./ui";

const LAST_ACCOUNT = "money.quickAdd.account";
const CATEGORY_USE = "money.quickAdd.categoryUse";

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: nothing to remember */
  }
};

const localDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Floating "+" on every /money page: amount, a category tile, save. Built for one-handed use on a phone. */
export default function QuickAdd() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Quick add a spend"
        onClick={() => setOpen(true)}
        className="fixed right-4 z-[80] w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_8px_24px_rgba(16,185,129,0.45)] flex items-center justify-center text-2xl transition hover:scale-105 active:scale-95 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] md:right-8 md:bottom-8"
      >
        <i aria-hidden="true" className="ph-bold ph-plus" />
      </button>
      {open && <QuickAddSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickAddSheet({ onClose }: { onClose: () => void }) {
  const { accounts } = useMoneyAccounts();
  const { categories } = useMoneyCategories();
  const { mutate } = useSWRConfig();
  const amountRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [accountId, setAccountId] = useState<string>(() => read(LAST_ACCOUNT, ""));
  const [categoryId, setCategoryId] = useState("");
  const [what, setWhat] = useState("");
  const [date, setDate] = useState(localDay());
  const [pickDate, setPickDate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Cards first (daily spends), then bank accounts
  const ordered = useMemo(() => [...accounts.filter((a) => a.type === "CREDIT_CARD"), ...accounts.filter((a) => a.type === "BANK")], [accounts]);
  const chosenAccount = ordered.find((a) => a.id === accountId) ?? ordered[0];

  // Most used categories first
  const sortedCategories = useMemo(() => {
    const use = read<Record<string, number>>(CATEGORY_USE, {});
    return [...categories]
      .filter((c) => !["Salary", "Interest", "Card Bills"].includes(c.name))
      .sort((a, b) => (use[b.id] ?? 0) - (use[a.id] ?? 0) || a.sortOrder - b.sortOrder);
  }, [categories]);
  const category = categories.find((c) => c.id === categoryId);

  const save = async (again: boolean) => {
    const value = normaliseMoney(amount);
    if (!value || value.startsWith("-") || Number(value) === 0) {
      setError("Enter the amount.");
      amountRef.current?.focus();
      return;
    }
    if (!chosenAccount) {
      setError("Add an account in Settings first.");
      return;
    }
    if (!categoryId && !what.trim()) {
      setError("Pick a category, or say what it was for.");
      return;
    }
    setError("");
    setBusy(true);
    const res = await send("/api/money/transactions", "POST", {
      accountId: chosenAccount.id,
      txnDate: date,
      narration: what.trim() || category?.name || "Spend",
      amount: value,
      direction,
      categoryId: categoryId || null,
    });
    setBusy(false);
    if (!res.ok) return;

    write(LAST_ACCOUNT, chosenAccount.id);
    if (categoryId) {
      const use = read<Record<string, number>>(CATEGORY_USE, {});
      write(CATEGORY_USE, { ...use, [categoryId]: (use[categoryId] ?? 0) + 1 });
    }
    toast.success(`${formatINR(value)} ${direction === "DEBIT" ? "spent" : "received"}${category ? ` · ${category.name}` : ""}`);
    // Every /money view that depends on transactions
    void mutate((key) => typeof key === "string" && key.startsWith("/api/money/"));
    if (again) {
      setAmount("");
      setWhat("");
      setCategoryId("");
      amountRef.current?.focus();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1rem)] max-w-[480px] sm:max-w-[480px] max-h-[calc(100dvh-1rem)] flex flex-col rounded-3xl border-0 bg-white p-0 shadow-2xl gap-0 overflow-hidden"
      >
        <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
          <DialogTitle className="text-lg font-extrabold text-slate-900">Quick add</DialogTitle>
          <div role="radiogroup" aria-label="Spend or income" className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {(["DEBIT", "CREDIT"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={direction === d}
                onClick={() => setDirection(d)}
                className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${direction === d ? (d === "DEBIT" ? "bg-white text-rose-600 shadow-sm" : "bg-white text-emerald-600 shadow-sm") : "text-slate-500"}`}
              >
                {d === "DEBIT" ? "Spend" : "Income"}
              </button>
            ))}
          </div>
        </div>

        <form
          noValidate
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
        >
          <div className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-2 transition ${error && !normaliseMoney(amount) ? "border-rose-300" : "border-emerald-200 focus-within:border-emerald-500"}`}>
            <span className={`text-3xl font-extrabold ${direction === "DEBIT" ? "text-rose-500" : "text-emerald-500"}`}>₹</span>
            <input
              ref={amountRef}
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              aria-label="Amount"
              className="w-full bg-transparent text-4xl font-extrabold tabular-nums text-slate-900 outline-none placeholder:text-slate-300"
            />
          </div>

          <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[1.5px] text-slate-400">Category</p>
            <div role="radiogroup" aria-label="Category" className="grid grid-cols-4 gap-2">
              {sortedCategories.map((c) => {
                const on = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setCategoryId(on ? "" : c.id)}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-center transition active:scale-95 ${on ? "ring-2 ring-offset-1" : "bg-slate-50 hover:bg-slate-100"}`}
                    style={on ? { backgroundColor: `${c.color}1a`, boxShadow: `0 0 0 2px ${c.color}` } : undefined}
                  >
                    <span className="w-10 h-10 rounded-xl text-white flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: c.color }}>
                      <i aria-hidden="true" className={`ph-fill ${c.icon}`} />
                    </span>
                    <span className="line-clamp-2 text-[11px] font-bold leading-tight text-slate-700">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <input
            value={what}
            maxLength={200}
            onChange={(e) => setWhat(e.target.value)}
            placeholder="What for? (optional: Swiggy, auto, tea…)"
            aria-label="What for"
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
          />

          {ordered.length > 1 && (
            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[1.5px] text-slate-400">Paid with</p>
              <div className="-mx-5 px-5 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {ordered.map((a) => {
                  const on = chosenAccount?.id === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAccountId(a.id)}
                      aria-pressed={on}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${on ? "text-white shadow" : "bg-slate-50 text-slate-600"}`}
                      style={on ? { backgroundColor: a.color } : undefined}
                    >
                      <i aria-hidden="true" className={`ph-fill ${a.type === "CREDIT_CARD" ? "ph-credit-card" : "ph-bank"}`} />
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {[
              ["Today", localDay()],
              ["Yesterday", localDay(-1)],
            ].map(([label, d]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setDate(d);
                  setPickDate(false);
                }}
                className={`rounded-xl px-3 py-2 text-xs font-bold ${date === d && !pickDate ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600"}`}
              >
                {label}
              </button>
            ))}
            <button type="button" onClick={() => setPickDate(true)} className={`rounded-xl px-3 py-2 text-xs font-bold ${pickDate ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600"}`}>
              <i aria-hidden="true" className="ph-bold ph-calendar-blank mr-1" />Other day
            </button>
          </div>
          {pickDate && <DatePickerInput value={date} onChange={setDate} disableFutureDates />}

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        </form>

        <div className="shrink-0 flex gap-2 border-t border-slate-100 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center">
            <i aria-hidden="true" className="ph-bold ph-x" />
          </button>
          <button type="button" onClick={() => save(true)} disabled={busy} className="h-12 flex-1 rounded-xl border border-emerald-200 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
            Save &amp; add another
          </button>
          <button type="button" onClick={() => save(false)} disabled={busy} className="h-12 flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-extrabold text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)] inline-flex items-center justify-center gap-2">
            {busy && <i aria-hidden="true" className="ph-bold ph-circle-notch animate-spin" />} Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
