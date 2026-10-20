// Shared shapes for the Settings area (layouts builder, team, recycle bin,
// system preferences, integrations).

export type UserRole = "ADMIN" | "STAFF" | "PHOTOGRAPHER";
export type UserStatus = "ACTIVE" | "PENDING" | "INACTIVE";

// ---------------------------------------------------------------------------
// Form layouts (stored as JSON in the DB; shape enforced by the builder UI)
// ---------------------------------------------------------------------------

export type VisibilityOperator = "EQUALS" | "NOT_EQUALS" | "CONTAINS";

export interface VisibilityRule {
  fieldId: string;
  operator: VisibilityOperator;
  values?: string[];
  /** Legacy single-value rules saved before `values` existed. */
  value?: string;
}

export interface StatusOption {
  label: string;
  color: string;
}

export interface UserPicklistConfig {
  mode: "ALL" | "ROLES" | "USERS";
  roles?: string[];
  userIds?: string[];
  showAvailability?: boolean;
}

export interface FutureDateRestriction {
  enabled: boolean;
  dateFieldId: string;
  restrictedStatuses: string[];
}

export interface FormField {
  id: string;
  name: string;
  type: string;
  mandatory: boolean;
  options?: string[];
  statusOptions?: StatusOption[];
  placeholder?: string;
  defaultValue?: string;
  userPicklistConfig?: UserPicklistConfig;
  visibilityRule?: VisibilityRule;
  futureDateRestriction?: FutureDateRestriction;
  restrictFutureDate?: boolean;
  isRecordDate?: boolean;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  fields: FormField[];
  locked?: boolean;
  visibilityRule?: VisibilityRule;
}

export interface FormSchema {
  sections: FormSection[];
}

export interface FormLayout {
  id?: string;
  formKey: string;
  name: string;
  description: string;
  schema: FormSchema;
}

export interface FieldTypeDef {
  value: string;
  label: string;
  icon: string;
}

/** Minimal user shape returned by GET /api/users, used by pickers. */
export interface UserOption {
  id: string;
  name: string | null;
  role: string;
}

// ---------------------------------------------------------------------------
// Team management
// ---------------------------------------------------------------------------

export interface TeamMember {
  id: string;
  idNumber: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  invitedAt?: string | null;
  tempPassword?: string;
}

// ---------------------------------------------------------------------------
// Recycle bin (GET /api/recycle-bin)
// ---------------------------------------------------------------------------

export interface PersonalExpenseSnapshot {
  date: string;
  title: string;
  category: string;
  type?: string;
  amount?: number;
}

export interface RecycleBinItem<TOriginal = unknown> {
  id: string;
  itemType: string;
  itemId: string;
  transactionId: string;
  originalType: string;
  entryName: string;
  trashedBy: string;
  trashedAt: string;
  originalData: TOriginal;
}

export interface RecycleBinResponse<TOriginal = unknown> {
  items: RecycleBinItem<TOriginal>[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// System preferences (GET/PUT /api/settings/system)
// ---------------------------------------------------------------------------

export interface CalendarTier {
  max: number;
  bg: string;
  text: string;
}

export interface UiPreferences {
  currencySymbol: string;
  hotDateBenchmark?: number;
  calendarTiers: CalendarTier[];
  /** Other keys are preserved and saved back untouched. */
  [key: string]: unknown;
}

export interface SystemSettingEntry {
  key: string;
  value: unknown;
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export interface WhatsAppStatus {
  status?: string;
  pairingCode?: string;
  qrCode?: string;
  error?: string;
}
