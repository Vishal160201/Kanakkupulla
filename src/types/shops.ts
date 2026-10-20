// Shops: business units that ledger ("Daily Kanakku") entries belong to.

import type { ShopTypeName } from "@/lib/shopModules";

/** STUDIO shops share every studio module; FERTILIZER shops get the ledger, inventory, farmers and produce only. */
export type ShopType = ShopTypeName;

/** A shop as returned by GET /api/shops. */
export interface Shop {
  id: string;
  name: string;
  /** Phosphor icon name from SHOP_ICONS (src/lib/shopIcons.ts); null uses the storefront icon. */
  icon: string | null;
  /** Hex colour, e.g. "#6366f1". */
  color: string;
  /** Fixed at creation. Decides which modules and ledger layout the shop uses. */
  type: ShopType;
  /** Non-admin users allowed into a FERTILIZER shop (returned to admins only). */
  /** Owners only: who is assigned to this shop and with which role. */
  members?: ShopMemberAssignment[];
  isArchived: boolean;
  isDefault: boolean;
  /** Ledger entries in this shop (including any in the recycle bin). */
  transactionCount: number;
  createdAt: string;
  updatedAt: string;
}

/** The shop fields embedded in each transaction by the list / detail APIs. */
export type ShopSummary = Pick<Shop, "id" | "name" | "color" | "icon">;

/** GET /api/shops[?includeArchived=true] */
export interface ShopListResponse {
  shops: Shop[];
  defaultShopId: string | null;
}

/** Body of POST /api/shops and PUT /api/shops/[id]. */
export interface ShopInput {
  name?: string;
  /** POST only; the type can't be changed afterwards. */
  type?: ShopType;
  color?: string;
  icon?: string | null;
  isDefault?: boolean;
  isArchived?: boolean;
}

/** The switcher value: one shop's id, or every studio shop ("all", admins only). */
export type ActiveShopId = "all" | string;

/** PUT /api/shops/[id]/members */
export interface ShopMemberAssignment {
  userId: string;
  roleId: string;
  roleKey: "ADMIN" | "STAFF";
}

export interface ShopMembersResponse {
  members: ShopMemberAssignment[];
}
