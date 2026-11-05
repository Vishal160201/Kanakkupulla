"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ShopTypeShell from "@/components/shops/ShopTypeShell";
import PermissionTooltip from "@/components/shared/PermissionTooltip";
import { ErrorState, ListSkeleton, cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage, formatINR } from "@/components/inventory/inventoryUtils";
import type { CableProvider, CableSubscriberListResponse } from "@/types/cable";
import { cn } from "@/lib/utils";
import { ago } from "./cableShared";
import { requestExtensionSync } from "./extensionSync";
import { useCanManageCable, useRevalidateCable, useSubscribers } from "./useCableData";
import SubscribersTab from "./SubscribersTab";
import CollectionsTab from "./CollectionsTab";
import GroupingTab from "./GroupingTab";
import ComplaintsTab from "./ComplaintsTab";
import ReportsTab from "./ReportsTab";
import SubscriberDetailDialog from "./SubscriberDetailDialog";
import { TCCL_PAY_DAY, dayOfMonth } from "@/lib/cableMonthly";
import SyncSetupDialog from "./SyncSetupDialog";
import CableSettingsDialog from "./CableSettingsDialog";

const TABS = [
  { id: "subscribers", label: "Subscribers", icon: "users-three" },
  { id: "collections", label: "Collections", icon: "hand-coins" },
  { id: "complaints", label: "Complaints", icon: "wrench" },
  { id: "reports", label: "Reports", icon: "chart-bar" },
  { id: "grouping", label: "Grouping", icon: "folders" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const isTab = (v: unknown): v is Tab => TABS.some((t) => t.id === v);

/** The extension syncs every minute; flag the status once a few runs were missed. */
const STALE_MINUTES = 5;

/** The current time, ticking every minute (keeps "expires in" and "synced … ago" fresh). */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Asks the browser extension for an instant sync, then reloads everything. */
function SyncNowButton() {
  const [syncing, setSyncing] = useState(false);
  const revalidate = useRevalidateCable();
  const syncNow = async () => {
    setSyncing(true);
    try {
      const status = await requestExtensionSync();
      if (status.ok) toast.success(status.message);
      else toast.error(status.message);
      await revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSyncing(false);
    }
  };
  return (
    <button type="button" onClick={syncNow} disabled={syncing} className={`${primaryButtonClass} w-full`}>
      <i className={cn("ph-bold ph-arrows-clockwise", syncing && "animate-spin")} aria-hidden="true" />
      {syncing ? "Syncing…" : "Sync now"}
    </button>
  );
}

type PortalStatus = { name: string; syncedAt: string | null; wallet: number | null; walletAt: string | null };

/** One portal's sync health and partner wallet. */
function PortalLine({ portal, now, lowWalletAlert, onSetup }: { portal: PortalStatus; now: number; lowWalletAlert: number | null; onSetup?: () => void }) {
  const minutes = portal.syncedAt ? (now - new Date(portal.syncedAt).getTime()) / 60_000 : null;
  const stale = minutes !== null && minutes > STALE_MINUTES;
  const walletLow = portal.wallet !== null && lowWalletAlert !== null && portal.wallet < lowWalletAlert;
  const tone = stale || walletLow ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-100 text-emerald-800";
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold", tone)} role="status">
      <i className={cn("ph-bold text-lg shrink-0", stale ? "ph-warning" : "ph-arrows-clockwise")} aria-hidden="true" />
      <span className="flex-1 min-w-0">
        <span className="font-extrabold">{portal.name}</span>{" "}
        {stale
          ? `· last synced ${ago(portal.syncedAt!, now)}. Check that Chrome is open with the extension and you're logged in to the ${portal.name} portal.`
          : `· synced ${ago(portal.syncedAt!, now)}`}
      </span>
      {portal.wallet !== null && (
        <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap font-extrabold", walletLow && "text-rose-700")}>
          <i className={cn("ph-bold", walletLow ? "ph-warning-circle" : "ph-wallet")} aria-hidden="true" />
          Wallet {portal.wallet < 0 ? "−" : ""}
          {formatINR(Math.abs(portal.wallet))}
          {walletLow && <span className="font-semibold"> · below {formatINR(lowWalletAlert!, { decimals: false })}</span>}
        </span>
      )}
      {onSetup && stale && (
        <button type="button" onClick={onSetup} className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-white/80 border border-current/20 font-bold text-xs hover:bg-white">
          Sync setup
        </button>
      )}
    </div>
  );
}

/** Sync health and partner wallet of this section's portal, above every tab. */
function StatusStrip({ data, provider, now, onSetup }: { data: CableSubscriberListResponse; provider: CableProvider; now: number; onSetup?: () => void }) {
  const portal: PortalStatus =
    provider === "TCCL"
      ? { name: "TCCL", syncedAt: data.tcclSyncedAt, wallet: data.shop.tcclWalletBalance, walletAt: data.shop.tcclWalletSyncedAt }
      : { name: "TIC Fiber", syncedAt: data.syncedAt, wallet: data.shop.walletBalance, walletAt: data.shop.walletSyncedAt };
  if (!portal.syncedAt) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl border bg-slate-50 border-slate-200 text-slate-600 px-4 py-3 text-sm font-semibold" role="status">
        <i className="ph-bold ph-plugs text-lg shrink-0" aria-hidden="true" />
        <span className="flex-1 min-w-0">{portal.name} isn&apos;t connected yet. Set up the browser extension to sync its subscribers every minute.</span>
        {onSetup && (
          <button type="button" onClick={onSetup} className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-white/80 border border-current/20 font-bold text-xs hover:bg-white">
            Sync setup
          </button>
        )}
      </div>
    );
  }
  return <PortalLine portal={portal} now={now} lowWalletAlert={data.shop.lowWalletAlert} onSetup={onSetup} />;
}

function CableView({ shopId, provider, tab, onTab, onSetup }: { shopId: string; provider: CableProvider; tab: Tab; onTab: (t: Tab) => void; onSetup?: () => void }) {
  const { data, error, mutate } = useSubscribers(shopId);
  const [openId, setOpenId] = useState<string | null>(null);
  const now = useNow();

  if (error) return <div className={cardClass}><ErrorState message={errorMessage(error)} onRetry={() => mutate()} /></div>;
  if (!data) return <div className={cn(cardClass, "p-4")}><ListSkeleton /></div>;

  return (
    <div className="space-y-5 sm:space-y-6">
      <StatusStrip data={data} provider={provider} now={now} onSetup={onSetup} />
      {provider === "TCCL" && dayOfMonth(new Date(now)) >= TCCL_PAY_DAY - 3 && dayOfMonth(new Date(now)) <= TCCL_PAY_DAY && (
        <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800" role="status">
          <i className="ph-bold ph-calendar-check text-lg shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0">
            {dayOfMonth(new Date(now)) === TCCL_PAY_DAY ? "Pay TCCL today" : `Pay TCCL by the ${TCCL_PAY_DAY}th`}: <span className="font-extrabold">{formatINR(data.tcclMonth.billed, { decimals: false })}</span> billed this month · {formatINR(data.tcclMonth.collected, { decimals: false })} collected so far.
          </span>
          {tab !== "collections" && (
            <button type="button" onClick={() => onTab("collections")} className="shrink-0 px-3 py-1.5 rounded-lg bg-white/80 border border-current/20 font-bold text-xs hover:bg-white">
              Collections
            </button>
          )}
        </div>
      )}
      <div role="tablist" aria-label={`${provider === "TCCL" ? "TCCL" : "TIC Fiber"} sections`} className="grid grid-cols-5 gap-0.5 md:flex md:items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm w-full md:w-auto md:self-start">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={cn(
              "min-w-0 px-1 md:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-[10px] sm:text-sm transition-all flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap",
              tab === t.id ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <i className={`ph-bold ph-${t.icon} text-base sm:text-sm`} aria-hidden="true" />
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>
      {tab === "subscribers" && <SubscribersTab shopId={shopId} data={data} provider={provider} now={now} onOpen={setOpenId} />}
      {tab === "grouping" && <GroupingTab shopId={shopId} provider={provider} subscribers={data.subscribers} />}
      {tab === "collections" && <CollectionsTab shopId={shopId} provider={provider} data={data} onOpen={setOpenId} />}
      {tab === "complaints" && <ComplaintsTab shopId={shopId} provider={provider} subscribers={data.subscribers} onOpen={setOpenId} />}
      {tab === "reports" && <ReportsTab shopId={shopId} provider={provider} />}
      {openId && <SubscriberDetailDialog subscriberId={openId} shop={data.shop} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/** One portal's section of a cable shop: its subscribers, collections, complaints and reports. */
export default function CablePage({ provider }: { provider: CableProvider }) {
  const isCable = provider === "TCCL";
  const canManage = useCanManageCable();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : "subscribers";
  const [dialog, setDialog] = useState<"setup" | "settings" | null>(null);
  const setTab = (t: Tab) => router.replace(t === "subscribers" ? pathname : `${pathname}?tab=${t}`, { scroll: false });

  return (
    <ShopTypeShell
      shopType="CABLE"
      pageName={isCable ? "TCCL" : "TIC Fiber"}
      eyebrow={isCable ? "Cable TV subscribers" : "Internet subscribers"}
      actions={
        <>
          <PermissionTooltip allowed={canManage} className="flex">
            <button type="button" onClick={() => setDialog("settings")} disabled={!canManage} className={`${secondaryButtonClass} w-full`}>
              <i className="ph-bold ph-gear-six" /> Settings
            </button>
          </PermissionTooltip>
          <SyncNowButton />
        </>
      }
    >
      {(shopId) => (
        <>
          <CableView shopId={shopId} provider={provider} tab={tab} onTab={setTab} onSetup={canManage ? () => setDialog("setup") : undefined} />
          {dialog === "setup" && canManage && <SyncSetupDialog shopId={shopId} onClose={() => setDialog(null)} />}
          {dialog === "settings" && canManage && <CableSettingsDialog shopId={shopId} onSyncSetup={() => setDialog("setup")} onClose={() => setDialog(null)} />}
        </>
      )}
    </ShopTypeShell>
  );
}
