import React from 'react';
import { cn } from "@/lib/utils";

export interface StepperStep {
  label: string;
  value: string;
  icon: string;
  color?: string; // Optional custom color class for the active state
}

interface BookingStatusStepperProps {
  steps: StepperStep[];
  currentStatus: string;
  onStatusChange: (status: string) => void;
  className?: string;
}

export default function BookingStatusStepper({ steps, currentStatus, onStatusChange, className }: BookingStatusStepperProps) {
  // Find index of current status
  let currentIndex = steps.findIndex(s => s.value === currentStatus);
  if (currentIndex === -1) currentIndex = 0; // Fallback

  return (
    <div className={cn("flex items-center justify-between w-full relative", className)}>
      {/* Background dashed line */}
      <div className="absolute left-[10%] right-[10%] top-6 h-[2px] border-t-2 border-dashed border-slate-200 -z-10"></div>
      
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
        
        // Determine colors based on state
        let circleBg = "bg-white border-2 border-slate-100";
        let iconColor = "text-slate-300";
        let labelColor = "text-slate-400";
        
        if (isCurrent) {
          circleBg = "bg-red-500 border-none shadow-md shadow-red-200/50";
          iconColor = "text-white";
          labelColor = "text-slate-800 font-black";
        } else if (isCompleted) {
          circleBg = "bg-white border-2 border-slate-200";
          iconColor = "text-slate-400";
          labelColor = "text-slate-500 font-bold";
        }
        
        return (
          <div key={step.value} className="flex flex-col items-center flex-1 relative group cursor-pointer" onClick={() => onStatusChange(step.value)}>
            {/* The outer ring for Current state */}
            {isCurrent && (
              <div className="absolute top-0 flex items-center justify-center pointer-events-none" style={{ width: '48px', height: '48px' }}>
                <div className="w-[60px] h-[60px] rounded-full border border-red-200 absolute"></div>
                <div className="w-[72px] h-[72px] rounded-full border border-red-50 absolute bg-red-50/20 animate-pulse"></div>
              </div>
            )}
            
            {/* Main Icon Circle */}
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 z-10", circleBg, isCurrent ? "scale-100" : "scale-95 group-hover:scale-100")}>
              <i className={cn(step.icon, "text-xl transition-colors duration-300", iconColor)}></i>
            </div>
            
            {/* Status Label */}
            <div className="mt-4 flex flex-col items-center gap-1">
              <span className={cn("text-[0.65rem] tracking-widest uppercase text-center transition-colors duration-300 w-24 leading-tight", labelColor)}>
                {step.label}
              </span>
              
              {/* CURRENT pill */}
              <div className={cn("transition-all duration-300 overflow-hidden", isCurrent ? "h-5 opacity-100 mt-0.5" : "h-0 opacity-0")}>
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-black tracking-wider border border-red-100 uppercase">
                  Current
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
