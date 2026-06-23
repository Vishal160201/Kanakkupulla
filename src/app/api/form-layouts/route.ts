
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/form-layouts
export async function GET() {
  try {
    const formLayouts = await prisma.formLayout.findMany();
    return NextResponse.json(formLayouts);
  } catch (error) {
    console.error('Error fetching form layouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/form-layouts
export async function POST(req: Request) {
  try {
    const { formKey, name, description, schema } = await req.json();
    const newFormLayout = await prisma.formLayout.create({
      data: { formKey, name, description, schema },
    });
    return NextResponse.json(newFormLayout, { status: 201 });
  } catch (error) {
    console.error('Error creating form layout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
