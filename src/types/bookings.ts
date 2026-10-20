// Shared shapes for the bookings UI (layout schema from /api/settings/layouts/BOOKING_FORM,
// booking payloads from /api/bookings/*, and the album-status page).

/** Booking customData / other free-form JSON columns, once parsed into an object. */
export type CustomData = Record<string, unknown>;

export interface VisibilityRule {
  dependsOn?: string;
  fieldId?: string;
  operator?: string;
  values?: string[];
  value?: string;
}

export interface StatusOption {
  label: string;
  color?: string;
}

/** Layout options are normally plain strings, but older layouts store `{ label, value }` objects. */
export type FieldOption = string | { label: string; value?: string; color?: string };

export interface UserPicklistConfig {
  mode?: "ALL" | "ROLES" | "USERS";
  roles?: string[];
  userIds?: string[];
  showAvailability?: boolean;
}

export interface LayoutField {
  id: string;
  name: string;
  type?: string;
  mandatory?: boolean;
  options?: FieldOption[];
  statusOptions?: StatusOption[];
  placeholder?: string;
  defaultValue?: string;
  userPicklistConfig?: UserPicklistConfig;
  visibilityRule?: VisibilityRule | null;
  futureDateRestriction?: {
    enabled?: boolean;
    dateFieldId?: string;
    restrictedStatuses?: string[];
  };
  restrictFutureDate?: boolean;
  isRecordDate?: boolean;
}

export interface LayoutSection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  fields: LayoutField[];
  visibilityRule?: VisibilityRule | null;
}

export interface LayoutSchema {
  sections?: LayoutSection[];
}

/** Response of /api/settings/layouts/BOOKING_FORM. */
export interface LayoutResponse {
  schema?: LayoutSchema | null;
}

/** A user as returned by /api/users. */
export interface TeamUser {
  id: string;
  name: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

export interface BookingClient {
  id?: string;
  name: string;
  phone: string;
  email?: string | null;
}

export interface BookingOrder {
  id?: string;
  package: number;
  advance: number;
  due: number;
  installments?: unknown;
}

export interface BookingTransaction {
  id: string;
  amount: number;
  date: string;
  paymentMode?: string | null;
  description?: string | null;
  category?: string | null;
  deletedAt?: string | null;
}

/** A payment row in the booking form (one per advance installment). */
export interface Installment {
  amount: string;
  date: string;
  paymentMode: string;
  transactionId?: string;
}

/** /api/bookings/[id] response (JSON columns still raw). */
export interface BookingDetailResponse {
  id: string;
  bookingNumber?: string | null;
  title?: string;
  phone?: string;
  email?: string;
  category: string;
  date: string;
  time: string;
  location: string;
  status: string;
  galleryDelivered?: boolean;
  createdAt: string;
  updatedAt?: string;
  customData?: unknown;
  inclusions?: unknown;
  client?: BookingClient | null;
  order?: BookingOrder | null;
  transactions?: BookingTransaction[];
  createdBy?: { name?: string | null; email?: string | null } | null;
  updatedBy?: { name?: string | null; email?: string | null } | null;
}

/** Booking detail with customData/inclusions parsed. */
export interface BookingDetail extends Omit<BookingDetailResponse, "customData" | "inclusions"> {
  customData: CustomData;
  inclusions: unknown;
}

/** Row of the /api/bookings list (used for availability checks). */
export interface BookingListItem {
  id: string;
  date: string;
  time: string;
  customData?: CustomData | null;
}

/** Album-tracking keys the album-status page reads from customData. */
export interface AlbumCustomData extends CustomData {
  fld_b_album_status?: string;
  album_delivery_date?: string;
  delivery_date?: string;
  designer?: string;
  fld_b_photographers?: string;
  album_progress?: string;
  album_size?: string;
  album_pages?: string;
  fld_b_album_type?: string;
  album_type?: string;
  album_remarks?: string;
}

/** Booking row handed from the album-status server page to its client (customData JSON-encoded). */
export interface AlbumBooking {
  id: string;
  bookingNumber: string | null;
  category: string;
  date: string;
  status: string;
  customData: string;
  client: { name: string; phone: string } | null;
}

export interface AlbumTeamUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

export interface AlbumTrackingUpdates {
  status?: string;
  customData?: Record<string, string>;
}
