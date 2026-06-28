import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Paperclip, X } from "lucide-react";
import GooglePicker from "@/components/shared/GooglePicker";

export interface FileAttachmentProps {
  id: string;
  type: 'IMAGE' | 'FILE';
  value: any;
  onChange: (value: any) => void;
  driveStatus?: { connected: boolean };
  moduleName: string;
  categoryName?: string;
  buttonText?: string;
}

export default function FileAttachment({
  id,
  type,
  value,
  onChange,
  driveStatus,
  moduleName,
  categoryName = "Uncategorized",
  buttonText,
}: FileAttachmentProps) {
  const [expanded, setExpanded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);

  const isDriveFile = (value as any)?.driveFile;

  if (value) {
    return (
      <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3 overflow-hidden">
          {isDriveFile ? (
            <img src={value.driveFile.iconUrl} alt="icon" className="w-6 h-6 object-contain" />
          ) : (
            type === 'IMAGE' ? (
              <i className="ph-fill ph-image text-2xl text-blue-500"></i>
            ) : (
              <Paperclip className="w-6 h-6 text-slate-400 shrink-0" />
            )
          )}
          <div className="flex flex-col overflow-hidden">
            <span className="text-[0.85rem] font-bold text-slate-700 truncate max-w-[200px]">
              {isDriveFile ? value.driveFile.name : "Local File Selected"}
            </span>
            {isDriveFile && value.driveFile.sizeBytes && (
              <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">
                {(Number(value.driveFile.sizeBytes) / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>
        </div>
        <button type="button" onClick={() => { onChange(null); setExpanded(false); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 transition-colors shadow-sm shrink-0">
          <X className="w-4 h-4 font-bold" />
        </button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(true);
        }}
        className="w-full flex items-center justify-center gap-2 h-[44px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[0.95rem] font-medium transition-colors shadow-sm whitespace-nowrap"
      >
        <Paperclip className="w-5 h-5 text-slate-400 shrink-0" />
        {buttonText || (type === 'IMAGE' ? "Attach Image" : "Attach File")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 file-upload-container w-full animate-in fade-in slide-in-from-top-1 duration-200">
      <input
        id={`file_input_${id}`}
        type="file"
        accept={type === 'IMAGE' ? "image/*" : undefined}
        disabled={uploadProgress !== undefined}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          // Client-side size validation: 10MB limit
          if (file.size > 10 * 1024 * 1024) {
            toast.error("File exceeds 10MB limit. Please choose a smaller file.");
            e.target.value = ''; // Reset input
            return;
          }

          let fileToUpload: File | Blob = file;
          if (type === 'IMAGE' && file.type.startsWith('image/')) {
            try {
              fileToUpload = await new Promise<File | Blob>((resolve) => {
                const img = new globalThis.Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;
                  if (width > 1200) {
                    height = Math.round((height * 1200) / width);
                    width = 1200;
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(img, 0, 0, width, height);
                  canvas.toBlob((blob) => {
                    if (blob) {
                      resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    } else {
                      resolve(file);
                    }
                  }, 'image/jpeg', 0.6);
                };
                img.onerror = () => resolve(file);
                img.src = URL.createObjectURL(file);
              });
            } catch (err) {
            }
          }

          if (driveStatus?.connected) {
            setUploadProgress(0);

            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/integrations/google/upload", true);

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent);
              }
            };

            xhr.onload = () => {
              setUploadProgress(undefined);

              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const responseData = JSON.parse(xhr.responseText);
                  onChange({ driveFile: responseData });
                  toast.success("File uploaded to Google Drive");
                } catch (err) {
                  toast.error("Failed to parse upload response");
                }
              } else {
                try {
                  const errData = JSON.parse(xhr.responseText);
                  toast.error(errData.error || "Upload failed");
                } catch {
                  toast.error("Upload failed");
                }
              }
            };

            xhr.onerror = () => {
              setUploadProgress(undefined);
              toast.error("Network error during upload");
            };

            const uploadData = new FormData();
            uploadData.append("file", fileToUpload);
            uploadData.append("module", moduleName);
            uploadData.append("category", categoryName);

            xhr.send(uploadData);
          } else {
            // Fallback to base64 if Drive is not connected
            const reader = new FileReader();
            reader.onloadend = () => onChange(reader.result);
            reader.readAsDataURL(fileToUpload);
          }
        }}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        disabled={uploadProgress !== undefined}
        onClick={() => document.getElementById(`file_input_${id}`)?.click()}
        className="flex-1 flex items-center justify-center gap-2 h-[44px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-sm relative overflow-hidden whitespace-nowrap"
      >
        {uploadProgress !== undefined ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Upload className="w-4 h-4 text-slate-400 shrink-0" />
            Upload from Device
          </>
        )}
        {uploadProgress !== undefined && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </button>

      {driveStatus?.connected && (
        <GooglePicker
          onPick={(file) => onChange({ driveFile: file })}
          className="flex-1 flex items-center justify-center gap-2 h-[44px] px-3 py-0 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
        />
      )}
    </div>
  );
}
