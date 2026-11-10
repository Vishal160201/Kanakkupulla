import { notFound } from "next/navigation";
import { getMoneyUser } from "@/lib/money/auth";
import { commitmentsView } from "@/lib/money/server/overview";
import CommitmentsPage from "@/components/money/CommitmentsPage";

export default async function MoneyCommitmentsPage() {
  const user = await getMoneyUser();
  if (!user) notFound();
  return <CommitmentsPage initial={await commitmentsView(user.id)} />;
}
