import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { userPreferencesSchema } from "@/lib/validations/users";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { emailNotifications: true, pushNotifications: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      emailNotifications: user.emailNotifications,
      pushNotifications: user.pushNotifications
    });
  } catch (error) {
    console.error("Failed to fetch preferences:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const parsed = await parseJsonBody(request, userPreferencesSchema);
    if (parsed.error) return parsed.error;
    const { emailNotifications, pushNotifications } = parsed.data;

    const updateData: Prisma.UserUpdateInput = {};
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (pushNotifications !== undefined) updateData.pushNotifications = pushNotifications;

    await prisma.user.update({
      where: { id: auth.user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
