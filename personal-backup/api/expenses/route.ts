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
  const isDeleted = searchParams.get("deleted") === "true";
  
  try {
    const expenses = await prisma.personalExpense.findMany({
      where: {
        deletedAt: isDeleted ? { not: null } : null
      },
      orderBy: { date: 'desc' },
      include: {
        emi: true
      }
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("GET /api/personal/expenses error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const data = await req.json();
    
    // Ensure numeric amount and valid date
    const amount = parseFloat(data.amount);
    const date = new Date(data.date);

    const expense = await prisma.$transaction(async (tx) => {
      // 1. Create the Expense
      const exp = await tx.personalExpense.create({
        data: {
          title: data.title,
          amount,
          type: data.type, // CREDIT/DEBIT
          category: data.category,
          date,
          paymentSource: data.paymentSource,
          notes: data.notes || null,
          isEMI: data.isEMI || false,
          emiId: data.emiId || null
        }
      });

      // 2. Update EMI if linked
      if (data.isEMI && data.emiId) {
        const emi = await tx.personalEMI.findUnique({ where: { id: data.emiId } });
        if (emi && emi.status !== "COMPLETED") {
          const newPaidMonths = emi.paidMonths + 1;
          const newStatus = newPaidMonths >= emi.totalMonths ? "COMPLETED" : "ACTIVE";
          
          let nextDueDate = emi.nextDueDate;
          if (newStatus === "COMPLETED") {
            nextDueDate = null;
          } else if (emi.nextDueDate) {
            // we can just add roughly 30 days or handle it safely, since addMonths is not imported here, 
            // we can just use native JS Date logic
            const next = new Date(emi.nextDueDate);
            next.setMonth(next.getMonth() + 1);
            nextDueDate = next;
          }

          await tx.personalEMI.update({
            where: { id: data.emiId },
            data: {
              paidMonths: newPaidMonths,
              status: newStatus,
              nextDueDate: nextDueDate
            }
          });
        }
      }

      // 3. Update Card Balance if paymentSource is a card ID
      if (data.paymentSource && data.paymentSource !== "Cash") {
        const card = await tx.personalCard.findUnique({ where: { id: data.paymentSource } });
        if (card && card.manualBalance !== null) {
          const balanceUpdate = data.type === 'DEBIT' 
            ? { decrement: amount } 
            : { increment: amount };
          
          await tx.personalCard.update({
            where: { id: card.id },
            data: { manualBalance: balanceUpdate }
          });
        }
      }

      return exp;
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("POST /api/personal/expenses error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
