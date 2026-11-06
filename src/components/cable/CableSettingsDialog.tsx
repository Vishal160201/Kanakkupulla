"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
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
  const [smsFrom, setSmsFrom] = useState<string | null>(null);
  const [smsLang, setSmsLang] = useState<"en" | "ta" | null>(null);
  const [smsAuto, setSmsAuto] = useState<boolean | null>(null);
  const [savingSms, setSavingSms] = useState(false);
  const [fee, setFee] = useState<string | null>(null);
  const [nodeFee, setNodeFee] = useState<string | null>(null);
  const [savingFees, setSavingFees] = useState(false);
  const [pairToken, setPairToken] = useState<string | null>(null);
  const [pairQr, setPairQr] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [confirmRepair, setConfirmRepair] = useState(false);

  // Fields show the saved values until edited
  const lastTen = (v: string) => v.replace(/\D/g, "").slice(-10);
  const upiShown = upiId ?? shop?.upiId ?? "";
  const phoneShown = phone ?? lastTen(shop?.contactPhone ?? "");
  const alertShown = alert ?? (shop?.lowWalletAlert == null ? "" : String(shop.lowWalletAlert));
  const smsFromShown = smsFrom ?? lastTen(shop?.smsFrom ?? "");
  const smsLangShown = smsLang ?? shop?.smsLanguage ?? "en";
  const smsAutoShown = smsAuto ?? shop?.smsAutoReminders ?? false;
  const feeShown = fee ?? (shop?.cableMonthlyFee == null ? "" : String(shop.cableMonthlyFee));
  const nodeFeeShown = nodeFee ?? (shop?.cableNodeFee == null ? "" : String(shop.cableNodeFee));

  const saveFees = async () => {
    const amount = (v: string) => (v.trim() === "" ? null : roundMoney(parseDecimal(v)));
    const monthly = amount(feeShown);
    const node = amount(nodeFeeShown);
    if ((monthly !== null && !Number.isFinite(monthly)) || (node !== null && !Number.isFinite(node))) return toast.error("Enter the amounts as numbers.");
    setSavingFees(true);
    try {
      await sendJson("/api/cable/settings", "PATCH", { shopId, cableMonthlyFee: monthly, cableNodeFee: node });
      toast.success("Monthly amounts saved", { description: monthly === null ? "Dues follow TCCL's bills." : !shop?.cableMonthlyFee ? "Houses are charged from next month." : undefined });
      setFee(null);
      setNodeFee(null);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingFees(false);
    }
  };

  const saveSms = async () => {
    setSavingSms(true);
    try {
      await sendJson("/api/cable/settings", "PATCH", {
        shopId,
        smsFrom: smsFromShown,
        smsLanguage: smsLangShown,
        smsAutoReminders: smsAutoShown,
      });
      toast.success("SMS settings saved");
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

  // While the pairing QR is up, poll faster and close it the moment the phone connects
  // (the close is a render-time reset, not an effect).
  if (pairToken && shop?.smsConnected) {
    setPairToken(null);
    setPairQr(null);
  }
  useEffect(() => {
    if (!pairToken || shop?.smsConnected) return;
    const t = setInterval(revalidate, 3000);
    return () => clearInterval(t);
  }, [pairToken, shop?.smsConnected, revalidate]);

  const pairPhone = async () => {
    setPairing(true);
    try {
      const res = await sendJson<{ token: string }>("/api/cable/sms/pair", "POST", { shopId });
      setPairToken(res.token);
      // The SMS Sender app scans this to fill in the address + token by itself
      const link = `kanakkupulla://pair?url=${encodeURIComponent(window.location.origin)}&token=${encodeURIComponent(res.token)}`;
      setPairQr(await QRCode.toDataURL(link, { margin: 1, width: 220 }).catch(() => null));
      setConfirmRepair(false);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPairing(false);
    }
  };

  const copyToken = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Token copied");
    } catch {
      toast.error("Couldn't copy — select the token and copy it.");
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
          <SectionTitle title="Cable TV monthly amount" hint="What each house pays a month. A house pays the full month once its box is on at any time in it, new connections too. A box off all month isn't charged. Set a house's own amount (0 = free) in its Edit." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cable-fee" className={labelClass}>Monthly amount</label>
              <MoneyInput id="cable-fee" value={feeShown} onChange={(v) => setFee(sanitizeDecimal(v, 2))} placeholder="e.g. 250" />
            </div>
            <div>
              <label htmlFor="cable-node-fee" className={labelClass}>Node houses pay</label>
              <MoneyInput id="cable-node-fee" value={nodeFeeShown} onChange={(v) => setNodeFee(sanitizeDecimal(v, 2))} placeholder="Blank = monthly amount" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={saveFees} disabled={savingFees || !shop || (fee === null && nodeFee === null)} className={cn(primaryButtonClass)}>
              {savingFees ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
              Save
            </button>
          </div>
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
          <SectionTitle title="SMS reminders" hint="Send SMS free from your own phone's SIM. Install the Kanakkupulla SMS Sender app on an always-on Android phone and pair it below." />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 mb-3 space-y-2">
            {pairToken ? (
              <>
                {pairQr && (
                  <div className="flex flex-col items-center gap-1 pb-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, nothing to optimize */}
                    <img src={pairQr} alt="Pairing QR code — scan it with the Kanakkupulla SMS app" width={220} height={220} className="rounded-xl border border-slate-200 bg-white" />
                    <p className="text-xs font-bold text-slate-600">In the app, tap <span className="text-slate-900">Scan QR to connect</span></p>
                  </div>
                )}
                <p className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">Or paste the token into the app</p>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white pl-3 pr-1 py-1">
                  <code className="flex-1 min-w-0 truncate text-xs font-bold text-slate-800 select-all">{pairToken}</code>
                  <button type="button" onClick={() => copyToken(pairToken)} className="shrink-0 h-8 px-3 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200">
                    <i className="ph-bold ph-copy mr-1" aria-hidden="true" /> Copy
                  </button>
                </div>
                <p className="text-xs font-bold text-amber-700">
                  <i className="ph-bold ph-warning mr-1" aria-hidden="true" /> Shown once. Scan the QR now, or paste the token (and this site&apos;s address) into the app.
                </p>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-600 min-w-0">
                  {shop?.smsPaired ? (
                    shop.smsConnected ? (
                      <>
                        <i className="ph-bold ph-device-mobile text-emerald-600 mr-1" aria-hidden="true" />
                        <span className="text-emerald-700">Connected</span>
                        {shop.smsDeviceSeenAt && ` · last seen ${new Date(shop.smsDeviceSeenAt).toLocaleString("en-IN")}`}
                      </>
                    ) : (
                      <>
                        <i className="ph-bold ph-device-mobile-slash text-amber-600 mr-1" aria-hidden="true" />
                        <span className="text-amber-700">Not connected</span>
                        {shop.smsDeviceSeenAt
                          ? ` · last seen ${new Date(shop.smsDeviceSeenAt).toLocaleString("en-IN")}. Open the sender app on the phone.`
                          : " · paired, but the phone hasn't connected yet. Open the sender app."}
                      </>
                    )
                  ) : (
                    <><i className="ph-bold ph-device-mobile-slash text-slate-400 mr-1" aria-hidden="true" /> No phone paired yet.</>
                  )}
                </p>
                {shop?.smsPaired && !confirmRepair ? (
                  <button type="button" onClick={() => setConfirmRepair(true)} className={cn(secondaryButtonClass, "shrink-0")}>
                    <i className="ph-bold ph-arrows-clockwise" aria-hidden="true" /> Re-pair
                  </button>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    {confirmRepair && (
                      <button type="button" onClick={() => setConfirmRepair(false)} className={secondaryButtonClass}>Cancel</button>
                    )}
                    <button type="button" onClick={pairPhone} disabled={pairing} className={cn(primaryButtonClass)}>
                      <i className={pairing ? "ph ph-circle-notch animate-spin" : "ph-bold ph-device-mobile"} aria-hidden="true" />
                      {confirmRepair ? "New token" : "Pair phone"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
