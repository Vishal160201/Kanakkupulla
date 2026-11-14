"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { formatINR, formatMoneyDate } from "@/lib/money/format";
import { ConfirmDialog, Panel, inputClass, primaryButton, secondaryButton, send } from "./ui";

interface LogEntry {
  at: string;
  outcome: "added" | "duplicate" | "skipped" | "no-account";
  detail: string;
  amount?: string;
  direction?: "DEBIT" | "CREDIT";
  account?: string;
}
interface Connection {
  connected: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
  url: string;
  log: LogEntry[];
}
type Preview =
  | { ok: false; reason: string }
  | { ok: true; account: { id: string; name: string } | null; txn: { amount: string; direction: "DEBIT" | "CREDIT"; date: string; counterparty: string | null; upiId: string | null; refNo: string | null; last4: string | null; isCard: boolean } };

const OUTCOME: Record<LogEntry["outcome"], { icon: string; tone: string }> = {
  added: { icon: "ph-check-circle", tone: "text-emerald-600 bg-emerald-50" },
  duplicate: { icon: "ph-copy", tone: "text-slate-500 bg-slate-100" },
  skipped: { icon: "ph-funnel-simple", tone: "text-slate-500 bg-slate-100" },
  "no-account": { icon: "ph-warning-circle", tone: "text-amber-600 bg-amber-50" },
};

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const copy = async (text: string, what: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error("Couldn't copy. Select it and copy instead.");
  }
};

function CopyRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-slate-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className={`min-w-0 flex-1 break-all text-xs font-bold ${secret ? "text-violet-700" : "text-slate-800"}`}>{value}</code>
        <button type="button" onClick={() => void copy(value, label)} className="shrink-0 h-9 rounded-xl bg-white border border-slate-200 px-3 text-xs font-bold text-slate-600 inline-flex items-center gap-1.5">
          <i aria-hidden="true" className="ph-bold ph-copy" /> Copy
        </button>
      </div>
    </div>
  );
}

/** My Wallet → Settings: forward bank SMS from an iPhone (Shortcuts automation) so UPI and card payments appear by themselves. */
export default function SmsSettings() {
  const { data, mutate } = useSWR<Connection>("/api/money/sms/connection", fetcher, { refreshInterval: 30_000 });
  const [fresh, setFresh] = useState<{ token: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [sample, setSample] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  const connect = async () => {
    setBusy(true);
    const res = await send<{ token: string; url: string }>("/api/money/sms/connection", "POST", {});
    setBusy(false);
    if (!res.ok) return;
    setFresh(res.data);
    void mutate();
  };

  const tryIt = async () => {
    if (!sample.trim()) {
      setPreview({ ok: false, reason: "paste an SMS first" });
      return;
    }
    const res = await send<Preview>("/api/money/sms/preview", "POST", { text: sample });
    if (res.ok) setPreview(res.data);
  };

  const url = fresh?.url ?? data?.url ?? "";
  return (
    <Panel
      title="iPhone SMS"
      subtitle="GPay, PhonePe, Paytm and Kiwi payments appear by themselves: your iPhone forwards each bank SMS here."
      icon="ph-device-mobile"
      actions={
        data?.connected ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => void connect()} disabled={busy} className={secondaryButton}><i aria-hidden="true" className="ph-bold ph-key" /> New key</button>
            <button type="button" onClick={() => setDisconnecting(true)} className={secondaryButton}><i aria-hidden="true" className="ph-bold ph-plugs" /> Disconnect</button>
          </div>
        ) : (
          <button type="button" onClick={() => void connect()} disabled={busy} className={primaryButton}><i aria-hidden="true" className="ph-bold ph-link" /> Connect iPhone</button>
        )
      }
    >
      <div className="space-y-5">
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${data?.connected ? "bg-gradient-to-r from-emerald-50 to-teal-50" : "bg-slate-50"}`}>
          <span className={`w-10 h-10 shrink-0 rounded-xl text-white flex items-center justify-center ${data?.connected ? "bg-gradient-to-br from-emerald-500 to-teal-500" : "bg-slate-300"}`}>
            <i aria-hidden="true" className={`ph-fill ${data?.connected ? "ph-check-circle" : "ph-device-mobile-slash"} text-xl`} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-800">{data?.connected ? "Connected" : "Not connected"}</p>
            <p className="text-xs font-semibold text-slate-500">
              {data?.connected ? (data.lastUsedAt ? `Last SMS ${when(data.lastUsedAt)}` : "Waiting for the first SMS") : "Connect, then add the automation on your iPhone."}
            </p>
          </div>
        </div>

        {fresh && (
          <div className="rounded-3xl border-2 border-violet-200 bg-violet-50/50 p-4 space-y-3">
            <p className="flex items-center gap-2 text-sm font-extrabold text-violet-800"><i aria-hidden="true" className="ph-fill ph-key" /> Your phone key: copy it now, it&apos;s shown only once</p>
            <CopyRow label="Web address" value={url} />
            <CopyRow label="Authorization header" value={`Bearer ${fresh.token}`} secret />
          </div>
        )}

        <details className="group rounded-2xl border border-slate-100 p-4" open={!!fresh}>
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-extrabold text-slate-800">
            Set up the iPhone automation
            <i aria-hidden="true" className="ph-bold ph-caret-down transition group-open:rotate-180" />
          </summary>
          <ol className="mt-3 space-y-2.5 text-sm font-medium text-slate-600">
            {[
              <>Open <b>Shortcuts</b> → <b>Automation</b> → <b>+</b> → <b>Message</b>.</>,
              <>Tap <b>Message Contains</b> and type <b>Rs</b>. Choose <b>Run Immediately</b> and turn <b>Notify When Run</b> off. Tap <b>Next</b>.</>,
              <>Tap <b>New Blank Automation</b>, add the action <b>Get Contents of URL</b>, and paste the <b>web address</b> above.</>,
              <>Tap the arrow next to it. Set <b>Method</b> to <b>POST</b>. Under <b>Headers</b> add <b>Authorization</b> with the header value above.</>,
              <>Under <b>Request Body</b> pick <b>JSON</b>, add a <b>Text</b> field named <b>text</b>, and set its value to <b>Shortcut Input</b> → <b>Content</b>. Tap <b>Done</b>.</>,
              <>Make a second automation the same way with <b>INR</b> instead of Rs (Yes Bank and some HDFC alerts use INR). A message caught by both is still saved once.</>,
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-[11px] font-extrabold text-white flex items-center justify-center">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            Only payment alerts are kept. OTPs, offers, reminders and failed payments are dropped without being saved. When the bank statement comes in, its rows replace these entries.
          </p>
        </details>

        <div>
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[1.5px] text-slate-500">Try a message</p>
          <textarea
            value={sample}
            onChange={(e) => { setSample(e.target.value); setPreview(null); }}
            rows={3}
            placeholder="Paste a bank SMS to see what it would add. Nothing is saved."
            className={`${inputClass} h-auto py-2.5 resize-none`}
          />
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => void tryIt()} className={secondaryButton}><i aria-hidden="true" className="ph-bold ph-magic-wand" /> Check</button>
            {preview && !preview.ok && <p className="text-xs font-bold text-slate-500">Would be skipped: {preview.reason}.</p>}
          </div>
          {preview?.ok && (
            <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm">
              <p className={`font-extrabold ${preview.txn.direction === "DEBIT" ? "text-rose-600" : "text-emerald-600"}`}>
                {preview.txn.direction === "DEBIT" ? "−" : "+"}{formatINR(preview.txn.amount)}
                <span className="ml-2 text-slate-700">{preview.txn.counterparty ?? preview.txn.upiId ?? (preview.txn.direction === "DEBIT" ? "Payment" : "Money in")}</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {formatMoneyDate(preview.txn.date)}
                {preview.account ? ` · ${preview.account.name}` : ""}
                {preview.txn.refNo ? ` · Ref ${preview.txn.refNo}` : ""}
              </p>
              {!preview.account && (
                <p className="mt-1 text-xs font-bold text-amber-600">
                  {preview.txn.last4 ? `No account or card ending ${preview.txn.last4} yet. Add those digits to the account above.` : "Couldn't tell which account. Add the last 4 digits to your accounts."}
                </p>
              )}
            </div>
          )}
        </div>

        {data && data.log.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[1.5px] text-slate-500">Recent messages</p>
            <ul className="space-y-1.5">
              {data.log.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                  <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${OUTCOME[e.outcome].tone}`}><i aria-hidden="true" className={`ph-bold ${OUTCOME[e.outcome].icon}`} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-700">{e.detail}</span>
                    <span className="block text-[11px] font-semibold text-slate-400">{when(e.at)}{e.account ? ` · ${e.account}` : ""}</span>
                  </span>
                  {e.amount && <span className={`shrink-0 text-sm font-extrabold tabular-nums ${e.direction === "DEBIT" ? "text-rose-600" : "text-emerald-600"}`}>{e.direction === "DEBIT" ? "−" : "+"}{formatINR(e.amount)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {disconnecting && (
        <ConfirmDialog
          title="Disconnect the iPhone?"
          text="Its key stops working at once. Entries already added stay."
          confirmLabel="Disconnect"
          onClose={() => setDisconnecting(false)}
          onConfirm={async () => {
            const res = await send("/api/money/sms/connection", "DELETE");
            if (res.ok) {
              toast.success("iPhone disconnected");
              setFresh(null);
              setDisconnecting(false);
              void mutate();
            }
          }}
        />
      )}
    </Panel>
  );
}
