"use client";

import ShopIcon from "@/components/shops/ShopIcon";
import type { Shop } from "@/types/shops";
import type { AccessRole, TeamMember } from "@/types/settings";
import { ROLE_META } from "../roles/roleMeta";

interface AssignmentChipsProps {
  user: TeamMember;
  shops: Shop[];
  roles: AccessRole[];
}

/** "Owner" badge, or one "Shop · Role" chip per shop a member is assigned to. */
export default function AssignmentChips({ user, shops, roles }: AssignmentChipsProps) {
  if (user.role === "OWNER") {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${ROLE_META.OWNER.badge}`}>
        <i aria-hidden="true" className="ph-fill ph-crown" />
        Owner
      </span>
    );
  }

  const assignments = user.assignments ?? [];
  if (assignments.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-rose-200 bg-rose-50 text-[10px] font-extrabold text-rose-600">
        <i aria-hidden="true" className="ph-bold ph-warning" />
        No shop access
      </span>
    );
  }

  return (
    <span className="flex flex-wrap gap-1">
      {assignments.map((a) => {
        const shop = shops.find((s) => s.id === a.shopId);
        const role = roles.find((r) => r.id === a.roleId);
        const roleName = role?.name ?? ROLE_META[a.roleKey]?.label ?? a.roleKey;
        return (
          <span
            key={`${a.shopId}-${a.roleId}`}
            className={`inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-white text-[10px] font-bold text-slate-600 ${
              shop?.isArchived ? "opacity-60" : ""
            }`}
          >
            <span style={shop ? { color: shop.color } : undefined} className={shop ? "" : "text-slate-400"}>
              <ShopIcon icon={shop?.icon} />
            </span>
            <span className="truncate">{shop?.name ?? "Unknown shop"}</span>
            <span className="text-slate-300">&middot;</span>
            <span className={a.roleKey === "ADMIN" ? "text-indigo-600" : "text-sky-600"}>{roleName}</span>
          </span>
        );
      })}
    </span>
  );
}
