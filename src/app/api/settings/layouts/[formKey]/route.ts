import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { DEFAULT_LAYOUTS } from "@/lib/defaultLayouts";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ formKey: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { formKey } = await params;

  try {
    const layout = await prisma.formLayout.findUnique({
      where: { formKey },
    });
    if (layout) return NextResponse.json(layout);

    // Fallback to default layout if not configured in DB yet
    const defaultLayout = DEFAULT_LAYOUTS.find((l) => l.formKey === formKey);
    if (!defaultLayout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    const now = new Date();
    return NextResponse.json({
      id: `default-${formKey}`,
      formKey: defaultLayout.formKey,
      name: defaultLayout.name,
      description: defaultLayout.description,
      schema: defaultLayout.schema,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error("Failed to fetch form layout:", error);
    return NextResponse.json({ error: "Failed to fetch form layout" }, { status: 500 });
  }
}
