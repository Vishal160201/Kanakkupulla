// Phosphor icon names a shop can use (rendered as `ph-bold ph-<name>`). Shared by the API
// validation and the UI, so stored values are always icons the app can draw.
export const SHOP_ICONS = [
  "storefront",
  "camera",
  "aperture",
  "image",
  "frame-corners",
  "gift",
  "printer",
  "film-strip",
  "video-camera",
  "diamond",
  "heart",
  "star",
  "buildings",
  "house",
  "package",
  "briefcase",
  "plant",
  "leaf",
  "tractor",
  "grains",
] as const;

export type ShopIconName = (typeof SHOP_ICONS)[number];

export const DEFAULT_SHOP_ICON: ShopIconName = "storefront";

export function isShopIcon(value: unknown): value is ShopIconName {
  return typeof value === "string" && (SHOP_ICONS as readonly string[]).includes(value);
}
