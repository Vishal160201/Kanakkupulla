// Fertilizer Inventory: products, stock movements, sale / purchase bills and
// farmer credit. Shapes mirror the /api/inventory/* contract (money fields are numbers).

import type { INVENTORY_PAYMENT_MODES } from "@/lib/shopModules";
export type InventoryPaymentMode = (typeof INVENTORY_PAYMENT_MODES)[number];

export type BillKind = "SALE" | "PURCHASE";
export type StockMovementType = "PURCHASE" | "SALE" | "ADJUSTMENT";

/** GET /api/inventory/summary */
export interface InventorySummary {
  stockValue: number;
  productCount: number;
  outOfStockCount: number;
  todaySales: number;
  todayPurchases: number;
  creditOutstanding: number;
  customersWithDues: number;
}

export interface InventoryProduct {
  id: string;
  name: string;
  /** Pack type, one of PACK_TYPES (older rows may hold other strings). */
  unit: string;
  /** Size of one pack (50 for a 50 kg bag); null for Loose / Piece or when not set. */
  packSize: number | null;
  /** Unit of packSize, or what a Loose product is sold by. */
  packUnit: string | null;
  price: number;
  isArchived: boolean;
  /** Current quantity in stock. */
  stock: number;
}

/** GET /api/inventory/products */
export interface InventoryProductListResponse {
  products: InventoryProduct[];
}

/** Body of POST /api/inventory/products (with shopId) and PUT /api/inventory/products/[id]. */
export interface InventoryProductInput {
  shopId?: string;
  name?: string;
  unit?: string;
  packSize?: number | null;
  packUnit?: string | null;
  price?: number;
  isArchived?: boolean;
}

export interface BillRef {
  id: string;
  billNumber: string;
  kind: BillKind;
}

export interface StockMovement {
  id: string;
  type: StockMovementType;
  /** Signed: positive adds stock, negative removes it. */
  quantity: number;
  unitPrice: number | null;
  amount: number | null;
  date: string;
  notes: string | null;
  bill: BillRef | null;
  /** Stock after this movement. */
  balanceAfter: number;
}

/** GET /api/inventory/products/[id]/movements (newest first) */
export interface ProductMovementsResponse {
  product: InventoryProduct;
  movements: StockMovement[];
}

/** Body of POST /api/inventory/adjustments */
export interface StockAdjustmentInput {
  shopId: string;
  productId: string;
  /** Signed, non-zero. */
  quantity: number;
  notes: string;
}

export interface CustomerRef {
  id: string;
  name: string;
}

/** A bill as listed by GET /api/inventory/bills. */
export interface InventoryBill {
  id: string;
  kind: BillKind;
  billNumber: string;
  date: string;
  customer: CustomerRef | null;
  supplierName: string | null;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: string;
  notes: string | null;
  voidedAt: string | null;
  lineCount: number;
}

export interface InventoryBillLine {
  id: string;
  product: { id: string; name: string; unit: string; packSize: number | null; packUnit: string | null };
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InventoryBillDetail extends InventoryBill {
  lines: InventoryBillLine[];
}

/** GET /api/inventory/bills */
export interface InventoryBillListResponse {
  bills: InventoryBill[];
  total: number;
  page: number;
  pageSize: number;
}

/** GET /api/inventory/bills/[id] */
export interface InventoryBillDetailResponse {
  bill: InventoryBillDetail;
}

export interface InventoryBillLineInput {
  productId: string;
  /** > 0 */
  quantity: number;
  unitPrice: number;
}

/** Body of POST /api/inventory/bills */
export interface InventoryBillInput {
  shopId: string;
  kind: BillKind;
  /** YYYY-MM-DD */
  date: string;
  customerId?: string;
  supplierName?: string;
  /** SALE only; defaults to the total. Less than the total needs a customer (credit). */
  paidAmount?: number;
  paymentMode: string;
  notes?: string;
  lines: InventoryBillLineInput[];
}

/**
 * One entry of the 409 `errors` payload of POST /api/inventory/bills (a line exceeds stock).
 * The UI accepts any of: an array of these, an array of strings (by line index), or an
 * object keyed by line index / productId.
 */
export interface BillLineError {
  index?: number;
  lineIndex?: number;
  productId?: string;
  message?: string;
  error?: string;
  available?: number;
}

export interface CreditCustomer {
  id: string;
  name: string;
  phone: string | null;
  place: string | null;
  /** Credit owed by the customer. */
  balance: number;
  lastActivity: string | null;
  isArchived?: boolean;
}

/** GET /api/inventory/customers */
export interface CreditCustomerListResponse {
  customers: CreditCustomer[];
}

/** Body of POST /api/inventory/customers (with shopId) and PUT /api/inventory/customers/[id]. */
export interface CreditCustomerInput {
  shopId?: string;
  name?: string;
  phone?: string;
  place?: string;
  isArchived?: boolean;
}

export interface CreditPayment {
  id: string;
  amount: number;
  date: string;
  paymentMode: string;
  notes: string | null;
  voidedAt: string | null;
  /** Fertilizer credit deducted from a produce payment; voided only with that payment. */
  fromProducePayment?: boolean;
}

/** GET /api/inventory/customers/[id] */
export interface CreditCustomerDetailResponse {
  customer: CreditCustomer;
  balance: number;
  bills: InventoryBill[];
  payments: CreditPayment[];
}

/** Body of POST /api/inventory/customers/[id]/payments */
export interface CreditPaymentInput {
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  paymentMode: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Produce: crops bought from farmers and sold to buyers (/api/inventory/produce/*)
// ---------------------------------------------------------------------------

export interface ProduceItem {
  id: string;
  name: string;
  /** kg, quintal or tonne: quantities and rates are in this unit. */
  unit: string;
  isArchived: boolean;
  /** In the item's unit. */
  stock: number;
}

/** GET /api/inventory/produce/items */
export interface ProduceItemListResponse {
  items: ProduceItem[];
}

export interface ProduceItemInput {
  shopId?: string;
  name?: string;
  unit?: string;
  isArchived?: boolean;
}

export interface ProduceSummaryItem extends ProduceItem {
  todayQuantity: number;
  todayAmount: number;
  todayCollections: number;
}

/** GET /api/inventory/produce/summary */
export interface ProduceSummary {
  items: ProduceSummaryItem[];
  /** Stock of every item converted to kg. */
  stockKg: number;
  owedToFarmers: number;
  farmersOwed: number;
  buyerDues: number;
  buyersWithDues: number;
  todayCollectedAmount: number;
  todayCollections: number;
}

export interface PartyRef {
  id: string;
  name: string;
  place: string | null;
}

export interface ProduceItemRef {
  id: string;
  name: string;
  unit: string;
}

export interface ProduceCollection {
  id: string;
  date: string;
  quantity: number;
  rate: number;
  amount: number;
  notes: string | null;
  voidedAt: string | null;
  item: ProduceItemRef;
  customer: PartyRef;
}

/** GET /api/inventory/produce/collections */
export interface ProduceCollectionListResponse {
  collections: ProduceCollection[];
  total: number;
  page: number;
  pageSize: number;
}

/** Body of POST /api/inventory/produce/collections */
export interface ProduceCollectionInput {
  shopId: string;
  itemId: string;
  customerId: string;
  /** YYYY-MM-DD */
  date: string;
  quantity: number;
  rate: number;
  notes?: string;
}

export interface ProduceFarmer {
  id: string;
  name: string;
  phone: string | null;
  place: string | null;
  /** What the shop owes the farmer for produce (all crops). */
  produceDue: number;
  collectedAmount: number;
  collections: number;
  /** Names of the crops collected from this farmer. */
  crops: string[];
  /** Fertilizer credit the farmer owes the shop. */
  fertilizerCredit: number;
  lastCollection: string | null;
}

/** GET /api/inventory/produce/farmers */
export interface ProduceFarmerListResponse {
  farmers: ProduceFarmer[];
}

export interface ProducePayment {
  id: string;
  date: string;
  /** cashAmount + creditDeducted */
  amount: number;
  cashAmount: number;
  creditDeducted: number;
  paymentMode: string;
  notes: string | null;
  voidedAt: string | null;
  customer: PartyRef;
}

export interface FarmerCrop {
  itemId: string;
  name: string;
  unit: string;
  quantity: number;
  amount: number;
}

/** GET /api/inventory/produce/farmers/[id] */
export interface ProduceFarmerDetailResponse {
  farmer: { id: string; name: string; phone: string | null; place: string | null; isArchived: boolean };
  produceDue: number;
  collectedAmount: number;
  /** Non-voided collections per crop. */
  crops: FarmerCrop[];
  fertilizerCredit: number;
  /** Most fertilizer credit that can come off a payment now. */
  maxCreditDeduction: number;
  collections: ProduceCollection[];
  payments: ProducePayment[];
}

/** Body of POST /api/inventory/produce/farmers/[id]/payments */
export interface ProducePaymentInput {
  cashAmount: number;
  creditDeducted?: number;
  /** YYYY-MM-DD */
  date: string;
  paymentMode: string;
  notes?: string;
}

export interface ProduceBuyer {
  id: string;
  name: string;
  phone: string | null;
  place: string | null;
  due: number;
  lastSale: string | null;
  isArchived?: boolean;
}

/** GET /api/inventory/produce/buyers */
export interface ProduceBuyerListResponse {
  buyers: ProduceBuyer[];
}

/** Body of POST /api/inventory/produce/buyers (with shopId) and PUT /api/inventory/produce/buyers/[id]. */
export interface ProduceBuyerInput {
  shopId?: string;
  name?: string;
  phone?: string;
  place?: string;
  isArchived?: boolean;
}

export interface ProduceSale {
  id: string;
  saleNumber: string;
  date: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: string;
  notes: string | null;
  voidedAt: string | null;
  item: ProduceItemRef;
  buyer: PartyRef;
}

/** GET /api/inventory/produce/sales */
export interface ProduceSaleListResponse {
  sales: ProduceSale[];
  total: number;
  page: number;
  pageSize: number;
}

/** Body of POST /api/inventory/produce/sales */
export interface ProduceSaleInput {
  shopId: string;
  itemId: string;
  buyerId: string;
  /** YYYY-MM-DD */
  date: string;
  quantity: number;
  rate: number;
  /** Defaults to the total; the rest is the buyer's due. */
  paidAmount?: number;
  paymentMode: string;
  notes?: string;
}

export interface ProduceReceipt {
  id: string;
  amount: number;
  date: string;
  paymentMode: string;
  notes: string | null;
  voidedAt: string | null;
}

/** GET /api/inventory/produce/buyers/[id] */
export interface ProduceBuyerDetailResponse {
  buyer: { id: string; name: string; phone: string | null; place: string | null; isArchived: boolean };
  due: number;
  sales: ProduceSale[];
  receipts: ProduceReceipt[];
}
