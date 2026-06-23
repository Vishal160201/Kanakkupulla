
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/system-logs/[id]
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const log = await prisma.systemLog.findUnique({
      where: { id: params.id },
    });
    if (!log) {
      return NextResponse.json({ error: 'System log not found' }, { status: 404 });
    }
    return NextResponse.json(log);
  } catch (error) {
    console.error('Error fetching system log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/system-logs/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { details } = await req.json();
    const updatedLog = await prisma.systemLog.update({
      where: { id: params.id },
      data: { details },
    });
    return NextResponse.json(updatedLog);
  } catch (error) {
    console.error('Error updating system log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/system-logs/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.systemLog.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ message: 'System log deleted successfully' });
  } catch (error) {
    console.error('Error deleting system log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
