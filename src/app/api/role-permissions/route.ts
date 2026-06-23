
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/role-permissions
export async function GET() {
  try {
    const rolePermissions = await prisma.rolePermission.findMany();
    return NextResponse.json(rolePermissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/role-permissions
export async function POST(req: Request) {
  try {
    const { role, permission, enabled } = await req.json();
    const newRolePermission = await prisma.rolePermission.create({
      data: { role, permission, enabled },
    });
    return NextResponse.json(newRolePermission, { status: 201 });
  } catch (error) {
    console.error('Error creating role permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
