"use client";

import { useState, useEffect } from "react";

type ThresholdSettings = {
  orderStale: number;
  orderReady: number;
  advance: number;
  gallery: number;
  album: number;
  paymentDue: number;
};

export default function ReminderPreferences() {
  const [settings, setSettings] = useState<ThresholdSettings>({
    orderStale: 3,
    orderReady: 2,
    advance: 7,
    gallery: 14,
    album: 30,
    paymentDue: 3,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings/system");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      
      const newSettings = { ...settings };
      const arr = Array.isArray(data) ? data : data.settings ?? Object.entries(data).map(([key, value]) => ({ key, value }));
      
      arr.forEach((s: any) => {
        if (s.key === "reminder_threshold_order_stale" && s.value?.days) newSettings.orderStale = Number(s.value.days);
        if (s.key === "reminder_threshold_order_ready" && s.value?.days) newSettings.orderReady = Number(s.value.days);
        if (s.key === "reminder_threshold_advance" && s.value?.days) newSettings.advance = Number(s.value.days);
        if (s.key === "reminder_threshold_gallery" && s.value?.days) newSettings.gallery = Number(s.value.days);
        if (s.key === "reminder_threshold_album" && s.value?.days) newSettings.album = Number(s.value.days);
        if (s.key === "reminder_threshold_payment_due" && s.value?.days) newSettings.paymentDue = Number(s.value.days);
      });
      setSettings(newSettings);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

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
      ];

      for (const update of updates) {
        await fetch("/api/settings/system", {
          method: "POST",
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
      <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Notification Preferences</h2>
          <p className="text-sm text-slate-500 mt-1">Configure when system reminders are triggered.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm font-semibold text-green-600 animate-fade-in-up">✓ Saved</span>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-orange-500/20"
          >
            {isSaving ? <i className="ph ph-spinner animate-spin"></i> : <i className="ph ph-check"></i>}
            Save Preferences
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Order Reminders</h3>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Stale Orders</label>
              <p className="text-xs text-slate-500 mb-3">Remind when an order is stuck in Pending/Processing.</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Remind after</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.orderStale}
                  onChange={(e) => setSettings({ ...settings, orderStale: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600">days</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Ready for Pickup</label>
              <p className="text-xs text-slate-500 mb-3">Remind when an order is ready but uncollected.</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Remind after</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.orderReady}
                  onChange={(e) => setSettings({ ...settings, orderReady: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600">days</span>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Due</label>
              <p className="text-xs text-slate-500 mb-3">Remind before payment due date for orders and bookings.</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Remind</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.paymentDue}
                  onChange={(e) => setSettings({ ...settings, paymentDue: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600">days before</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Booking Reminders</h3>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Advance Not Collected</label>
              <p className="text-xs text-slate-500 mb-3">Remind before the event if advance is 0.</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Remind</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.advance}
                  onChange={(e) => setSettings({ ...settings, advance: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600">days before</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Gallery Not Delivered</label>
              <p className="text-xs text-slate-500 mb-3">Remind after event if gallery is still pending.</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Remind after</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.gallery}
                  onChange={(e) => setSettings({ ...settings, gallery: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600">days</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Album Pending</label>
              <p className="text-xs text-slate-500 mb-3">Remind after event if album status is PENDING.</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Remind after</span>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={settings.album}
                  onChange={(e) => setSettings({ ...settings, album: Number(e.target.value) })}
                />
                <span className="text-sm font-medium text-slate-600">days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
