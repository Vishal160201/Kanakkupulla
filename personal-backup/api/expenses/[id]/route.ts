import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const data = await req.json();
    
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.amount !== undefined) updateData.amount = parseFloat(data.amount);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.paymentSource !== undefined) updateData.paymentSource = data.paymentSource;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.deletedAt !== undefined) updateData.deletedAt = data.deletedAt; // Used for restore (null)

    const expense = await prisma.personalExpense.update({
      where: { id: (await context.params).id },
      data: updateData
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("PATCH /api/personal/expenses/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const hardDelete = searchParams.get("hard") === "true";

  try {
    if (hardDelete) {
      await prisma.personalExpense.delete({
        where: { id: (await context.params).id }
      });
      return NextResponse.json({ success: true });
    } else {
      // Soft delete
      const expense = await prisma.personalExpense.update({
        where: { id: (await context.params).id },
        data: { deletedAt: new Date() }
      });
      
      if (session?.user) {
        await prisma.recycleBin.create({
          data: {
            itemType: "PERSONAL_EXPENSE",
            itemId: expense.id,
            originalData: expense as any,
            trashedById: (session.user as any).id
          }
        });
      }

      return NextResponse.json(expense);
    }
  } catch (error) {
    console.error("DELETE /api/personal/expenses/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
