"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import CustomDropdown from "@/components/ui/CustomDropdown";
import Checkbox from "@/components/ui/Checkbox";
import Switch from "@/components/settings/common/Switch";
import { normaliseMoney, formatINR } from "@/lib/money/format";
import type { RuleInput } from "@/lib/money/rules";
import { accountOption, categoryOption, useMoneyAccounts, useMoneyCategories, type MoneyCategoryDTO } from "./hooks";
import { ACCOUNT_COLORS } from "./AccountFormDialog";
import { ConfirmDialog, FieldError, FormDialog, KIND_LABELS, KIND_OPTIONS, MoneyInput, Panel, inputClass, labelClass, primaryButton, secondaryButton, send } from "./ui";

const CATEGORY_ICONS = ["ph-tag", "ph-fork-knife", "ph-train", "ph-gas-pump", "ph-shopping-bag", "ph-diamond", "ph-film-slate", "ph-house-line", "ph-users-three", "ph-repeat", "ph-credit-card", "ph-handshake", "ph-briefcase", "ph-percent", "ph-heartbeat", "ph-graduation-cap", "ph-gift", "ph-airplane", "ph-coffee", "ph-t-shirt", "ph-device-mobile", "ph-car", "ph-baby", "ph-paw-print"];
const CATEGORY_COLORS = [...ACCOUNT_COLORS, "#ec4899", "#84cc16", "#64748b", "#a855f7"];

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function CategoriesSettings() {
  const { categories, mutate } = useMoneyCategories();
  const [editing, setEditing] = useState<MoneyCategoryDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<MoneyCategoryDTO | null>(null);
  return (
    <Panel title="Categories" subtitle="What your spending is grouped by." icon="ph-tag" actions={<button type="button" onClick={() => setEditing("new")} className={primaryButton}><i aria-hidden="true" className="ph-bold ph-plus" /> Add</button>}>
      <ul className="grid grid-cols-2 gap-2 xl:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-slate-100 px-2 sm:px-3 py-2">
            <button type="button" onClick={() => setEditing(c)} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 text-left">
              <span className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl text-white flex items-center justify-center" style={{ backgroundColor: c.color }}><i aria-hidden="true" className={`ph-fill ${c.icon}`} /></span>
              <span className="min-w-0 flex-1 line-clamp-2 break-words text-xs sm:text-sm font-bold leading-tight text-slate-800">{c.name}</span>
            </button>
            <button type="button" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)} className="hidden sm:flex w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 items-center justify-center"><i aria-hidden="true" className="ph-bold ph-pencil-simple" /></button>
            <button type="button" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)} className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center"><i aria-hidden="true" className="ph-bold ph-trash" /></button>
          </li>
        ))}
      </ul>
      {editing && <CategoryDialog category={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => void mutate()} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          text="Its transactions and rules become uncategorised."
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const res = await send(`/api/money/categories/${deleting.id}`, "DELETE");
            if (res.ok) {
              toast.success("Category deleted");
              setDeleting(null);
              void mutate();
            }
          }}
        />
      )}
    </Panel>
  );
}

function CategoryDialog({ category, onClose, onSaved }: { category: MoneyCategoryDTO | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState(category?.icon ?? "ph-tag");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) return setError("Name is required.");
    setBusy(true);
    const res = await send(category ? `/api/money/categories/${category.id}` : "/api/money/categories", category ? "PUT" : "POST", { name: name.trim(), color, icon });
    setBusy(false);
    if (!res.ok) return setError(res.errors?.name ?? "");
    toast.success(category ? "Category updated" : "Category added");
    onSaved();
    onClose();
  };
  return (
    <FormDialog eyebrow={category ? "Edit category" : "New category"} title={category ? `Edit ${category.name}` : "Add a category"} onClose={onClose} busy={busy} footer={<><button type="button" onClick={onClose} className={`flex-1 ${secondaryButton}`}>Cancel</button><button type="button" onClick={save} disabled={busy} className={`flex-1 ${primaryButton}`}>Save</button></>}>
      <div>
        <label htmlFor="cat-name" className={labelClass}>Name</label>
        <input id="cat-name" autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={`${inputClass} ${error ? "border-red-300" : ""}`} placeholder="e.g. Medical" />
        <FieldError message={error} />
      </div>
      <div>
        <span className={labelClass}>Icon</span>
        <div role="radiogroup" aria-label="Icon" className="grid grid-cols-8 gap-1.5">
          {CATEGORY_ICONS.map((i) => (
            <button key={i} type="button" role="radio" aria-checked={icon === i} aria-label={i.replace("ph-", "").replace(/-/g, " ")} onClick={() => setIcon(i)} className={`h-10 rounded-xl flex items-center justify-center text-lg ${icon === i ? "bg-emerald-50 text-emerald-600 ring-2 ring-emerald-400" : "bg-slate-50 text-slate-500 hover:bg-white hover:ring-1 hover:ring-slate-200"}`}>
              <i aria-hidden="true" className={`ph-bold ${i}`} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className={labelClass}>Colour</span>
        <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full flex items-center justify-center ${color === c ? "ring-2 ring-offset-2 ring-slate-400" : ""}`} style={{ backgroundColor: c }}>
              {color === c && <i aria-hidden="true" className="ph-bold ph-check text-white text-sm" />}
            </button>
          ))}
        </div>
      </div>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = { NARRATION: "Narration", COUNTERPARTY: "Counterparty", UPI_ID: "UPI ID", MERCHANT: "Card merchant" };

export function RulesSettings() {
  const { data: rules = [], mutate } = useSWR<(RuleInput & { createdAt: string })[]>("/api/money/rules", fetcher);
  const { byId: catById } = useMoneyCategories();
  const { byId: accById } = useMoneyAccounts();
  const [editing, setEditing] = useState<RuleInput | "new" | null>(null);
  const [deleting, setDeleting] = useState<RuleInput | null>(null);
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const matching = rules.filter((r) => r.pattern.toUpperCase().includes(q.trim().toUpperCase()));
  // The seeded list is long: show a handful until you search or ask for all
  const shown = q.trim() || showAll ? matching : matching.slice(0, 8);
  return (
    <Panel title="Rules" subtitle="Applied to every new transaction, lowest number first. Text matches ignore case and spaces." icon="ph-magic-wand" actions={<button type="button" onClick={() => setEditing("new")} className={primaryButton}><i aria-hidden="true" className="ph-bold ph-plus" /> Add rule</button>}>
      <div className="relative mb-3">
        <i aria-hidden="true" className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a rule" className={`${inputClass} pl-9`} />
      </div>
      <ul className="divide-y divide-slate-50">
        {shown.map((r) => {
          const cat = r.categoryId ? catById.get(r.categoryId) : undefined;
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <span className="w-9 shrink-0 text-center text-[11px] font-extrabold text-slate-400">{r.priority}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] sm:text-sm font-bold text-slate-800 break-words">
                  <span className="text-slate-400">{FIELD_LABELS[r.field]} {r.isRegex ? "matches" : "contains"} </span>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px]">{r.pattern}</code>
                  {r.direction && <span className="text-slate-400"> · {r.direction === "DEBIT" ? "debits only" : "credits only"}</span>}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {[cat ? `→ ${cat.name}` : null, r.kind ? `as ${KIND_LABELS[r.kind]?.label.toLowerCase()}` : null, r.targetAccountId ? `paying ${accById.get(r.targetAccountId)?.name ?? "a card"}` : null].filter(Boolean).join(" ")}
                </p>
              </div>
              <button type="button" aria-label="Edit rule" onClick={() => setEditing(r)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 flex items-center justify-center"><i aria-hidden="true" className="ph-bold ph-pencil-simple" /></button>
              <button type="button" aria-label="Delete rule" onClick={() => setDeleting(r)} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center"><i aria-hidden="true" className="ph-bold ph-trash" /></button>
            </li>
          );
        })}
      </ul>
      {shown.length < matching.length && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-2 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
          Show all {matching.length} rules
        </button>
      )}
      {editing && <RuleDialog rule={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => void mutate()} />}
      {deleting && (
        <ConfirmDialog title="Delete this rule?" text="Transactions it already categorised keep their category." onClose={() => setDeleting(null)} onConfirm={async () => {
          const res = await send(`/api/money/rules/${deleting.id}`, "DELETE");
          if (res.ok) {
            toast.success("Rule deleted");
            setDeleting(null);
            void mutate();
          }
        }} />
      )}
    </Panel>
  );
}

function RuleDialog({ rule, onClose, onSaved }: { rule: RuleInput | null; onClose: () => void; onSaved: () => void }) {
  const { categories } = useMoneyCategories();
  const { accounts } = useMoneyAccounts();
  const [field, setField] = useState<string>(rule?.field ?? "NARRATION");
  const [pattern, setPattern] = useState(rule?.pattern ?? "");
  const [isRegex, setIsRegex] = useState(rule?.isRegex ?? false);
  const [direction, setDirection] = useState<string>(rule?.direction ?? "");
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? "");
  const [kind, setKind] = useState<string>(rule?.kind ?? "");
  const [targetAccountId, setTarget] = useState(rule?.targetAccountId ?? "");
  const [priority, setPriority] = useState(String(rule?.priority ?? 100));
  const [apply, setApply] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const e: Record<string, string> = {};
    if (pattern.trim().length < 2) e.pattern = "Pattern needs at least 2 characters.";
    else if (isRegex) {
      try {
        new RegExp(pattern.trim(), "i");
      } catch {
        e.pattern = "That pattern isn't a valid regular expression.";
      }
    }
    if (!categoryId && !kind) e.categoryId = "Choose a category or a kind for this rule.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const body = { field, pattern: pattern.trim(), isRegex, direction: direction || null, categoryId: categoryId || null, kind: kind || null, targetAccountId: kind === "CARD_PAYMENT" ? targetAccountId || null : null, priority: Number(priority) || 100 };
    const url = `${rule ? `/api/money/rules/${rule.id}` : "/api/money/rules"}${apply ? "?apply=1" : ""}`;
    const res = await send<{ applied: number }>(url, rule ? "PUT" : "POST", body);
    setBusy(false);
    if (!res.ok) return setErrors(res.errors ?? {});
    toast.success(`Rule saved${apply ? `, applied to ${res.data.applied} transaction${res.data.applied === 1 ? "" : "s"}` : ""}`);
    onSaved();
    onClose();
  };

  return (
    <FormDialog eyebrow={rule ? "Edit rule" : "New rule"} title={rule ? "Edit rule" : "Add a rule"} onClose={onClose} busy={busy} footer={<><button type="button" onClick={onClose} className={`flex-1 ${secondaryButton}`}>Cancel</button><button type="button" onClick={save} disabled={busy} className={`flex-1 ${primaryButton}`}>Save</button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <span className={labelClass}>Look at</span>
          <CustomDropdown options={Object.entries(FIELD_LABELS).map(([value, label]) => ({ value, label }))} value={field} onChange={setField} />
        </div>
        <div>
          <span className={labelClass}>Order</span>
          <CustomDropdown options={[10, 20, 50, 100, 200].map((n) => ({ value: String(n), label: String(n), hint: n === 10 ? "first" : n === 200 ? "last" : undefined }))} value={priority} onChange={setPriority} />
        </div>
      </div>
      <div>
        <label htmlFor="rule-pattern" className={labelClass}>{isRegex ? "Regular expression" : "Contains"}</label>
        <input id="rule-pattern" autoFocus value={pattern} maxLength={200} onChange={(e) => setPattern(e.target.value)} placeholder="e.g. SWIGGY" className={`${inputClass} ${errors.pattern ? "border-red-300" : ""}`} />
        <FieldError message={errors.pattern} />
        <div className="mt-2"><Checkbox checked={isRegex} onChange={setIsRegex} label="It's a regular expression" tone="green" size="sm" /></div>
      </div>
      <div>
        <span className={labelClass}>Only</span>
        <CustomDropdown options={[{ value: "", label: "Debits and credits" }, { value: "DEBIT", label: "Debits (money out)" }, { value: "CREDIT", label: "Credits (money in)" }]} value={direction} onChange={setDirection} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <span className={labelClass}>Category</span>
          <CustomDropdown options={[{ value: "", label: "Leave as is" }, ...categories.map(categoryOption)]} value={categoryId} onChange={setCategoryId} />
          <FieldError message={errors.categoryId} />
        </div>
        <div>
          <span className={labelClass}>Kind</span>
          <CustomDropdown options={[{ value: "", label: "Leave as is" }, ...KIND_OPTIONS]} value={kind} onChange={setKind} />
        </div>
      </div>
      {kind === "CARD_PAYMENT" && (
        <div>
          <span className={labelClass}>Card being paid</span>
          <CustomDropdown options={[{ value: "", label: "Not sure" }, ...accounts.filter((a) => a.type === "CREDIT_CARD").map(accountOption)]} value={targetAccountId} onChange={setTarget} />
          <p className="mt-1.5 text-[11px] font-semibold text-slate-400">Payments then lower that card&apos;s used amount.</p>
        </div>
      )}
      <Checkbox checked={apply} onChange={setApply} label="Also apply to transactions already imported" tone="green" />
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Preferences, backup and restore
// ---------------------------------------------------------------------------

interface Prefs {
  largeSpendThreshold: string;
  forecastDays: number;
  salaryInForecast: boolean;
  dueSoonDays: number;
}

export function PreferencesSettings() {
  const { data, mutate } = useSWR<Prefs>("/api/money/preferences", fetcher);
  if (!data) return null;
  return <PreferencesForm key={JSON.stringify(data)} initial={data} onSaved={(p) => void mutate(p, { revalidate: false })} />;
}

function PreferencesForm({ initial, onSaved }: { initial: Prefs; onSaved: (p: Prefs) => void }) {
  const [threshold, setThreshold] = useState(initial.largeSpendThreshold);
  const [days, setDays] = useState(String(initial.forecastDays));
  const [dueSoon, setDueSoon] = useState(String(initial.dueSoonDays));
  const [salary, setSalary] = useState(initial.salaryInForecast);
  const [error, setError] = useState("");
  const save = async () => {
    const t = normaliseMoney(threshold);
    if (!t || t.startsWith("-")) return setError("Enter an amount like 3000.");
    setError("");
    const res = await send<Prefs>("/api/money/preferences", "PUT", { largeSpendThreshold: t, forecastDays: Number(days), dueSoonDays: Number(dueSoon), salaryInForecast: salary });
    if (res.ok) {
      toast.success("Settings saved");
      onSaved(res.data);
    }
  };
  return (
    <Panel title="Forecast and alerts" icon="ph-bell-ringing" actions={<button type="button" onClick={save} className={primaryButton}>Save</button>}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="pref-large" className={labelClass}>Large one-off spend above</label>
          <MoneyInput id="pref-large" value={threshold} onChange={setThreshold} placeholder="3000" error={!!error} />
          <FieldError message={error} />
          <p className="mt-1.5 text-[11px] font-semibold text-slate-400">Left out of the card daily average. Now {formatINR(initial.largeSpendThreshold)}.</p>
        </div>
        <div>
          <span className={labelClass}>Forecast looks ahead</span>
          <CustomDropdown options={[14, 30, 45, 60, 90].map((n) => ({ value: String(n), label: `${n} days` }))} value={days} onChange={setDays} />
        </div>
        <div>
          <span className={labelClass}>Warn about bills due within</span>
          <CustomDropdown options={[3, 5, 7, 10, 14].map((n) => ({ value: String(n), label: `${n} days` }))} value={dueSoon} onChange={setDueSoon} />
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-800">Count the next salary in the forecast</p>
          <p className="text-[11px] font-semibold text-slate-400">Expected on the last working day of the month, at your last salary&apos;s amount.</p>
        </div>
        <Switch checked={salary} onChange={setSalary} label="Count the next salary in the forecast" />
      </div>
    </Panel>
  );
}

export function BackupSettings() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; data: unknown; counts: string } | null>(null);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const counts = `${data.accounts?.length ?? 0} accounts, ${data.transactions?.length ?? 0} transactions and ${data.commitments?.length ?? 0} commitments`;
      setPending({ name: file.name, data, counts });
    } catch {
      toast.error("That isn't a backup file.");
    }
    if (inputRef.current) inputRef.current.value = "";
  };
  return (
    <Panel title="Backup and restore" subtitle="A backup holds your transactions as readable text: keep the file somewhere safe." icon="ph-database">
      <div className="flex flex-wrap gap-2">
        <a href="/api/money/backup" className={primaryButton}><i aria-hidden="true" className="ph-bold ph-download-simple" /> Download a backup</a>
        <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} className={secondaryButton}><i aria-hidden="true" className="ph-bold ph-upload-simple" /> Restore from a backup</button>
      </div>
      {pending && (
        <ConfirmDialog
          title="Replace everything with this backup?"
          text={<>All your current tracker data is replaced by <b>{pending.name}</b> ({pending.counts}). This can&apos;t be undone, so download a backup of what you have now first.</>}
          confirmLabel="Replace"
          onClose={() => setPending(null)}
          onConfirm={async () => {
            const res = await send<{ transactions: number }>("/api/money/backup", "POST", pending.data);
            if (res.ok) {
              toast.success(`Restored ${res.data.transactions} transactions`);
              setPending(null);
              setTimeout(() => window.location.reload(), 600);
            }
          }}
        />
      )}
    </Panel>
  );
}
