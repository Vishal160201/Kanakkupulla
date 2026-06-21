"use client";

import React, { useState, useEffect, useRef } from "react";
import { Wheel, ShadeSlider, hexToHsva, hsvaToHex } from "@uiw/react-color";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

// Custom hex to RGB converter
const hexToRgb = (hex: string) => {
  if (!/^#[0-9A-Fa-f]{3,8}$/i.test(hex)) return { r: 0, g: 0, b: 0 };
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const tailwindToHex: Record<string, string> = {
  'bg-red-500': '#ef4444',
  'bg-orange-500': '#f97316',
  'bg-amber-500': '#f59e0b',
  'bg-emerald-500': '#10b981',
  'bg-blue-500': '#3b82f6',
  'bg-violet-500': '#8b5cf6',
  'bg-slate-500': '#64748b',
  'bg-rose-500': '#f43f5e',
};

export function ColorPicker({ color, onChange, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalColor, setInternalColor] = useState(() => {
    if (color && color.startsWith("#")) return color;
    if (color && tailwindToHex[color]) return tailwindToHex[color];
    return "#cbd5e1";
  });
  
  // Keep internal state in sync when prop changes
  useEffect(() => {
    if (color) {
      if (color.startsWith("#")) {
        setInternalColor(color);
      } else if (tailwindToHex[color]) {
        setInternalColor(tailwindToHex[color]);
      }
    }
  }, [color]);

  const handleColorChange = (colorResult: any) => {
    const newHex = hsvaToHex(colorResult.hsva);
    setInternalColor(newHex);
    onChange(newHex);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalColor(val);
    if (/^#[0-9A-Fa-f]{6}$/i.test(val)) {
      onChange(val);
    }
  };

  const isValidHex = /^#[0-9A-Fa-f]{3,8}$/i.test(internalColor);
  const displayHex = isValidHex ? internalColor : "#cbd5e1";
  
  const rgb = hexToRgb(displayHex);
  const hsvaColor = hexToHsva(displayHex);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "w-8 h-8 rounded-full shadow-sm border-[3px] border-white ring-1 ring-gray-200 flex items-center justify-center overflow-hidden transition-transform hover:scale-105 shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500",
              !internalColor.startsWith('#') && !tailwindToHex[internalColor] ? internalColor : '',
              className
            )}
            style={internalColor.startsWith('#') || tailwindToHex[internalColor] ? { backgroundColor: internalColor } : {}}
          />
        }
      />
      <PopoverContent className="w-[200px] p-3 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border-gray-100 flex flex-col gap-3 bg-white/90 backdrop-blur-xl" sideOffset={10}>
        <div className="flex flex-col gap-3">
          <div className="font-bold text-slate-800 text-[0.8rem] pl-1">Color Picker</div>
          
          <div className="flex flex-col items-center justify-center gap-3 py-1">
            <Wheel color={hsvaColor} onChange={handleColorChange} width={150} height={150} />
            <div className="w-full mt-1">
              <ShadeSlider hsva={hsvaColor} onChange={(newAlpha) => handleColorChange({ hsva: { ...hsvaColor, ...newAlpha } })} style={{ width: '100%', height: '12px' }} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
             <div className="flex items-center bg-slate-50 border border-gray-200 rounded-lg px-2 py-1 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all">
               <span className="text-slate-400 font-bold text-[0.65rem] mr-1">HEX</span>
               <input 
                 type="text" 
                 value={internalColor}
                 onChange={handleHexInputChange}
                 className="w-full bg-transparent outline-none text-[0.75rem] font-bold text-slate-700 uppercase"
               />
             </div>
             
             <div className="flex gap-1">
                <div className="flex flex-col items-center justify-center bg-slate-50 border border-gray-200 rounded-md py-1 flex-1">
                   <span className="text-slate-400 font-bold text-[0.55rem]">R</span>
                   <span className="text-[0.7rem] font-bold text-slate-700">{rgb.r}</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-50 border border-gray-200 rounded-md py-1 flex-1">
                   <span className="text-slate-400 font-bold text-[0.55rem]">G</span>
                   <span className="text-[0.7rem] font-bold text-slate-700">{rgb.g}</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-50 border border-gray-200 rounded-md py-1 flex-1">
                   <span className="text-slate-400 font-bold text-[0.55rem]">B</span>
                   <span className="text-[0.7rem] font-bold text-slate-700">{rgb.b}</span>
                </div>
             </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
