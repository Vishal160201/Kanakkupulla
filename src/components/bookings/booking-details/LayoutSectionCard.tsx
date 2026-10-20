"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { ChevronDown, Gem, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import VerticalStatusStepper from "@/components/dashboard/VerticalStatusStepper";
import type { BookingDetail, FieldOption, LayoutField, LayoutSection, StatusOption, TeamUser } from "@/types/bookings";
import { STANDARD_FIELD_MAP } from "../layoutUtils";
import { getFieldIcon, getInclusionItemStyle, getSectionIcon } from "./fieldIcons";
import { readBookingField } from "./bookingFields";

const ALBUM_STATUSES = ['designing', 'sent for printing', 'ready for delivery', 'delivered'];
const DEFAULT_ALBUM_STEPS: StatusOption[] = [
  { label: 'Pending' },
  { label: 'Designing' },
  { label: 'Sent for printing' },
  { label: 'Ready for delivery' },
  { label: 'Delivered' }
];
const HIDDEN_FIELD_NAMES = ['status', 'date', 'shoot date', 'start time', 'time', 'category', 'shoot category', 'location', 'focus'];

/** Resolves a field's stored value into what the details view shows. */
function formatFieldValue(field: LayoutField, rawVal: unknown, teamUsers: TeamUser[]): unknown {
  let val = rawVal;
  const fname = (field.name || '').toLowerCase();
  if (val && (field.type === 'USER_PICKLIST' || field.type === 'MULTI_USER_PICKLIST' || fname.includes('photographer') || fname.includes('designer'))) {
    let ids: string[] = [];
    if (typeof val === 'string') {
      if (val.startsWith('[')) {
        try { ids = JSON.parse(val); } catch { ids = [val]; }
      } else {
        ids = val.split(',').map(s => s.trim());
      }
    } else if (Array.isArray(val)) {
      ids = val;
    } else {
      ids = [String(val)];
    }
    val = ids.map(id => teamUsers.find(u => u.id === id)?.name || id).join(', ');
  } else if (val && field.type === 'DATE') {
    val = new Date(val as string).toLocaleDateString();
  } else if (val && field.type === 'TIME') {
    const match = (val as string).match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h24 = parseInt(match[1], 10);
      const m = match[2];
      const p = h24 >= 12 ? 'PM' : 'AM';
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      val = `${String(h12).padStart(2, '0')}:${m} ${p}`;
    }
  }

  if (val === undefined || val === null || val === '') val = "N/A";
  return val;
}

function MultiSelectList({ field, value }: { field: LayoutField; value: string }) {
  const items = value.split(',').map(s => s.trim()).filter(Boolean);
  const isWedding = (field.name || '').toLowerCase().includes('wedding');
  const titleColorClass = isWedding ? 'text-indigo-600' : 'text-orange-500';
  const iconBgClass = isWedding ? 'bg-indigo-50' : 'bg-orange-50';
  const MainIcon = isWedding ? Gem : Package;

  return (
    <details className="w-full mt-1 mb-3 group" open>
      <summary className="flex items-center justify-between mb-3 px-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none outline-none hover:opacity-80 transition-opacity">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${iconBgClass} flex items-center justify-center`}>
            <MainIcon className={`w-4 h-4 ${titleColorClass}`} />
          </div>
          <p className={`text-[11px] font-black uppercase tracking-wider ${titleColorClass}`}>{field.name}</p>
        </div>
        <ChevronDown className={`w-4 h-4 ${titleColorClass} opacity-60 transition-transform duration-200 group-open:-rotate-180`} />
      </summary>

      <div className="mt-1 ml-[15px] pl-5 border-l-2 border-slate-100/60 flex flex-col gap-1.5">
        {items.map(item => {
          const { ItemIcon, itemColor, itemBg } = getInclusionItemStyle(item);
          return (
            <div key={item} className="flex items-center gap-3 py-1">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${itemBg}`}>
                <ItemIcon className={`w-3 h-3 ${itemColor}`} />
              </div>
              <p className="text-xs font-semibold text-slate-700">{item}</p>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function FieldRow({ field, booking, teamUsers }: { field: LayoutField; booking: BookingDetail; teamUsers: TeamUser[] }) {
  const standardKey = STANDARD_FIELD_MAP[field.id];
  let val = formatFieldValue(field, standardKey ? readBookingField(booking, standardKey) : booking.customData?.[field.id], teamUsers);

  const isMultiSelectStringList = typeof val === 'string' && val.includes(',') && val !== "N/A" && (field.type === 'MULTI_PICKLIST' || field.type === 'MULTI_SELECT' || (field.name || '').toLowerCase().includes('inclusion'));
  if (isMultiSelectStringList) {
    return <MultiSelectList field={field} value={val as string} />;
  }

  if (Array.isArray(val)) val = val.join(', ');

  const { icon, color } = getFieldIcon(field);
  return (
    <div className="flex items-start gap-3 w-full">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-${color}-50 text-${color}-500 mt-0.5`}>
        {/* Scaled down icon slightly inside to fit w-8 */}
        <div className="scale-75 origin-center flex items-center justify-center">{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{field.name}</p>
        <p className="font-bold text-slate-800 text-sm whitespace-pre-wrap break-words">{val as ReactNode}</p>
      </div>
    </div>
  );
}

interface SectionStepperProps {
  section: LayoutSection;
  booking: BookingDetail;
  sectionStatusField: LayoutField | undefined;
  currentSectionStatus: unknown;
  isUpdatingStatus: boolean;
  onSectionStatusChange: (fieldId: string, status: string) => void;
}

function SectionStepper({ section, booking, sectionStatusField, currentSectionStatus, isUpdatingStatus, onSectionStatusChange }: SectionStepperProps) {
  const isAlbum = section.title.toLowerCase().includes('album');
  if (isAlbum) {
    const s = (booking.status || 'Pending').toLowerCase();
    const isShootCompleted = s === 'shoot completed' || s === 'completed' || ALBUM_STATUSES.includes(s);
    if (!isShootCompleted) return null;
  }

  let options: (StatusOption | FieldOption)[] = sectionStatusField?.statusOptions || sectionStatusField?.options || [];

  if (isAlbum && (!sectionStatusField || options.length === 0)) {
    options = DEFAULT_ALBUM_STEPS;
  }

  if (options.length === 0) return null;

  let steps = options
    .map(o => typeof o === 'string' ? o : (o.label || ('value' in o ? o.value : undefined)))
    .filter((label): label is string => typeof label === 'string' && label.toLowerCase() !== 'cancelled');

  if (!isAlbum) {
    const allowedEventSteps = ['pending', 'confirmed', 'shoot completed'];
    steps = steps.filter(step => allowedEventSteps.includes(step.toLowerCase()));
  }

  const effectiveFieldId = sectionStatusField?.id || (isAlbum ? 'fld_b_album_status' : '');
  let effectiveStatus = (currentSectionStatus || (isAlbum ? booking.customData?.fld_b_album_status : null)) as string | null;

  if (!isAlbum && effectiveStatus) {
    const s = effectiveStatus.toLowerCase();
    if (ALBUM_STATUSES.includes(s)) {
      effectiveStatus = 'Shoot Completed';
    }
  }

  return (
    <div className="xl:border-l border-slate-100 xl:pl-6 pt-6 xl:pt-0 flex w-full xl:w-auto xl:min-w-[150px] h-full">
      <VerticalStatusStepper
        steps={steps}
        currentStatus={effectiveStatus}
        sectionTitle={section.title}
        onStatusChange={(newStatus) => onSectionStatusChange(effectiveFieldId, newStatus)}
        isUpdating={isUpdatingStatus}
        updatedAt={booking.updatedAt ? format(new Date(booking.updatedAt), "dd MMM yyyy, h:mm a") : undefined}
      />
    </div>
  );
}

interface LayoutSectionCardProps {
  section: LayoutSection;
  booking: BookingDetail;
  teamUsers: TeamUser[];
  isFieldVisible: (rule: LayoutField['visibilityRule']) => boolean;
  isUpdatingStatus: boolean;
  onSectionStatusChange: (fieldId: string, status: string) => void;
}

/** One dynamic layout section of the booking (fields + optional status timeline). */
export default function LayoutSectionCard({ section, booking, teamUsers, isFieldVisible, isUpdatingStatus, onSectionStatusChange }: LayoutSectionCardProps) {
  const visibleFields = section.fields?.filter(f => {
    const fname = (f.name || '').toLowerCase();
    if (f.id === 'fld_b_client' || f.id === 'fld_b_phone' || f.id === 'fld_b_email') return false; // Handled in client info
    if (fname.includes('attachment') || f.type === 'FILE' || f.type === 'ATTACHMENT') return false;
    if (HIDDEN_FIELD_NAMES.includes(fname)) return false;
    return isFieldVisible(f.visibilityRule);
  }) || [];

  if (visibleFields.length === 0) return null;

  // Identify status field inside section to drive timeline
  const sectionStatusField = section.fields?.find(f => {
    const fname = (f.name || '').toLowerCase();
    return fname.includes('status') || f.type === 'STATUS_PICKER' || f.id === 'fld_b_album_status' || f.id === 'fld_b_status';
  });

  let currentSectionStatus: unknown = null;
  if (sectionStatusField) {
    const standardKey = STANDARD_FIELD_MAP[sectionStatusField.id];
    currentSectionStatus = standardKey ? readBookingField(booking, standardKey) : booking.customData?.[sectionStatusField.id];
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4">
        {getSectionIcon(section.title)}
        <h3 className="font-bold text-[#0B1E40]">{section.title}</h3>
      </div>
      <div className={cn("grid grid-cols-1 gap-6", (sectionStatusField || section.title.toLowerCase().includes('album')) ? "xl:grid-cols-[1fr_auto]" : "")}>
        <div className="space-y-5 flex-1 min-w-0 xl:pr-6">
          {visibleFields.map(field => (
            <FieldRow key={field.id} field={field} booking={booking} teamUsers={teamUsers} />
          ))}
        </div>

        <SectionStepper
          section={section}
          booking={booking}
          sectionStatusField={sectionStatusField}
          currentSectionStatus={currentSectionStatus}
          isUpdatingStatus={isUpdatingStatus}
          onSectionStatusChange={onSectionStatusChange}
        />
      </div>
    </div>
  );
}
