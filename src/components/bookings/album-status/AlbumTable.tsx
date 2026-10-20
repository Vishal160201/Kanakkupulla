"use client";

import type { Dispatch, SetStateAction } from "react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { cn } from "@/lib/utils";
import type { AlbumBooking, AlbumTeamUser, AlbumTrackingUpdates } from "@/types/bookings";
import {
  ALBUM_STATUS_OPTIONS, albumData, albumDisplayId, albumStage, deliveryDateOf, designerIdOf, designerOptions, formatShootDate,
} from "./albumUtils";

export const ITEMS_PER_PAGE = 25;

const TH = "p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap";

interface AlbumRowProps {
  album: AlbumBooking;
  teamUsers: AlbumTeamUser[];
  isSelected: boolean;
  onOpenDetails: (id: string) => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: AlbumTrackingUpdates) => void;
}

function AlbumRow({ album: a, teamUsers, isSelected, onOpenDetails, onSelect, onUpdate }: AlbumRowProps) {
  const cData = albumData(a);
  const formattedShootDate = formatShootDate(a);
  const designerId = designerIdOf(cData);
  const deliveryDateStr = deliveryDateOf(cData);
  const { statusLabel, progress } = albumStage(cData);

  return (
    <tr className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-slate-50' : ''}`}>
      <td
        className="p-5 whitespace-nowrap cursor-pointer group"
        onClick={() => onOpenDetails(a.id)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center text-slate-500 font-black uppercase text-lg group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
            {a.client?.name?.charAt(0)}
          </div>
          <div>
            <div className="font-black text-slate-800 text-sm group-hover:text-purple-600 transition-colors">{a.client?.name}</div>
            <div className="text-xs text-slate-500 font-medium">{a.category} • {formattedShootDate}</div>
          </div>
        </div>
      </td>
      <td
        className="p-5 whitespace-nowrap cursor-pointer"
        onClick={() => onOpenDetails(a.id)}
      >
        <span className="text-purple-600 font-black text-sm hover:underline">
          {albumDisplayId(a)}
        </span>
      </td>
      <td className="p-5 whitespace-nowrap align-middle">
        <CustomDropdown
          options={designerOptions(teamUsers)}
          value={designerId || ""}
          onChange={(val) => onUpdate(a.id, { customData: { designer: val } })}
          className="w-40 mx-auto"
          placeholder="Unassigned"
        />
      </td>
      <td className="p-5 whitespace-nowrap align-middle">
        <div className="w-40 mx-auto flex flex-col items-center">
          <DatePickerInput
            value={deliveryDateStr ? new Date(deliveryDateStr).toISOString().split('T')[0] : ""}
            onChange={(val) => onUpdate(a.id, { customData: { album_delivery_date: val } })}
          />
          {deliveryDateStr && new Date(deliveryDateStr) < new Date() && statusLabel.toLowerCase() !== 'delivered' && (
            <div className="text-[0.65rem] text-orange-500 font-bold mt-1 text-center">Overdue by {Math.floor((new Date().getTime() - new Date(deliveryDateStr).getTime()) / (1000 * 3600 * 24))} days</div>
          )}
        </div>
      </td>
      <td className="p-5 whitespace-nowrap align-middle">
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
          className="w-40 mx-auto"
          placeholder="Select Status"
        />
      </td>
      <td className="p-5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onSelect(a.id)}
            className={`px-5 py-1.5 rounded-xl text-sm font-black border transition-colors ${isSelected ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}
          >
            View
          </button>

        </div>
      </td>
    </tr>
  );
}

function Pagination({ currentPage, totalPages, totalItems, onPageChange }: { currentPage: number; totalPages: number; totalItems: number; onPageChange: Dispatch<SetStateAction<number>> }) {
  return (
    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 mt-auto">
      <div className="flex gap-1">
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
    <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {totalItems > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className={TH}>Client / Event</th>
                <th className={TH}>Booking ID</th>
                <th className={`${TH} text-center`}>Designer</th>
                <th className={`${TH} text-center`}>Delivery Date</th>
                <th className={`${TH} text-center`}>Status</th>
                <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest"></th>
              </tr>
            </thead>
          <tbody className="divide-y divide-slate-100">
            {albums.map(a => (
              <AlbumRow key={a.id} album={a} isSelected={selectedAlbumId === a.id} {...rowProps} />
            ))}
          </tbody>
        </table>
      </div>
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
