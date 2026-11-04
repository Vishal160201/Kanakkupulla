"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FieldError, InventoryDialog, Pill, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass, type PillTone } from "@/components/inventory/InventoryUI";
import { errorMessage, sendJson } from "@/components/inventory/inventoryUtils";
import type { BoxStatus, ImportRow } from "@/lib/cableImport";
import { cn } from "@/lib/utils";
import { PasswordNeeded, readSubscriberFile } from "./subscriberFiles";
import { useRevalidateCable } from "./useCableData";

interface Result {
  sheet: string | null;
  line: number;
  name: string | null;
  tamilName: string | null;
  vcNumber: string | null;
  oldVcNumber: string | null;
  status: BoxStatus;
  byOldVc: boolean;
  shared: boolean;
  account: string | null;
  tcclName: string | null;
}

const TONE: Record<BoxStatus, PillTone> = { "Box active": "green", "Box deactivated": "red", "Not in TCCL": "slate", "Not found in TCCL": "amber", "No VC": "slate" };
const ORDER: BoxStatus[] = ["Box active", "Box deactivated", "Not in TCCL", "Not found in TCCL", "No VC"];

/** Reads an xlsx / csv of subscribers, shows each row's TCCL box status, then saves the matched rows. */
export default function ImportSubscribersDialog({ shopId, canSave, onClose }: { shopId: string; canSave: boolean; onClose: () => void }) {
  const revalidate = useRevalidateCable();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [filter, setFilter] = useState<BoxStatus | "all">("all");
  const [busy, setBusy] = useState<"reading" | "saving" | null>(null);
  // A password-protected file waiting for its password
  const [locked, setLocked] = useState<{ file: File; error: string | null } | null>(null);
  const [password, setPassword] = useState("");

  const pick = async (f: File | undefined, pw?: string) => {
    if (!f) return;
    setBusy("reading");
    setResults(null);
    setFilter("all");
    try {
      const read = await readSubscriberFile(f, pw);
      if (read.length === 0) throw new Error("The file has no subscriber rows.");
      const r = await sendJson<{ results: Result[] }>("/api/cable/subscribers/import", "POST", { shopId, apply: false, rows: read });
      setFile(f.name);
      setRows(read);
      setResults(r.results);
      setLocked(null);
      setPassword("");
    } catch (err) {
      if (err instanceof PasswordNeeded) setLocked({ file: f, error: pw ? err.message : null });
      else toast.error(errorMessage(err));
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const savable = results?.filter((r) => r.account && !r.shared).length ?? 0;
  const save = async () => {
    setBusy("saving");
    try {
      const r = await sendJson<{ saved: number }>("/api/cable/subscribers/import", "POST", { shopId, apply: true, rows });
      toast.success(`${r.saved} subscriber${r.saved === 1 ? "" : "s"} updated`, { description: "Names, Tamil names, mobiles and old VCs from the file." });
      revalidate();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const counts = Object.fromEntries(ORDER.map((s) => [s, results?.filter((r) => r.status === s).length ?? 0])) as Record<BoxStatus, number>;
  const shown = results?.filter((r) => filter === "all" || r.status === filter) ?? [];

  return (
    <InventoryDialog
      open
      onClose={onClose}
      busy={!!busy}
      size="xl"
      eyebrow="TCCL cable TV"
      title="Import subscribers"
      subtitle={file ?? "Excel (.xlsx) or CSV with VC number, and optionally Name (English), Name (Tamil), Old VC and Mobile columns"}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={!!busy} className={cn(secondaryButtonClass, "h-10")}>Cancel</button>
          {results && canSave && (
            <button type="button" onClick={() => void save()} disabled={!!busy || savable === 0} className={cn(primaryButtonClass, "h-10")}>
              {busy === "saving" ? <i className="ph ph-circle-notch animate-spin" aria-hidden="true" /> : <i className="ph-bold ph-check" aria-hidden="true" />}
              Save {savable} matched
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <input ref={input} type="file" accept=".xlsx,.csv" className="sr-only" aria-label="Choose a file" onChange={(e) => void pick(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={!!busy}
          className="w-full rounded-2xl border-2 border-dashed border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 px-4 py-5 text-sm font-bold text-slate-600 flex items-center justify-center gap-2 transition-colors"
        >
          {busy === "reading" ? <i className="ph ph-circle-notch animate-spin" aria-hidden="true" /> : <i className="ph-bold ph-upload-simple text-orange-600" aria-hidden="true" />}
          {busy === "reading" ? "Checking with TCCL…" : results || locked ? "Choose another file" : "Choose an Excel or CSV file"}
        </button>

        {locked && (
          <form
            noValidate
            className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!password) return setLocked({ ...locked, error: "Enter the file's password." });
              void pick(locked.file, password);
            }}
          >
            <label htmlFor="import-password" className={labelClass}>
              <i className="ph-bold ph-lock-key mr-1" aria-hidden="true" /> Password for {locked.file.name}
            </label>
            <div className="flex gap-2">
              <input
                id="import-password"
                type="password"
                autoComplete="off"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(inputClass, "flex-1", locked.error && inputErrorClass)}
                aria-invalid={!!locked.error}
              />
              <button type="submit" disabled={!!busy} className={cn(primaryButtonClass, "h-11 shrink-0")}>
                {busy === "reading" ? <i className="ph ph-circle-notch animate-spin" aria-hidden="true" /> : <i className="ph-bold ph-lock-key-open" aria-hidden="true" />}
                Open
              </button>
            </div>
            <FieldError message={locked.error} />
            <p className="text-[11px] font-semibold text-slate-400">The file is opened on our server and not stored. The password isn&apos;t saved.</p>
          </form>
        )}

        {results && (
          <>
            <p className="text-sm font-semibold text-slate-600">
              {results.length} rows checked against the last TCCL sync. Rows are matched by VC number, or by old VC when the VC isn&apos;t in TCCL.
              {!canSave && " You can view this but not save it."}
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Status filter">
              {(["all", ...ORDER] as const).map((s) => (s === "all" || counts[s] > 0) && (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={filter === s}
                  onClick={() => setFilter(s)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-bold border transition-colors", filter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}
                >
                  {s === "all" ? "All" : s} <span className="opacity-60">{s === "all" ? results.length : counts[s]}</span>
                </button>
              ))}
            </div>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 max-h-[45vh] overflow-y-auto">
              {shown.map((r, i) => (
                <li key={`${r.sheet}-${r.line}-${i}`} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="w-16 shrink-0 text-[11px] font-bold text-slate-400 truncate" title={r.sheet ? `${r.sheet}, row ${r.line}` : `Row ${r.line}`}>
                    {r.sheet ? `${r.sheet} · ${r.line}` : `#${r.line}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 truncate">
                      {r.name ?? "No name"}
                      {r.tamilName && <span className="font-semibold text-slate-500"> ({r.tamilName})</span>}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate">
                      {[r.vcNumber && `VC ${r.vcNumber}`, r.oldVcNumber && r.oldVcNumber !== r.vcNumber && `old ${r.oldVcNumber}`, r.account && `TCCL ${r.account} · ${r.tcclName}`].filter(Boolean).join(" · ")}
                    </div>
                    {(r.byOldVc || r.shared) && (
                      <div className="text-[11px] font-semibold text-amber-700">
                        {r.shared ? "Another row matches the same TCCL account, so neither is saved" : "Matched by old VC; the VC in the file isn't in TCCL"}
                      </div>
                    )}
                  </div>
                  <Pill tone={TONE[r.status]}>{r.status}</Pill>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </InventoryDialog>
  );
}
