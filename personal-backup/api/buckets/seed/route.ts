import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SEED_DATA = [
  { title:'Trolley',   type:'DEBT',    targetAmount:2000,  monthlyContribution:2000,  color:'#ef4444', icon:'ShoppingCart' },
  { title:'Suba',      type:'DEBT',    targetAmount:12000, monthlyContribution:12000, color:'#f97316', icon:'User' },
  { title:'LIC',       type:'SAVINGS', targetAmount:21000, monthlyContribution:3500,  color:'#6366f1', icon:'Shield' },
  { title:'Christmas', type:'SAVINGS', targetAmount:6000,  monthlyContribution:1000,  color:'#16a34a', icon:'Gift' },
  { title:'AC EMI',    type:'EMI',     targetAmount:0,     monthlyContribution:0,     color:'#0ea5e9', icon:'Wind' }
];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== 'nithyavishalr@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const existing = await prisma.personalBucket.count();
    if (existing === 0) {
      await prisma.personalBucket.createMany({
        data: SEED_DATA
      });
      return NextResponse.json({ success: true, seeded: true });
    }
    return NextResponse.json({ success: true, seeded: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// Dummy comment to force TS refresh
