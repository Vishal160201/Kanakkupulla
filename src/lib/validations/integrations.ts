import { z } from "zod";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const driveFileId = z
  .string({ message: "Missing fileId" })
  .min(1, "Missing fileId")
  .max(200)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid fileId");

/** GET /api/integrations/google/thumbnail?fileId= */
export const driveThumbnailQuerySchema = z.object({ fileId: driveFileId });

/** POST /api/integrations/google/share */
export const driveShareSchema = z.object({ fileId: driveFileId });

const folderName = (fallback: string) =>
  z
    .string()
    .trim()
    .max(120, "Name is too long")
    .nullish()
    .transform(v => v || fallback);

/** POST /api/integrations/google/upload (multipart form data) */
export const driveUploadSchema = z.object({
  file: z.instanceof(File, { message: "No file uploaded" }),
  module: folderName("Uncategorized"),
  category: folderName("Uncategorized"),
  date: z.string().trim().max(40).nullish(),
});

/** Reads the upload form into a plain object for driveUploadSchema. */
export function uploadFormToObject(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : null;
  };
  return { file: formData.get("file"), module: text("module"), category: text("category"), date: text("date") };
}
