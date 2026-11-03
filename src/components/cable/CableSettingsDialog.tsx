"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CablePlan } from "@/types/cable";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { ErrorState, InventoryDialog, ListSkeleton, MoneyInput, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage, formatINR, parseDecimal, roundMoney, sanitizeDecimal, sendJson } from "@/components/inventory/inventoryUtils";
import { cn } from "@/lib/utils";
import { usePlans, useRevalidateCable, useSubscribers } from "./useCableData";

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
      <p className="text-xs font-semibold text-slate-400">{hint}</p>
    </div>
  );
}

/** One plan's selling price, saved on its own. */
function PlanPriceRow({ plan }: { plan: CablePlan }) {
  const revalidate = useRevalidateCable();
  const [value, setValue] = useState(plan.price === null ? "" : String(plan.price));
  const [saving, setSaving] = useState(false);
  const saved = plan.price === null ? "" : String(plan.price);
  const save = async () => {
    const price = value.trim() === "" ? null : roundMoney(parseDecimal(value));
    if (price !== null && (!Number.isFinite(price) || price < 0)) return toast.error("Enter 0 or more.");
    setSaving(true);
    try {
      const res = await sendJson<{ filledRenewals: number }>(`/api/cable/plans/${encodeURIComponent(plan.id)}`, "PATCH", { price });
      toast.success(`${plan.name}: ${price === null ? "price removed" : formatINR(price)}`, {
        description: res.filledRenewals ? `${res.filledRenewals} earlier renewal${res.filledRenewals === 1 ? "" : "s"} priced too.` : undefined,
      });
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <li className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-800 break-all">{plan.name}</div>
        <div className="text-[11px] font-semibold text-slate-400">{plan.subscribers} subscriber{plan.subscribers === 1 ? "" : "s"}</div>
      </div>
      <MoneyInput value={value} onChange={(v) => setValue(sanitizeDecimal(v, 2))} placeholder="Price" className="w-28 shrink-0" ariaLabel={`Price of ${plan.name}`} />
      <button
        type="button"
        onClick={save}
        disabled={saving || value === saved}
        aria-label={`Save price of ${plan.name}`}
        className="h-11 w-11 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center disabled:opacity-30"
      >
        <i className={saving ? "ph ph-circle-notch animate-spin" : "ph-bold ph-check"} aria-hidden="true" />
      </button>
    </li>
  );
}

/** Plan prices (what a renewal is charged), the UPI ID / phone used in WhatsApp messages, and the low-wallet warning. */
export default function CableSettingsDialog({ shopId, onSyncSetup, onClose }: { shopId: string; onSyncSetup: () => void; onClose: () => void }) {
  const plans = usePlans(shopId);
  const { data } = useSubscribers(shopId);
  const revalidate = useRevalidateCable();
  const shop = data?.shop;
  const [upiId, setUpiId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [smsKey, setSmsKey] = useState("");
  const [smsFrom, setSmsFrom] = useState<string | null>(null);
  const [smsLang, setSmsLang] = useState<"en" | "ta" | null>(null);
  const [smsAuto, setSmsAuto] = useState<boolean | null>(null);
  const [savingSms, setSavingSms] = useState(false);

  // Fields show the saved values until edited
  const lastTen = (v: string) => v.replace(/\D/g, "").slice(-10);
  const upiShown = upiId ?? shop?.upiId ?? "";
  const phoneShown = phone ?? lastTen(shop?.contactPhone ?? "");
  const alertShown = alert ?? (shop?.lowWalletAlert == null ? "" : String(shop.lowWalletAlert));
  const smsFromShown = smsFrom ?? lastTen(shop?.smsFrom ?? "");
  const smsLangShown = smsLang ?? shop?.smsLanguage ?? "en";
  const smsAutoShown = smsAuto ?? shop?.smsAutoReminders ?? false;

  const saveSms = async () => {
    setSavingSms(true);
    try {
      await sendJson("/api/cable/settings", "PATCH", {
        shopId,
        smsFrom: smsFromShown,
        smsLanguage: smsLangShown,
        smsAutoReminders: smsAutoShown,
        ...(smsKey.trim() ? { smsApiKey: smsKey.trim() } : {}),
      });
      toast.success("SMS settings saved");
      setSmsKey("");
      setSmsFrom(null);
      setSmsLang(null);
      setSmsAuto(null);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingSms(false);
    }
  };

  const saveDetails = async () => {
    const alertValue = alertShown.trim() === "" ? null : roundMoney(parseDecimal(alertShown));
    if (alertValue !== null && !Number.isFinite(alertValue)) return toast.error("Enter the wallet amount as a number.");
    setSaving(true);
    try {
      await sendJson("/api/cable/settings", "PATCH", { shopId, upiId: upiShown, contactPhone: phoneShown, lowWalletAlert: alertValue });
      toast.success("Settings saved");
      setUpiId(null);
      setPhone(null);
      setAlert(null);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <InventoryDialog open onClose={onClose} busy={saving} eyebrow="Cable & Internet" title="Settings" size="lg">
      <div className="space-y-7">
        <section className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-slate-900">TIC Fiber sync</h3>
            <p className="text-xs font-semibold text-slate-500">The browser extension and this shop&apos;s sync key</p>
          </div>
          <button type="button" onClick={onSyncSetup} className={secondaryButtonClass}>
            <i className="ph-bold ph-plugs-connected" aria-hidden="true" /> Sync setup
          </button>
        </section>

        <section>
          <SectionTitle title="Plan prices" hint="What you charge a subscriber for one renewal of each plan. Renewals are owed at this price." />
          {plans.error ? (
            <ErrorState message={errorMessage(plans.error)} onRetry={() => plans.mutate()} />
          ) : !plans.data ? (
            <ListSkeleton rows={3} />
          ) : plans.data.plans.length === 0 ? (
            <p className="text-sm font-medium text-slate-400">Plans appear here after the first sync from TIC Fiber.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {plans.data.plans.map((p) => (
                <PlanPriceRow key={`${p.id}-${p.price}`} plan={p} />
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle title="WhatsApp messages and wallet" hint="Your UPI ID and phone go into reminder messages. Get a warning when the TIC wallet runs low." />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="cable-upi" className={labelClass}>UPI ID</label>
              <input id="cable-upi" value={upiShown} maxLength={100} onChange={(e) => setUpiId(e.target.value)} placeholder="name@bank" className={inputClass} />
            </div>
            <div>
              <label htmlFor="cable-phone" className={labelClass}>Contact phone</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">+91</span>
                <input id="cable-phone" value={phoneShown} maxLength={10} inputMode="numeric" onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98765 43210" className={cn(inputClass, "pl-12")} />
              </div>
            </div>
            <div>
              <label htmlFor="cable-alert" className={labelClass}>Warn below</label>
              <MoneyInput id="cable-alert" value={alertShown} onChange={(v) => setAlert(sanitizeDecimal(v, 2))} placeholder="e.g. 500" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={saveDetails} disabled={saving || !shop || (upiId === null && phone === null && alert === null)} className={cn(primaryButtonClass)}>
              {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
              Save
            </button>
          </div>
        </section>

        <section>
          <SectionTitle title="SMS reminders (httpSMS)" hint="Send SMS from your own phone's SIM. Install the httpSMS app on an always-on Android phone, then paste its API key and the SIM's number." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sms-key" className={labelClass}>
                httpSMS API key {shop?.smsConfigured && <span className="text-emerald-600">· connected</span>}
              </label>
              <input id="sms-key" type="password" autoComplete="off" value={smsKey} maxLength={1000} onChange={(e) => setSmsKey(e.target.value)} placeholder={shop?.smsConfigured ? "•••••••• (leave blank to keep)" : "Paste your API key"} className={inputClass} />
            </div>
            <div>
              <label htmlFor="sms-from" className={labelClass}>Send from (SIM number)</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">+91</span>
                <input id="sms-from" value={smsFromShown} maxLength={10} inputMode="numeric" onChange={(e) => setSmsFrom(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98765 43210" className={cn(inputClass, "pl-12")} />
              </div>
            </div>
            <div>
              <span className={labelClass}>Reminder language</span>
              <CustomDropdown
                options={[{ label: "English", value: "en" }, { label: "தமிழ் (Tamil)", value: "ta" }]}
                value={smsLangShown}
                onChange={(v) => setSmsLang(v as "en" | "ta")}
              />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 h-11 self-end">
              <span className="text-sm font-bold text-slate-700">Daily auto-reminders</span>
              <button
                type="button"
                role="switch"
                aria-checked={smsAutoShown}
                aria-label="Daily auto-reminders"
                onClick={() => setSmsAuto(!smsAutoShown)}
                className={cn("w-11 h-6 shrink-0 rounded-full transition-colors relative", smsAutoShown ? "bg-emerald-500" : "bg-slate-300")}
              >
                <span className={cn("w-4 h-4 rounded-full bg-white absolute top-1 transition-transform", smsAutoShown ? "left-6" : "left-1")} />
              </button>
            </label>
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-2">
            Auto-reminders text subscribers who are expiring soon, expired or owing — once a day. Needs the phone on with internet and the SIM in it.
          </p>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={saveSms} disabled={savingSms || !shop} className={cn(primaryButtonClass)}>
              {savingSms ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
              Save SMS settings
            </button>
          </div>
        </section>
      </div>
    </InventoryDialog>
  );
}
