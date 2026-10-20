import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { getGoogleDriveToken, getOrCreateFolder } from "@/lib/googleDriveAuth";
import prisma from "@/lib/prisma";
import { parseWith } from "@/lib/validations/http";
import { MAX_UPLOAD_BYTES, driveUploadSchema, uploadFormToObject } from "@/lib/validations/integrations";

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
    }
    const parsed = parseWith(driveUploadSchema, uploadFormToObject(formData));
    if (parsed.error) return parsed.error;
    const { file, module: moduleName, category: categoryName } = parsed.data;
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is too large (max 25 MB)" }, { status: 413 });
    }
    const dateStr = parsed.data.date || new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date()).replace(/\//g, '-');

    const accessToken = await getGoogleDriveToken({ user: auth.user });

    // --- FOLDER MANAGEMENT ---
    const getFolders = async () => {
      const rootFid = await getOrCreateFolder("Kanakkupulla", null, accessToken, userId);
      const modFid = await getOrCreateFolder(moduleName, rootFid, accessToken, userId);
      const catFid = await getOrCreateFolder(categoryName, modFid, accessToken, userId);
      return await getOrCreateFolder(dateStr, catFid, accessToken, userId);
    };

    let folderId = await getFolders();

    // Construct multipart/related payload for Google Drive API
    const boundary = "314159265358979323846";

    const buildBody = (fid: string) => {
      const metadata: { name: string; mimeType: string; parents?: string[] } = { name: file.name, mimeType: file.type };
      if (fid) metadata.parents = [fid];
      
      const metadataPart = 
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${file.type}\r\n\r\n`;

      const closeDelim = `\r\n--${boundary}--\r\n`;
      return Buffer.concat([
        Buffer.from(metadataPart, 'utf8'),
        fileBuffer,
        Buffer.from(closeDelim, 'utf8')
      ]);
    };

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let body = buildBody(folderId);

    const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

    const doUpload = () => fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    let uploadRes = await doUpload();

    // RETRY LOGIC ON 404
    if (uploadRes.status === 404) {
      await prisma.systemSetting.deleteMany({
        where: { key: { startsWith: `google_drive_folder_${userId}_` } }
      });
      folderId = await getFolders();
      body = buildBody(folderId);
      uploadRes = await doUpload();
    }

    if (!uploadRes.ok) {
      console.error("Drive upload failed:", uploadRes.status, await uploadRes.text());
      return NextResponse.json({ error: "Failed to upload file to Google Drive" }, { status: uploadRes.status });
    }

    const uploadedFile = await uploadRes.json();
    const fileId = uploadedFile.id;

    // 2. Set permissions to "anyone with link can view"
    const permUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
    await fetch(permUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone"
      })
    });

    // 3. Fetch the metadata (webViewLink, iconLink)
    const getUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,iconLink`;
    const getRes = await fetch(getUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    const finalFile = await getRes.json();

    return NextResponse.json({
      id: finalFile.id,
      name: finalFile.name,
      url: finalFile.webViewLink,
      iconUrl: finalFile.iconLink
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "reauth_required" || message === "No Google Drive account connected") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Drive upload error:", err);
    return NextResponse.json({ error: message || "Failed to upload file to Google Drive" }, { status: 500 });
  }
}
