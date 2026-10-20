"use client";

import { useShops } from "@/components/providers/ShopProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ShopIcon from "./ShopIcon";

const segmentBase =
  "shrink-0 inline-flex items-center gap-2 h-9 pl-1.5 pr-3.5 rounded-xl text-[0.8rem] font-bold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300";
const segmentActive = "bg-white text-slate-900 shadow-sm";
const segmentIdle = "text-slate-500 hover:text-slate-800";

/** Icon tile tinted with the shop colour (the colour is the only per-shop marker). */
function IconTile({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="w-6 h-6 rounded-lg flex items-center justify-center text-[0.8rem] shrink-0"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      {children}
    </span>
  );
}

interface ShopSwitcherProps {
  className?: string;
  /** Explains which figures follow the selection; shown behind an info button. */
  note?: string;
}

/**
 * Segmented control: "All Shops" + one segment per active shop. Scrolls horizontally on
 * small screens and renders nothing when there is at most one active shop.
 */
export default function ShopSwitcher({ className = "", note }: ShopSwitcherProps) {
  const { shops, activeShopId, setActiveShopId, isReady } = useShops();

  if (!isReady || shops.length <= 1) return null;

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      <div
        role="group"
        aria-label="Filter by shop"
        className="flex items-center gap-1 p-1 max-w-full overflow-x-auto rounded-2xl bg-slate-100 border border-slate-200/60 shadow-inner [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          aria-pressed={activeShopId === "all"}
          onClick={() => setActiveShopId("all")}
          className={`${segmentBase} ${activeShopId === "all" ? segmentActive : segmentIdle}`}
        >
          <IconTile color="#64748b">
            <i className="ph-bold ph-squares-four" />
          </IconTile>
          All Shops
        </button>
        {shops.map((shop) => {
          const isActive = activeShopId === shop.id;
          return (
            <button
              key={shop.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveShopId(shop.id)}
              className={`${segmentBase} ${isActive ? segmentActive : segmentIdle}`}
            >
              <IconTile color={shop.color}>
                <ShopIcon icon={shop.icon} />
              </IconTile>
              <span className="max-w-[160px] truncate">{shop.name}</span>
            </button>
          );
        })}
      </div>

      {note && (
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label="Which figures follow the shop filter"
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white hover:shadow-sm transition-all"
              >
                <i className="ph-bold ph-info text-base" />
              </button>
            }
          />
          <PopoverContent
            sideOffset={8}
            className="w-72 p-3.5 rounded-2xl border-slate-100 bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.18)] text-xs font-medium leading-relaxed text-slate-600"
          >
            {note}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
