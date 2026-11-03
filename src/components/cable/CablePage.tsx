"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ShopTypeShell from "@/components/shops/ShopTypeShell";
import PermissionTooltip from "@/components/shared/PermissionTooltip";
import { ErrorState, ListSkeleton, cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage, formatINR } from "@/components/inventory/inventoryUtils";
import type { CableSubscriberListResponse } from "@/types/cable";
import { cn } from "@/lib/utils";
import { ago } from "./cableShared";
import { requestExtensionSync } from "./extensionSync";
import { useCanManageCable, useRevalidateCable, useSubscribers } from "./useCableData";
import SubscribersTab from "./SubscribersTab";
import CollectionsTab from "./CollectionsTab";
import ComplaintsTab from "./ComplaintsTab";
import ReportsTab from "./ReportsTab";
import EquipmentTab from "./EquipmentTab";
import SubscriberDetailDialog from "./SubscriberDetailDialog";
import SyncSetupDialog from "./SyncSetupDialog";
import CableSettingsDialog from "./CableSettingsDialog";

const TABS = [
  { id: "subscribers", label: "Subscribers", icon: "users-three" },
  { id: "collections", label: "Collections", icon: "hand-coins" },
  { id: "complaints", label: "Complaints", icon: "wrench" },
  { id: "equipment", label: "Equipment", icon: "package" },
  { id: "reports", label: "Reports", icon: "chart-bar" },
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

/** Sync health and the partner wallet balance, above every tab. */
function StatusStrip({ data, now, onSetup }: { data: CableSubscriberListResponse; now: number; onSetup?: () => void }) {
  const minutes = data.syncedAt ? (now - new Date(data.syncedAt).getTime()) / 60_000 : null;
  const stale = minutes !== null && minutes > STALE_MINUTES;
  const tone = minutes === null ? "bg-slate-50 border-slate-200 text-slate-600" : stale ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-100 text-emerald-800";
  const { walletBalance, lowWalletAlert } = data.shop;
  const walletLow = walletBalance !== null && lowWalletAlert !== null && walletBalance < lowWalletAlert;
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
      <div className={cn("flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold", tone)} role="status">
        <i className={cn("ph-bold text-lg shrink-0", minutes === null ? "ph-plugs" : stale ? "ph-warning" : "ph-arrows-clockwise")} aria-hidden="true" />
        <span className="flex-1 min-w-0">
          {minutes === null
            ? "TIC Fiber isn't connected yet. Set up the browser extension to sync subscribers every minute."
            : stale
              ? `Last synced from TIC Fiber ${ago(data.syncedAt!, now)}. Check that Chrome is open with the extension, and that you're logged in to the TIC Fiber partner portal.`
              : `Synced from TIC Fiber ${ago(data.syncedAt!, now)}`}
        </span>
        {onSetup && (minutes === null || stale) && (
          <button type="button" onClick={onSetup} className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-white/80 border border-current/20 font-bold text-xs hover:bg-white">
            Sync setup
          </button>
        )}
      </div>
      {walletBalance !== null && (
        <div className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3", walletLow ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-white border-slate-200 text-slate-700")} role="status">
          <i className={cn("ph-bold text-lg", walletLow ? "ph-warning-circle" : "ph-wallet")} aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[1.2px] opacity-70">TIC wallet{data.shop.walletSyncedAt ? ` · ${ago(data.shop.walletSyncedAt, now)}` : ""}</div>
            <div className="text-sm font-extrabold">
              {walletBalance < 0 ? "−" : ""}
              {formatINR(Math.abs(walletBalance))}
              {walletLow && <span className="font-semibold"> · below {formatINR(lowWalletAlert!, { decimals: false })}, top up before renewing</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CableView({ shopId, tab, onTab, onSetup }: { shopId: string; tab: Tab; onTab: (t: Tab) => void; onSetup?: () => void }) {
  const { data, error, mutate } = useSubscribers(shopId);
  const [openId, setOpenId] = useState<string | null>(null);
  const now = useNow();

  if (error) return <div className={cardClass}><ErrorState message={errorMessage(error)} onRetry={() => mutate()} /></div>;
  if (!data) return <div className={cn(cardClass, "p-4")}><ListSkeleton /></div>;

  return (
    <div className="space-y-5 sm:space-y-6">
      <StatusStrip data={data} now={now} onSetup={onSetup} />
      <div role="tablist" aria-label="Cable & Internet sections" className="grid grid-cols-5 gap-0.5 md:flex md:items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm w-full md:w-auto md:self-start">
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
      {tab === "subscribers" && <SubscribersTab data={data} now={now} onOpen={setOpenId} />}
      {tab === "collections" && <CollectionsTab shopId={shopId} data={data} onOpen={setOpenId} />}
      {tab === "complaints" && <ComplaintsTab shopId={shopId} subscribers={data.subscribers} onOpen={setOpenId} />}
      {tab === "equipment" && <EquipmentTab shopId={shopId} />}
      {tab === "reports" && <ReportsTab shopId={shopId} />}
      {openId && <SubscriberDetailDialog subscriberId={openId} shop={data.shop} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/** Cable & internet shop: subscribers synced from TIC Fiber, renewal collections, complaints and reports. */
export default function CablePage() {
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
      pageName="Cable & Internet"
      eyebrow="Cable & Internet"
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
          <CableView shopId={shopId} tab={tab} onTab={setTab} onSetup={canManage ? () => setDialog("setup") : undefined} />
          {dialog === "setup" && canManage && <SyncSetupDialog shopId={shopId} onClose={() => setDialog(null)} />}
          {dialog === "settings" && canManage && <CableSettingsDialog shopId={shopId} onSyncSetup={() => setDialog("setup")} onClose={() => setDialog(null)} />}
        </>
      )}
    </ShopTypeShell>
  );
}
