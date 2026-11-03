// Cable & internet shops: subscribers synced from the TIC Fiber portal and the money / complaints around them.

export interface CableSubscriberRow {
  id: string;
  provider: string;
  /** The portal's user id */
  externalId: string;
  name: string;
  phone: string | null;
  /** As the portal shows it: Active, Inactive, … */
  status: string;
  plan: string | null;
  area: string | null;
  expiresAt: string | null;
  renewedAt: string | null;
  /** Set when the subscriber no longer appears in the portal */
  goneAt: string | null;
  /** Renewal amounts minus payments; negative = paid in advance */
  due: number;
  openComplaints: number;
}

export interface CableShopInfo {
  name: string;
  upiId: string | null;
  contactPhone: string | null;
  walletBalance: number | null;
  walletSyncedAt: string | null;
  lowWalletAlert: number | null;
}

export interface CableSubscriberListResponse {
  subscribers: CableSubscriberRow[];
  syncedAt: string | null;
  hasSyncKey: boolean;
  shop: CableShopInfo;
}

export interface CableRenewal {
  id: string;
  plan: string | null;
  /** null until the plan has a price */
  amount: number | null;
  renewedAt: string | null;
  previousExpiry: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface CablePayment {
  id: string;
  amount: number;
  date: string;
  paymentMode: string;
  notes: string | null;
  voidedAt: string | null;
  collectedBy: string | null;
}

export interface CableComplaint {
  id: string;
  issue: string;
  notes: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  fixedAt: string | null;
  createdAt: string;
}

export interface CableSubscriberDetail extends Omit<CableSubscriberRow, "openComplaints"> {
  altPhone: string | null;
  macId: string | null;
  address: string | null;
  createdOn: string | null;
  activatedAt: string | null;
  renewals: CableRenewal[];
  payments: CablePayment[];
  complaints: CableComplaint[];
}

export interface CablePlan {
  id: string;
  name: string;
  price: number | null;
  subscribers: number;
}

export interface CablePerson {
  id: string;
  name: string;
}

export interface CableComplaintListItem extends CableComplaint {
  createdByName: string | null;
  subscriber: { id: string; name: string; externalId: string; phone: string | null; area: string | null };
}

export interface CableCollectionsResponse {
  payments: { id: string; amount: number; paymentMode: string; date: string; collectedBy: string; subscriber: { id: string; name: string; externalId: string; area: string | null } }[];
  total: number;
  byCollector: { name: string; amount: number }[];
}

export interface CableReport {
  months: { month: string; renewals: number; billed: number; collected: number; walletTopUps: number; margin: number }[];
  byPlan: { plan: string; renewals: number; billed: number }[];
  byArea: { area: string; collected: number }[];
  statusCounts: { status: string; count: number }[];
  removed: number;
}
