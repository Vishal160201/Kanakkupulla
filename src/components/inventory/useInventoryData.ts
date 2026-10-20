"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type {
  BillKind,
  CreditCustomerDetailResponse,
  CreditCustomerListResponse,
  InventoryBillDetailResponse,
  InventoryBillListResponse,
  InventoryProductListResponse,
  InventorySummary,
  ProduceBuyerDetailResponse,
  ProduceBuyerListResponse,
  ProduceCollectionListResponse,
  ProduceFarmerDetailResponse,
  ProduceFarmerListResponse,
  ProduceItemListResponse,
  ProduceSaleListResponse,
  ProduceSummary,
  ProductMovementsResponse,
} from "@/types/inventory";
import { inventoryUrl } from "./inventoryUtils";

export function useInventorySummary(shopId: string | null) {
  return useSWR<InventorySummary>(shopId ? inventoryUrl("summary", shopId) : null, fetcher);
}

/** Every product of the shop, archived ones included (filter on the client). */
export function useInventoryProducts(shopId: string | null) {
  return useSWR<InventoryProductListResponse>(shopId ? inventoryUrl("products", shopId, { includeArchived: "true" }) : null, fetcher);
}

export function useProductMovements(productId: string | null) {
  return useSWR<ProductMovementsResponse>(productId ? `/api/inventory/products/${encodeURIComponent(productId)}/movements` : null, fetcher);
}

export function useInventoryBills(shopId: string | null, kind: BillKind, page: number, search: string) {
  return useSWR<InventoryBillListResponse>(
    shopId ? inventoryUrl("bills", shopId, { kind, page, search: search.trim() || undefined }) : null,
    fetcher,
    { keepPreviousData: true }
  );
}

export function useInventoryBill(billId: string | null) {
  return useSWR<InventoryBillDetailResponse>(billId ? `/api/inventory/bills/${encodeURIComponent(billId)}` : null, fetcher);
}

export function useCreditCustomers(shopId: string | null, search = "") {
  return useSWR<CreditCustomerListResponse>(
    shopId ? inventoryUrl("customers", shopId, { search: search.trim() || undefined }) : null,
    fetcher,
    { keepPreviousData: true }
  );
}

export function useCreditCustomer(customerId: string | null) {
  return useSWR<CreditCustomerDetailResponse>(customerId ? `/api/inventory/customers/${encodeURIComponent(customerId)}` : null, fetcher);
}

// ---------------------------------------------------------------------------
// Produce
// ---------------------------------------------------------------------------

export function useProduceSummary(shopId: string | null) {
  return useSWR<ProduceSummary>(shopId ? inventoryUrl("produce/summary", shopId) : null, fetcher);
}

/** The shop's crop list (archived ones included; filter on the client). */
export function useProduceItems(shopId: string | null) {
  return useSWR<ProduceItemListResponse>(shopId ? inventoryUrl("produce/items", shopId, { includeArchived: "true" }) : null, fetcher);
}

export function useProduceCollections(shopId: string | null, page: number, search: string, itemId = "") {
  return useSWR<ProduceCollectionListResponse>(
    shopId ? inventoryUrl("produce/collections", shopId, { page, search: search.trim() || undefined, itemId: itemId || undefined }) : null,
    fetcher,
    { keepPreviousData: true }
  );
}

export function useProduceFarmers(shopId: string | null, search = "") {
  return useSWR<ProduceFarmerListResponse>(
    shopId ? inventoryUrl("produce/farmers", shopId, { search: search.trim() || undefined }) : null,
    fetcher,
    { keepPreviousData: true }
  );
}

export function useProduceFarmer(customerId: string | null) {
  return useSWR<ProduceFarmerDetailResponse>(customerId ? `/api/inventory/produce/farmers/${encodeURIComponent(customerId)}` : null, fetcher);
}

export function useProduceBuyers(shopId: string | null, search = "") {
  return useSWR<ProduceBuyerListResponse>(
    shopId ? inventoryUrl("produce/buyers", shopId, { search: search.trim() || undefined }) : null,
    fetcher,
    { keepPreviousData: true }
  );
}

export function useProduceBuyer(buyerId: string | null) {
  return useSWR<ProduceBuyerDetailResponse>(buyerId ? `/api/inventory/produce/buyers/${encodeURIComponent(buyerId)}` : null, fetcher);
}

export function useProduceSales(shopId: string | null, page: number, search: string, itemId = "") {
  return useSWR<ProduceSaleListResponse>(
    shopId ? inventoryUrl("produce/sales", shopId, { page, search: search.trim() || undefined, itemId: itemId || undefined }) : null,
    fetcher,
    { keepPreviousData: true }
  );
}
