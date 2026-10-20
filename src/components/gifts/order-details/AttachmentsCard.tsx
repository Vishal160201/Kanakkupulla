"use client";

import { Paperclip } from "lucide-react";
import type { GiftOrderCustomData } from "@/types/gifts";
import { isDriveAttachment } from "@/types/gifts";
import { isAttachmentValue } from "./orderDetailsConstants";

export function hasAttachments(customData: GiftOrderCustomData) {
  return Object.values(customData).some(isAttachmentValue);
}

export default function AttachmentsCard({ customData }: { customData: GiftOrderCustomData }) {
  return (
    <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm flex flex-col print-section col-span-1 lg:col-span-12 mb-6">
      <div className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-6">
        <Paperclip size={16} /> Attachments
      </div>
      <div className="flex flex-wrap gap-4">
        {Object.entries(customData).map(([key, val]) => {
          if (isDriveAttachment(val)) {
            const { driveFile } = val;
            const fileId = driveFile.id || driveFile.driveFileId;
            return (
              <a key={key} href={driveFile.url || driveFile.webViewLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer w-fit min-w-[200px]">
                <img
                  src={fileId ? `/api/integrations/google/thumbnail?fileId=${fileId}` : driveFile.iconUrl}
                  alt="Drive File"
                  className="w-8 h-8 object-cover rounded-md bg-slate-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.includes('/api/integrations/google/thumbnail')) {
                      // Fallback 1: drive.google.com/thumbnail
                      target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200&authuser=0`;
                    } else if (target.src.includes('drive.google.com/thumbnail')) {
                      // Fallback 2: lh3 public URL
                      target.src = `https://lh3.googleusercontent.com/d/${fileId}=w200`;
                    } else {
                      // Fallback 3: Generic icon
                      target.src = String(driveFile.iconUrl);
                      target.className = "w-8 h-8 object-contain";
                    }
                  }}
                />
                <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{driveFile.name}</span>
              </a>
            );
          }
          if (typeof val === 'string' && val.startsWith('data:image')) {
            return (
              <button type="button" key={key} aria-label="View attachment full size" className="w-24 h-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(val, '_blank')} title="Click to view full size">
                <img src={val} alt="Attachment" className="w-full h-full object-cover" />
              </button>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
