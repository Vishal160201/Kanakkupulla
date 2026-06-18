import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { TRANSACTION_CATEGORIES, PAYMENT_MODES } from "@/lib/transactionConstants";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, type, date, category, paymentMode, description, status } = body;

    // Confirm ownership
    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Validate updated fields
    const errors: Record<string, string> = {};
    const parsedAmount = parseFloat(amount);
    if (amount !== undefined && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      errors.amount = "Amount must be a positive number.";
    }
    if (type && !["INCOME", "EXPENSE"].includes(type)) errors.type = "Invalid type.";
    if (date && isNaN(new Date(date).getTime())) errors.date = "Invalid date.";
    if (category && !(TRANSACTION_CATEGORIES as readonly string[]).includes(category)) {
      errors.category = "Invalid category.";
    }
    if (paymentMode && !(PAYMENT_MODES as readonly string[]).includes(paymentMode)) {
      errors.paymentMode = "Invalid payment mode.";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", errors }, { status: 422 });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parsedAmount }),
        ...(type && { type }),
        ...(date && { date: new Date(date) }),
        ...(category && { category }),
        ...(paymentMode && { paymentMode }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(updatedTransaction, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const { id } = await params;

    // Confirm ownership before deleting
    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
