
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/form-layouts/[id]
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const formLayout = await prisma.formLayout.findUnique({
      where: { id: params.id },
    });
    if (!formLayout) {
      return NextResponse.json({ error: 'Form layout not found' }, { status: 404 });
    }
    return NextResponse.json(formLayout);
  } catch (error) {
    console.error('Error fetching form layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/form-layouts/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { name, description, schema } = await req.json();
    const updatedFormLayout = await prisma.formLayout.update({
      where: { id: params.id },
      data: { name, description, schema },
    });
    return NextResponse.json(updatedFormLayout);
  } catch (error) {
    console.error('Error updating form layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/form-layouts/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.formLayout.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ message: 'Form layout deleted successfully' });
  } catch (error) {
    console.error('Error deleting form layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
