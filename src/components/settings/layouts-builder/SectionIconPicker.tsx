"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { APP_ICONS_BY_CATEGORY } from "@/lib/appIcons";
import { Tooltip } from "@/components/ui/Tooltip";

interface SectionIconPickerProps {
  icon: string | undefined;
  onChange: (iconClassName: string) => void;
}

export default function SectionIconPicker({ icon, onChange }: SectionIconPickerProps) {
  return (
    <Popover>
      <PopoverTrigger aria-label="Choose section icon">
        <div className="text-orange-500 mt-1 w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center hover:bg-orange-100 transition-colors cursor-pointer border border-orange-100 outline-none">
          <i className={`ph-fill ${icon || "ph-squares-four"} text-2xl`}></i>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl border-slate-100 shadow-xl" align="start">
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Choose Section Icon</p>
        </div>
        <div className="p-2 max-h-72 overflow-y-auto">
          {Object.entries(APP_ICONS_BY_CATEGORY).map(([cat, icons]) => (
            <div key={cat} className="mb-3 last:mb-0">
              <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1.5">{cat}</p>
              <div className="grid grid-cols-5 gap-1">
                {icons.map((appIcon) => (
                  <Tooltip key={appIcon.id} content={appIcon.label}>
                    <button
                      type="button"
                      onClick={() => onChange(appIcon.className)}
                      aria-label={appIcon.label}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${icon === appIcon.className ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-slate-600 hover:bg-slate-100 hover:text-orange-600"}`}
                    >
                      <i className={`ph-fill ${appIcon.className}`}></i>
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
