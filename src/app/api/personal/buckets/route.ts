import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== 'nithyavishalr@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const archived = url.searchParams.get('archived') === 'true';

    const buckets = await prisma.personalBucket.findMany({
      where: { isActive: !archived },
      include: { payments: true },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ buckets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== 'nithyavishalr@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const bucket = await prisma.personalBucket.create({
      data: {
        title: data.title,
        type: data.type,
        targetAmount: parseFloat(data.targetAmount) || 0,
        savedAmount: parseFloat(data.savedAmount) || 0,
        monthlyContribution: parseFloat(data.monthlyContribution) || 0,
        linkedCardId: data.linkedCardId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        debtDirection: data.debtDirection || 'I_OWE',
        deductFromBalance: Boolean(data.deductFromBalance),
        notes: data.notes || null,
        color: data.color || '#6366f1',
        icon: data.icon || 'Wallet',
      }
    });

    return NextResponse.json({ bucket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
