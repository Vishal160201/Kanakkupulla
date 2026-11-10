import { notFound } from "next/navigation";
import { getMoneyUser } from "@/lib/money/auth";
import { dashboardView } from "@/lib/money/server/overview";
import Dashboard from "@/components/money/Dashboard";

export default async function MoneyOverviewPage() {
  const user = await getMoneyUser();
  if (!user) notFound();
  return <Dashboard initial={await dashboardView(user.id)} />;
}
