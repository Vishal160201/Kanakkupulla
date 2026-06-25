import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DEFAULT_LAYOUTS } from "@/lib/defaultLayouts";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ formKey: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formKey } = await params;

  try {
    let layout = await prisma.formLayout.findUnique({
      where: { formKey },
    });

    if (!layout) {
      // Fallback to default layout if not configured in DB yet
      const defaultLayout = DEFAULT_LAYOUTS.find((l) => l.formKey === formKey);
      if (defaultLayout) {
        layout = {
          id: `default-${formKey}`,
          formKey: defaultLayout.formKey,
          name: defaultLayout.name,
          description: defaultLayout.description,
          schema: defaultLayout.schema,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
      } else {
        return NextResponse.json({ error: "Layout not found" }, { status: 404 });
      }
    }

    return NextResponse.json(layout);
  } catch (error) {
    console.error(`Error fetching layout ${formKey}:`, error);
    return NextResponse.json({ error: "Failed to fetch form layout" }, { status: 500 });
  }
}
