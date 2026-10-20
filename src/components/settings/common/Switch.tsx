"use client";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name (the switch has no visible text of its own). */
  label: string;
  disabled?: boolean;
  size?: "sm" | "md";
  /** Show a lock in the knob (for values that can't be changed). */
  locked?: boolean;
}

/** App-styled toggle switch (role="switch"); replaces native checkboxes. */
export default function Switch({ checked, onChange, label, disabled, size = "md", locked }: SwitchProps) {
  const track = size === "sm" ? "w-9 h-5" : "w-11 h-6";
  const knob = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const shift = size === "sm" ? "translate-x-4" : "translate-x-5";
  const isInert = disabled || locked;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={isInert || undefined}
      disabled={disabled}
      onClick={() => !isInert && onChange(!checked)}
      className={`relative inline-flex shrink-0 rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-1 ${track} ${
        checked ? (locked ? "bg-orange-300" : "bg-orange-500") : "bg-slate-200"
      } ${isInert ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:shadow-sm"}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${knob} ${
          checked ? shift : "translate-x-0"
        }`}
      >
        {locked && <i className="ph-fill ph-lock-simple text-[0.5rem] text-orange-400" />}
      </span>
    </button>
  );
}
