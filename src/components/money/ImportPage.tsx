"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import CustomDropdown from "@/components/ui/CustomDropdown";
import Checkbox from "@/components/ui/Checkbox";
import Switch from "@/components/settings/common/Switch";
import { formatINR, formatMoneyDate } from "@/lib/money/format";
import type { StatementPreview } from "@/lib/money/server/importer";
import type { previewSheet } from "@/lib/money/server/sheetImport";
import { accountOption, useMoneyAccounts } from "./hooks";
import { AccountChip, Amount, COMMITMENT_TYPES, ConfirmDialog, EmptyState, Panel, inputClass, labelClass, primaryButton, secondaryButton } from "./ui";

type SheetPreview = Awaited<ReturnType<typeof previewSheet>>;
type Preview = StatementPreview | SheetPreview;

interface ImportRow {
  id: string;
  accountId: string;
  sourceType: string;
  filename: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  openingBalance: string | null;
  closingBalance: string | null;
  status: "OK" | "NEEDS_REVIEW";
  warnings: { code: string; message: string }[];
  importedAt: string;
  transactionCount: number;
}

const SOURCE_LABEL: Record<string, string> = { HDFC_PDF: "HDFC statement", KVB_PDF: "KVB statement", CARD_CSV: "Card spends (CSV)", AA_JSON: "Account Aggregator data" };
const thisYear = new Date().getFullYear();

/** /money/import: drop a file, check the preview, then save. */
export default function ImportPage() {
  const { accounts, byId } = useMoneyAccounts();
  const { data: history = [], mutate: refreshHistory } = useSWR<ImportRow[]>("/api/money/imports", fetcher);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState<"NEEDS_PASSWORD" | "WRONG_PASSWORD" | null>(null);
  const [accountId, setAccountId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [deleting, setDeleting] = useState<ImportRow | null>(null);
  // Sheet options
  const [firstYear, setFirstYear] = useState(thisYear);
  const [skip, setSkip] = useState<string[]>([]);
  const [sheetAccounts, setSheetAccounts] = useState<{ emi?: string; bill?: string; pool?: string }>({});
  const [setPoolBalance, setSetPoolBalance] = useState(true);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setPassword("");
    setNeedsPassword(null);
    setAccountId("");
    setShowAll(false);
    setSkip([]);
    setSheetAccounts({});
    if (inputRef.current) inputRef.current.value = "";
  };

  const run = async (mode: "preview" | "commit", f: File, overrides: { accountId?: string; password?: string; firstYear?: number; sheetAccounts?: typeof sheetAccounts } = {}) => {
    const form = new FormData();
    form.set("file", f);
    form.set("mode", mode);
    const acc = overrides.accountId ?? accountId;
    if (acc) form.set("accountId", acc);
    const pw = overrides.password ?? password;
    if (pw) form.set("password", pw);
    if (/\.xlsx$/i.test(f.name)) {
      form.set("options", JSON.stringify({ firstYear: overrides.firstYear ?? firstYear, skip, accounts: overrides.sheetAccounts ?? sheetAccounts, setPoolBalance }));
    }
    setBusy(true);
    try {
      const res = await fetch("/api/money/import", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "NEEDS_PASSWORD" || data.code === "WRONG_PASSWORD") {
          setNeedsPassword(data.code);
          if (data.code === "WRONG_PASSWORD") toast.error(data.error);
          return null;
        }
        toast.error(data.error || "That file couldn't be imported.");
        return null;
      }
      setNeedsPassword(null);
      return data;
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    reset();
    setFile(f);
    const data = await run("preview", f, { accountId: "", password: "" });
    if (data) setPreview(data);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void pick(e.dataTransfer.files?.[0]);
  };

  const commit = async () => {
    if (!file || !preview) return;
    const data = await run("commit", file);
    if (!data) return;
    if (preview.type === "sheet") {
      toast.success(`${data.created} commitment${data.created === 1 ? "" : "s"} added${data.poolBalanceSet ? ", and the balance set" : ""}`);
    } else {
      toast.success(
        `${data.inserted} transaction${data.inserted === 1 ? "" : "s"} imported` +
          (data.selfTransfers ? `, ${data.selfTransfers} self transfer${data.selfTransfers === 1 ? "" : "s"} matched` : "") +
          (data.replaced ? `, ${data.replaced} you'd typed in now from the statement` : ""),
      );
    }
    reset();
    void refreshHistory();
  };

  const statement = preview?.type === "statement" ? preview : null;
  const sheet = preview?.type === "sheet" ? preview : null;
  const wantCards = statement?.source === "CARD_CSV";
  const accountChoices = accounts.filter((a) => (wantCards ? a.type === "CREDIT_CARD" : a.type === "BANK")).map(accountOption);
  const chosenAccount = statement?.accountId ?? "";
  const rows = statement ? (showAll ? statement.rows : statement.rows.slice(0, 60)) : [];

  return (
    <div className="space-y-6">
      {!preview && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`rounded-3xl border-2 border-dashed px-6 py-12 text-center transition ${dragging ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"}`}
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center text-3xl shadow-md">
            <i aria-hidden="true" className={`ph-fill ${busy ? "ph-circle-notch animate-spin" : "ph-upload-simple"}`} />
          </div>
          <p className="mt-4 text-lg font-extrabold text-slate-900">{busy ? `Reading ${file?.name ?? "file"}…` : "Drop a statement or file here"}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">HDFC or KVB statement PDF, card spends CSV (date,time,merchant,amount,category), Account Aggregator JSON, or your EMI Excel sheet.</p>
          <input ref={inputRef} type="file" accept=".pdf,.csv,.json,.xlsx" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className={`mt-5 ${primaryButton}`}>
            <i aria-hidden="true" className="ph-bold ph-folder-open" /> Choose a file
          </button>
          <p className="mt-4 text-[11px] font-semibold text-slate-400 flex items-center justify-center gap-1">
            <i aria-hidden="true" className="ph-bold ph-lock-simple" /> The file and its password are read on the server and not kept.
          </p>
        </div>
      )}

      {needsPassword && file && (
        <Panel title="This PDF is password protected" subtitle={file.name} icon="ph-lock-key">
          <form
            noValidate
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = await run("preview", file);
              if (data) setPreview(data);
            }}
          >
            <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Statement password" autoComplete="off" className={`${inputClass} ${needsPassword === "WRONG_PASSWORD" ? "border-red-300" : ""}`} />
            <div className="flex gap-2">
              <button type="submit" disabled={busy || !password} className={primaryButton}>Open</button>
              <button type="button" onClick={reset} className={secondaryButton}>Cancel</button>
            </div>
          </form>
          <p className="mt-2 text-[11px] font-semibold text-slate-400">Used once to open the file. Never saved.</p>
        </Panel>
      )}

      {statement && file && (
        <Panel
          title={SOURCE_LABEL[statement.source] ?? "Statement"}
          subtitle={file.name}
          icon="ph-file-text"
          actions={<button type="button" onClick={reset} className={secondaryButton}>Choose another file</button>}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <span className={labelClass}>Account</span>
              <CustomDropdown
                options={accountChoices}
                value={chosenAccount}
                placeholder={wantCards ? "Choose the card" : "Choose the account"}
                onChange={async (v) => {
                  setAccountId(v);
                  const data = await run("preview", file, { accountId: v });
                  if (data) setPreview(data);
                }}
              />
              {statement.accountLast4 && <p className="text-[11px] font-semibold text-slate-400 mt-1.5">The statement is for an account ending {statement.accountLast4}.</p>}
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ["Period", statement.periodFrom ? `${formatMoneyDate(statement.periodFrom)} – ${formatMoneyDate(statement.periodTo)}` : null],
                ["Opening", statement.openingBalance ? formatINR(statement.openingBalance) : null],
                ["Closing", statement.closingBalance ? formatINR(statement.closingBalance) : null],
                ["Rows", `${statement.newCount} new${statement.duplicateCount ? ` · ${statement.duplicateCount} already in` : ""}`],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-sm font-extrabold text-slate-900">{value}</p>
                  </div>
                ))}
            </div>
          </div>

          <div className={`mt-4 rounded-2xl border px-4 py-3 ${statement.validation.ok ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
            <p className="text-sm font-extrabold flex items-center gap-2">
              <i aria-hidden="true" className={`ph-fill ${statement.validation.ok ? "ph-check-circle" : "ph-warning"}`} />
              {statement.validation.ok
                ? `Every balance adds up: ${statement.validation.totals.debitCount} debits (${formatINR(statement.validation.totals.debits)}), ${statement.validation.totals.creditCount} credits (${formatINR(statement.validation.totals.credits)}).`
                : "Some checks didn't pass. It will still import, marked for review."}
            </p>
            {!statement.validation.ok && (
              <ul className="mt-2 space-y-1 text-xs font-semibold list-disc pl-5">
                {statement.validation.warnings.slice(0, 8).map((w, i) => <li key={i}>{w.message}</li>)}
                {statement.validation.warnings.length > 8 && <li>…and {statement.validation.warnings.length - 8} more.</li>}
              </ul>
            )}
          </div>

          {statement.alreadyImported && (
            <p className="mt-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700">This exact file was already imported into this account.</p>
          )}

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Narration</th>
                  <th className="px-3 py-2">Ref</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-t border-slate-50 ${r.duplicate ? "opacity-45" : ""}`}>
                    <td className="px-3 py-2 font-bold text-slate-600 whitespace-nowrap">{formatMoneyDate(r.txnDate)}{r.txnTime ? <span className="block text-[10px] text-slate-400">{r.txnTime}</span> : null}</td>
                    <td className="px-3 py-2 font-semibold text-slate-700 max-w-[380px]">
                      <span className="line-clamp-2 break-all">{r.narration}</span>
                      {r.duplicate && <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 text-[10px] font-extrabold text-slate-500">Already imported</span>}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-400">{r.refNo}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap"><Amount value={r.amount} direction={r.direction} /></td>
                    <td className="px-3 py-2 text-right font-bold text-slate-600 whitespace-nowrap">{r.balanceAfter ? formatINR(r.balanceAfter) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {statement.rows.length > 60 && !showAll && (
            <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-xs font-bold text-emerald-600">Show all {statement.rows.length} rows</button>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={reset} className={secondaryButton}>Cancel</button>
            <button type="button" onClick={commit} disabled={busy || !chosenAccount || statement.alreadyImported || statement.newCount === 0} className={primaryButton}>
              {busy && <i aria-hidden="true" className="ph-bold ph-circle-notch animate-spin" />}
              {statement.newCount === 0 ? "Nothing new to import" : `Import ${statement.newCount} transaction${statement.newCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </Panel>
      )}

      {sheet && file && (
        <Panel title="Commitments from your sheet" subtitle={file.name} icon="ph-table" actions={<button type="button" onClick={reset} className={secondaryButton}>Choose another file</button>}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <span className={labelClass}>First month&apos;s year</span>
              <CustomDropdown
                options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({ value: String(y), label: `${sheet.months[0] ? new Date(`${sheet.months[0]}-01T00:00:00Z`).toLocaleString("en-IN", { month: "short", timeZone: "UTC" }) : ""} ${y}` }))}
                value={String(firstYear)}
                onChange={async (v) => {
                  setFirstYear(Number(v));
                  const data = await run("preview", file, { firstYear: Number(v) });
                  if (data) setPreview(data);
                }}
              />
            </div>
            {([
              ["emi", "Card the EMI is on", "CREDIT_CARD"],
              ["bill", "Card for \"other expense\"", "CREDIT_CARD"],
              ["pool", "Available-money account", "BANK"],
            ] as const).map(([key, label, type]) => (
              <div key={key}>
                <span className={labelClass}>{label}</span>
                <CustomDropdown
                  options={accounts.filter((a) => a.type === type).map(accountOption)}
                  value={sheetAccounts[key] ?? (key === "pool" ? sheet.poolBalance?.accountId : sheet.commitments.find((c) => c.type === (key === "emi" ? "CARD_EMI" : "CARD_BILL"))?.accountId) ?? ""}
                  placeholder="Choose"
                  onChange={async (v) => {
                    const next = { ...sheetAccounts, [key]: v };
                    setSheetAccounts(next);
                    const data = await run("preview", file, { sheetAccounts: next });
                    if (data) setPreview(data);
                  }}
                />
              </div>
            ))}
          </div>

          <ul className="mt-5 space-y-2">
            {sheet.commitments.map((c) => {
              const t = COMMITMENT_TYPES[c.type];
              const on = !skip.includes(c.key);
              return (
                <li key={c.key} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${on ? "border-slate-100 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}>
                  <Checkbox checked={on} onChange={(v) => setSkip((s) => (v ? s.filter((k) => k !== c.key) : [...s, c.key]))} ariaLabel={`Include ${c.name}`} tone="green" />
                  <div className="w-9 h-9 shrink-0 rounded-xl text-white flex items-center justify-center" style={{ backgroundColor: t.color }}>
                    <i aria-hidden="true" className={`ph-fill ${t.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-900">
                      {c.name} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">{t.label}</span>
                    </p>
                    <p className="text-xs font-semibold text-slate-500">{formatINR(c.totalAmount)} · {c.note}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      {c.schedule.map((s) => `${formatMoneyDate(s.dueDate).slice(3)} ${formatINR(s.amount)}${Number(s.paidAmount) > 0 ? " paid" : ""}`).join(" · ")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {sheet.poolBalance && (
            <div className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-800">Set {sheet.poolBalance.label} to {formatINR(sheet.poolBalance.amount)}</p>
                <p className="text-[11px] font-semibold text-slate-400">The sheet&apos;s balance, as of today. A statement with later rows takes over from it.</p>
              </div>
              <Switch checked={setPoolBalance} onChange={setSetPoolBalance} label="Set the balance" />
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={reset} className={secondaryButton}>Cancel</button>
            <button type="button" onClick={commit} disabled={busy || sheet.commitments.length === skip.length} className={primaryButton}>
              {busy && <i aria-hidden="true" className="ph-bold ph-circle-notch animate-spin" />}
              Add {sheet.commitments.length - skip.length} commitment{sheet.commitments.length - skip.length === 1 ? "" : "s"}
            </button>
          </div>
        </Panel>
      )}

      <Panel title="Imported files" subtitle="Deleting an import removes the transactions it added." icon="ph-clock-counter-clockwise">
        {history.length === 0 ? (
          <EmptyState icon="ph-files" title="Nothing imported yet" text="Your first statement will show up here with its checks." />
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="flex flex-col gap-2 rounded-2xl border border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AccountChip account={byId.get(h.accountId)} />
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${h.status === "OK" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                      {h.status === "OK" ? "Checks passed" : "Needs a look"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800">{h.filename ?? h.sourceType}</p>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {[h.periodFrom ? `${formatMoneyDate(h.periodFrom)} – ${formatMoneyDate(h.periodTo)}` : null, `${h.transactionCount} transactions`, `imported ${formatMoneyDate(h.importedAt)}`].filter(Boolean).join(" · ")}
                  </p>
                  {h.status !== "OK" && h.warnings.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-[11px] font-semibold text-amber-700">
                      {h.warnings.slice(0, 3).map((w, i) => <li key={i}>{w.message}</li>)}
                    </ul>
                  )}
                </div>
                <button type="button" onClick={() => setDeleting(h)} className="h-9 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1.5">
                  <i aria-hidden="true" className="ph-bold ph-trash" /> Delete
                </button>
              </li>
            ))}
          </ul>
        )}
        {history.length > 0 && (
          <p className="mt-3 text-xs font-semibold text-slate-400">
            Next: check them in <Link href="/money/transactions" className="font-bold text-emerald-600">Transactions</Link>.
          </p>
        )}
      </Panel>

      {deleting && (
        <ConfirmDialog
          title="Delete this import?"
          text={`Its ${deleting.transactionCount} transactions go too. Self transfers they were matched with go back to unmatched.`}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const res = await fetch(`/api/money/imports/${deleting.id}`, { method: "DELETE" });
            if (!res.ok) {
              toast.error("Couldn't delete the import.");
              return;
            }
            toast.success("Import deleted");
            setDeleting(null);
            void refreshHistory();
          }}
        />
      )}
    </div>
  );
}
