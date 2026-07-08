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
    
    if (data.cvv && !/^\d{3,4}$/.test(data.cvv)) {
      return NextResponse.json({ error: "Invalid CVV format" }, { status: 400 });
    }
    if (data.expiryDate && !/^(0[1-9]|1[0-2])\/\d{2}$/.test(data.expiryDate)) {
      return NextResponse.json({ error: "Invalid Expiry Date format. Use MM/YY" }, { status: 400 });
    }
    
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.lastFour !== undefined) updateData.lastFour = data.lastFour;
    if (data.bank !== undefined) updateData.bank = data.bank;
    if (data.billingDate !== undefined) updateData.billingDate = data.billingDate ? parseInt(data.billingDate) : null;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? parseInt(data.dueDate) : null;
    if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit ? parseFloat(data.creditLimit) : null;
    if (data.manualBalance !== undefined) updateData.manualBalance = data.manualBalance ? parseFloat(data.manualBalance) : null;
    if (data.balance !== undefined) updateData.balance = data.balance ? parseFloat(data.balance) : null;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.cvv !== undefined) updateData.cvv = data.cvv;
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
    if (data.network !== undefined) updateData.network = data.network;

    const card = await prisma.personalCard.update({
      where: { id: (await context.params).id },
      data: updateData
    });

    return NextResponse.json(card);
  } catch (error) {
    console.error("PATCH /api/personal/cards/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await prisma.personalCard.delete({
      where: { id: (await context.params).id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/personal/cards/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
