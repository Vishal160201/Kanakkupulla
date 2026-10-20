"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ShopDot } from "@/components/shops/ShopBadge";
import type { Shop, ShopInput } from "@/types/shops";

export const SHOP_COLOR_PRESETS = [
  "#6366f1", // indigo
  "#f97316", // orange
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#f43f5e", // rose
  "#8b5cf6", // violet
  "#eab308", // amber
  "#64748b", // slate
];

const EMOJI_SUGGESTIONS = ["🏪", "📸", "🖼️", "🎁", "🖨️", "🎞️", "💍", "⭐"];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface ShopFormDialogProps {
  /** Shop being edited, or null to create one. */
  shop: Shop | null;
  isSaving: boolean;
  /** Field errors returned by the API (422 `errors`). */
  serverErrors?: Record<string, string>;
  onSubmit: (input: ShopInput) => void;
  onClose: () => void;
}

const inputClass =
  "w-full h-11 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition";
const labelClass = "block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2";

/** Add / edit form for a shop: name, emoji icon and colour. Mounted only while open. */
export default function ShopFormDialog({ shop, isSaving, serverErrors, onSubmit, onClose }: ShopFormDialogProps) {
  const [name, setName] = useState(shop?.name ?? "");
  const [icon, setIcon] = useState(shop?.icon ?? "");
  const [color, setColor] = useState(shop?.color ?? SHOP_COLOR_PRESETS[0]);
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const shownErrors = { ...serverErrors, ...errors };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Shop name is required.";
    else if (name.trim().length > 60) errs.name = "Shop name is too long.";
    if (!HEX_RE.test(color)) errs.color = "Use a hex colour like #6366f1.";
    if ([...icon.trim()].length > 4) errs.icon = "Use a single emoji.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const input: ShopInput = { name: name.trim(), color, icon: icon.trim() || null };
    if (!shop && isDefault) input.isDefault = true;
    onSubmit(input);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] max-w-[460px] sm:max-w-[460px] rounded-3xl border-0 bg-white p-0 shadow-2xl gap-0 overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <span className="text-[0.65rem] font-bold text-orange-500 uppercase tracking-[1px]">
            {shop ? "Edit Shop" : "New Shop"}
          </span>
          <DialogTitle className="text-xl font-extrabold text-slate-900 mt-0.5">
            {shop ? `Edit ${shop.name}` : "Add a shop"}
          </DialogTitle>
        </div>

        <form
          className="px-6 py-5 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {/* Preview */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white shadow-sm"
              style={{ backgroundColor: HEX_RE.test(color) ? color : "#94a3b8" }}
            >
              {icon.trim() || <i className="ph-bold ph-storefront" />}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">{name.trim() || "Shop name"}</div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <ShopDot color={HEX_RE.test(color) ? color : null} className="w-2 h-2" /> Preview
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="shop-name" className={labelClass}>
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="shop-name"
              autoFocus
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Studio"
              className={`${inputClass} ${shownErrors.name ? "border-red-300" : ""}`}
            />
            {shownErrors.name && <p className="text-xs text-red-500 mt-1 font-medium">{shownErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="shop-icon" className={labelClass}>Icon (emoji)</label>
            <div className="flex items-center gap-2">
              <input
                id="shop-icon"
                value={icon}
                maxLength={16}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🏪"
                className={`${inputClass} w-20 text-center text-lg ${shownErrors.icon ? "border-red-300" : ""}`}
              />
              <div className="flex flex-wrap gap-1">
                {EMOJI_SUGGESTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    aria-label={`Use ${emoji}`}
                    className={`w-9 h-9 rounded-lg text-lg transition ${icon === emoji ? "bg-orange-50 ring-2 ring-orange-400" : "hover:bg-slate-100"}`}
                  >
                    {emoji}
                  </button>
                ))}
                {icon && (
                  <button
                    type="button"
                    onClick={() => setIcon("")}
                    aria-label="Remove icon"
                    className="w-9 h-9 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <i className="ph-bold ph-x" />
                  </button>
                )}
              </div>
            </div>
            {shownErrors.icon && <p className="text-xs text-red-500 mt-1 font-medium">{shownErrors.icon}</p>}
          </div>

          <div>
            <span className={labelClass}>Colour</span>
            <div className="flex flex-wrap items-center gap-2 mb-3" role="radiogroup" aria-label="Colour presets">
              {SHOP_COLOR_PRESETS.map((preset) => {
                const isSelected = color.toLowerCase() === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={preset}
                    onClick={() => setColor(preset)}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${isSelected ? "ring-2 ring-offset-2 ring-slate-900" : ""}`}
                    style={{ backgroundColor: preset }}
                  >
                    {isSelected && <i className="ph-bold ph-check text-white text-sm" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Pick a custom colour"
                value={HEX_RE.test(color) ? color : "#6366f1"}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
              />
              <input
                aria-label="Hex colour"
                value={color}
                maxLength={7}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setColor(v.startsWith("#") ? v : `#${v}`);
                }}
                className={`${inputClass} w-32 font-mono uppercase ${shownErrors.color ? "border-red-300" : ""}`}
              />
            </div>
            {shownErrors.color && <p className="text-xs text-red-500 mt-1 font-medium">{shownErrors.color}</p>}
          </div>

          {!shop && (
            <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              Make this the default shop
            </label>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
              {shop ? "Save Changes" : "Add Shop"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
