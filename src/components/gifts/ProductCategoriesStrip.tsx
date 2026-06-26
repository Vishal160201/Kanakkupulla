"use client";

import React, { useRef } from "react";
import { getProductIcon } from "@/lib/productIcons";

const CATEGORY_UI = [
  { id: "keychain", name: "Keychain" },
  { id: "mug-print", name: "Mug Print" },
  { id: "lamination", name: "Lamination" },
  { id: "photoframe", name: "Photoframe" },
  { id: "mobile-case", name: "Mobile Case" },
  { id: "fridge-magnet", name: "Fridge Magnet" },
  { id: "backlight-photo", name: "Backlight" },
  { id: "frontlight-photo", name: "Frontlight" },
  { id: "visiting-card", name: "Visiting Card" },
  { id: "invitation", name: "Invitation" },
  { id: "voter-id", name: "Voter ID" },
  { id: "aadhaar-card", name: "Aadhaar Card" },
  { id: "smart-card", name: "Smart Card" }
];

interface ProductCategoriesStripProps {
  onCategorySelect?: (categoryId: string) => void;
  selectedCategory?: string | null;
}

export default function ProductCategoriesStrip({ onCategorySelect, selectedCategory }: ProductCategoriesStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // We can add subtle horizontal scrolling buttons if needed, but standard native overflow-x is usually enough for mobile/desktop.
  
  return (
    <div className="w-max max-w-full mx-auto bg-white/60 backdrop-blur-xl rounded-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit">
      <div 
        ref={scrollRef}
        className="flex justify-start gap-[10px] overflow-x-auto overflow-y-visible py-3 px-4 snap-x hide-scrollbar items-start"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          @media (max-height: 500px) and (orientation: landscape) {
            .cat-wrapper { width: 48px !important; }
            .cat-btn { width: 32px !important; height: 32px !important; }
            .cat-icon { transform: scale(0.8) !important; }
            .cat-text { font-size: 9px !important; margin-top: 4px !important; line-height: 1 !important; }
          }
        `}} />
        
        {CATEGORY_UI.map((cat) => {
          const uiProps = getProductIcon(cat.id);
          const Icon = uiProps.icon;
          const isSelected = selectedCategory === cat.id;
          
          return (
            <div key={cat.id} className="relative flex flex-col items-center shrink-0 snap-center group w-[56px] sm:w-[72px] cat-wrapper">
              <button
                onClick={() => onCategorySelect?.(cat.id)}
                className="w-[48px] h-[48px] cat-btn flex items-center justify-center transition-all duration-300 rounded-2xl cursor-pointer active:scale-95"
              >
                <div 
                  className={`w-[48px] h-[48px] cat-btn rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm
                    ${uiProps.bg} ${uiProps.color}
                    ${isSelected ? 'ring-2 ring-offset-1 ring-blue-400 shadow-sm scale-105' : 'group-hover:scale-105 group-hover:shadow-sm'}
                  `}
                >
                  <Icon size={18} strokeWidth={1.5} className={`cat-icon ${isSelected ? 'scale-110 transition-transform' : 'group-hover:scale-110 transition-transform'}`} />
                </div>
              </button>
              
              <span className="mt-[6px] text-[10px] leading-[1.2] font-medium text-slate-600 max-w-[56px] sm:max-w-[72px] w-full text-center whitespace-normal break-words line-clamp-2 cat-text">
                {cat.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
