// Shared shapes for the Gifts & Frames UI (payloads of /api/gifts/* and the
// GIFT_ORDER_FORM layout schema). Money fields arrive from the API as plain numbers.

/** A Google Drive file reference, as stored in customData / attachment fields. */
export interface DriveFileInfo {
  id?: string;
  driveFileId?: string;
  name?: string;
  url?: string;
  webViewLink?: string;
  iconUrl?: string;
  sizeBytes?: string | number;
}

/** An attachment value stored in a custom field: `{ driveFile }` once uploaded to Drive. */
export interface DriveAttachment {
  driveFile: DriveFileInfo;
}

export function isDriveAttachment(value: unknown): value is DriveAttachment {
  return (
    typeof value === "object" &&
    value !== null &&
    "driveFile" in value &&
    Boolean((value as { driveFile?: unknown }).driveFile)
  );
}

export type GiftOrderStatus = "PENDING" | "PROCESSING" | "READY" | "DELIVERED";

export interface GiftProduct {
  id: string;
  name: string;
  description?: string | null;
  price?: number;
  stock?: number;
  iconName?: string;
}

export interface GiftOrderTransaction {
  id: string;
  amount: number;
  type: string;
  date: string;
  category: string;
  paymentMode?: string | null;
  description?: string | null;
  status?: string;
  deletedAt?: string | null;
}

/** ProductOrder.customData — standard keys plus any `fld_g_*` layout field values. */
export interface GiftOrderCustomData {
  amount?: number | string;
  advanceAmount?: number | string;
  dueAmount?: number | string;
  discountAmount?: number | string;
  paymentMode?: string;
  dueDate?: string;
  [key: string]: unknown;
}

export interface GiftOrder {
  id: string;
  productId?: string;
  product: GiftProduct;
  quantity: number;
  status: string;
  clientName: string;
  clientPhone: string | null;
  createdAt: string;
  updatedAt?: string;
  date?: string;
  orderNumber?: string | null;
  dueDate?: string | null;
  discountAmount?: number | null;
  customData?: GiftOrderCustomData | null;
  transactions?: GiftOrderTransaction[];
}

/** GET /api/gifts/orders */
export interface GiftOrdersResponse {
  orders?: GiftOrder[];
  totalCount?: number;
}

/** GET /api/gifts/orders/[id] */
export interface GiftOrderResponse {
  order?: GiftOrder;
}

/** GET /api/gifts/products */
export interface GiftProductsResponse {
  products?: GiftProduct[];
}

// ---- GIFT_ORDER_FORM layout schema (/api/settings/layouts/GIFT_ORDER_FORM) ----

export interface GiftVisibilityRule {
  dependsOn?: string;
  fieldId?: string;
  operator?: string;
  values?: string[];
  value?: string;
}

export interface GiftLayoutField {
  id: string;
  name: string;
  type?: string;
  mandatory?: boolean;
  options?: string[];
  statusOptions?: { label: string; color?: string }[];
  placeholder?: string;
  restrictFutureDate?: boolean;
  isRecordDate?: boolean;
  visibility?: GiftVisibilityRule | null;
  visibilityRule?: GiftVisibilityRule | null;
}

export interface GiftLayoutSection {
  id: string;
  title: string;
  icon?: string;
  fields: GiftLayoutField[];
  visibility?: GiftVisibilityRule | null;
  visibilityRule?: GiftVisibilityRule | null;
}

export interface GiftLayoutSchema {
  sections?: GiftLayoutSection[];
}

export interface GiftLayoutResponse {
  schema?: GiftLayoutSchema | null;
}
