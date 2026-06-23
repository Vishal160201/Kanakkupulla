
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/role-permissions/[id]
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const rolePermission = await prisma.rolePermission.findUnique({
      where: { id: params.id },
    });
    if (!rolePermission) {
      return NextResponse.json({ error: 'Role permission not found' }, { status: 404 });
    }
    return NextResponse.json(rolePermission);
  } catch (error) {
    console.error('Error fetching role permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/role-permissions/[id]
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { enabled } = await req.json();
    const updatedRolePermission = await prisma.rolePermission.update({
      where: { id: params.id },
      data: { enabled },
    });
    return NextResponse.json(updatedRolePermission);
  } catch (error) {
    console.error('Error updating role permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/role-permissions/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.rolePermission.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ message: 'Role permission deleted successfully' });
  } catch (error) {
    console.error('Error deleting role permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
