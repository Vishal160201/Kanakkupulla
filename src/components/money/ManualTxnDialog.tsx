"use client";

import { useState } from "react";
import { toast } from "sonner";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import TimePickerInput from "@/components/ui/TimePickerInput";
import { normaliseMoney } from "@/lib/money/format";
import { accountOption, categoryOption, useMoneyAccounts, useMoneyCategories } from "./hooks";
import { FieldError, FormDialog, MoneyInput, Segmented, inputClass, labelClass, primaryButton, secondaryButton, send } from "./ui";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Add a card spend (or refund) by hand. */
export default function ManualTxnDialog({ defaultAccountId, onClose, onSaved }: { defaultAccountId?: string; onClose: () => void; onSaved: () => void }) {
  const { accounts } = useMoneyAccounts();
  const { categories } = useMoneyCategories();
  const cards = accounts.filter((a) => a.type === "CREDIT_CARD");
  const [accountId, setAccountId] = useState(defaultAccountId ?? cards[0]?.id ?? "");
  const [date, setDate] = useState(localToday());
  const [time, setTime] = useState("");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const e: Record<string, string> = {};
    if (!(accountId || cards[0]?.id)) e.accountId = "Choose an account.";
    if (!merchant.trim()) e.narration = "Merchant is required.";
    const value = normaliseMoney(amount);
    if (!value || value.startsWith("-") || Number(value) === 0) e.amount = "Enter an amount like 250.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await send("/api/money/transactions", "POST", {
      accountId: accountId || cards[0]?.id,
      txnDate: date,
      txnTime: time || null,
      narration: merchant.trim(),
      amount: value,
      direction,
      categoryId: categoryId || null,
      note: note.trim() || null,
    });
    setBusy(false);
    if (!res.ok) {
      if (res.errors) setErrors(res.errors);
      return;
    }
    toast.success(direction === "DEBIT" ? "Spend added" : "Refund added");
    onSaved();
    onClose();
  };

  return (
    <FormDialog
      eyebrow="New entry"
      title="Add a spend"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={`flex-1 ${secondaryButton}`}>Cancel</button>
          <button type="button" onClick={save} disabled={busy} className={`flex-1 ${primaryButton}`}>
            {busy && <i aria-hidden="true" className="ph-bold ph-circle-notch animate-spin" />} Save
          </button>
        </>
      }
    >
      <Segmented label="Spend or refund" value={direction} onChange={setDirection} options={[{ value: "DEBIT", label: "Spend", icon: "ph-arrow-up-right" }, { value: "CREDIT", label: "Refund", icon: "ph-arrow-u-up-left" }]} />
      <div>
        <span className={labelClass}>Card or account</span>
        <CustomDropdown options={[...cards, ...accounts.filter((a) => a.type === "BANK")].map(accountOption)} value={accountId || cards[0]?.id || ""} onChange={setAccountId} placeholder="Choose" error={!!errors.accountId} />
        <FieldError message={errors.accountId} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={labelClass}>Date</span>
          <DatePickerInput value={date} onChange={setDate} disableFutureDates />
        </div>
        <div>
          <span className={labelClass}>Time</span>
          <TimePickerInput value={time || null} onChange={setTime} placeholder="Optional" />
        </div>
      </div>
      <div>
        <label htmlFor="money-merchant" className={labelClass}>Merchant <span className="text-red-500">*</span></label>
        <input id="money-merchant" autoFocus value={merchant} maxLength={200} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Swiggy" className={`${inputClass} ${errors.narration ? "border-red-300" : ""}`} />
        <FieldError message={errors.narration} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="money-amount" className={labelClass}>Amount <span className="text-red-500">*</span></label>
          <MoneyInput id="money-amount" value={amount} onChange={setAmount} placeholder="250" error={!!errors.amount} />
          <FieldError message={errors.amount} />
        </div>
        <div>
          <span className={labelClass}>Category</span>
          <CustomDropdown options={[{ value: "", label: "Use my rules" }, ...categories.map(categoryOption)]} value={categoryId} onChange={setCategoryId} placeholder="Use my rules" />
        </div>
      </div>
      <div>
        <label htmlFor="money-note" className={labelClass}>Note</label>
        <input id="money-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className={inputClass} />
      </div>
    </FormDialog>
  );
}
