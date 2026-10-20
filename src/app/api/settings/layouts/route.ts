import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { layoutUpsertSchema } from "@/lib/validations/settings";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const layouts = await prisma.formLayout.findMany({
      orderBy: { name: "asc" },
      take: 100,
    });
    return NextResponse.json(layouts);
  } catch (error) {
    console.error("Failed to fetch form layouts:", error);
    return NextResponse.json({ error: "Failed to fetch form layouts" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, layoutUpsertSchema);
    if (parsed.error) return parsed.error;
    const { formKey, name, description, schema } = parsed.data;

    const updated = await prisma.formLayout.upsert({
      where: { formKey },
      update: { name, description, schema },
      create: { formKey, name, description, schema },
    });

    // Invalidate caches so the modal reads the newest layout immediately
    revalidatePath("/api/settings/layouts");
    revalidatePath(`/api/settings/layouts/${formKey}`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update form layout:", error);
    return NextResponse.json({ error: "Failed to update form layout" }, { status: 500 });
  }
}
