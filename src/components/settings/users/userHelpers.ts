import type { TeamMember, UserStatus } from "@/types/settings";

const AVATAR_COLORS = ["bg-[#1e293b]", "bg-[#0369a1]", "bg-[#15803d]", "bg-[#c2410c]", "bg-[#6d28d9]"];

export const avatarColorOf = (name: string | null) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const initialsOf = (name: string | null, fallback?: string | null) => {
  const source = (name || fallback || "").trim();
  if (!source) return "??";
  return source
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const userIdLabel = (user: Pick<TeamMember, "idNumber">) => `#MDuser-${String(user.idNumber).padStart(3, "0")}`;

export const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  PENDING: "Invited",
  INACTIVE: "Inactive",
};

export const STATUS_STYLES: Record<UserStatus, { dot: string; text: string; bg: string }> = {
  ACTIVE: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50 border-green-200" },
  PENDING: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  INACTIVE: { dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
};

/** Studio-level label: "Owner", or "Member" (access comes from shop roles). */
export const roleLabelOf = (user: Pick<TeamMember, "role">) => (user.role === "OWNER" ? "Owner" : "Member");

/** The personal-tracker account (NEXT_PUBLIC_PERSONAL_TRACKER_EMAIL) is the primary owner: only they can edit it. */
const PRIMARY_OWNER_EMAIL = process.env.NEXT_PUBLIC_PERSONAL_TRACKER_EMAIL;
export const isPrimaryOwner = (user: Pick<TeamMember, "email">) => !!PRIMARY_OWNER_EMAIL && user.email === PRIMARY_OWNER_EMAIL;

/** Body helper: API error text from a failed response. */
export async function readError(res: Response, fallback: string): Promise<{ message: string; errors?: Record<string, string> }> {
  const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: Record<string, string> };
  return { message: data.error || fallback, errors: data.errors };
}
