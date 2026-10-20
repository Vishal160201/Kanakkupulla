import { DEFAULT_SHOP_ICON, isShopIcon } from "@/lib/shopIcons";

/** A shop's Phosphor icon; unknown or empty values fall back to the storefront icon. */
export default function ShopIcon({ icon, className = "" }: { icon?: string | null; className?: string }) {
  const name = isShopIcon(icon) ? icon : DEFAULT_SHOP_ICON;
  return <i aria-hidden="true" className={`ph-bold ph-${name} ${className}`} />;
}
