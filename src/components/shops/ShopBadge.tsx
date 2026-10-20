import type { ShopSummary } from "@/types/shops";

export function ShopDot({ color, className = "w-2.5 h-2.5" }: { color?: string | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color || "#94a3b8" }}
    />
  );
}

interface ShopBadgeProps {
  shop: ShopSummary | null | undefined;
  /** "dark" for rows drawn on the dark "Today's Transactions" panel. */
  tone?: "light" | "dark";
  className?: string;
}

/** Coloured dot + emoji + name; used on ledger rows in the "All Shops" view. */
export default function ShopBadge({ shop, tone = "light", className = "" }: ShopBadgeProps) {
  if (!shop) return null;
  const toneClass = tone === "dark"
    ? "bg-white/[0.06] text-slate-300 border-white/10"
    : "bg-white text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex max-w-[140px] shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${toneClass} ${className}`}
      title={`Shop: ${shop.name}`}
    >
      <ShopDot color={shop.color} className="w-2 h-2" />
      {shop.icon && <span className="leading-none">{shop.icon}</span>}
      <span className="truncate">{shop.name}</span>
    </span>
  );
}
