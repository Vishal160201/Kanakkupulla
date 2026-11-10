"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatINR, maskLast4 } from "@/lib/money/format";

/** Shared building blocks for the /money pages. */

export const KIND_LABELS: Record<string, { label: string; className: string; icon: string }> = {
  EXPENSE: { label: "Spend", className: "bg-rose-50 text-rose-600", icon: "ph-arrow-up-right" },
  INCOME: { label: "Income", className: "bg-emerald-50 text-emerald-600", icon: "ph-arrow-down-left" },
  SALARY: { label: "Salary", className: "bg-green-100 text-green-700", icon: "ph-briefcase" },
  INTEREST: { label: "Interest", className: "bg-lime-50 text-lime-700", icon: "ph-percent" },
  SELF_TRANSFER: { label: "Self transfer", className: "bg-sky-50 text-sky-600", icon: "ph-arrows-left-right" },
  CARD_PAYMENT: { label: "Card bill paid", className: "bg-slate-100 text-slate-600", icon: "ph-credit-card" },
  CARD_REFUND: { label: "Card refund", className: "bg-teal-50 text-teal-600", icon: "ph-arrow-u-up-left" },
  PASS_THROUGH: { label: "Pass-through", className: "bg-amber-50 text-amber-600", icon: "ph-arrow-bend-double-up-right" },
  REIMBURSEMENT: { label: "Paid back", className: "bg-violet-50 text-violet-600", icon: "ph-hand-coins" },
};
export const KIND_OPTIONS = Object.entries(KIND_LABELS).map(([value, k]) => ({ value, label: k.label, icon: k.icon }));

export const COMMITMENT_TYPES: Record<string, { label: string; icon: string; color: string; hint: string }> = {
  SAVINGS_GOAL: { label: "Savings goal", icon: "ph-piggy-bank", color: "#10b981", hint: "Money you set aside each month, kept in your available-money account." },
  CARD_BILL: { label: "Card bill", icon: "ph-credit-card", color: "#f97316", hint: "A credit card bill you pay in full." },
  CARD_EMI: { label: "Card EMI", icon: "ph-calendar-dots", color: "#6366f1", hint: "A card amount paid back in monthly parts." },
  RECEIVABLE: { label: "Owed to you", icon: "ph-hand-coins", color: "#0ea5e9", hint: "Money someone owes you. Link it to the card EMI it pays for." },
  PAYABLE: { label: "You owe", icon: "ph-hand-arrow-up", color: "#f43f5e", hint: "Money you owe a person." },
  EXPECTED_INCOME: { label: "Expected income", icon: "ph-arrow-circle-down", color: "#22c55e", hint: "Money you expect to receive." },
};

export const inputClass =
  "w-full h-11 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition";
export const labelClass = "block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2";
export const primaryButton =
  "h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-sm font-bold text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)] hover:brightness-105 transition disabled:opacity-60 inline-flex items-center justify-center gap-2";
export const secondaryButton =
  "h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 inline-flex items-center justify-center gap-2";

export function Panel({ title, subtitle, icon, actions, children, className = "" }: { title?: string; subtitle?: string; icon?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-slate-100 bg-white p-5 md:p-6 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center text-lg shadow-sm">
                <i aria-hidden="true" className={`ph-fill ${icon}`} />
              </div>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-base font-extrabold text-slate-900">{title}</h2>}
              {subtitle && <p className="text-xs font-semibold text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** ₹ amount; debits/negatives in rose, credits in emerald when `tone` asks for it. */
export function Amount({ value, direction, tone = "auto", className = "" }: { value: string | null | undefined; direction?: "DEBIT" | "CREDIT"; tone?: "auto" | "plain"; className?: string }) {
  if (value == null) return null;
  const negative = value.startsWith("-");
  const color = tone === "plain" ? "" : direction === "DEBIT" || negative ? "text-rose-600" : direction === "CREDIT" ? "text-emerald-600" : "text-slate-900";
  return (
    <span className={`tabular-nums font-extrabold ${color} ${className}`}>
      {direction === "DEBIT" ? "−" : direction === "CREDIT" ? "+" : ""}
      {formatINR(value)}
    </span>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  const k = KIND_LABELS[kind] ?? KIND_LABELS.EXPENSE;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap ${k.className}`}>
      <i aria-hidden="true" className={`ph-bold ${k.icon}`} /> {k.label}
    </span>
  );
}

export function AccountChip({ account }: { account?: { name: string; color: string; last4?: string | null; type?: string } }) {
  if (!account) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 pl-1 pr-2 py-0.5 text-[11px] font-bold text-slate-600 whitespace-nowrap">
      <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px]" style={{ backgroundColor: account.color }}>
        <i aria-hidden="true" className={`ph-fill ${account.type === "CREDIT_CARD" ? "ph-credit-card" : "ph-bank"}`} />
      </span>
      {account.name}
      {account.last4 && <span className="text-slate-400">{maskLast4(account.last4).replace("•••• ", "••")}</span>}
    </span>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-6 py-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center text-2xl shadow-md">
        <i aria-hidden="true" className={`ph-fill ${icon}`} />
      </div>
      <p className="mt-3 text-base font-extrabold text-slate-800">{title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500 max-w-md mx-auto">{text}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-red-500 mt-1 font-medium">{message}</p> : null;
}

export function MoneyInput({ id, value, onChange, placeholder, error }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: boolean }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
      <input id={id} value={value} inputMode="decimal" autoComplete="off" onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputClass} pl-7 ${error ? "border-red-300" : ""}`} />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; icon?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 min-w-fit py-2 px-3 rounded-lg inline-flex items-center justify-center gap-1.5 text-[13px] font-bold transition-all ${value === o.value ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          {o.icon && <i aria-hidden="true" className={`ph-bold ${o.icon}`} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Confirmation dialog for destructive actions (no native confirm()). */
export function ConfirmDialog({ title, text, confirmLabel = "Delete", tone = "danger", onConfirm, onClose }: { title: string; text: ReactNode; confirmLabel?: string; tone?: "danger" | "primary"; onConfirm: () => Promise<unknown> | void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-2rem)] max-w-[420px] sm:max-w-[420px] rounded-3xl border-0 bg-white p-7 text-center shadow-2xl gap-0">
        <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mx-auto mb-5 ${tone === "danger" ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}`}>
          <i aria-hidden="true" className={`ph-fill text-3xl ${tone === "danger" ? "ph-trash text-red-500" : "ph-check-circle text-emerald-500"}`} />
        </div>
        <DialogTitle className="text-lg font-extrabold text-slate-900 mb-1">{title}</DialogTitle>
        <div className="text-sm text-slate-500 mb-6">{text}</div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy} className={`flex-1 ${secondaryButton}`}>Cancel</button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
            className={`flex-1 h-11 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 inline-flex items-center justify-center gap-2 ${tone === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
          >
            {busy && <i aria-hidden="true" className="ph-bold ph-circle-notch animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Modal shell with a title, scrolling body and sticky footer. */
export function FormDialog({ eyebrow, title, children, footer, onClose, busy, wide }: { eyebrow: string; title: string; children: ReactNode; footer: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
  const w = wide ? "max-w-[640px] sm:max-w-[640px]" : "max-w-[500px] sm:max-w-[500px]";
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent showCloseButton={false} className={`w-[calc(100vw-2rem)] ${w} max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl border-0 bg-white p-0 shadow-2xl gap-0 overflow-hidden`}>
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-100">
          <span className="text-[0.65rem] font-bold text-emerald-600 uppercase tracking-[1px]">{eyebrow}</span>
          <DialogTitle className="text-xl font-extrabold text-slate-900 mt-0.5">{title}</DialogTitle>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">{children}</div>
        <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-slate-100 bg-white">{footer}</div>
      </DialogContent>
    </Dialog>
  );
}

/** JSON request with the API's error shown as a toast. Returns the body, or null on failure. */
export async function send<T = unknown>(url: string, method: string, body?: unknown, { quiet }: { quiet?: boolean } = {}): Promise<{ ok: true; data: T } | { ok: false; error: string; errors?: Record<string, string>; code?: string }> {
  try {
    const res = await fetch(url, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = (data as { error?: string }).error || "Something went wrong. Try again.";
      if (!quiet) toast.error(error);
      return { ok: false, error, errors: (data as { errors?: Record<string, string> }).errors, code: (data as { code?: string }).code };
    }
    return { ok: true, data: data as T };
  } catch {
    if (!quiet) toast.error("Couldn't reach the server. Check your connection and try again.");
    return { ok: false, error: "offline" };
  }
}

/** Saves rows as a CSV file in the browser. */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob([`﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
