import React from 'react';
import { cn } from "@/lib/utils";

export interface VerticalStatusStepperProps {
  steps: string[];
  currentStatus: string | null;
  sectionTitle?: string;
  onStatusChange?: (status: string) => void;
  isUpdating?: boolean;
  updatedAt?: string;
}

const eventStepMap: Record<string, any> = {
  'pending': { icon: 'ph-clock', colorClass: 'text-indigo-600', ringClass: 'ring-indigo-100', bgClass: 'bg-indigo-50', lineClass: 'bg-indigo-500' },
  'confirmed': { icon: 'ph-check-circle', colorClass: 'text-emerald-600', ringClass: 'ring-emerald-100', bgClass: 'bg-emerald-50', lineClass: 'bg-emerald-500' },
  'shoot completed': { icon: 'ph-camera', colorClass: 'text-red-500', ringClass: 'ring-red-100', bgClass: 'bg-red-50', lineClass: 'bg-red-500' }
};

const albumStepMap: Record<string, any> = {
  'pending': { icon: 'ph-clock', colorClass: 'text-emerald-500', ringClass: 'ring-emerald-100', bgClass: 'bg-emerald-50', lineClass: 'bg-emerald-500' },
  'designing': { icon: 'ph-pencil-simple', colorClass: 'text-blue-500', ringClass: 'ring-blue-100', bgClass: 'bg-blue-50', lineClass: 'bg-blue-500' },
  'sent for printing': { icon: 'ph-paper-plane-tilt', colorClass: 'text-purple-500', ringClass: 'ring-purple-100', bgClass: 'bg-purple-50', lineClass: 'bg-purple-500' },
  'ready for delivery': { icon: 'ph-package', colorClass: 'text-orange-500', ringClass: 'ring-orange-100', bgClass: 'bg-orange-50', lineClass: 'bg-orange-500' },
  'delivered': { icon: 'ph-check-circle', colorClass: 'text-teal-500', ringClass: 'ring-teal-100', bgClass: 'bg-teal-50', lineClass: 'bg-teal-500' }
};

export default function VerticalStatusStepper({ steps, currentStatus, sectionTitle, onStatusChange, isUpdating, updatedAt }: VerticalStatusStepperProps) {
  const isAlbum = sectionTitle?.toLowerCase().includes('album');
  const stepMap = isAlbum ? albumStepMap : eventStepMap;
  
  const currentIndex = steps.findIndex(s => s.toLowerCase() === currentStatus?.toLowerCase());
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="flex flex-col items-start font-sans mt-0.5 h-full w-full">
      {steps.map((step, idx) => {
        const stepKey = step.toLowerCase();
        const config = stepMap[stepKey] || { icon: 'ph-circle', colorClass: 'text-slate-500', ringClass: 'ring-slate-100', bgClass: 'bg-slate-50', lineClass: 'bg-slate-500' };
        
        const isPast = idx < activeIndex;
        const isActive = idx === activeIndex;
        
        const nextLineColored = idx < activeIndex;
        
        return (
          <div key={step} className={cn("flex flex-col group w-full", idx < steps.length - 1 ? "flex-1" : "")}>
            {/* The Step Item */}
            <div 
              className={cn("flex items-start", onStatusChange ? "cursor-pointer" : "", isUpdating ? "opacity-50 pointer-events-none" : "")}
              onClick={() => onStatusChange && !isUpdating && onStatusChange(step)}
            >
              {/* Icon Container */}
              <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                {isActive && (
                  <div className={cn("absolute inset-0 rounded-full animate-ping opacity-30", config.bgClass)} />
                )}
                
                <div className={cn(
                  "w-[26px] h-[26px] rounded-full flex items-center justify-center z-10 transition-all duration-500 ring-2 ring-white",
                  (isActive || isPast) ? cn(config.bgClass) : "bg-slate-50",
                  isActive ? "scale-110" : ""
                )}>
                  <i className={cn(
                    "text-[10px]",
                    config.icon,
                    (isActive || isPast) ? config.colorClass : "text-slate-300",
                    (isActive || isPast) ? "ph-bold" : "ph"
                  )}></i>
                </div>
              </div>
              
              {/* Step Label */}
              <div className="ml-4 flex flex-col justify-center min-h-[26px]">
                <div className="font-bold text-[10px] text-slate-800 uppercase tracking-wider leading-none mb-1">
                  {step}
                </div>
                {updatedAt && (
                  <div className="text-[9px] text-slate-400 font-medium leading-none">
                    {updatedAt}
                  </div>
                )}
              </div>
            </div>
            
            {/* Connecting Line (except for last item) */}
            {idx < steps.length - 1 && (
              <div className="flex-1 min-h-[24px] w-0.5 flex shrink-0 ml-[15px] relative overflow-hidden my-0.5">
                {/* Background gray line */}
                <div className="absolute inset-0 bg-slate-100" />
                {/* Foreground colored line */}
                <div className={cn(
                  "absolute top-0 w-full transition-all duration-700 ease-out",
                  config.lineClass
                )} 
                style={{ height: nextLineColored ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
