"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import type { CableSubscriberListResponse } from "@/types/cable";
import { InventoryDialog, primaryButtonClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage, sendJson } from "@/components/inventory/inventoryUtils";

async function copy(value: string, what: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${what} copied`);
  } catch {
    toast.error(`Couldn't copy. Select the ${what.toLowerCase()} and copy it yourself.`);
  }
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-1 py-1">
      <code className="flex-1 min-w-0 truncate text-xs font-bold text-slate-800 select-all">{value}</code>
      <button type="button" onClick={() => copy(value, label)} className="shrink-0 h-8 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100">
        <i className="ph-bold ph-copy mr-1" aria-hidden="true" />
        Copy
      </button>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="w-7 h-7 rounded-full bg-orange-50 text-orange-600 text-sm font-extrabold flex items-center justify-center shrink-0">{n}</span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-bold text-slate-800 leading-7">{title}</p>
        {children}
      </div>
    </li>
  );
}

/** How to connect the Kanakkupulla browser extension to this shop, and the sync key it needs. */
export default function SyncSetupDialog({ shopId, onClose }: { shopId: string; onClose: () => void }) {
  const { data } = useSWR<CableSubscriberListResponse>(`/api/cable/subscribers?shopId=${encodeURIComponent(shopId)}`, fetcher);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const createKey = async () => {
    setBusy(true);
    try {
      const res = await sendJson<{ key: string }>("/api/cable/sync-key", "POST", { shopId });
      setKey(res.key);
      setConfirmReplace(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const hasKey = data?.hasSyncKey && !key;
  const muted = "text-xs font-medium text-slate-500 leading-relaxed";

  return (
    <InventoryDialog
      open
      onClose={onClose}
      busy={busy}
      eyebrow="TIC Fiber · TCCL"
      title="Sync setup"
      subtitle="A Chrome extension reads your TIC Fiber and TCCL portals every minute and updates this shop."
      size="lg"
      footer={
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={secondaryButtonClass} disabled={busy}>
            Done
          </button>
        </div>
      }
    >
      <ol className="space-y-5">
        <Step n={1} title="Install the extension in Chrome">
          <p className={muted}>
            Open <code className="font-bold">chrome://extensions</code>, switch on <b>Developer mode</b>, click <b>Load unpacked</b> and choose the{" "}
            <code className="font-bold">browser-extension</code> folder from the Kanakkupulla project. Use the Chrome that stays open in the shop.
          </p>
        </Step>

        <Step n={2} title="Get a sync key for this shop">
          {key ? (
            <>
              <CopyField label="Sync key" value={key} />
              <p className="text-xs font-bold text-amber-700">
                <i className="ph-bold ph-warning mr-1" aria-hidden="true" />
                Copy it now. It isn&apos;t shown again; make a new one if you lose it.
              </p>
            </>
          ) : hasKey && !confirmReplace ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <p className={`${muted} flex-1`}>This shop already has a sync key in use.</p>
              <button type="button" onClick={() => setConfirmReplace(true)} className={secondaryButtonClass}>
                <i className="ph-bold ph-key" aria-hidden="true" /> Make a new key
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {confirmReplace && <p className="text-xs font-bold text-amber-700">The extension stops syncing until you paste the new key into it.</p>}
              <div className="flex gap-2">
                <button type="button" onClick={createKey} disabled={busy || !data} className={primaryButtonClass}>
                  <i className={busy ? "ph ph-circle-notch animate-spin" : "ph-bold ph-key"} aria-hidden="true" />
                  {confirmReplace ? "Replace key" : "Create sync key"}
                </button>
                {confirmReplace && (
                  <button type="button" onClick={() => setConfirmReplace(false)} className={secondaryButtonClass} disabled={busy}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </Step>

        <Step n={3} title="Paste these into the extension's options">
          <p className={muted}>Click the extension&apos;s icon, then paste:</p>
          <CopyField label="Kanakkupulla address" value={typeof window === "undefined" ? "" : window.location.origin} />
          <p className={muted}>and the sync key from step 2, then Save.</p>
        </Step>

        <Step n={4} title="Stay logged in to the portals">
          <p className={muted}>
            Log in at <code className="font-bold">partner.ticfiber.in</code> (internet) and <code className="font-bold">sms.tccl.co.in</code> (cable TV) in the same Chrome, and tick the
            portals you use in the extension. It uses those logins and never sees your passwords. If a portal logs you out, the extension icon shows a red badge until you log in again.
          </p>
        </Step>
      </ol>
    </InventoryDialog>
  );
}
