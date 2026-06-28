
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/role-permissions/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rolePermission = await prisma.rolePermission.findUnique({
      where: { id },
    });
    if (!rolePermission) {
      return NextResponse.json({ error: 'Role permission not found' }, { status: 404 });
    }
    return NextResponse.json(rolePermission);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/role-permissions/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { enabled } = await req.json();
    const updatedRolePermission = await prisma.rolePermission.update({
      where: { id },
      data: { enabled },
    });
    return NextResponse.json(updatedRolePermission);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/role-permissions/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.rolePermission.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Role permission deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
