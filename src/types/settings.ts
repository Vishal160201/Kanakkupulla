// Shared shapes for the Settings area (layouts builder, team, roles, recycle bin,
// system preferences, integrations).

import type { NotificationTypeKey, PermissionMap, RoleKey } from "@/lib/access";

/** Studio-level role on the user record. Owners can do everything; members get access per shop. */
export type UserRole = "OWNER" | "MEMBER";
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
  /** UserRole values ("OWNER" / "MEMBER"). Older layouts may still hold ADMIN / STAFF / PHOTOGRAPHER. */
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

/** One shop a member can open, and the role they have there. */
export interface UserShopAssignment {
  shopId: string;
  roleId: string;
  roleKey: RoleKey;
}

/** Body item for POST /api/users and PUT /api/users/[id]. */
export interface UserAssignmentInput {
  shopId: string;
  roleId: string;
}

/** GET /api/users row. `assignments` / `tempPassword` are sent to owners only. */
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
  assignments?: UserShopAssignment[];
}

/** POST /api/users */
export interface CreateUserInput {
  name: string;
  email: string;
  phone?: string;
  isOwner: boolean;
  assignments: UserAssignmentInput[];
}

/** PUT /api/users/[id] */
export interface UpdateUserInput {
  name?: string;
  phone?: string;
  status?: UserStatus;
  isOwner?: boolean;
  assignments?: UserAssignmentInput[];
}

// ---------------------------------------------------------------------------
// Roles & permissions (GET /api/roles, PUT /api/roles/[id], PUT /api/roles/owner)
// ---------------------------------------------------------------------------

/** Which roles receive which alerts. A missing type falls back to the role's default. */
export type NotificationRules = Partial<Record<NotificationTypeKey, boolean>>;

/** A per-shop role (Admin / Staff) with its editable permission grid. */
export interface AccessRole {
  id: string;
  key: RoleKey;
  name: string;
  description: string | null;
  permissions: PermissionMap;
  notifications: NotificationRules;
  /** How many (user, shop) assignments use this role. */
  assignmentCount: number;
}

export interface RolesResponse {
  roles: AccessRole[];
  owner: { notifications: NotificationRules };
}

export interface UpdateRoleInput {
  permissions?: PermissionMap;
  notifications?: NotificationRules;
  description?: string;
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
