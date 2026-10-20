"use client";

import type { Dispatch, SetStateAction } from "react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { cn } from "@/lib/utils";
import type { AlbumBooking, AlbumCustomData, AlbumTeamUser, AlbumTrackingUpdates } from "@/types/bookings";
import { clickableProps } from "../clickableProps";
import {
  ALBUM_STATUS_OPTIONS, albumData, albumDisplayId, albumStage, deliveryDateOf, designerIdOf, designerName, designerOptions, formatShootDate, formatShortDate,
} from "./albumUtils";

export const ITEMS_PER_PAGE = 25;

const TH = "px-3 py-4 2xl:p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap";
const TD = "px-3 py-4 2xl:p-5 whitespace-nowrap";
/** Width of the designer / delivery / status controls in the table. */
const CONTROL_W = "w-40";

interface AlbumRowProps {
  album: AlbumBooking;
  teamUsers: AlbumTeamUser[];
  isSelected: boolean;
  onOpenDetails: (id: string) => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: AlbumTrackingUpdates) => void;
  /** Without Album status Manage the designer, date and status are shown read-only. */
  canEdit: boolean;
}

const READ_ONLY_TEXT = "text-sm font-bold text-slate-700";
const READ_ONLY_CELL = `${CONTROL_W} mx-auto text-center ${READ_ONLY_TEXT}`;

interface AlbumControlProps {
  album: AlbumBooking;
  cData: AlbumCustomData;
  teamUsers: AlbumTeamUser[];
  onUpdate: (id: string, updates: AlbumTrackingUpdates) => void;
  canEdit: boolean;
  /** Width / alignment of the control (table cell vs. card). */
  className: string;
  /** Classes for the read-only text shown without edit access. */
  readOnlyClassName: string;
}

function DesignerControl({ album: a, cData, teamUsers, onUpdate, canEdit, className, readOnlyClassName }: AlbumControlProps) {
  const designerId = designerIdOf(cData);
  return canEdit ? (
    <CustomDropdown
      options={designerOptions(teamUsers)}
      value={designerId || ""}
      onChange={(val) => onUpdate(a.id, { customData: { designer: val } })}
      className={className}
      placeholder="Unassigned"
    />
  ) : (
    <div className={readOnlyClassName}>{designerName(teamUsers, designerId, 'Unassigned')}</div>
  );
}

function DeliveryControl({ album: a, cData, onUpdate, canEdit, className, readOnlyClassName }: AlbumControlProps) {
  const deliveryDateStr = deliveryDateOf(cData);
  const { statusLabel } = albumStage(cData);
  return (
    <div className={className}>
      {canEdit ? (
        <DatePickerInput
          value={deliveryDateStr ? new Date(deliveryDateStr).toISOString().split('T')[0] : ""}
          onChange={(val) => onUpdate(a.id, { customData: { album_delivery_date: val } })}
        />
      ) : (
        <div className={readOnlyClassName}>{deliveryDateStr ? formatShortDate(deliveryDateStr) : 'Not set'}</div>
      )}
      {deliveryDateStr && new Date(deliveryDateStr) < new Date() && statusLabel.toLowerCase() !== 'delivered' && (
        <div className="text-[0.65rem] text-orange-500 font-bold mt-1">Overdue by {Math.floor((new Date().getTime() - new Date(deliveryDateStr).getTime()) / (1000 * 3600 * 24))} days</div>
      )}
    </div>
  );
}

function StatusControl({ album: a, cData, onUpdate, canEdit, className, readOnlyClassName }: AlbumControlProps) {
  const { progress } = albumStage(cData);
  return canEdit ? (
    <CustomDropdown
      options={ALBUM_STATUS_OPTIONS}
      value={cData.fld_b_album_status || "Pending"}
      onChange={(val) => {
        let newProgress = progress;
        if (val === 'Delivered') newProgress = 100;
        const updates: AlbumTrackingUpdates = { customData: { fld_b_album_status: val, album_progress: newProgress.toString() } };
        if (val === 'Delivered') updates.status = 'Delivered';
        onUpdate(a.id, updates);
      }}
      className={className}
      placeholder="Select Status"
    />
  ) : (
    <div className={readOnlyClassName}>{cData.fld_b_album_status || 'Pending'}</div>
  );
}

function ViewButton({ isSelected, onClick, className = "" }: { isSelected: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 2xl:px-5 py-1.5 rounded-xl text-sm font-black border transition-colors",
        isSelected ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50',
        className
      )}
    >
      View
    </button>
  );
}

function AlbumRow({ album: a, teamUsers, isSelected, onOpenDetails, onSelect, onUpdate, canEdit }: AlbumRowProps) {
  const cData = albumData(a);
  const formattedShootDate = formatShootDate(a);
  const controlProps = { album: a, cData, teamUsers, onUpdate, canEdit, readOnlyClassName: READ_ONLY_CELL };

  return (
    <tr className={`group/row hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-slate-50' : ''}`}>
      <td
        className={`${TD} cursor-pointer group`}
        onClick={() => onOpenDetails(a.id)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center text-slate-500 font-black uppercase text-lg group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
            {a.client?.name?.charAt(0)}
          </div>
          <div className="min-w-0 max-w-[10rem] lg:max-w-[14rem] 2xl:max-w-none">
            <div className="font-black text-slate-800 text-sm truncate group-hover:text-purple-600 transition-colors">{a.client?.name}</div>
            <div className="text-xs text-slate-500 font-medium truncate">{a.category} • {formattedShootDate}</div>
            {/* Booking ID has its own column from lg up */}
            <div className="lg:hidden text-[0.7rem] text-purple-600 font-black truncate">{albumDisplayId(a)}</div>
          </div>
        </div>
      </td>
      <td
        className={`${TD} cursor-pointer hidden lg:table-cell`}
        onClick={() => onOpenDetails(a.id)}
      >
        <span className="text-purple-600 font-black text-sm hover:underline">
          {albumDisplayId(a)}
        </span>
      </td>
      <td className={`${TD} align-middle`}>
        <DesignerControl {...controlProps} className={`${CONTROL_W} mx-auto`} />
      </td>
      <td className={`${TD} align-middle`}>
        <DeliveryControl {...controlProps} className={`${CONTROL_W} mx-auto flex flex-col items-center text-center`} />
      </td>
      <td className={`${TD} align-middle`}>
        <StatusControl {...controlProps} className={`${CONTROL_W} mx-auto`} />
      </td>
      {/* Pinned to the right so the action stays visible when the table scrolls sideways */}
      <td className={`${TD} text-right sticky right-0 z-[1] transition-colors ${isSelected ? 'bg-slate-50' : 'bg-white group-hover/row:bg-slate-50'}`}>
        <div className="flex items-center justify-end gap-2">
          <ViewButton isSelected={isSelected} onClick={() => onSelect(a.id)} />
        </div>
      </td>
    </tr>
  );
}

/** Stacked card used instead of the table row below lg. */
function AlbumCard({ album: a, teamUsers, isSelected, onOpenDetails, onSelect, onUpdate, canEdit }: AlbumRowProps) {
  const cData = albumData(a);
  const formattedShootDate = formatShootDate(a);
  const { statusLabel, statusColor } = albumStage(cData);
  const controlProps = { album: a, cData, teamUsers, onUpdate, canEdit, readOnlyClassName: READ_ONLY_TEXT };
  const FIELD_LABEL = "text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1.5";

  return (
    <div className={`p-4 flex flex-col gap-4 transition-colors ${isSelected ? 'bg-slate-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group" {...clickableProps(() => onOpenDetails(a.id))}>
          <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center text-slate-500 font-black uppercase text-lg group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
            {a.client?.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-black text-slate-800 text-sm truncate group-hover:text-purple-600 transition-colors">{a.client?.name}</div>
            <div className="text-xs text-slate-500 font-medium truncate">{a.category} • {formattedShootDate}</div>
            <div className="text-[0.7rem] text-purple-600 font-black truncate">{albumDisplayId(a)}</div>
          </div>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[0.7rem] font-black whitespace-nowrap ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <div className={FIELD_LABEL}>Status</div>
          <StatusControl {...controlProps} className="w-full" />
        </div>
        <div className="min-w-0">
          <div className={FIELD_LABEL}>Delivery Date</div>
          <DeliveryControl {...controlProps} className="w-full" />
        </div>
        <div className="min-w-0 col-span-2">
          <div className={FIELD_LABEL}>Designer</div>
          <DesignerControl {...controlProps} className="w-full" />
        </div>
      </div>

      <ViewButton isSelected={isSelected} onClick={() => onSelect(a.id)} className="w-full py-2" />
    </div>
  );
}

function Pagination({ currentPage, totalPages, totalItems, onPageChange }: { currentPage: number; totalPages: number; totalItems: number; onPageChange: Dispatch<SetStateAction<number>> }) {
  return (
    <div className="p-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 mt-auto">
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={currentPage === 1}
          onClick={() => onPageChange(prev => Math.max(1, prev - 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
          <i className="ph-bold ph-caret-left"></i>
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-lg border text-sm font-bold transition-colors",
              currentPage === page
                ? "border-purple-200 bg-purple-50 text-purple-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          aria-label="Next page"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(prev => Math.min(totalPages, prev + 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
          <i className="ph-bold ph-caret-right"></i>
        </button>
      </div>
      <div className="text-xs font-bold text-slate-500">
        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} albums
      </div>
    </div>
  );
}

interface AlbumTableProps extends Omit<AlbumRowProps, 'album' | 'isSelected'> {
  albums: AlbumBooking[];
  selectedAlbumId: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: Dispatch<SetStateAction<number>>;
}

/** Left column of the album-status page: the current page of albums plus pagination. */
export default function AlbumTable({ albums, selectedAlbumId, currentPage, totalPages, totalItems, onPageChange, ...rowProps }: AlbumTableProps) {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {totalItems > 0 ? (
        <>
        {/* Phones and tablets: stacked cards */}
        <div className="lg:hidden divide-y divide-slate-100">
          {albums.map(a => (
            <AlbumCard key={a.id} album={a} isSelected={selectedAlbumId === a.id} {...rowProps} />
          ))}
        </div>

        {/* Laptop and up: table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className={TH}>Client / Event</th>
                <th className={`${TH} hidden lg:table-cell`}>Booking ID</th>
                <th className={`${TH} text-center`}>Designer</th>
                <th className={`${TH} text-center`}>Delivery Date</th>
                <th className={`${TH} text-center`}>Status</th>
                <th className={`${TH} sticky right-0 z-[1] bg-white`}></th>
              </tr>
            </thead>
          <tbody className="divide-y divide-slate-100">
            {albums.map(a => (
              <AlbumRow key={a.id} album={a} isSelected={selectedAlbumId === a.id} {...rowProps} />
            ))}
          </tbody>
        </table>
      </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 text-slate-400 h-full">
          <i className="ph-fill ph-images text-5xl mb-4 text-slate-300"></i>
          <p className="font-bold text-lg text-slate-500">No pending albums.</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} onPageChange={onPageChange} />
      )}
    </div>
  );
}
