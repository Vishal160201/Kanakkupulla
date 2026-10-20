import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { userUpdateSchema } from "@/lib/validations/users";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const parsed = await parseJsonBody(request, userUpdateSchema);
    if (parsed.error) return parsed.error;
    const { role, status, name, phone } = parsed.data;

    const updateData: Prisma.UserUpdateInput = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const currentUserId = auth.user.id;

  try {
    const { id } = await params;

    if (id === currentUserId) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.$transaction(async tx => {
      // Budgets are studio-wide but owned by their creator (and block the delete), so hand them to
      // the acting admin; where the admin already has the same budget, the deleted user's copy goes.
      const budgets = await tx.categoryBudget.findMany({
        where: { userId: id },
        select: { id: true, category: true, month: true, year: true },
      });
      if (budgets.length > 0) {
        const adminBudgets = await tx.categoryBudget.findMany({
          where: {
            userId: currentUserId,
            OR: budgets.map(b => ({ category: b.category, month: b.month, year: b.year })),
          },
          select: { category: true, month: true, year: true },
        });
        const key = (b: { category: string; month: number; year: number }) => `${b.category}|${b.month}|${b.year}`;
        const adminKeys = new Set(adminBudgets.map(key));
        const duplicateIds = budgets.filter(b => adminKeys.has(key(b))).map(b => b.id);
        const transferIds = budgets.filter(b => !adminKeys.has(key(b))).map(b => b.id);

        await tx.categoryBudget.deleteMany({ where: { id: { in: duplicateIds } } });
        await tx.categoryBudget.updateMany({ where: { id: { in: transferIds } }, data: { userId: currentUserId } });
      }

      await tx.account.deleteMany({ where: { userId: id } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
