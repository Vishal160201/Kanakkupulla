"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ShopDot } from "@/components/shops/ShopBadge";
import ShopIcon from "@/components/shops/ShopIcon";
import { ColorPicker } from "@/components/ui/color-picker";
import { SHOP_ICONS, isShopIcon, type ShopIconName } from "@/lib/shopIcons";
import { SHOP_TYPES, SHOP_TYPE_LABELS } from "@/lib/shopModules";
import { shopTypeOf } from "@/components/providers/ShopProvider";
import type { Shop, ShopInput, ShopType } from "@/types/shops";

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

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** What each shop type gets, shown under the type choice. */
const SHOP_TYPE_DETAILS: Record<ShopType, { icon: string; hint: string }> = {
  STUDIO: { icon: "ph-camera", hint: "Every studio module: bookings, gifts, dashboard and Daily Kanakku." },
  FERTILIZER: { icon: "ph-plant", hint: "Daily Kanakku, Fertilizer Inventory, Farmers and Produce only. Open to owners and the people you add." },
};

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

/** Add / edit form for a shop: name, icon and colour. Mounted only while open. */
export default function ShopFormDialog({ shop, isSaving, serverErrors, onSubmit, onClose }: ShopFormDialogProps) {
  const [name, setName] = useState(shop?.name ?? "");
  const [icon, setIcon] = useState<ShopIconName | null>(isShopIcon(shop?.icon) ? shop.icon : null);
  const [color, setColor] = useState(shop?.color ?? SHOP_COLOR_PRESETS[0]);
  const [isDefault, setIsDefault] = useState(false);
  // Fixed once the shop exists.
  const [type, setType] = useState<ShopType>(shop ? shopTypeOf(shop) : "STUDIO");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const shownErrors = { ...serverErrors, ...errors };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Shop name is required.";
    else if (name.trim().length > 60) errs.name = "Shop name is too long.";
    if (!HEX_RE.test(color)) errs.color = "Use a hex colour like #6366f1.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const input: ShopInput = { name: name.trim(), color, icon };
    if (!shop) input.type = type;
    // Only studio shops can be the default (booking and gift payments land there).
    if (!shop && isDefault && type === "STUDIO") input.isDefault = true;
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
          noValidate
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
              <ShopIcon icon={icon} />
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
            <span id="shop-type-label" className={labelClass}>Shop type</span>
            {shop ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 h-11">
                <i aria-hidden="true" className={`ph-bold ${SHOP_TYPE_DETAILS[type].icon} text-slate-500`} />
                <span className="text-sm font-bold text-slate-700">{SHOP_TYPE_LABELS[type]}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                  <i aria-hidden="true" className="ph-bold ph-lock-simple" /> Can&apos;t be changed
                </span>
              </div>
            ) : (
              <div role="radiogroup" aria-labelledby="shop-type-label" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                {SHOP_TYPES.map((option) => {
                  const isSelected = type === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setType(option)}
                      className={`h-10 rounded-lg inline-flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                        isSelected ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <i aria-hidden="true" className={`ph-bold ${SHOP_TYPE_DETAILS[option].icon}`} />
                      {SHOP_TYPE_LABELS[option]}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-1.5">{SHOP_TYPE_DETAILS[type].hint}</p>
            {shownErrors.type && <p className="text-xs text-red-500 mt-1 font-medium">{shownErrors.type}</p>}
          </div>

          <div>
            <span id="shop-icon-label" className={labelClass}>Icon</span>
            <div role="radiogroup" aria-labelledby="shop-icon-label" className="grid grid-cols-8 gap-1.5">
              {SHOP_ICONS.map((name) => {
                const isSelected = (icon ?? "storefront") === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={name.replace(/-/g, " ")}
                    onClick={() => setIcon(name)}
                    className={`h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                      isSelected
                        ? "bg-orange-50 text-orange-600 ring-2 ring-orange-400"
                        : "bg-slate-50 text-slate-500 hover:bg-white hover:text-slate-800 hover:ring-1 hover:ring-slate-200"
                    }`}
                  >
                    <i aria-hidden="true" className={`ph-bold ph-${name}`} />
                  </button>
                );
              })}
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
              <ColorPicker
                color={HEX_RE.test(color) ? color : "#6366f1"}
                onChange={setColor}
                className="w-11 h-11"
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

          {!shop && type === "STUDIO" && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <div className="text-sm font-bold text-slate-800">Make this the default shop</div>
                <div className="text-[11px] font-semibold text-slate-400">Booking and gift payments are recorded here.</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isDefault}
                aria-label="Make this the default shop"
                onClick={() => setIsDefault((v) => !v)}
                className={`w-11 h-6 shrink-0 rounded-full transition-colors relative ${isDefault ? "bg-orange-500" : "bg-slate-300"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${isDefault ? "left-6" : "left-1"}`} />
              </button>
            </div>
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
