"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { useActiveShopCan } from "@/hooks/useAccess";
import type {
  CableProvider,
  CableCollectionsResponse,
  CableComplaintListItem,
  CablePerson,
  CablePlan,
  CableReport,
  CableSubscriberDetail,
  CableSubscriberListResponse,
} from "@/types/cable";

const q = (shopId: string) => `shopId=${encodeURIComponent(shopId)}`;
export const subscribersKey = (shopId: string) => `/api/cable/subscribers?${q(shopId)}`;

/** The extension syncs every minute; refresh twice as often so changes show up without reloading. */
export function useSubscribers(shopId: string) {
  return useSWR<CableSubscriberListResponse>(subscribersKey(shopId), fetcher, { refreshInterval: 30_000 });
}

export function useSubscriber(id: string | null) {
  return useSWR<{ subscriber: CableSubscriberDetail }>(id ? `/api/cable/subscribers/${encodeURIComponent(id)}` : null, fetcher);
}

export function usePlans(shopId: string) {
  return useSWR<{ plans: CablePlan[] }>(`/api/cable/plans?${q(shopId)}`, fetcher);
}

export function useComplaints(shopId: string, status: "open" | "fixed", provider?: CableProvider) {
  return useSWR<{ complaints: CableComplaintListItem[]; people: CablePerson[] }>(`/api/cable/complaints?${q(shopId)}&status=${status}${provider ? `&provider=${provider}` : ""}`, fetcher);
}

export function useCollections(shopId: string, date: string, provider?: CableProvider) {
  return useSWR<CableCollectionsResponse>(`/api/cable/collections?${q(shopId)}&date=${encodeURIComponent(date)}${provider ? `&provider=${provider}` : ""}`, fetcher);
}

export function useCableReport(shopId: string, provider: CableProvider) {
  return useSWR<CableReport>(`/api/cable/reports?${q(shopId)}&provider=${provider}`, fetcher);
}

/** Reloads every cable view (and the ledger, which collections post to). */
export function useRevalidateCable() {
  const { mutate } = useSWRConfig();
  return useCallback(
    () => mutate((key) => typeof key === "string" && (key.startsWith("/api/cable") || key.startsWith("/api/transactions"))),
    [mutate]
  );
}

export function useCanManageCable(): boolean {
  return useActiveShopCan()("cable", "MANAGE");
}
