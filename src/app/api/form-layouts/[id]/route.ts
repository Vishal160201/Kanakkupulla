
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/form-layouts/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const formLayout = await prisma.formLayout.findUnique({
      where: { id },
    });
    if (!formLayout) {
      return NextResponse.json({ error: 'Form layout not found' }, { status: 404 });
    }
    return NextResponse.json(formLayout);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/form-layouts/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, description, schema } = await req.json();
    const updatedFormLayout = await prisma.formLayout.update({
      where: { id },
      data: { name, description, schema },
    });
    return NextResponse.json(updatedFormLayout);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/form-layouts/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.formLayout.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Form layout deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
