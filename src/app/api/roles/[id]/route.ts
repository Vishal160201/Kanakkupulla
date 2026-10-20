import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clearAccessCache, requireOwner } from "@/lib/authz";
import { normalizePermissions, type RoleKey } from "@/lib/access";
import { listRoles, normalizeNotifications } from "@/lib/roles";
import { parseJsonBody } from "@/lib/validations/http";
import { roleUpdateSchema } from "@/lib/validations/admin";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/roles/[id] — change a role's permission grid, alert switches or description. Owner only.
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, roleUpdateSchema);
  if (body.error) return body.error;

  try {
    const { id } = await params;
    const existing = await prisma.accessRole.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const { permissions, notifications, description } = body.data;
    await prisma.accessRole.update({
      where: { id },
      data: {
        // Merge onto the current grid, then clamp to what each module supports
        ...(permissions ? { permissions: normalizePermissions({ ...normalizePermissions(existing.permissions), ...permissions }) } : {}),
        ...(notifications
          ? { notifications: normalizeNotifications({ ...normalizeNotifications(existing.notifications, existing.key as RoleKey), ...notifications }, existing.key as RoleKey) }
          : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });
    await prisma.systemLog.create({
      data: { action: "ROLE_UPDATED", details: `Updated role ${existing.name}`, userId: auth.user.id },
    });
    clearAccessCache();

    const role = (await listRoles()).find(r => r.id === id);
    return NextResponse.json({ role });
  } catch (error) {
    console.error("Failed to update role:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}
