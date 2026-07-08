import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const cardId = searchParams.get('cardId');

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (cardId) {
      const card = await prisma.personalCard.findUnique({ where: { id: cardId } });
      if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
      
      const billingDate = card.billingDate || 1;
      const cycleStart = now.getDate() >= billingDate 
        ? new Date(now.getFullYear(), now.getMonth(), billingDate) 
        : new Date(now.getFullYear(), now.getMonth() - 1, billingDate);
      const cycleEnd = new Date(cycleStart);
      cycleEnd.setMonth(cycleEnd.getMonth() + 1);

      const cardExpenses = await prisma.personalExpense.findMany({
        where: {
          paymentSource: cardId,
          date: { gte: cycleStart, lt: cycleEnd },
          deletedAt: null
        }
      });

      let totalSpentCycle = 0;
      cardExpenses.forEach(e => {
        if (e.type === "DEBIT") totalSpentCycle += e.amount;
      });

      return NextResponse.json({
        totalSpentCycle,
        statementStart: cycleStart,
        statementEnd: cycleEnd
      });
    }

    // Default general summary logic
    const expenses = await prisma.personalExpense.findMany({
      where: {
        date: { gte: startOfMonth },
        deletedAt: null
      }
    });

    const emis = await prisma.personalEMI.findMany({
      where: { status: "ACTIVE" }
    });

    let totalSpentMonth = 0;
    let totalIncomeMonth = 0;
    
    expenses.forEach(e => {
      if (e.type === "DEBIT") totalSpentMonth += e.amount;
      if (e.type === "CREDIT") totalIncomeMonth += e.amount;
    });

    const activeEmisCount = emis.length;
    const netBalance = totalIncomeMonth - totalSpentMonth;

    return NextResponse.json({
      totalSpentMonth,
      totalIncomeMonth,
      netBalance,
      activeEmisCount
    });
  } catch (error) {
    console.error("GET /api/personal/summary error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
