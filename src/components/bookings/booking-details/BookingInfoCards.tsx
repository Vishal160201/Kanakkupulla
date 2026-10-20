import { FileText, Clock, UserCircle, Phone, Mail } from "lucide-react";
import type { BookingDetail, TeamUser } from "@/types/bookings";
import { shortBookingId } from "../layoutUtils";

/** Top strip: booking id, created/updated by, album designer. */
export function BookingInfoStrip({ booking, teamUsers, albumDesignerVal }: { booking: BookingDetail; teamUsers: TeamUser[]; albumDesignerVal: unknown }) {
  const designerId = albumDesignerVal as string | null | undefined;
  return (
    <div className="w-full bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-slate-100">
      <div className="flex items-center gap-4 w-full lg:px-4">
        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
          <FileText className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Booking ID</p>
          <p className="font-bold text-slate-800">{booking.bookingNumber || shortBookingId(booking.id)}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full lg:px-6">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
          <UserCircle className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Created By</p>
          <p className="font-bold text-slate-800">{booking.createdBy?.name || booking.createdBy?.email || 'N/A'}</p>
          <p className="text-xs text-slate-500">{new Date(booking.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full lg:px-6">
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
          <Clock className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Updated By</p>
          <p className="font-bold text-slate-800">{booking.updatedBy?.name || booking.updatedBy?.email || 'System'}</p>
          <p className="text-xs text-slate-500">{new Date(booking.updatedAt || booking.createdAt).toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full lg:px-6">
        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
          <UserCircle className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Album Designer</p>
          <p className="font-bold text-slate-800">{designerId ? teamUsers.find(u => u.id === designerId)?.name || designerId : "Unassigned"}</p>
        </div>
      </div>
    </div>
  );
}

function ClientInfoRow({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 w-full">
      <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{label}</p>
        <p className="font-bold text-slate-800 text-sm whitespace-pre-wrap break-words">{value}</p>
      </div>
    </div>
  );
}

export function ClientInfoCard({ booking }: { booking: BookingDetail }) {
  const cd = booking.customData as { fld_b_client?: string; fld_b_phone?: string; fld_b_email?: string };
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4">
        <UserCircle className="w-5 h-5 text-indigo-500" />
        <h3 className="font-bold text-[#0B1E40]">Client Info</h3>
      </div>
      <div className="space-y-5">
        <ClientInfoRow icon={<UserCircle className="w-4 h-4 text-indigo-500" />} iconBg="bg-indigo-50" label="Client Name"
          value={booking.client?.name || booking.title || cd?.fld_b_client || "N/A"} />
        <ClientInfoRow icon={<Phone className="w-4 h-4 text-emerald-500" />} iconBg="bg-emerald-50" label="Phone Number"
          value={booking.client?.phone || booking.phone || cd?.fld_b_phone || "N/A"} />
        <ClientInfoRow icon={<Mail className="w-4 h-4 text-blue-500" />} iconBg="bg-blue-50" label="Email Address"
          value={booking.client?.email || booking.email || cd?.fld_b_email || "N/A"} />
      </div>
    </div>
  );
}
