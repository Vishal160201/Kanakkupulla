import TransactionDetailsRoute from "./TransactionDetailsRoute";

export default async function TransactionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransactionDetailsRoute id={id} />;
}
