import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { can, requireUser } from "@/lib/authz";
import { parseSearchParams } from "@/lib/validations/http";
import { searchQuerySchema } from "@/lib/validations/admin";

type SearchResult = {
  id: string;
  type: "BOOKING" | "TRANSACTION";
  title: string;
  subtitle: string;
  link: string;
  icon: string;
  color: string;
};

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const parsed = parseSearchParams(request, searchQuerySchema);
  if (parsed.error) return parsed.error;
  const query = parsed.data.q;

  try {
    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results: SearchResult[] = [];

    // Search Bookings (and associated Client)
    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        OR: [
          { bookingNumber: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
          { client: { name: { contains: query, mode: "insensitive" } } },
          { client: { email: { contains: query, mode: "insensitive" } } },
          { client: { phone: { contains: query, mode: "insensitive" } } },
        ]
      },
      select: {
        id: true,
        category: true,
        bookingNumber: true,
        date: true,
        client: { select: { name: true } }
      },
      take: 5
    });

    bookings.forEach(b => {
      results.push({
        id: b.id,
        type: "BOOKING",
        title: `${b.client.name} - ${b.category}`,
        subtitle: `Booking No: ${b.bookingNumber || 'N/A'} • ${b.date.toISOString().split('T')[0]}`,
        link: `/bookings/details/${b.id}`,
        icon: "ph-calendar-star",
        color: "blue"
      });
    });

    // Search Transactions
    const canSeeTransactions = await can(auth.user, "ledger", "VIEW");
    const transactions = !canSeeTransactions ? [] : await prisma.transaction.findMany({
      where: {
        deletedAt: null,
        shop: { type: "STUDIO" }, // global search covers the studio; other shops have their own screens
        OR: [
          { description: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { transactionId: { contains: query, mode: "insensitive" } },
        ]
      },
      select: { id: true, description: true, category: true, transactionId: true, type: true, amount: true, date: true },
      take: 5
    });

    transactions.forEach(t => {
      results.push({
        id: t.id,
        type: "TRANSACTION",
        title: t.description || t.category,
        subtitle: `${t.transactionId} • ${t.type === 'INCOME' ? '+' : '-'}₹${t.amount} • ${t.date.toISOString().split('T')[0]}`,
        link: `/transactions/details/${t.id}`,
        icon: "ph-wallet",
        color: t.type === 'INCOME' ? "green" : "red"
      });
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
