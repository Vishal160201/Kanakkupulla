import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== 'nithyavishalr@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const payments = await prisma.personalBucketPayment.findMany({
      where: { bucketId: params.id },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== 'nithyavishalr@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const month = parseInt(data.month);
    const year = parseInt(data.year);
    const amount = parseFloat(data.amount) || 0;
    
    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 });
    }

    const payment = await prisma.personalBucketPayment.upsert({
      where: {
        bucketId_month_year: {
          bucketId: params.id,
          month: month,
          year: year
        }
      },
      update: {
        amount: { increment: amount },
        status: data.status || 'PAID',
        notes: data.notes || null,
      },
      create: {
        bucketId: params.id,
        month: month,
        year: year,
        amount: amount,
        status: data.status || 'PAID',
        notes: data.notes || null,
      }
    });

    return NextResponse.json({ payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
