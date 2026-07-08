import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

import { addMonths } from "date-fns";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const data = await req.json();
    
    // Check if it's the specific "markPaid" action
    if (data.action === "markPaid") {
      const emi = await prisma.personalEMI.findUnique({ where: { id: (await context.params).id } });
      if (!emi) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (emi.status === "COMPLETED") return NextResponse.json({ error: "EMI already completed" }, { status: 400 });

      // Create PersonalExpense for this month
      await prisma.personalExpense.create({
        data: {
          title: `EMI: ${emi.title} (${emi.paidMonths + 1}/${emi.totalMonths})`,
          amount: emi.emiAmount,
          type: "DEBIT",
          category: "EMI",
          date: emi.nextDueDate || new Date(),
          paymentSource: emi.cardId || "Cash",
          isEMI: true,
          emiId: emi.id
        }
      });

      // Deduct from card balance if cardId exists
      if (emi.cardId && emi.cardId !== "Cash") {
        const card = await prisma.personalCard.findUnique({ where: { id: emi.cardId } });
        if (card && card.manualBalance !== null) {
          await prisma.personalCard.update({
            where: { id: card.id },
            data: { manualBalance: { decrement: emi.emiAmount } }
          });
        }
      }

      // Update EMI progress
      const newPaidMonths = emi.paidMonths + 1;
      const newStatus = newPaidMonths >= emi.totalMonths ? "COMPLETED" : "ACTIVE";
      const nextDueDate = newStatus === "COMPLETED" ? null : (emi.nextDueDate ? addMonths(emi.nextDueDate, 1) : null);

      const updatedEmi = await prisma.personalEMI.update({
        where: { id: (await context.params).id },
        data: {
          paidMonths: newPaidMonths,
          nextDueDate: nextDueDate,
          status: newStatus
        }
      });

      return NextResponse.json(updatedEmi);
    }

    // Otherwise standard update
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.cardId !== undefined) updateData.cardId = data.cardId === "" ? null : data.cardId;
    if (data.totalAmount !== undefined) updateData.totalAmount = parseFloat(data.totalAmount);
    if (data.emiAmount !== undefined) updateData.emiAmount = parseFloat(data.emiAmount);
    if (data.totalMonths !== undefined) updateData.totalMonths = parseInt(data.totalMonths, 10);
    if (data.startDate !== undefined) {
      updateData.startDate = new Date(data.startDate);
      // Recalculate next due date based on startDate and paidMonths
      const emi = await prisma.personalEMI.findUnique({ where: { id: (await context.params).id } });
      if (emi) {
        updateData.nextDueDate = addMonths(new Date(data.startDate), emi.paidMonths);
      }
    }

    const emi = await prisma.personalEMI.update({
      where: { id: (await context.params).id },
      data: updateData
    });

    return NextResponse.json(emi);
  } catch (error) {
    console.error("PATCH /api/personal/emis/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const id = (await context.params).id;

    // Remove linked PersonalExpense records first
    await prisma.personalExpense.deleteMany({
      where: { emiId: id }
    });

    await prisma.personalEMI.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/personal/emis/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
