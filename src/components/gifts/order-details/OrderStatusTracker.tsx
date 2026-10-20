"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_OPTIONS } from "./orderDetailsConstants";

interface OrderStatusTrackerProps {
  currentStatusIndex: number;
  isUpdatingStatus: string | null;
  /** Omitted without Gifts Manage: the tracker is read-only. */
  onStatusChange?: (status: string) => void;
}

export default function OrderStatusTracker({ currentStatusIndex, isUpdatingStatus, onStatusChange }: OrderStatusTrackerProps) {
  const activeLine = STATUS_OPTIONS[currentStatusIndex > 0 ? currentStatusIndex : 0]?.line;

  return (
    <div className="bg-white rounded-3xl py-3 md:py-4 px-4 md:px-8 border border-slate-100 shadow-sm flex flex-col justify-center col-span-1 lg:col-span-12 relative z-20 no-print overflow-hidden">

      <div className="w-full pb-2">
        <div className="relative flex items-start justify-between w-full max-w-4xl mx-auto px-0 sm:px-2">
        {/* Timeline Background Track */}
        <div className="absolute left-8 right-8 sm:left-12 sm:right-12 top-8 flex items-center z-0">
          <div
            className={cn("h-[2px] transition-all duration-1000 ease-out relative", activeLine)}
            style={{ width: `${(currentStatusIndex / (STATUS_OPTIONS.length - 1)) * 100}%` }}
          >
            {/* Little dot at the end of the active line */}
            <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full", activeLine)}></div>
          </div>
          <div className="h-[2px] border-t-2 border-dashed border-slate-200 flex-1"></div>
        </div>

        {STATUS_OPTIONS.map((status, index) => {
          const isCompleted = index < currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const isPending = index > currentStatusIndex;
          const isUpdating = isUpdatingStatus === status.value;
          const Icon = status.icon;

          return (
            <button
              type="button"
              key={status.value}
              aria-current={isCurrent ? "step" : undefined}
              className={cn("flex flex-col items-center relative bg-white z-10 group", onStatusChange ? "cursor-pointer" : "cursor-default")}
              disabled={!onStatusChange}
              onClick={() => onStatusChange?.(status.value)}
            >

              {/* Circle Icon Container */}
              <div className="h-16 flex items-center justify-center">
                {isCompleted && (
                  <div className={cn("relative w-12 h-12 rounded-full flex items-center justify-center border-[3px] transition-transform group-hover:scale-105", status.bg, status.border)}>
                    <Icon size={18} className={status.text} />
                    <div className={cn("absolute top-0 right-0 w-4 h-4 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm", status.solidBg)}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  </div>
                )}

                {isCurrent && (
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className={cn("absolute inset-0 rounded-full animate-[ping_2s_ease-in-out_infinite] opacity-60", status.bg)}></div>
                    <div className={cn("absolute inset-2 rounded-full border-2", status.bg, status.border)}></div>
                    <div className={cn("absolute inset-4 rounded-full shadow-lg flex items-center justify-center text-white z-10 transition-transform group-hover:scale-105", status.solidBg, status.shadow)}>
                      {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Icon size={18} />}
                    </div>
                    {/* Sparkles for Delivered */}
                    {index === 3 && (
                      <>
                        <div className={cn("absolute top-0 left-1 w-1 h-1 rounded-full animate-bounce", status.solidBg)}></div>
                        <div className={cn("absolute bottom-2 right-0 w-0.5 h-0.5 rounded-full", status.solidBg)}></div>
                        <div className={cn("absolute top-3 right-1 w-1 h-1 rounded-full", status.solidBg)}></div>
                      </>
                    )}
                  </div>
                )}

                {isPending && (
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-[3px] border-slate-100 transition-transform group-hover:scale-105 group-hover:border-slate-200">
                    {isUpdating ? <Loader2 size={18} className="animate-spin text-slate-400" /> : <Icon size={18} className="text-slate-300" />}
                  </div>
                )}
              </div>

              {/* Text Labels - Consistently below icons */}
              <div className="mt-2 flex flex-col items-center pointer-events-none w-16 sm:w-24">
                <span className={cn(
                  "text-[11px] font-bold uppercase tracking-widest text-center leading-tight transition-colors",
                  isCurrent ? "text-slate-800" : "text-slate-400"
                )}>
                  <span className="sm:hidden">{status.label === 'IN PRODUCTION' ? 'IN PROD' : status.label === 'READY FOR PICKUP' ? 'READY' : status.label}</span>
                  <span className="hidden sm:inline">{status.label}</span>
                </span>
                {isCurrent && (
                  <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 shadow-sm", status.bg, status.textLabel)}>CURRENT</span>
                )}
              </div>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
