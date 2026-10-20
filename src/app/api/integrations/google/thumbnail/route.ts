import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { fetchDriveFile } from "@/lib/googleDriveAuth";
import { parseSearchParams } from "@/lib/validations/http";
import { driveThumbnailQuerySchema } from "@/lib/validations/integrations";

export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const query = parseSearchParams(req, driveThumbnailQuerySchema);
    if (query.error) return query.error;

    const response = await fetchDriveFile({ user: auth.user }, query.data.fileId);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch thumbnail" }, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || "image/jpeg";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600" // Private Drive content: never cache in shared caches
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "reauth_required" || message === "No Google Drive account connected") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Failed to fetch Drive thumbnail:", err);
    return NextResponse.json({ error: "Failed to fetch thumbnail" }, { status: 500 });
  }
}
