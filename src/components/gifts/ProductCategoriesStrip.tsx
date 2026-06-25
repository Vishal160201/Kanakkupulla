"use client";

import React, { useRef } from "react";
import { 
  Key, 
  Coffee, 
  Files, 
  Smartphone, 
  Magnet, 
  Image as ImageIcon, 
  ImagePlus, 
  IdCard, 
  Mail, 
  CreditCard,
  Frame,
  LucideIcon
} from "lucide-react";

// Same as GIFTS_PRODUCTS but with specific colors for the UI similar to the user's reference
const CATEGORY_UI = [
  { id: "keychain", name: "Keychain", icon: Key, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "mug-print", name: "Mug Print", icon: Coffee, color: "text-amber-600", bg: "bg-amber-50" },
  { id: "lamination", name: "Lamination", icon: Files, color: "text-teal-500", bg: "bg-teal-50" },
  { id: "photoframe", name: "Photoframe", icon: Frame, color: "text-yellow-600", bg: "bg-yellow-50" },
  { id: "mobile-case", name: "Mobile Case", icon: Smartphone, color: "text-purple-500", bg: "bg-purple-50" },
  { id: "fridge-magnet", name: "Fridge Magnet", icon: Magnet, color: "text-red-500", bg: "bg-red-50" },
  { id: "backlight-photo", name: "Backlight", icon: ImagePlus, color: "text-indigo-500", bg: "bg-indigo-50" },
  { id: "frontlight-photo", name: "Frontlight", icon: ImageIcon, color: "text-pink-500", bg: "bg-pink-50" },
  { id: "visiting-card", name: "Visiting Card", icon: IdCard, color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "invitation", name: "Invitation", icon: Mail, color: "text-orange-500", bg: "bg-orange-50" },
  { id: "voter-id", name: "Voter ID", icon: IdCard, color: "text-slate-500", bg: "bg-slate-50" },
  { id: "aadhaar-card", name: "Aadhaar Card", icon: CreditCard, color: "text-violet-500", bg: "bg-violet-50" },
  { id: "smart-card", name: "Smart Card", icon: CreditCard, color: "text-cyan-500", bg: "bg-cyan-50" }
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
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          
          return (
            <div key={cat.id} className="relative flex flex-col items-center shrink-0 snap-center group w-[56px] sm:w-[72px] cat-wrapper">
              <button
                onClick={() => onCategorySelect?.(cat.id)}
                className="w-[48px] h-[48px] cat-btn flex items-center justify-center transition-all duration-300 rounded-2xl cursor-pointer active:scale-95"
              >
                <div 
                  className={`w-[48px] h-[48px] cat-btn rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm
                    ${cat.bg} ${cat.color}
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
