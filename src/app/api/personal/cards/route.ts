import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  
  try {
    const cards = await prisma.personalCard.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error("GET /api/personal/cards error:", error);
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
    
    if (data.cvv && !/^\d{3,4}$/.test(data.cvv)) {
      return NextResponse.json({ error: "Invalid CVV format" }, { status: 400 });
    }
    if (data.expiryDate && !/^(0[1-9]|1[0-2])\/\d{2}$/.test(data.expiryDate)) {
      return NextResponse.json({ error: "Invalid Expiry Date format. Use MM/YY" }, { status: 400 });
    }
    
    const card = await prisma.personalCard.create({
      data: {
        name: data.name,
        type: data.type, // CREDIT/DEBIT
        network: data.network || "Visa",
        lastFour: data.lastFour,
        bank: data.bank,
        billingDate: data.billingDate ? parseInt(data.billingDate) : null,
        dueDate: data.dueDate ? parseInt(data.dueDate) : null,
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit) : null,
        manualBalance: data.manualBalance ? parseFloat(data.manualBalance) : null,
        balance: data.balance ? parseFloat(data.balance) : null,
        color: data.color,
        cvv: data.cvv || null,
        expiryDate: data.expiryDate || null
      }
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("POST /api/personal/cards error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
