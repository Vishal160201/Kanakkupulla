import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { clearAccessCache, requireOwner } from "@/lib/authz";
import { ShopError } from "@/lib/shops";
import { formatAssignments, setUserAssignments, userAssignmentsSelect, validateAssignments } from "@/lib/userAccess";
import { parseJsonBody } from "@/lib/validations/http";
import { userUpdateSchema } from "@/lib/validations/users";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const parsed = await parseJsonBody(request, userUpdateSchema);
    if (parsed.error) return parsed.error;
    const { status, name, phone, isOwner, assignments } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const willBeOwner = isOwner ?? user.role === "OWNER";
    if (user.role === "OWNER" && !willBeOwner) {
      if (id === auth.user.id) {
        return NextResponse.json({ error: "You can't remove your own owner access." }, { status: 422 });
      }
      const owners = await prisma.user.count({ where: { role: "OWNER", status: "ACTIVE" } });
      if (owners <= 1) return NextResponse.json({ error: "At least one owner must remain." }, { status: 422 });
    }
    if (id === auth.user.id && status === "INACTIVE") {
      return NextResponse.json({ error: "You can't deactivate yourself." }, { status: 422 });
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (status) updateData.status = status;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (isOwner !== undefined) updateData.role = isOwner ? "OWNER" : "MEMBER";

    const updated = await prisma.$transaction(async tx => {
      if (willBeOwner) {
        // Owners reach every shop; assignments would only be stale data
        await setUserAssignments(tx, id, []);
      } else if (assignments !== undefined) {
        const valid = await validateAssignments(tx, assignments);
        if (valid.length === 0) throw new ShopError("Give the person access to at least one shop.", 422);
        await setUserAssignments(tx, id, valid);
      } else if (user.role === "OWNER") {
        throw new ShopError("Pick the shops this person can access.", 422);
      }
      return tx.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, phone: true, role: true, status: true, ...userAssignmentsSelect },
      });
    });
    clearAccessCache(id);

    const { shopMemberships, ...userFields } = updated;
    return NextResponse.json({ user: { ...userFields, assignments: formatAssignments(shopMemberships) } });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
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
