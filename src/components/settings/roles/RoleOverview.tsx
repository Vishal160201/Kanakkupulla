"use client";

import { ACCESS_MODULES } from "@/lib/access";
import type { AccessRole } from "@/types/settings";
import { ROLE_META, pluralize } from "./roleMeta";
import type { RolesDraft } from "./useRolesDraft";

interface RoleOverviewProps {
  roles: AccessRole[];
  /** null while the user list is loading. */
  ownerCount: number | null;
  draft: RolesDraft;
}

function Card({
  icon,
  tile,
  title,
  badge,
  description,
  footer,
}: {
  icon: string;
  tile: string;
  title: string;
  badge?: React.ReactNode;
  description: string;
  footer: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col gap-3 min-w-0">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg shadow-sm ${tile}`}>
          <i aria-hidden="true" className={`ph-bold ph-${icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
            {badge}
          </div>
          <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-500">
        {footer}
      </div>
    </div>
  );
}

/** Owner / Admin / Staff summary cards above the permission grid. */
export default function RoleOverview({ roles, ownerCount, draft }: RoleOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      <Card
        icon={ROLE_META.OWNER.icon}
        tile={ROLE_META.OWNER.tile}
        title="Owner"
        badge={
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
            <i aria-hidden="true" className="ph-fill ph-lock-simple" /> Locked
          </span>
        }
        description={ROLE_META.OWNER.description}
        footer={
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className="ph-bold ph-users text-slate-400" />
            {ownerCount === null ? "Counting…" : pluralize(ownerCount, "owner")}
          </span>
        }
      />
      {roles.map((role) => {
        const meta = ROLE_META[role.key];
        const enabled = ACCESS_MODULES.filter((m) => draft.levelOf(role.id, m.key) !== "NONE").length;
        return (
          <Card
            key={role.id}
            icon={meta.icon}
            tile={meta.tile}
            title={role.name}
            description={role.description || meta.description}
            footer={
              <>
                <span className="inline-flex items-center gap-1.5">
                  <i aria-hidden="true" className="ph-bold ph-storefront text-slate-400" />
                  {role.assignmentCount === 0 ? "Not assigned yet" : pluralize(role.assignmentCount, "shop assignment")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i aria-hidden="true" className="ph-bold ph-squares-four text-slate-400" />
                  {enabled} of {ACCESS_MODULES.length} modules
                </span>
              </>
            }
          />
        );
      })}
    </div>
  );
}
