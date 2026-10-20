import type { ReactNode } from "react";
import { FileText, Link as LinkIcon, Target, Upload } from "lucide-react";
import type { BookingDetail, LayoutSchema } from "@/types/bookings";
import { STANDARD_FIELD_MAP } from "../layoutUtils";
import { readBookingField } from "./bookingFields";

function NotesCard() {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full min-h-[160px] gap-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-amber-600" />
        <h3 className="font-bold text-[#0B1E40]">Notes</h3>
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <p className="text-sm text-slate-400 font-medium mt-2">No notes added</p>
        <div className="flex justify-end mt-4">
          <button type="button" className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-bold border border-slate-200 transition-colors">
            + Add Note
          </button>
        </div>
      </div>
    </div>
  );
}

function AttachmentsCard() {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full min-h-[160px] gap-4">
      <div className="flex items-center gap-2">
        <LinkIcon className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-[#0B1E40]">Attachments (0)</h3>
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <p className="text-sm text-slate-400 font-medium mt-2">No files uploaded yet</p>
        <div className="flex justify-end mt-4">
          <button type="button" className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-bold border border-blue-200 transition-colors">
            <Upload className="w-4 h-4" /> Upload Files
          </button>
        </div>
      </div>
    </div>
  );
}

function FocusCard({ booking, layoutSchema }: { booking: BookingDetail; layoutSchema: LayoutSchema | null }) {
  const focusSection = layoutSchema?.sections?.find(s => s.title?.toLowerCase() === 'focus');
  const cd = booking.customData;

  const focusVal = cd?.fld_b_focus || cd?.focus;
  let amountVal = cd?.fld_b_amount || cd?.amount || 'N/A';
  let dateVal = cd?.fld_b_date || cd?.date || 'N/A';
  let attachmentsCount = 0;

  if (focusSection) {
    const dateField = focusSection.fields?.find(f => (f.name || '').toLowerCase() === 'date');
    const amountField = focusSection.fields?.find(f => (f.name || '').toLowerCase() === 'amount');
    const attachmentFields = focusSection.fields?.filter(f => (f.name || '').toLowerCase().includes('attachment') || f.type === 'FILE' || f.type === 'ATTACHMENT') || [];

    if (dateField) {
      const val = STANDARD_FIELD_MAP[dateField.id] ? readBookingField(booking, STANDARD_FIELD_MAP[dateField.id]) : cd?.[dateField.id];
      if (val) dateVal = new Date(val as string).toLocaleDateString();
    }
    if (amountField) {
      const val = STANDARD_FIELD_MAP[amountField.id] ? readBookingField(booking, amountField.id) : cd?.[amountField.id];
      if (val) amountVal = val;
    }

    attachmentFields.forEach(f => {
      const val = STANDARD_FIELD_MAP[f.id] ? readBookingField(booking, STANDARD_FIELD_MAP[f.id]) : cd?.[f.id];
      if (val) {
        if (Array.isArray(val)) attachmentsCount += val.length;
        else if (typeof val === 'string' && val.trim() !== '') attachmentsCount += 1;
      }
    });

    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full min-h-[160px] gap-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-[#0B1E40]">{focusSection.title || 'Focus'}</h3>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-3 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date</span>
            <span className="text-sm font-bold text-slate-800">{dateVal as ReactNode}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Amount</span>
            <span className="text-sm font-bold text-slate-800">{amountVal as ReactNode}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attachments</span>
            <span className="text-sm font-bold text-blue-600">{attachmentsCount} File{attachmentsCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!focusVal || focusVal === 'N/A' || focusVal === '') return <div className="hidden md:block"></div>;
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full min-h-[160px] gap-4">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-[#0B1E40]">Primary Focus</h3>
      </div>
      <div className="flex-1 flex flex-col justify-center mt-2">
        <p className="text-sm font-bold text-slate-800">{focusVal as ReactNode}</p>
      </div>
    </div>
  );
}

/** Row 2 of the details view: Notes, Attachments, Focus. */
export default function SupplementaryCards({ booking, layoutSchema }: { booking: BookingDetail; layoutSchema: LayoutSchema | null }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mt-6">
      <NotesCard />
      <AttachmentsCard />
      <FocusCard booking={booking} layoutSchema={layoutSchema} />
    </div>
  );
}
