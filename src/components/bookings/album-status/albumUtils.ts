import type { AlbumBooking, AlbumCustomData, AlbumTeamUser } from "@/types/bookings";
import { parseCustomData } from "../layoutUtils";

export const ALBUM_STATUS_OPTIONS = [
  'Pending',
  'Designing',
  'Sent for printing',
  'Ready for delivery',
  'Delivered'
];

export const FILTER_TABS = ['Pending', 'Overdue', 'Designing', 'Sent for printing', 'Ready for delivery', 'Delivered', 'All'];

export const albumData = (a: Pick<AlbumBooking, 'customData'>) => parseCustomData<AlbumCustomData>(a.customData);

export const albumStatusOf = (cd: AlbumCustomData) => (cd.fld_b_album_status || '').trim().toLowerCase();

export const deliveryDateOf = (cd: AlbumCustomData) => cd.album_delivery_date || cd.delivery_date;

export const designerIdOf = (cd: AlbumCustomData) => cd.designer || cd.fld_b_photographers;

/** Past its delivery date and not yet delivered. */
export function isAlbumOverdue(cd: AlbumCustomData): boolean {
  const deliveryDateStr = deliveryDateOf(cd);
  if (deliveryDateStr) {
    const deliveryDate = new Date(deliveryDateStr);
    if (deliveryDate < new Date() && albumStatusOf(cd) !== 'delivered') return true;
  }
  return false;
}

export const formatShortDate = (value: string | Date) =>
  new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function formatShootDate(a: Pick<AlbumBooking, 'date'>): string {
  const bDate = a.date?.split('T')[0];
  return bDate ? formatShortDate(bDate) : '-';
}

export const albumDisplayId = (a: Pick<AlbumBooking, 'id' | 'bookingNumber'>) =>
  a.bookingNumber || `BK-${a.id.substring(a.id.length - 4).toUpperCase()}`;

export const designerName = (teamUsers: AlbumTeamUser[], designerId: string | undefined, fallback: string) => {
  const designerUser = teamUsers.find(u => u.id === designerId);
  return designerUser ? designerUser.name : (designerId || fallback);
};

export const designerOptions = (teamUsers: AlbumTeamUser[]) =>
  [{ label: "Unassigned", value: "" }, ...teamUsers.map(u => ({ label: u.name as string, value: u.id }))];

/** Status label, badge colour and progress (defaulting progress by stage when unset). */
export function albumStage(cd: AlbumCustomData) {
  const statusLabel = cd.fld_b_album_status || 'Pending';
  let statusColor = 'bg-slate-100 text-slate-700';
  let progress = parseInt(cd.album_progress || '0');
  const s = statusLabel.toLowerCase();

  if (s === 'designing') {
    statusColor = 'bg-orange-100 text-orange-700';
    if (progress === 0) progress = 25;
  } else if (s === 'sent for printing') {
    statusColor = 'bg-purple-100 text-purple-700';
    if (progress === 0) progress = 50;
  } else if (s === 'ready for delivery') {
    statusColor = 'bg-emerald-100 text-emerald-700';
    if (progress === 0) progress = 75;
  } else if (s === 'delivered') {
    statusColor = 'bg-blue-100 text-blue-700';
    if (progress === 0) progress = 100;
  }

  return { statusLabel, statusColor, progress };
}

/** Status dot colour used by the filter dropdown. */
export const tabDotClass = (tab: string) =>
  tab === 'Pending' ? 'bg-slate-400' :
  tab === 'Overdue' ? 'bg-red-500' :
  tab === 'Designing' ? 'bg-orange-500' :
  tab === 'Sent for printing' ? 'bg-purple-500' :
  tab === 'Ready for delivery' ? 'bg-emerald-500' :
  tab === 'Delivered' ? 'bg-blue-500' : 'bg-slate-800';
