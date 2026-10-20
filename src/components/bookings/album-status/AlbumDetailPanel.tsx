"use client";

import type { ReactNode } from "react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import type { AlbumBooking, AlbumTeamUser, AlbumTrackingUpdates } from "@/types/bookings";
import {
  albumData, albumDisplayId, albumStage, deliveryDateOf, designerIdOf, designerName, designerOptions, formatShootDate, formatShortDate,
} from "./albumUtils";

function DetailRow({ label, children, alignStart }: { label: string; children: ReactNode; alignStart?: boolean }) {
  return (
    <div className={`grid grid-cols-[110px_1fr] text-[0.85rem] ${alignStart ? 'items-start' : 'items-center'}`}>
      <div className="text-slate-500 font-medium">{label}</div>
      <div className="font-black text-slate-800 flex items-center gap-2"><span className="text-slate-400 font-normal">:</span> {children}</div>
    </div>
  );
}

function TimelineStep({ label, reached, note, dot }: { label: string; reached: boolean; note: string; dot: { on: string; off: string; inner: ReactNode } }) {
  return (
    <div className="relative">
      <div className={`absolute -left-[1.65rem] w-4 h-4 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm ${reached ? dot.on : dot.off}`}>
        {reached && dot.inner}
      </div>
      <div className="flex justify-between items-start -mt-0.5">
        <div className={`font-black text-[0.8rem] ${reached ? 'text-slate-800' : 'text-slate-400'}`}>{label}</div>
        <div className="text-[0.7rem] text-slate-400 font-medium">{reached ? note : 'Pending'}</div>
      </div>
    </div>
  );
}

const check = <i className="ph-bold ph-check text-white text-[0.45rem]"></i>;

interface AlbumDetailPanelProps {
  album: AlbumBooking;
  teamUsers: AlbumTeamUser[];
  onClose: () => void;
  onOpenDetails: () => void;
  onUpdate: (id: string, updates: AlbumTrackingUpdates) => void;
  /** Without Album status Manage the panel is read-only. */
  canEdit: boolean;
}

/** Right column of the album-status page for the selected album. */
export default function AlbumDetailPanel({ album, teamUsers, onClose, onOpenDetails, onUpdate, canEdit }: AlbumDetailPanelProps) {
  const cData = albumData(album);
  const { statusLabel, statusColor, progress } = albumStage(cData);
  const isDelivered = statusLabel.toLowerCase() === 'delivered';
  const formattedShootDate = formatShootDate(album);
  const designerId = designerIdOf(cData);
  const deliveryDateStr = deliveryDateOf(cData);

  return (
    <div className="w-full lg:w-[380px] bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col relative sticky top-[80px] h-[calc(100vh-100px)] overflow-y-auto hide-scrollbar">
      <button type="button" aria-label="Close album details"
        onClick={onClose}
        className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
      >
        <i className="ph-bold ph-x text-lg"></i>
      </button>

      <h3 className="text-lg font-black text-slate-800 pr-8">{album.client?.name} – {album.category}</h3>

      <div className="mt-3">
        <span className={`px-2.5 py-1 rounded-md text-[0.7rem] font-bold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-8 space-y-4">
        <DetailRow label="Booking ID">{albumDisplayId(album)}</DetailRow>
        <DetailRow label="Shoot Date">{formattedShootDate}</DetailRow>
        <DetailRow label="Designer">
          {canEdit ? (
            <CustomDropdown
              options={designerOptions(teamUsers)}
              value={designerId || ""}
              onChange={(val) => onUpdate(album.id, { customData: { designer: val } })}
              className="w-40 border-b border-dashed border-slate-300 rounded-none shadow-none bg-transparent"
              placeholder="Unassigned"
            />
          ) : (
            designerName(teamUsers, designerId, 'Unassigned')
          )}
        </DetailRow>
        <DetailRow label="Delivery Date">
          {canEdit ? (
            <DatePickerInput
              value={deliveryDateStr ? new Date(deliveryDateStr).toISOString().split('T')[0] : ""}
              onChange={(val) => onUpdate(album.id, { customData: { album_delivery_date: val } })}
              className="flex items-center justify-between bg-white text-[0.8rem] border border-slate-200 rounded-lg px-3 py-1.5 outline-none hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer w-[140px] h-[34px]"
            />
          ) : (
            deliveryDateStr ? formatShortDate(deliveryDateStr) : 'Not set'
          )}
          {deliveryDateStr && new Date(deliveryDateStr) < new Date() && !isDelivered && (
            <span className="text-orange-500 font-bold ml-1">(Overdue)</span>
          )}
        </DetailRow>
        <DetailRow label="Album Size">{cData.album_size || 'Not specified'}</DetailRow>
        <DetailRow label="Pages">{cData.album_pages || 'Not specified'}</DetailRow>
        <DetailRow label="Album Type">{cData.fld_b_album_type || cData.album_type || 'Premium'}</DetailRow>
        <DetailRow label="Remarks" alignStart>{cData.album_remarks || 'Designing in progress'}</DetailRow>
      </div>

      <div className="mt-8 pt-6 relative">
        <h4 className="font-black text-slate-800 text-sm mb-6">Timeline</h4>

        <div className="relative pl-6 space-y-7">
          <div className="absolute left-[7px] top-[8px] bottom-[15px] w-[2px] bg-slate-100"></div>

          <div className="relative">
            <div className="absolute -left-[1.65rem] w-4 h-4 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center shadow-sm">
              {check}
            </div>
            <div className="flex justify-between items-start -mt-0.5">
              <div className="font-black text-slate-800 text-[0.8rem]">Pending</div>
              <div className="text-[0.7rem] text-slate-400 font-medium">{formattedShootDate}</div>
            </div>
          </div>

          <TimelineStep label="Designing" reached={progress >= 25} note="Started"
            dot={{ on: 'bg-white border-orange-400', off: 'bg-slate-200', inner: <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div> }} />
          <TimelineStep label="Sent for printing" reached={progress >= 50} note="Sent"
            dot={{ on: 'bg-white border-purple-400', off: 'bg-slate-200', inner: <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div> }} />
          <TimelineStep label="Ready for delivery" reached={progress >= 75} note="Ready"
            dot={{ on: 'bg-emerald-500', off: 'bg-white border-slate-200', inner: check }} />
          <TimelineStep label="Delivered" reached={isDelivered} note="Delivered"
            dot={{ on: 'bg-blue-500', off: 'bg-white border-slate-200', inner: check }} />
        </div>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <h4 className="font-black text-slate-800 text-sm mb-4">Quick Actions</h4>
        <div className="flex items-center gap-3">
          {canEdit && (
            <button type="button" className="flex-1 py-2.5 rounded-xl border border-purple-200 text-purple-700 font-bold text-xs hover:bg-purple-50 flex items-center justify-center gap-2 transition-colors">
              <i className="ph-bold ph-upload-simple"></i> Upload Draft
            </button>
          )}
          <button
            type="button"
            onClick={onOpenDetails}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
          >
            <i className="ph-bold ph-eye"></i> View Details
          </button>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => onUpdate(album.id, { status: 'Delivered', customData: { fld_b_album_status: 'Delivered', album_progress: '100' } })}
            className="w-full mt-3 py-3 rounded-xl bg-purple-700 text-white font-bold text-sm hover:bg-purple-800 flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            <i className="ph-bold ph-check-circle"></i> Mark as Completed
          </button>
        )}
      </div>
    </div>
  );
}
