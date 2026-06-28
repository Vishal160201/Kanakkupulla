
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/system-logs/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const log = await prisma.systemLog.findUnique({
      where: { id },
    });
    if (!log) {
      return NextResponse.json({ error: 'System log not found' }, { status: 404 });
    }
    return NextResponse.json(log);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/system-logs/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { details } = await req.json();
    const updatedLog = await prisma.systemLog.update({
      where: { id },
      data: { details },
    });
    return NextResponse.json(updatedLog);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/system-logs/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.systemLog.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'System log deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
