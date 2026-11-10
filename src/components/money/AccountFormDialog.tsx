"use client";

import { useState, type KeyboardEvent } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import CustomDropdown from "@/components/ui/CustomDropdown";
import Switch from "@/components/settings/common/Switch";
import { formatMoneyDate, normaliseMoney } from "@/lib/money/format";
import type { MoneyAccountDTO, MoneyAccountInput, MoneyAccountType } from "@/types/money";

export const ACCOUNT_COLORS = ["#f97316", "#10b981", "#0ea5e9", "#6366f1", "#f43f5e", "#8b5cf6", "#eab308", "#14b8a6"];

const TYPE_OPTIONS: { value: MoneyAccountType; label: string; icon: string; hint: string }[] = [
  { value: "BANK", label: "Bank account", icon: "ph-bank", hint: "Imported from statement PDFs. Balances come from the statement." },
  { value: "CREDIT_CARD", label: "Credit card", icon: "ph-credit-card", hint: "Spends added by hand or from a CSV; the bill is paid from a bank account." },
];

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `Day ${i + 1}` }));

const inputClass =
  "w-full h-11 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition";
const labelClass = "block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2";

interface AccountFormDialogProps {
  account: MoneyAccountDTO | null;
  isSaving: boolean;
  serverErrors?: Record<string, string>;
  onSubmit: (input: MoneyAccountInput) => void;
  onClose: () => void;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-red-500 mt-1 font-medium">{message}</p> : null;
}

/** Add / edit a bank account or credit card. Mounted only while open. */
export default function AccountFormDialog({ account, isSaving, serverErrors, onSubmit, onClose }: AccountFormDialogProps) {
  const [type, setType] = useState<MoneyAccountType>(account?.type ?? "BANK");
  const [name, setName] = useState(account?.name ?? "");
  const [institution, setInstitution] = useState(account?.institution ?? "");
  const [last4, setLast4] = useState(account?.last4 ?? "");
  const [identifiers, setIdentifiers] = useState<string[]>(account?.ownIdentifiers ?? []);
  const [identifierDraft, setIdentifierDraft] = useState("");
  const [isPool, setIsPool] = useState(account?.isPool ?? false);
  const [lowBalanceAlert, setLowBalanceAlert] = useState(account?.lowBalanceAlert ?? "1000.00");
  const [cycleStartDay, setCycleStartDay] = useState(account?.cycleStartDay ? String(account.cycleStartDay) : "");
  const [dueDay, setDueDay] = useState(account?.dueDay ? String(account.dueDay) : "");
  const [creditLimit, setCreditLimit] = useState(account?.creditLimit ?? "");
  const [outstanding, setOutstanding] = useState(account?.outstanding ?? "");
  const [manualBalance, setManualBalance] = useState(account?.manualBalance ?? "");
  const [color, setColor] = useState(account?.color ?? ACCOUNT_COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const shownErrors = { ...serverErrors, ...errors };
  const isCard = type === "CREDIT_CARD";
  const typeLocked = !!account && account.transactionCount > 0;

  const addIdentifier = () => {
    const value = identifierDraft.trim().toUpperCase();
    if (!value) return;
    if (value.length < 2) {
      setErrors((e) => ({ ...e, ownIdentifiers: "Identifiers need at least 2 characters." }));
      return;
    }
    setIdentifiers((list) => (list.includes(value) ? list : [...list, value]));
    setIdentifierDraft("");
    setErrors((e) => {
      const next = { ...e };
      delete next.ownIdentifiers;
      return next;
    });
  };

  const onIdentifierKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addIdentifier();
    } else if (e.key === "Backspace" && !identifierDraft && identifiers.length > 0) {
      setIdentifiers((list) => list.slice(0, -1));
    }
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (!institution.trim()) errs.institution = "Bank is required.";
    if (last4 && !/^\d{4}$/.test(last4)) errs.last4 = "Enter only the last 4 digits.";
    const alert = normaliseMoney(lowBalanceAlert || "0");
    if (alert == null || alert.startsWith("-")) errs.lowBalanceAlert = "Enter an amount like 1000.";
    const limit = isCard && creditLimit ? normaliseMoney(creditLimit) : null;
    if (isCard && creditLimit && (limit == null || limit.startsWith("-"))) errs.creditLimit = "Enter an amount like 50000.";
    const used = isCard && outstanding ? normaliseMoney(outstanding) : null;
    if (isCard && outstanding && (used == null || used.startsWith("-"))) errs.outstanding = "Enter an amount like 5000.50.";
    const typedBalance = !isCard && manualBalance ? normaliseMoney(manualBalance) : null;
    if (!isCard && manualBalance && (typedBalance == null || typedBalance.startsWith("-"))) errs.manualBalance = "Enter an amount like 25000.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // A half-typed identifier still counts
    const draft = identifierDraft.trim().toUpperCase();
    const ownIdentifiers = draft.length >= 2 && !identifiers.includes(draft) ? [...identifiers, draft] : identifiers;

    onSubmit({
      type,
      name: name.trim(),
      institution: institution.trim(),
      last4: last4 || null,
      ownIdentifiers,
      isPool: isCard ? false : isPool,
      lowBalanceAlert: alert ?? "0.00",
      cycleStartDay: isCard && cycleStartDay ? Number(cycleStartDay) : null,
      dueDay: isCard && dueDay ? Number(dueDay) : null,
      creditLimit: limit,
      outstanding: used,
      manualBalance: typedBalance,
      color,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] max-w-[500px] sm:max-w-[500px] max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl border-0 bg-white p-0 shadow-2xl gap-0 overflow-hidden"
      >
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-100">
          <span className="text-[0.65rem] font-bold text-emerald-600 uppercase tracking-[1px]">{account ? "Edit account" : "New account"}</span>
          <DialogTitle className="text-xl font-extrabold text-slate-900 mt-0.5">{account ? `Edit ${account.name}` : "Add an account"}</DialogTitle>
        </div>

        <form
          noValidate
          className="flex flex-col flex-1 min-h-0"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
            <div>
              <span id="money-type-label" className={labelClass}>Type</span>
              <div role="radiogroup" aria-labelledby="money-type-label" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                {TYPE_OPTIONS.map((option) => {
                  const isSelected = type === option.value;
                  const isDisabled = typeLocked && !isSelected;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={isDisabled}
                      onClick={() => setType(option.value)}
                      className={`py-2 px-1 rounded-lg inline-flex items-center justify-center gap-2 text-[13px] font-bold transition-all ${
                        isSelected ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      } ${isDisabled ? "opacity-40 cursor-not-allowed hover:text-slate-500" : ""}`}
                    >
                      <i aria-hidden="true" className={`ph-bold ${option.icon} text-base`} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
                {typeLocked ? "This account has transactions, so its type can't change." : TYPE_OPTIONS.find((o) => o.value === type)?.hint}
              </p>
              <FieldError message={shownErrors.type} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="money-name" className={labelClass}>
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="money-name"
                  autoFocus
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isCard ? "e.g. Kiwi card" : "e.g. HDFC savings"}
                  className={`${inputClass} ${shownErrors.name ? "border-red-300" : ""}`}
                />
                <FieldError message={shownErrors.name} />
              </div>
              <div>
                <label htmlFor="money-institution" className={labelClass}>
                  Bank <span className="text-red-500">*</span>
                </label>
                <input
                  id="money-institution"
                  value={institution}
                  maxLength={60}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className={`${inputClass} ${shownErrors.institution ? "border-red-300" : ""}`}
                />
                <FieldError message={shownErrors.institution} />
              </div>
            </div>

            <div>
              <label htmlFor="money-last4" className={labelClass}>Last 4 digits</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold tracking-widest text-slate-300">••••</span>
                <input
                  id="money-last4"
                  value={last4}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                  className={`${inputClass} pl-14 tracking-[0.2em] ${shownErrors.last4 ? "border-red-300" : ""}`}
                />
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-1.5">Only the last 4 digits are saved, never the full number.</p>
              <FieldError message={shownErrors.last4} />
            </div>

            <div>
              <label htmlFor="money-identifiers" className={labelClass}>How other accounts name this one</label>
              <div
                className={`flex flex-wrap items-center gap-1.5 min-h-11 rounded-xl border bg-white px-2 py-1.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition ${
                  shownErrors.ownIdentifiers ? "border-red-300" : "border-slate-200"
                }`}
              >
                {identifiers.map((value) => (
                  <span key={value} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 pl-2 pr-1 py-1 text-xs font-bold text-emerald-700">
                    {value}
                    <button
                      type="button"
                      aria-label={`Remove ${value}`}
                      onClick={() => setIdentifiers((list) => list.filter((v) => v !== value))}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-emerald-500 hover:bg-emerald-100"
                    >
                      <i aria-hidden="true" className="ph-bold ph-x text-[10px]" />
                    </button>
                  </span>
                ))}
                <input
                  id="money-identifiers"
                  value={identifierDraft}
                  maxLength={60}
                  autoComplete="off"
                  onChange={(e) => setIdentifierDraft(e.target.value)}
                  onKeyDown={onIdentifierKey}
                  onBlur={addIdentifier}
                  placeholder={identifiers.length ? "Add another" : "e.g. KVBL0001234 or name@okhdfc"}
                  className="flex-1 min-w-[140px] h-8 bg-transparent px-1 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
                Your UPI handle, the IFSC or part of the account number, as they show up in the other bank&apos;s statement. Used to spot self transfers. Press Enter after each.
              </p>
              <FieldError message={shownErrors.ownIdentifiers} />
            </div>

            {!isCard && (
              <div>
                <label htmlFor="money-balance" className={labelClass}>Balance now</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    id="money-balance"
                    value={manualBalance}
                    inputMode="decimal"
                    onChange={(e) => setManualBalance(e.target.value)}
                    placeholder="Leave empty to use the statement"
                    className={`${inputClass} pl-7 ${shownErrors.manualBalance ? "border-red-300" : ""}`}
                  />
                </div>
                <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
                  {account?.manualBalanceAsOf && account.manualBalance === normaliseMoney(manualBalance)
                    ? `As of ${formatMoneyDate(account.manualBalanceAsOf)}. A statement with later rows takes over from it.`
                    : "Only until you import a statement: a statement with later rows takes over from it."}
                </p>
                <FieldError message={shownErrors.manualBalance} />
              </div>
            )}

            {!isCard && (
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">Count as available money</p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Its balance goes into Bal for EMI, for the account you keep spare money in.</p>
                </div>
                <Switch checked={isPool} onChange={setIsPool} label="Count as available money" />
              </div>
            )}

            {isCard && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className={labelClass}>Billing cycle starts</span>
                  <CustomDropdown options={DAY_OPTIONS} value={cycleStartDay} onChange={setCycleStartDay} placeholder="Choose a day" />
                  <FieldError message={shownErrors.cycleStartDay} />
                </div>
                <div>
                  <span className={labelClass}>Bill due</span>
                  <CustomDropdown options={DAY_OPTIONS} value={dueDay} onChange={setDueDay} placeholder="Choose a day" />
                  <FieldError message={shownErrors.dueDay} />
                </div>
              </div>
            )}

            {isCard && (
              <div>
                <label htmlFor="money-outstanding" className={labelClass}>Used now</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    id="money-outstanding"
                    value={outstanding}
                    inputMode="decimal"
                    onChange={(e) => setOutstanding(e.target.value)}
                    placeholder="5000.50"
                    className={`${inputClass} pl-7 ${shownErrors.outstanding ? "border-red-300" : ""}`}
                  />
                </div>
                <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
                  {account?.outstandingAsOf && account.outstanding === normaliseMoney(outstanding)
                    ? `As of ${formatMoneyDate(account.outstandingAsOf)}. Change it and the date moves to today.`
                    : "What the card shows as used today. Spends you add later count from here."}
                </p>
                <FieldError message={shownErrors.outstanding} />
              </div>
            )}

            <div className={`grid grid-cols-1 gap-4 ${isCard ? "sm:grid-cols-2" : ""}`}>
              {isCard && (
                <div>
                  <label htmlFor="money-limit" className={labelClass}>Credit limit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                    <input
                      id="money-limit"
                      value={creditLimit}
                      inputMode="decimal"
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="50000"
                      className={`${inputClass} pl-7 ${shownErrors.creditLimit ? "border-red-300" : ""}`}
                    />
                  </div>
                  <FieldError message={shownErrors.creditLimit} />
                </div>
              )}
              <div>
                <label htmlFor="money-alert" className={labelClass}>Warn me below</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    id="money-alert"
                    value={lowBalanceAlert}
                    inputMode="decimal"
                    onChange={(e) => setLowBalanceAlert(e.target.value)}
                    placeholder="1000"
                    className={`${inputClass} pl-7 ${shownErrors.lowBalanceAlert ? "border-red-300" : ""}`}
                  />
                </div>
                <FieldError message={shownErrors.lowBalanceAlert} />
              </div>
            </div>

            <div>
              <span className={labelClass}>Colour</span>
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Account colour">
                {ACCOUNT_COLORS.map((preset) => {
                  const isSelected = color.toLowerCase() === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={preset}
                      onClick={() => setColor(preset)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${isSelected ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
                      style={{ backgroundColor: preset }}
                    >
                      {isSelected && <i aria-hidden="true" className="ph-bold ph-check text-white text-sm" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-slate-100 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-bold text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)] hover:brightness-105 transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {isSaving && <i aria-hidden="true" className="ph-bold ph-circle-notch animate-spin" />}
              {account ? "Save changes" : "Add account"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
