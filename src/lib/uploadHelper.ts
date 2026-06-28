export async function uploadFileToDrive(file: File | Blob, moduleName: string, categoryName: string = "Uncategorized", dateStr?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("module", moduleName);
  formData.append("category", categoryName);
  
  if (dateStr) {
    formData.append("date", dateStr);
  }

  const res = await fetch("/api/integrations/google/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upload file to Google Drive");
  }

  const data = await res.json();
  return { driveFile: data };
}
