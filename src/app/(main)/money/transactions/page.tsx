import { Suspense } from "react";
import TransactionsPage from "@/components/money/TransactionsPage";
import { Skeleton } from "@/components/money/ui";

export default function MoneyTransactionsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <TransactionsPage />
    </Suspense>
  );
}
