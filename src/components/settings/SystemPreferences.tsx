"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ColorPicker } from "../ui/color-picker";
import type { CalendarTier, UiPreferences } from "@/types/settings";

export default function SystemPreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<UiPreferences | null>(null);

  useEffect(() => {
    fetch("/api/settings/system")
      .then((res) => res.json())
      .then((data: { UI_PREFERENCES?: UiPreferences }) => {
        if (data.UI_PREFERENCES) {
          setPrefs(data.UI_PREFERENCES);
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load settings");
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "UI_PREFERENCES", value: prefs }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      toast.success("System preferences saved successfully!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateTiers = <K extends keyof CalendarTier>(index: number, field: K, value: CalendarTier[K]) => {
    if (!prefs) return;
    const newTiers = [...prefs.calendarTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setPrefs({ ...prefs, calendarTiers: newTiers });
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading system preferences...</div>;
  }

  if (!prefs) {
    return <div className="p-8 text-center text-red-500">Failed to load preferences.</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col lg:h-[calc(100vh-140px)]">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">System Preferences</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Customize global application rules and UI colors</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-[0.85rem] hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
        >
          {saving ? <i className="ph-bold ph-spinner animate-spin"></i> : <i className="ph-bold ph-check"></i>}
          Save Preferences
        </button>
      </div>

      <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 bg-slate-50/50">
        
        {/* Global Settings */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="ph-fill ph-globe text-orange-500 text-lg"></i> Global Settings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="text-[0.75rem] font-bold text-slate-600 mb-1.5 block">Currency Symbol</label>
              <input 
                type="text" 
                value={prefs.currencySymbol} 
                onChange={(e) => setPrefs({ ...prefs, currencySymbol: e.target.value })}
                className="w-full text-sm font-semibold text-slate-800 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-[0.75rem] font-bold text-slate-600 mb-1.5 block">Hot Date Benchmark ({prefs.currencySymbol})</label>
              <input 
                type="number" 
                value={prefs.hotDateBenchmark ?? ''} 
                onChange={(e) => setPrefs({ ...prefs, hotDateBenchmark: Number(e.target.value) })}
                className="w-full text-sm font-semibold text-slate-800 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
              />
              <p className="text-[0.65rem] text-slate-500 mt-1">Bookings with packages above this value will mark the day as &quot;Hot&quot; on the dashboard.</p>
            </div>
          </div>
        </section>

        {/* Calendar Tiers */}
        <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="ph-fill ph-calendar text-orange-500 text-lg"></i> Calendar Package Tiers
          </h3>
          <p className="text-[0.75rem] text-slate-500 mb-4">Define how bookings are color-coded in the calendar based on their package value. Lower values match first.</p>
          
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-[2.5rem_1.4fr_1fr_1fr] gap-4 px-3 text-[0.7rem] font-bold text-slate-400 uppercase">
              <div className="text-center">Tier</div>
              <div>Max Value ({prefs.currencySymbol})</div>
              <div>Background Color</div>
              <div>Text Color</div>
            </div>
            {prefs.calendarTiers.map((tier, index) => (
              <div key={index} className="grid grid-cols-2 md:grid-cols-[2.5rem_1.4fr_1fr_1fr] gap-3 md:gap-4 items-center bg-slate-50 border border-gray-100 rounded-xl p-3">
                <div className="col-span-2 md:col-span-1 md:text-center font-bold text-slate-500 text-sm"><span className="md:hidden">Tier </span>{index + 1}</div>
                <div className="col-span-2 md:col-span-1">
                  <span className="md:hidden block text-[0.65rem] font-bold text-slate-400 uppercase mb-1">Max value ({prefs.currencySymbol})</span>
                  <input 
                    type="number" 
                    value={tier.max} 
                    onChange={(e) => updateTiers(index, "max", Number(e.target.value))}
                    className="w-full text-sm font-semibold text-slate-800 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-orange-500"
                  />
                </div>
                <div className="min-w-0">
                  <span className="md:hidden block text-[0.65rem] font-bold text-slate-400 uppercase mb-1">Background</span>
                  <div className="flex items-center gap-2">
                  <ColorPicker 
                    color={tier.bg || '#ffffff'} 
                    onChange={(color) => updateTiers(index, "bg", color)}
                  />
                  <input 
                    type="text" 
                    value={tier.bg} 
                    onChange={(e) => updateTiers(index, "bg", e.target.value)}
                    className="w-full min-w-0 text-xs font-semibold text-slate-800 border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-orange-500"
                  />
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="md:hidden block text-[0.65rem] font-bold text-slate-400 uppercase mb-1">Text</span>
                  <div className="flex items-center gap-2">
                  <ColorPicker 
                    color={tier.text || '#000000'} 
                    onChange={(color) => updateTiers(index, "text", color)}
                  />
                  <input 
                    type="text" 
                    value={tier.text} 
                    onChange={(e) => updateTiers(index, "text", e.target.value)}
                    className="w-full min-w-0 text-xs font-semibold text-slate-800 border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-orange-500"
                  />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>



      </div>
    </div>
  );
}
