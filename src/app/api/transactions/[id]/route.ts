import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, type, date, category, paymentMode, description, status, attachmentUrl, bookingId } = body;

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(amount && { amount: parseFloat(amount.toString()) }),
        ...(type && { type }),
        ...(date && { date: new Date(date) }),
        ...(category && { category }),
        ...(paymentMode && { paymentMode }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(attachmentUrl !== undefined && { attachmentUrl }),
        ...(bookingId !== undefined && { bookingId })
      }
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.transaction.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
