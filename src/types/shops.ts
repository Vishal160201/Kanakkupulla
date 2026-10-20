// Shops: studio-wide business units that ledger ("Daily Kanakku") entries belong to.

/** A shop as returned by GET /api/shops. */
export interface Shop {
  id: string;
  name: string;
  /** Optional emoji shown next to the name. */
  icon: string | null;
  /** Hex colour, e.g. "#6366f1". */
  color: string;
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
  color?: string;
  icon?: string | null;
  isDefault?: boolean;
  isArchived?: boolean;
}

/** The switcher value: one shop's id, or every shop. */
export type ActiveShopId = "all" | string;
