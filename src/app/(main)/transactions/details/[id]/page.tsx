import TransactionDetailsModal from "@/components/dashboard/TransactionDetailsModal";

export default async function TransactionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransactionDetailsModal transactionId={id} />;
}
