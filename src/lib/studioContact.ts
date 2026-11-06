import prisma from "@/lib/prisma";
import { STUDIO_DETAILS } from "@/lib/constants";

export interface StudioContact {
  name: string;
  phone: string;
  upiId: string;
}

/** The studio's name, phone and UPI ID for messages to clients (Settings → Invoice Details, with defaults). */
export async function getStudioContact(): Promise<StudioContact> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: ["studio_name", "studio_phone", "studio_upi_id"] } },
    select: { key: true, value: true },
  });
  const setting = (key: string) => {
    const value = rows.find((r) => r.key === key)?.value;
    return typeof value === "string" && value.trim() ? value : null;
  };
  return {
    name: setting("studio_name") ?? STUDIO_DETAILS.name,
    phone: setting("studio_phone") ?? STUDIO_DETAILS.phone,
    upiId: setting("studio_upi_id") ?? STUDIO_DETAILS.upiId,
  };
}
