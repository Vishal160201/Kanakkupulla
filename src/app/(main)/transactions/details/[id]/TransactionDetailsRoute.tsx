"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";

/**
 * Deep-link entry for /transactions/details/[id] (used by global search).
 * Opens the globally mounted TransactionDetailsModal for the route id and
 * returns to the transactions list once the modal is closed.
 */
export default function TransactionDetailsRoute({ id }: { id: string }) {
  const router = useRouter();
  const { isTransactionDetailsOpen, openTransactionDetails } = useGlobalForm();
  const hasOpened = useRef(false);

  useEffect(() => {
    openTransactionDetails(id);
    // openTransactionDetails is recreated every render; only re-run when the id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isTransactionDetailsOpen) {
      hasOpened.current = true;
      return;
    }
    if (hasOpened.current) {
      hasOpened.current = false;
      router.replace("/transactions/allTransactions");
    }
  }, [isTransactionDetailsOpen, router]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <i className="ph-bold ph-receipt text-3xl mb-2"></i>
      <p className="text-sm font-medium">Opening transaction…</p>
    </div>
  );
}
