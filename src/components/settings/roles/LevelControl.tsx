"use client";

import { useRef } from "react";
import type { AccessLevel } from "@/lib/access";
import { LEVEL_LABELS } from "./roleMeta";

interface LevelControlProps {
  /** The levels this module supports, lowest first. */
  levels: readonly AccessLevel[];
  value: AccessLevel;
  onChange: (level: AccessLevel) => void;
  /** Accessible name, e.g. "Admin: Bookings". */
  label: string;
  disabled?: boolean;
  /** Stretch the segments to the container width (mobile accordions). */
  fullWidth?: boolean;
}

const ACTIVE_STYLES: Record<AccessLevel, string> = {
  NONE: "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200",
  VIEW: "bg-sky-500 text-white shadow-sm",
  MANAGE: "bg-orange-500 text-white shadow-sm",
};

const ICONS: Record<AccessLevel, string> = {
  NONE: "ph-prohibit",
  VIEW: "ph-eye",
  MANAGE: "ph-pencil-simple",
};

/** Compact None / View / Manage segmented control (a radio group with arrow-key support). */
export default function LevelControl({ levels, value, onChange, label, disabled, fullWidth }: LevelControlProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + levels.length) % levels.length;
    onChange(levels[next]);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={`${fullWidth ? "flex w-full" : "inline-flex"} items-center gap-0.5 rounded-xl bg-slate-100 p-0.5`}
    >
      {levels.map((level, index) => {
        const isActive = level === value;
        return (
          <button
            key={level}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(level)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(index, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(index, -1);
              }
            }}
            className={`${fullWidth ? "flex-1" : "min-w-[58px]"} h-8 px-2.5 rounded-[10px] text-[11px] font-bold inline-flex items-center justify-center gap-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:cursor-not-allowed ${
              isActive ? ACTIVE_STYLES[level] : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
            }`}
          >
            <i aria-hidden="true" className={`ph-bold ${ICONS[level]} text-[12px]`} />
            {LEVEL_LABELS[level]}
          </button>
        );
      })}
    </div>
  );
}
