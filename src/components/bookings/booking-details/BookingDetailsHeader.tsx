"use client";

import { Trash2, Receipt, Upload, Clock, MapPin, Tag, Calendar, Info, FolderOpen, CheckCircle2, ChevronDown } from "lucide-react";
import type { BookingDetail, StatusOption } from "@/types/bookings";
import { shortBookingId } from "../layoutUtils";
import { getStatusVisual } from "./fieldIcons";

interface BookingDetailsHeaderProps {
  booking: BookingDetail;
  canManageTransactions: boolean;
  isStatusPicker: boolean;
  statusOptions: StatusOption[];
  isStatusDropdownOpen: boolean;
  setIsStatusDropdownOpen: (open: boolean) => void;
  isUpdatingStatus: boolean;
  isExporting: boolean;
  isGeneratingInvoice: boolean;
  onDelete: () => void;
  onExport: () => void;
  onGenerateInvoice: () => void;
  onChangeStatus: (status: string) => void;
}

const spinner = <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />;

function StatusDisplay({
  booking, isStatusPicker, statusOptions, isStatusDropdownOpen, setIsStatusDropdownOpen, isUpdatingStatus, onChangeStatus,
}: Pick<BookingDetailsHeaderProps, 'booking' | 'isStatusPicker' | 'statusOptions' | 'isStatusDropdownOpen' | 'setIsStatusDropdownOpen' | 'isUpdatingStatus' | 'onChangeStatus'>) {
  const statusVal = booking.status || 'Pending';
  const currentActive = booking.status;
  const { icon, bg, ring, text, doubleBorder } = getStatusVisual(statusVal);

  const triggerContent = (
    <>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ring-1 ring-offset-1 ${bg} ${doubleBorder} ${ring}`}>
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-1">
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Status</p>
          {isStatusPicker && <ChevronDown className="w-2.5 h-2.5 text-slate-400" />}
        </div>
        <p className={`text-xs font-bold ${text}`}>{statusVal}</p>
      </div>
    </>
  );

  return (
    <div className="relative">
      {isStatusPicker ? (
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={isStatusDropdownOpen}
          onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
          className="flex items-center gap-2.5 text-left cursor-pointer hover:opacity-80 transition-opacity"
        >
          {triggerContent}
        </button>
      ) : (
        <div className="flex items-center gap-2.5 ">
          {triggerContent}
        </div>
      )}

      {/* Status Dropdown Menu */}
      {isStatusDropdownOpen && isStatusPicker && (
        <div className="absolute top-full mt-2 left-0 min-w-[140px] w-full bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-1">
            {statusOptions.map(opt => (
              <button
                type="button"
                key={opt.label}
                onClick={() => onChangeStatus(opt.label)}
                disabled={isUpdatingStatus}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between ${opt.label === currentActive ? 'font-bold text-[#0B1E40] bg-slate-50' : 'text-slate-600'}`}
              >
                {opt.label}
                {opt.label === currentActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-2 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ icon, iconBg, label, value, round }: { icon: React.ReactNode; iconBg: string; label: string; value: React.ReactNode; round?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-8 h-8 ${round ? 'rounded-full' : 'rounded-lg'} ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-xs font-bold text-[#0B1E40]">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function BookingDetailsHeader(props: BookingDetailsHeaderProps) {
  const { booking, canManageTransactions, isExporting, isGeneratingInvoice, onDelete, onExport, onGenerateInvoice } = props;

  return (
    <header className="shrink-0 sticky top-0 z-40 bg-[#F5F6F8] px-4 md:px-6 py-3 pb-2">
      <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-100 shadow-sm flex flex-col gap-2 relative">
        {/* Top row: ID and actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 text-orange-700 text-[10px] font-bold rounded-lg tracking-wider">
            <FolderOpen className="w-3 h-3" /> {booking.bookingNumber || shortBookingId(booking.id)}
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDelete}
              className="group flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-red-50 hover:px-3"
            >
              <Trash2 className="w-5 h-5 text-red-500 group-hover:text-red-600 shrink-0 transition-colors" />
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold text-sm text-red-600 whitespace-nowrap">
                Delete
              </span>
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={isExporting}
              className="group flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-white hover:border hover:border-slate-200 hover:shadow-sm hover:px-3 border border-transparent"
            >
              {isExporting ? spinner : <Upload className="w-5 h-5 text-slate-500 group-hover:text-slate-700 shrink-0 transition-colors" />}
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold text-sm text-slate-700 whitespace-nowrap">
                Export
              </span>
            </button>
            {canManageTransactions && (
              <button
                type="button"
                onClick={onGenerateInvoice}
                disabled={isGeneratingInvoice}
                className="group flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-[#0B1E40] hover:px-3"
              >
                {isGeneratingInvoice ? spinner : <Receipt className="w-5 h-5 text-slate-700 group-hover:text-white shrink-0 transition-colors" />}
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold text-sm text-white whitespace-nowrap">
                  Invoice
                </span>
              </button>
            )}
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-black text-[#0B1E40] tracking-tight">
          {booking.client?.name || booking.title || (booking.customData?.fld_b_client as string | undefined) || "Untitled Booking"}
        </h1>

        <div className="flex flex-wrap items-center gap-4 md:gap-5 pt-1">
          <MetaItem icon={<Tag className="w-4 h-4 text-purple-600" />} iconBg="bg-purple-50" label="Category" value={booking.category || "N/A"} />

          <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Shoot Date</p>
              <p className="text-xs font-bold text-[#0B1E40]">
                {booking.date ? new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A"}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-100" />

          <MetaItem round icon={<Clock className="w-4 h-4 text-purple-500" />} iconBg="bg-purple-50/50" label="Start Time" value={booking.time || "N/A"} />

          <div className="hidden md:block w-px h-6 bg-slate-100" />

          <MetaItem round icon={<MapPin className="w-4 h-4 text-red-500" />} iconBg="bg-red-50/50" label="Location" value={booking.location || "N/A"} />

          <div className="hidden md:block w-px h-6 bg-slate-100" />

          {/* Dynamic Status Display */}
          <StatusDisplay {...props} />
        </div>

        {booking.status === 'Cancelled' && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 w-full animate-fade-in-up">
            <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">Booking Cancelled</p>
              <p className="text-sm text-red-600 mt-1 leading-relaxed">
                This booking has linked transactions — cancelling will not auto-delete them. Manage manually in Daily Kanakku.
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
