"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { FetchError, fetcher } from "@/lib/fetcher";
import type { Transaction, TransactionListResponse } from "@/types/transactions";
import { buildListQuery, type ListFilterParams } from "./listFilters";

/**
 * Loads one page of the ledger for the current URL filters.
 *
 * The page number resets to 1 whenever the filters change. While a new page
 * loads, the previous page stays on screen (`isLoadingMore`); a filter change
 * shows the skeleton instead (`isLoading`), matching the original fetch flow.
 */
export function useTransactionsList(filterParams: ListFilterParams) {
  const query = buildListQuery(filterParams);
  const [pageState, setPageState] = useState({ query, page: 1 });
  const currentPage = pageState.query === query ? pageState.page : 1;

  const pageQuery = currentPage > 1
    ? `${query}${query ? '&' : ''}page=${currentPage}`
    : query;

  const { data, error, isLoading: isFetching, mutate } = useSWR<TransactionListResponse>(
    `/api/transactions?${pageQuery}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      onError: (err) => {
        if (err instanceof FetchError) {
          if (err.status === 401) toast.error("Session expired. Please log in again.");
        } else {
          console.error(err);
        }
      },
    }
  );

  // First page of a (new) filter set: show the skeleton, not the previous results.
  const isLoading = isFetching && currentPage === 1;
  const isLoadingMore = isFetching && currentPage > 1;
  const listData = isLoading || (error && currentPage === 1) ? undefined : data;

  const transactions: Transaction[] = listData?.items ?? [];
  const totalCount = listData?.total ?? 0;

  const goToPage = (page: number) => setPageState({ query, page });

  /** Drops deleted rows from the cached page without refetching. */
  const removeTransactions = (predicate: (tx: Transaction) => boolean) =>
    mutate(
      (current) => current && { ...current, items: (current.items ?? []).filter(tx => !predicate(tx)) },
      { revalidate: false }
    );

  return { transactions, totalCount, currentPage, isLoading, isLoadingMore, goToPage, removeTransactions };
}
