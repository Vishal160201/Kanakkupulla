import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== 'nithyavishalr@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const data = await request.json();
    
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.targetAmount !== undefined) updateData.targetAmount = parseFloat(data.targetAmount) || 0;
    if (data.savedAmount !== undefined) updateData.savedAmount = parseFloat(data.savedAmount) || 0;
    if (data.monthlyContribution !== undefined) updateData.monthlyContribution = parseFloat(data.monthlyContribution) || 0;
    if (data.linkedCardId !== undefined) updateData.linkedCardId = data.linkedCardId;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.debtDirection !== undefined) updateData.debtDirection = data.debtDirection;
    if (data.deductFromBalance !== undefined) updateData.deductFromBalance = Boolean(data.deductFromBalance);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const bucket = await prisma.personalBucket.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json({ bucket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== 'nithyavishalr@gmail.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const bucket = await prisma.personalBucket.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, bucket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
