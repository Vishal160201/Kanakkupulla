import { notFound } from "next/navigation";
import { getMoneyUser } from "@/lib/money/auth";
import { cardsView } from "@/lib/money/server/overview";
import CardsPage from "@/components/money/CardsPage";

export default async function MoneyCardsPage() {
  const user = await getMoneyUser();
  if (!user) notFound();
  return <CardsPage initial={await cardsView(user.id)} />;
}
