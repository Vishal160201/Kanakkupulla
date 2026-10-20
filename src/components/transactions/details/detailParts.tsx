// Formatting helpers and row primitives for the transaction details modal.

export const money = (value: number) =>
  `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const getCategoryIcon = (category: string) => {
  const value = category.toLowerCase();
  if (value.includes("photo")) return "ph-camera";
  if (value.includes("print") || value.includes("xerox")) return "ph-printer";
  if (value.includes("travel") || value.includes("bus")) return "ph-bus";
  if (value.includes("salary") || value.includes("wage")) return "ph-money";
  if (value.includes("tea") || value.includes("food") || value.includes("coffee")) return "ph-coffee";
  if (value.includes("chit") || value.includes("fund") || value.includes("saving")) return "ph-piggy-bank";
  if (value.includes("fuel") || value.includes("petrol")) return "ph-gas-pump";
  if (value.includes("rent") || value.includes("office")) return "ph-house";
  if (value.includes("repair") || value.includes("equipment")) return "ph-wrench";
  return "ph-receipt";
};

export const formatCustomValue = (value: unknown) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const fieldIcon = (type: string, label: string) => {
  const normalized = `${type} ${label}`.toLowerCase();
  if (normalized.includes("tag")) return "ph-tag";
  if (normalized.includes("date")) return "ph-calendar-blank";
  if (normalized.includes("phone")) return "ph-phone";
  if (normalized.includes("email")) return "ph-envelope-simple";
  if (normalized.includes("user")) return "ph-user";
  if (normalized.includes("currency") || normalized.includes("amount")) return "ph-currency-inr";
  if (normalized.includes("status")) return "ph-seal-check";
  if (normalized.includes("note") || normalized.includes("description")) return "ph-note";
  return "ph-info";
};

export function DetailRow({
  icon,
  label,
  value,
  multiline = false,
}: {
  icon: string;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="grid grid-cols-[24px_110px_minmax(0,1fr)] items-start gap-2 text-sm sm:grid-cols-[28px_120px_minmax(0,1fr)]">
      <i className={`ph-bold ${icon} mt-0.5 text-lg text-slate-400`} />
      <span className="font-semibold text-slate-400">{label}</span>
      <span className={`text-right font-bold text-slate-700 ${multiline ? "break-words" : "truncate"}`}>
        {value}
      </span>
    </div>
  );
}

export function ImpactRow({
  label,
  total,
  change,
  positive,
}: {
  label: string;
  total: number;
  change: number;
  positive: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-slate-100 px-4 py-4 text-sm">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="font-black text-slate-800">{money(total)}</span>
      <span className={`w-[86px] text-right font-black ${positive ? "text-emerald-500" : "text-rose-500"}`}>
        {change >= 0 ? "+" : "−"}{money(Math.abs(change))}
      </span>
    </div>
  );
}

/** A details row that links out (booking / gift order). */
export function LinkRow({ icon, label, value, onClick }: { icon: string; label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[24px_110px_minmax(0,1fr)] items-start gap-2 text-left text-sm sm:grid-cols-[28px_120px_minmax(0,1fr)] mt-1"
    >
      <i className={`ph-bold ${icon} mt-0.5 text-lg text-slate-400`} />
      <span className="font-semibold text-slate-400">{label}</span>
      <span className="text-right font-bold text-indigo-600 hover:underline truncate">
        {value}
      </span>
    </button>
  );
}
