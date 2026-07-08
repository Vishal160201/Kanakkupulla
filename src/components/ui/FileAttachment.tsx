import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Paperclip, X, CheckCircle2 } from "lucide-react";
import GooglePicker from "@/components/shared/GooglePicker";

export interface FileAttachmentProps {
  id: string;
  type: 'IMAGE' | 'FILE';
  value: any;
  onChange: (values: any[]) => void;
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
  const [uploadProgresses, setUploadProgresses] = useState<Record<string, number>>({});

  const valuesArray = Array.isArray(value) ? value : (value ? [value] : []);

  const handleRemove = (index: number) => {
    const newValues = [...valuesArray];
    newValues.splice(index, 1);
    onChange(newValues);
    if (newValues.length === 0) {
      setExpanded(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (valuesArray.length + files.length > 5) {
      toast.error("Max 5 files allowed");
      e.target.value = ''; 
      return;
    }

    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`'${file.name}' exceeds 20MB limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) {
      e.target.value = '';
      return;
    }

    const newValues = [...valuesArray];

    const processFile = async (file: File) => {
      setUploadProgresses(prev => ({ ...prev, [file.name]: 0 }));
      
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

      return new Promise<void>((resolve) => {
        if (driveStatus?.connected) {
          setUploadProgresses(prev => ({ ...prev, [file.name]: 100 }));
          newValues.push(fileToUpload);
          resolve();
        } else {
          const reader = new FileReader();
          reader.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploadProgresses(prev => ({ ...prev, [file.name]: progress }));
            }
          };
          reader.onloadend = () => {
            setUploadProgresses(prev => ({ ...prev, [file.name]: 100 }));
            newValues.push(reader.result);
            resolve();
          };
          reader.readAsDataURL(fileToUpload);
        }
      });
    };

    for (const file of validFiles) {
      await processFile(file);
      onChange([...newValues]); 
    }
    
    e.target.value = '';
  };

  const isUploading = Object.values(uploadProgresses).some(p => p !== undefined && p < 100);

  return (
    <div className="flex flex-col gap-2 w-full animate-in fade-in duration-200">
      {valuesArray.length > 0 && (
        <div className="flex flex-col gap-2 mb-2">
          {valuesArray.map((val, idx) => {
            const isDriveFile = val?.driveFile;
            const isLocalFile = typeof window !== 'undefined' && (val instanceof File || val instanceof Blob);
            const fileName = isDriveFile ? val.driveFile.name : (isLocalFile ? (val as File).name || "Local File" : "Uploaded File");
            const fileSize = isDriveFile && val.driveFile.sizeBytes ? Number(val.driveFile.sizeBytes) : (isLocalFile ? val.size : null);
            const progress = uploadProgresses[fileName];

            return (
              <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  {isDriveFile ? (
                    <img src={val.driveFile.iconUrl} alt="icon" className="w-6 h-6 object-contain" />
                  ) : (
                    type === 'IMAGE' ? (
                      <i className="ph-fill ph-image text-2xl text-blue-500"></i>
                    ) : (
                      <Paperclip className="w-6 h-6 text-slate-400 shrink-0" />
                    )
                  )}
                  <div className="flex flex-col overflow-hidden w-full gap-1">
                    <span className="text-[0.85rem] font-bold text-slate-700 truncate pr-4">
                      {fileName}
                    </span>
                    <div className="flex items-center gap-2">
                      {fileSize ? (
                        <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">
                          {(fileSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      ) : null}
                      
                      {progress !== undefined && progress < 100 && (
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-[100px]">
                          <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                      {progress === 100 && (
                         <span className="flex items-center gap-1 text-[0.65rem] font-bold text-emerald-600 uppercase tracking-wider">
                           <CheckCircle2 className="w-3 h-3" /> Done
                         </span>
                      )}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => handleRemove(idx)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 transition-colors shadow-sm shrink-0">
                  <X className="w-4 h-4 font-bold" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {(!expanded && valuesArray.length === 0) ? (
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
      ) : (
        valuesArray.length < 5 && (
          <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-1 duration-200">
            <input
              id={`file_input_${id}`}
              type="file"
              multiple
              accept={type === 'IMAGE' ? "image/*" : undefined}
              disabled={isUploading}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => document.getElementById(`file_input_${id}`)?.click()}
                className="flex-1 flex items-center justify-center gap-2 h-[44px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                    Upload from Device
                  </>
                )}
              </button>

              {driveStatus?.connected && (
                <GooglePicker
                  onPick={(file) => {
                    if (valuesArray.length >= 5) {
                      toast.error("Max 5 files allowed");
                      return;
                    }
                    onChange([...valuesArray, { driveFile: file }]);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 h-[44px] px-3 py-0 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
                />
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
