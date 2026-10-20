"use client";

import { useState, useEffect } from "react";
import TimePickerInput from "@/components/ui/TimePickerInput";
import type { SystemSettingEntry } from "@/types/settings";

type ThresholdSettings = {
  orderStale: number;
  orderReady: number;
  advance: number;
  gallery: number;
  album: number;
  paymentDue: number;
  bannerEnabled: boolean;
  bannerTime1: string;
  bannerTime2: string;
};

const DEFAULT_SETTINGS: ThresholdSettings = {
  orderStale: 3,
  orderReady: 2,
  advance: 7,
  gallery: 14,
  album: 30,
  paymentDue: 3,
  bannerEnabled: true,
  bannerTime1: "09:00",
  bannerTime2: "17:00",
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Normalise the /api/settings/system payload (array, `{ settings }`, or key→value map) to entries. */
function toSettingEntries(data: unknown): SystemSettingEntry[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) throw new Error("Unexpected settings payload");
  return (data.settings as SystemSettingEntry[] | undefined) ?? Object.entries(data).map(([key, value]) => ({ key, value }));
}

function parseSettings(data: unknown): ThresholdSettings {
  const newSettings = { ...DEFAULT_SETTINGS };
  toSettingEntries(data).forEach((s) => {
    const value = isRecord(s.value) ? s.value : undefined;
    if (s.key === "reminder_threshold_order_stale" && value?.days) newSettings.orderStale = Number(value.days);
    if (s.key === "reminder_threshold_order_ready" && value?.days) newSettings.orderReady = Number(value.days);
    if (s.key === "reminder_threshold_advance" && value?.days) newSettings.advance = Number(value.days);
    if (s.key === "reminder_threshold_gallery" && value?.days) newSettings.gallery = Number(value.days);
    if (s.key === "reminder_threshold_album" && value?.days) newSettings.album = Number(value.days);
    if (s.key === "reminder_threshold_payment_due" && value?.days) newSettings.paymentDue = Number(value.days);
    if (s.key === "BANNER_SETTINGS" && s.value) {
      newSettings.bannerEnabled = Boolean(value?.bannerEnabled ?? true);
      newSettings.bannerTime1 = (value?.bannerTime1 as string) || "09:00";
      newSettings.bannerTime2 = (value?.bannerTime2 as string) || "17:00";
    }
  });
  return newSettings;
}

export default function ReminderPreferences() {
  const [settings, setSettings] = useState<ThresholdSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings/system");
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data: unknown = await res.json();
        setSettings(parseSettings(data));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { key: "reminder_threshold_order_stale", value: { days: settings.orderStale } },
        { key: "reminder_threshold_order_ready", value: { days: settings.orderReady } },
        { key: "reminder_threshold_advance", value: { days: settings.advance } },
        { key: "reminder_threshold_gallery", value: { days: settings.gallery } },
        { key: "reminder_threshold_album", value: { days: settings.album } },
        { key: "reminder_threshold_payment_due", value: { days: settings.paymentDue } },
        { key: "BANNER_SETTINGS", value: { bannerEnabled: settings.bannerEnabled, bannerTime1: settings.bannerTime1, bannerTime2: settings.bannerTime2 } },
      ];

      for (const update of updates) {
        await fetch("/api/settings/system", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading preferences...</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Notification Preferences</h2>
          <p className="text-sm text-slate-500 mt-1">Configure when system reminders are triggered.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 animate-fade-in-up"><i className="ph-bold ph-check-circle" /> Saved</span>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm shadow-orange-500/20"
          >
            {isSaving ? <i className="ph ph-spinner animate-spin"></i> : <i className="ph ph-check"></i>}
            Save Preferences
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Order Reminders</h3>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Stale Orders</label>
              <p className="text-xs text-slate-500 mb-3">Remind when an order is stuck in Pending/Processing.</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Remind after</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.orderStale}
                  onChange={(e) => setSettings({ ...settings, orderStale: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">days</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Ready for Pickup</label>
              <p className="text-xs text-slate-500 mb-3">Remind when an order is ready but uncollected.</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Remind after</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.orderReady}
                  onChange={(e) => setSettings({ ...settings, orderReady: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">days</span>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Due</label>
              <p className="text-xs text-slate-500 mb-3">Remind before payment due date for orders and bookings.</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Remind</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.paymentDue}
                  onChange={(e) => setSettings({ ...settings, paymentDue: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">days before</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Booking Reminders</h3>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Advance Not Collected</label>
              <p className="text-xs text-slate-500 mb-3">Remind before the event if advance is 0.</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Remind</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.advance}
                  onChange={(e) => setSettings({ ...settings, advance: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">days before</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Gallery Not Delivered</label>
              <p className="text-xs text-slate-500 mb-3">Remind after event if gallery is still pending.</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Remind after</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.gallery}
                  onChange={(e) => setSettings({ ...settings, gallery: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">days</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Album Pending</label>
              <p className="text-xs text-slate-500 mb-3">Remind after event if album status is PENDING.</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Remind after</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.album}
                  onChange={(e) => setSettings({ ...settings, album: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">days</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-4">System Banners</h3>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Upcoming Shoot Banner</label>
                <p className="text-xs text-slate-500">Show a popup banner for upcoming shoots (next 2 days).</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.bannerEnabled}
                aria-label="Upcoming shoot banner"
                onClick={() => setSettings({ ...settings, bannerEnabled: !settings.bannerEnabled })}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.bannerEnabled ? 'bg-orange-500' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.bannerEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            
            {settings.bannerEnabled && (
              <div className="pt-4 border-t border-slate-200 flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-600">Time 1</span>
                  <TimePickerInput
                    className="flex h-[36px] w-[130px] items-center justify-between rounded-lg border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:border-slate-300"
                    value={settings.bannerTime1}
                    onChange={(val) => setSettings({ ...settings, bannerTime1: val })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-600">Time 2</span>
                  <TimePickerInput
                    className="flex h-[36px] w-[130px] items-center justify-between rounded-lg border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:border-slate-300"
                    value={settings.bannerTime2}
                    onChange={(val) => setSettings({ ...settings, bannerTime2: val })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
