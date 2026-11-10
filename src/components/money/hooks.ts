"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { MoneyAccountDTO } from "@/types/money";

export interface MoneyCategoryDTO {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export function useMoneyAccounts() {
  const { data, mutate } = useSWR<MoneyAccountDTO[]>("/api/money/accounts", fetcher);
  return { accounts: data ?? [], byId: new Map((data ?? []).map((a) => [a.id, a])), mutate, loaded: !!data };
}

export function useMoneyCategories() {
  const { data, mutate } = useSWR<MoneyCategoryDTO[]>("/api/money/categories", fetcher);
  return { categories: data ?? [], byId: new Map((data ?? []).map((c) => [c.id, c])), mutate };
}

export const accountOption = (a: MoneyAccountDTO) => ({
  value: a.id,
  label: `${a.name}${a.last4 ? ` ••${a.last4}` : ""}`,
  icon: a.type === "CREDIT_CARD" ? "ph-credit-card" : "ph-bank",
  color: a.color,
});

export const categoryOption = (c: MoneyCategoryDTO) => ({ value: c.id, label: c.name, icon: c.icon, color: c.color });
