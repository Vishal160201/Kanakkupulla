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
  LucideIcon
} from "lucide-react";

// Same as GIFTS_PRODUCTS but with specific colors for the UI similar to the user's reference
const CATEGORY_UI = [
  { id: "keychain", name: "Keychain", icon: Key, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "mug-print", name: "Mug Print", icon: Coffee, color: "text-amber-600", bg: "bg-amber-50" },
  { id: "lamination", name: "Lamination", icon: Files, color: "text-teal-500", bg: "bg-teal-50" },
  { id: "mobile-case", name: "Mobile Case", icon: Smartphone, color: "text-purple-500", bg: "bg-purple-50" },
  { id: "fridge-magnet", name: "Magnet", icon: Magnet, color: "text-red-500", bg: "bg-red-50" },
  { id: "backlight-photo", name: "Backlight", icon: ImagePlus, color: "text-indigo-500", bg: "bg-indigo-50" },
  { id: "frontlight-photo", name: "Frontlight", icon: ImageIcon, color: "text-pink-500", bg: "bg-pink-50" },
  { id: "visiting-card", name: "Visiting Card", icon: IdCard, color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "invitation", name: "Invitation", icon: Mail, color: "text-orange-500", bg: "bg-orange-50" },
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
    <div className="w-max max-w-full mx-auto bg-white/60 backdrop-blur-xl rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex justify-start md:justify-center gap-3 sm:gap-4 overflow-x-auto py-1 px-1 snap-x hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}} />
        
        {CATEGORY_UI.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          
          return (
            <button
              key={cat.id}
              onClick={() => onCategorySelect?.(cat.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 snap-center group transition-all"
            >
              <div 
                className={`w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm
                  ${cat.bg} ${cat.color}
                  ${isSelected ? 'ring-2 ring-offset-1 ring-blue-400 shadow-md scale-105' : 'group-hover:-translate-y-1 group-hover:shadow-md'}
                `}
              >
                <Icon size={18} strokeWidth={1.5} className={isSelected ? 'scale-110 transition-transform' : 'group-hover:scale-110 transition-transform'} />
              </div>
              <span className={`text-[0.6rem] sm:text-[0.65rem] font-bold tracking-tight max-w-[64px] text-center
                ${isSelected ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-900'}
              `}>
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
