import TransactionModal from "@/components/dashboard/TransactionModal";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const txn = await prisma.transaction.findUnique({
    where: { id }
  });

  if (!txn) notFound();

  const safeTxn = {
    ...txn,
    date: txn.date.toISOString(),
  };

  return (
    <div className="flex justify-center items-center h-full w-full">
      <TransactionModal editTransaction={safeTxn as any} />
    </div>
  );
}
