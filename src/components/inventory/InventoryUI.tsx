"use client";

// Small presentational building blocks shared by the inventory screens.

import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full h-11 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 outline-none placeholder:text-slate-300 placeholder:font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition";
export const inputErrorClass = "border-red-300 focus:border-red-400 focus:ring-red-500/15";
export const labelClass = "block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2";
export const cardClass = "bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.05)]";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl font-bold text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

export function FieldError({ message }: { message?: string | null }) {
  return message ? <p className="text-xs text-red-500 mt-1 font-medium">{message}</p> : null;
}

export function RequiredMark() {
  return <span className="text-red-500">*</span>;
}

/** ₹-prefixed decimal text input (no spinners). */
export function MoneyInput({
  id,
  value,
  onChange,
  hasError,
  placeholder = "0",
  className,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={hasError || undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputClass, "pl-7", hasError && inputErrorClass)}
      />
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(inputClass, "pl-9 pr-9")}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <i className="ph-bold ph-x text-xs" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: {
  icon: string;
  title: string;
  message?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
        <i className={`ph-bold ph-${icon} text-2xl text-orange-400`} aria-hidden="true" />
      </div>
      <p className="font-bold text-slate-700 text-base">{title}</p>
      {message && <p className="mt-1 font-medium text-sm text-slate-400 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-3">
        <i className="ph-bold ph-warning-circle text-2xl text-rose-500" aria-hidden="true" />
      </div>
      <p className="font-bold text-slate-700 text-sm">Couldn&apos;t load this</p>
      <p className="mt-1 text-sm font-medium text-slate-400 max-w-sm">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200">
          Try again
        </button>
      )}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl border border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-2">
              <div className="h-3.5 w-32 bg-slate-200 rounded" />
              <div className="h-3 w-20 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="h-5 w-20 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

const PILL_TONES = {
  slate: "bg-slate-100 text-slate-600",
  red: "bg-rose-50 text-rose-600",
  green: "bg-emerald-50 text-emerald-700",
  orange: "bg-orange-50 text-orange-600",
  blue: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  amber: "bg-amber-50 text-amber-700",
} as const;

export type PillTone = keyof typeof PILL_TONES;

export function Pill({ tone = "slate", icon, children, className }: { tone?: PillTone; icon?: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider", PILL_TONES[tone], className)}>
      {icon && <i className={`ph-bold ph-${icon} text-[11px]`} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Pagination({ page, pageSize, total, onPageChange, disabled }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void; disabled?: boolean }) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  if (total <= pageSize) return null;
  const btn =
    "h-10 px-4 rounded-xl border border-slate-200 bg-white font-bold text-[0.85rem] text-slate-700 shadow-sm hover:border-slate-300 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none";
  return (
    <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
      <div className="text-[0.75rem] font-bold text-slate-500">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </div>
      <div className="flex gap-2">
        <button type="button" className={btn} onClick={() => onPageChange(page - 1)} disabled={disabled || page <= 1} aria-label="Previous page">
          <i className="ph-bold ph-caret-left" /> <span className="hidden sm:inline">Prev</span>
        </button>
        <span className="hidden sm:flex items-center px-3 text-[0.85rem] font-bold text-slate-600">
          {page} / {totalPages}
        </span>
        <button type="button" className={btn} onClick={() => onPageChange(page + 1)} disabled={disabled || page >= totalPages} aria-label="Next page">
          <span className="hidden sm:inline">Next</span> <i className="ph-bold ph-caret-right" />
        </button>
      </div>
    </div>
  );
}

/** Standard inventory dialog: header (eyebrow + title + close), scrollable body, optional footer. */
export function InventoryDialog({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  busy,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Blocks closing while a request is in flight. */
  busy?: boolean;
}) {
  const width = { sm: "sm:max-w-[420px]", md: "sm:max-w-[520px]", lg: "sm:max-w-[680px]", xl: "sm:max-w-[820px]" }[size];
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] rounded-3xl border-0 bg-white p-0 shadow-2xl gap-0 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]",
          width
        )}
      >
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            {eyebrow && <span className="text-[0.65rem] font-bold text-orange-500 uppercase tracking-[1px]">{eyebrow}</span>}
            <DialogTitle className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 leading-tight break-words">{title}</DialogTitle>
            {subtitle && <div className="mt-1 text-xs sm:text-sm font-medium text-slate-500">{subtitle}</div>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 shrink-0 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
          >
            <i className="ph-bold ph-x" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
        {footer && <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-wrap justify-end gap-2.5">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}

/** Confirmation in the app's dialog style (replaces window.confirm). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busyLabel,
  icon = "warning",
  tone = "danger",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  icon?: string;
  tone?: "danger" | "neutral";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const danger = tone === "danger";
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !busy && onCancel()}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-2rem)] max-w-[400px] sm:max-w-[400px] rounded-3xl border-0 bg-white p-6 sm:p-7 text-center shadow-2xl">
        <div className={cn("mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full", danger ? "bg-rose-50 text-rose-500" : "bg-orange-50 text-orange-500")}>
          <i className={`ph-fill ph-${icon} text-3xl`} aria-hidden="true" />
        </div>
        <DialogTitle className="text-xl font-black text-slate-900">{title}</DialogTitle>
        <div className="text-sm leading-relaxed text-slate-500">{message}</div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="h-11 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "h-11 rounded-xl font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2",
              danger ? "bg-rose-500 hover:bg-rose-600" : "bg-orange-500 hover:bg-orange-600"
            )}
          >
            {busy && <i className="ph ph-circle-notch animate-spin" aria-hidden="true" />}
            {busy ? busyLabel ?? confirmLabel : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Two-option toggle in the app's segmented style. */
export function SegmentToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: string; activeClass: string }[];
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex bg-slate-50 rounded-xl border border-slate-200 p-1 h-11">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all",
              active ? opt.activeClass : "text-slate-500 hover:text-slate-800 hover:bg-white"
            )}
          >
            {opt.icon && <i className={`ph-bold ph-${opt.icon}`} aria-hidden="true" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Label / value row used in detail dialogs. */
export function InfoTile({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "red" | "green" }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 min-w-0">
      <div className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">{label}</div>
      <div className={cn("mt-1 text-sm sm:text-base font-extrabold truncate", tone === "red" ? "text-rose-600" : tone === "green" ? "text-emerald-600" : "text-slate-900")}>
        {value}
      </div>
    </div>
  );
}

export interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  iconClass: string;
  onClick?: () => void;
  highlight?: boolean;
}

/** Tappable KPI tile used on the inventory overview and produce screens. */
export function KpiCard({ label, value, hint, icon, iconClass, onClick, highlight }: KpiCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[0.6rem] sm:text-[0.65rem] font-extrabold text-slate-500 uppercase tracking-[1px] leading-tight">{label}</span>
        <span className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0", iconClass)}>
          <i className={`ph-bold ph-${icon} text-sm sm:text-base`} aria-hidden="true" />
        </span>
      </div>
      <div>
        <div className={cn("text-lg sm:text-2xl font-extrabold leading-none truncate", highlight ? "text-rose-600" : "text-slate-950")}>{value}</div>
        {hint && <div className="mt-1.5 text-[11px] sm:text-xs font-bold text-slate-400 truncate">{hint}</div>}
      </div>
    </>
  );
  const className = cn(cardClass, "p-3.5 sm:p-5 flex flex-col justify-between gap-3 min-h-[110px] sm:min-h-[130px] text-left min-w-0");
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(className, "transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300")}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}
