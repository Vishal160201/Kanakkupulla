"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ColorPicker } from "../ui/color-picker";

export default function SystemPreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<any>(null);

  useEffect(() => {
    fetch("/api/settings/system")
      .then((res) => res.json())
      .then((data) => {
        if (data.UI_PREFERENCES) {
          setPrefs(data.UI_PREFERENCES);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
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
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateTiers = (index: number, field: string, value: any) => {
    const newTiers = [...prefs.calendarTiers];
    newTiers[index][field] = value;
    setPrefs({ ...prefs, calendarTiers: newTiers });
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading system preferences...</div>;
  }

  if (!prefs) {
    return <div className="p-8 text-center text-red-500">Failed to load preferences.</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">System Preferences</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Customize global application rules and UI colors</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-[0.85rem] hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <i className="ph-bold ph-spinner animate-spin"></i> : <i className="ph-bold ph-check"></i>}
          Save Preferences
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
        
        {/* Global Settings */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="ph-fill ph-globe text-orange-500 text-lg"></i> Global Settings
          </h3>
          <div className="grid grid-cols-2 gap-6">
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
              <label className="text-[0.75rem] font-bold text-slate-600 mb-1.5 block">Hot Date Threshold ({prefs.currencySymbol})</label>
              <input 
                type="number" 
                value={prefs.hotDateThreshold} 
                onChange={(e) => setPrefs({ ...prefs, hotDateThreshold: Number(e.target.value) })}
                className="w-full text-sm font-semibold text-slate-800 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
              />
              <p className="text-[0.65rem] text-slate-500 mt-1">Bookings with packages above this value will mark the day as "Hot" on the dashboard.</p>
            </div>
          </div>
        </section>

        {/* Calendar Tiers */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="ph-fill ph-calendar text-orange-500 text-lg"></i> Calendar Package Tiers
          </h3>
          <p className="text-[0.75rem] text-slate-500 mb-4">Define how bookings are color-coded in the calendar based on their package value. Lower values match first.</p>
          
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-4 px-3 text-[0.7rem] font-bold text-slate-400 uppercase">
              <div className="col-span-1 text-center">Tier</div>
              <div className="col-span-5">Max Value ({prefs.currencySymbol})</div>
              <div className="col-span-3">Background Color</div>
              <div className="col-span-3">Text Color</div>
            </div>
            {prefs.calendarTiers.map((tier: any, index: number) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-center bg-slate-50 border border-gray-100 rounded-xl p-3">
                <div className="col-span-1 text-center font-bold text-slate-500">{index + 1}</div>
                <div className="col-span-5">
                  <input 
                    type="number" 
                    value={tier.max} 
                    onChange={(e) => updateTiers(index, "max", Number(e.target.value))}
                    className="w-full text-sm font-semibold text-slate-800 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-orange-500"
                  />
                </div>
                <div className="col-span-3 flex items-center gap-3">
                  <ColorPicker 
                    color={tier.bg || '#ffffff'} 
                    onChange={(color) => updateTiers(index, "bg", color)}
                  />
                  <input 
                    type="text" 
                    value={tier.bg} 
                    onChange={(e) => updateTiers(index, "bg", e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-orange-500"
                  />
                </div>
                <div className="col-span-3 flex items-center gap-3">
                  <ColorPicker 
                    color={tier.text || '#000000'} 
                    onChange={(color) => updateTiers(index, "text", color)}
                  />
                  <input 
                    type="text" 
                    value={tier.text} 
                    onChange={(e) => updateTiers(index, "text", e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Status Colors */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="ph-fill ph-palette text-orange-500 text-lg"></i> Booking Status Colors
          </h3>
          <p className="text-[0.75rem] text-slate-500 mb-4">Map statuses from your booking form to specific UI colors used in the Booking Table and Dashboard.</p>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(prefs.statusColors).map(([status, colors]: [string, any]) => (
              <div key={status} className="bg-slate-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.bg }}></div>
                  {status}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wide">Background</span>
                    <div className="flex items-center gap-2">
                      <ColorPicker 
                        color={colors.bg || '#ffffff'} 
                        onChange={(color) => setPrefs({ ...prefs, statusColors: { ...prefs.statusColors, [status]: { ...colors, bg: color } } })}
                      />
                      <input 
                        type="text" 
                        value={colors.bg} 
                        onChange={(e) => setPrefs({ ...prefs, statusColors: { ...prefs.statusColors, [status]: { ...colors, bg: e.target.value } } })}
                        className="w-full text-[0.7rem] font-semibold text-slate-800 border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wide">Text</span>
                    <div className="flex items-center gap-2">
                      <ColorPicker 
                        color={colors.text || '#000000'} 
                        onChange={(color) => setPrefs({ ...prefs, statusColors: { ...prefs.statusColors, [status]: { ...colors, text: color } } })}
                      />
                      <input 
                        type="text" 
                        value={colors.text} 
                        onChange={(e) => setPrefs({ ...prefs, statusColors: { ...prefs.statusColors, [status]: { ...colors, text: e.target.value } } })}
                        className="w-full text-[0.7rem] font-semibold text-slate-800 border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-orange-500"
                      />
                    </div>
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
