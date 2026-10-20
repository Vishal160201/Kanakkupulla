import { cn } from "@/lib/utils";

const TONES = {
  orange: "bg-orange-500 border-orange-500",
  blue: "bg-blue-600 border-blue-600",
  green: "bg-emerald-500 border-emerald-500",
  red: "bg-red-500 border-red-500",
} as const;
export type CheckboxTone = keyof typeof TONES;

/** The visual box only (for rows that are themselves the clickable control). */
export function CheckboxMark({ checked, tone = "orange", size = "md" }: { checked: boolean; tone?: CheckboxTone; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shrink-0 rounded-[5px] border flex items-center justify-center transition-colors",
        size === "sm" ? "w-4 h-4" : "w-5 h-5",
        checked ? TONES[tone] : "bg-white border-slate-300"
      )}
    >
      {checked && <i className={cn("ph-bold ph-check text-white", size === "sm" ? "text-[10px]" : "text-[12px]")} />}
    </span>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Visible label; when omitted, pass `ariaLabel`. */
  label?: React.ReactNode;
  ariaLabel?: string;
  tone?: CheckboxTone;
  size?: "sm" | "md";
  className?: string;
  labelClassName?: string;
  disabled?: boolean;
}

/** App-styled checkbox (a button with role="checkbox"; no native control). */
export default function Checkbox({ checked, onChange, label, ariaLabel, tone, size, className, labelClassName, disabled }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2.5 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-md",
        className
      )}
    >
      <CheckboxMark checked={checked} tone={tone} size={size} />
      {label && <span className={labelClassName}>{label}</span>}
    </button>
  );
}
