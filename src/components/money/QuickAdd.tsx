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

const sectionLabel = "mb-2.5 text-[11px] font-extrabold uppercase tracking-[2px] text-slate-400";

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

  const isSpend = direction === "DEBIT";

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

  /** Amount from the clipboard (e.g. copied from a payment app): the first number in it. */
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const match = /(\d[\d,]*(\.\d{1,2})?)/.exec(text.replace(/₹\s?/g, ""));
      const value = match ? normaliseMoney(match[1]) : null;
      if (value) {
        setAmount(value.replace(/\.00$/, ""));
        setError("");
      } else {
        toast.error("No amount found in what you copied.");
      }
    } catch {
      toast.error("Couldn't read the clipboard. Type the amount instead.");
    }
    amountRef.current?.focus();
  };

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
    toast.success(`${formatINR(value)} ${isSpend ? "spent" : "received"}${category ? ` · ${category.name}` : ""}`);
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

  const dateChoices: { key: string; label: string; day?: string }[] = [
    { key: "today", label: "Today", day: localDay() },
    { key: "yesterday", label: "Yesterday", day: localDay(-1) },
    { key: "other", label: "Other day" },
  ];
  const activeDate = pickDate ? "other" : date === localDay() ? "today" : date === localDay(-1) ? "yesterday" : "other";

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1rem)] max-w-[500px] sm:max-w-[500px] max-h-[calc(100dvh-1rem)] flex flex-col rounded-[28px] border-0 bg-white p-0 shadow-2xl gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-6 pb-4">
          <div>
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-slate-900">Quick add</DialogTitle>
            <p className="mt-0.5 text-sm font-medium text-slate-500">{isSpend ? "Add an expense in seconds" : "Add money you received"}</p>
          </div>
          <div role="radiogroup" aria-label="Spend or income" className="flex shrink-0 rounded-2xl bg-slate-100 p-1">
            {(["DEBIT", "CREDIT"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={direction === d}
                onClick={() => setDirection(d)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  direction === d ? `bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)] ${d === "DEBIT" ? "text-rose-500" : "text-emerald-600"}` : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {d === "DEBIT" ? "Spend" : "Income"}
              </button>
            ))}
          </div>
        </div>

        <form
          noValidate
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
        >
          {/* Amount */}
          <div
            className={`flex items-center gap-4 rounded-3xl border-2 bg-gradient-to-br px-4 py-3.5 shadow-[0_6px_20px_rgba(16,185,129,0.08)] transition ${
              error && !normaliseMoney(amount)
                ? "border-rose-300 from-rose-50/60 to-white"
                : "border-emerald-200 from-emerald-50/70 to-white focus-within:border-emerald-400"
            }`}
          >
            <span className={`w-12 h-12 shrink-0 rounded-full text-white flex items-center justify-center text-2xl shadow-[0_6px_14px_rgba(0,0,0,0.15)] ${isSpend ? "bg-gradient-to-br from-rose-500 to-pink-500" : "bg-gradient-to-br from-emerald-500 to-teal-500"}`}>
              <i aria-hidden="true" className="ph-bold ph-currency-inr" />
            </span>
            <input
              ref={amountRef}
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              aria-label="Amount"
              className="min-w-0 flex-1 bg-transparent text-5xl font-extrabold tabular-nums tracking-tight text-slate-900 outline-none placeholder:text-slate-900"
            />
            <button type="button" onClick={paste} aria-label="Paste the amount" title="Paste the amount" className="w-10 h-10 shrink-0 rounded-xl text-slate-400 hover:bg-white hover:text-slate-600 flex items-center justify-center text-2xl transition">
              <i aria-hidden="true" className="ph ph-clipboard-text" />
            </button>
          </div>

          {/* Category */}
          <div>
            <p className={sectionLabel}>Category</p>
            <div role="radiogroup" aria-label="Category" className="grid grid-cols-4 gap-2.5">
              {sortedCategories.map((c) => {
                const on = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setCategoryId(on ? "" : c.id)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border px-1 pt-3 pb-2.5 text-center transition active:scale-95 ${
                      on ? "bg-white" : "border-slate-100 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.05)] hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                    }`}
                    style={on ? { borderColor: c.color, boxShadow: `0 0 0 2px ${c.color}, 0 6px 16px ${c.color}33` } : undefined}
                  >
                    <span
                      className="w-12 h-12 rounded-2xl text-white flex items-center justify-center text-2xl"
                      style={{ background: `linear-gradient(145deg, ${c.color}, ${c.color}d9)`, boxShadow: `0 6px 14px ${c.color}55` }}
                    >
                      <i aria-hidden="true" className={`ph-fill ${c.icon}`} />
                    </span>
                    <span className="line-clamp-2 px-0.5 text-[12px] font-semibold leading-tight text-slate-700">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* What for */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/10 transition">
            <span className="w-9 h-9 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i aria-hidden="true" className="ph-bold ph-pencil-simple" />
            </span>
            <input
              value={what}
              maxLength={200}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="What for? (optional: Swiggy, auto, tea...)"
              aria-label="What for"
              className="min-w-0 flex-1 h-9 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Paid with */}
          {ordered.length > 0 && (
            <div>
              <p className={sectionLabel}>{isSpend ? "Paid with" : "Received in"}</p>
              <div className="flex flex-wrap gap-2">
                {ordered.map((a) => {
                  const on = chosenAccount?.id === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAccountId(a.id)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition ${on ? "" : "border-slate-100 bg-white text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.05)]"}`}
                      style={on ? { borderColor: a.color, color: a.color, backgroundColor: `${a.color}12`, boxShadow: `0 0 0 1px ${a.color}` } : undefined}
                    >
                      <i aria-hidden="true" className={`${on ? "ph-fill" : "ph"} ${a.type === "CREDIT_CARD" ? "ph-credit-card" : "ph-bank"} text-lg`} style={on ? undefined : { color: "#334155" }} />
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <p className={sectionLabel}>Date</p>
            <div className="flex flex-wrap gap-2">
              {dateChoices.map((c) => {
                const on = activeDate === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      if (c.day) {
                        setDate(c.day);
                        setPickDate(false);
                      } else {
                        setPickDate(true);
                      }
                    }}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                      on ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_6px_14px_rgba(16,185,129,0.3)]" : "border border-slate-100 bg-white text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.05)]"
                    }`}
                  >
                    <i aria-hidden="true" className="ph ph-calendar-blank text-lg" />
                    {c.label}
                  </button>
                );
              })}
            </div>
            {pickDate && (
              <div className="mt-2">
                <DatePickerInput value={date} onChange={setDate} disableFutureDates />
              </div>
            )}
          </div>

          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
        </form>

        {/* Footer */}
        <div className="shrink-0 flex gap-2.5 border-t border-slate-100 bg-white px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="h-14 w-14 shrink-0 rounded-2xl bg-white text-slate-500 shadow-[0_2px_10px_rgba(15,23,42,0.1)] flex items-center justify-center text-xl hover:text-slate-700"
          >
            <i aria-hidden="true" className="ph-bold ph-x" />
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={busy}
            className="h-14 flex-1 rounded-2xl border-2 border-emerald-200 bg-white text-[15px] font-bold text-emerald-700 hover:bg-emerald-50 inline-flex items-center justify-center gap-2 transition"
          >
            <i aria-hidden="true" className="ph-bold ph-plus text-lg" />
            <span className="truncate">Save &amp; add another</span>
          </button>
          <button
            type="button"
            onClick={() => save(false)}
            disabled={busy}
            className="h-14 flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-base font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.35)] inline-flex items-center justify-center gap-2 transition hover:brightness-105"
          >
            <i aria-hidden="true" className={`ph-bold ${busy ? "ph-circle-notch animate-spin" : "ph-check"} text-lg`} />
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
