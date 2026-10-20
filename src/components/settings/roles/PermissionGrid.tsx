"use client";

import { useState } from "react";
import { ACCESS_MODULES, type AccessModule } from "@/lib/access";
import { Tooltip } from "@/components/ui/Tooltip";
import type { AccessRole } from "@/types/settings";
import LevelControl from "./LevelControl";
import { LEVEL_LABELS, ROLE_META, SCOPE_HINTS, SCOPE_LABELS, pluralize } from "./roleMeta";
import type { RolesDraft } from "./useRolesDraft";

interface PermissionGridProps {
  roles: AccessRole[];
  draft: RolesDraft;
}

const SCOPE_STYLES: Record<AccessModule["appliesTo"], string> = {
  studio: "bg-indigo-50 text-indigo-600",
  shop: "bg-lime-50 text-lime-700",
  all: "bg-slate-100 text-slate-500",
};

function ScopeTag({ module }: { module: AccessModule }) {
  return (
    <Tooltip content={SCOPE_HINTS[module.appliesTo]}>
      <span
        tabIndex={0}
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${SCOPE_STYLES[module.appliesTo]}`}
      >
        {SCOPE_LABELS[module.appliesTo]}
      </span>
    </Tooltip>
  );
}

function ModuleLabel({ module }: { module: AccessModule }) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-9 h-9 shrink-0 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
        <i aria-hidden="true" className={`ph-bold ph-${module.icon} text-base`} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-bold text-slate-900">{module.label}</span>
          <ScopeTag module={module} />
        </div>
        <p className="text-[11px] font-medium leading-snug text-slate-400 mt-0.5">{module.description}</p>
      </div>
    </div>
  );
}

/** What an Owner has for a module: the highest level it supports. */
function OwnerLevel({ module }: { module: AccessModule }) {
  return (
    <Tooltip content="Owners always have full access">
      <span
        tabIndex={0}
        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl bg-orange-50 text-orange-600 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
      >
        <i aria-hidden="true" className="ph-fill ph-lock-simple text-[11px]" />
        {LEVEL_LABELS[module.levels[module.levels.length - 1]]}
      </span>
    </Tooltip>
  );
}

function ChangedDot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white">
      <span className="sr-only">Unsaved change</span>
    </span>
  );
}

function RoleHeading({ label, icon, badge }: { label: string; icon: string; badge: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${badge}`}>
      <i aria-hidden="true" className={`ph-bold ph-${icon}`} />
      {label}
    </span>
  );
}

/** Wide table for large screens. */
function DesktopGrid({ roles, draft }: PermissionGridProps) {
  return (
    <div className="hidden xl:block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            <th scope="col" className="text-left px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Module
            </th>
            <th scope="col" className="px-3 py-3 text-left w-[110px]">
              <RoleHeading label="Owner" icon={ROLE_META.OWNER.icon} badge={ROLE_META.OWNER.badge} />
            </th>
            {roles.map((role) => (
              <th key={role.id} scope="col" className="px-3 py-3 text-left w-[230px]">
                <RoleHeading label={role.name} icon={ROLE_META[role.key].icon} badge={ROLE_META[role.key].badge} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {ACCESS_MODULES.map((module) => (
            <tr key={module.key} className="hover:bg-slate-50/40 transition-colors">
              <th scope="row" className="px-5 py-3.5 text-left font-normal">
                <ModuleLabel module={module} />
              </th>
              <td className="px-3 py-3.5">
                <OwnerLevel module={module} />
              </td>
              {roles.map((role) => (
                <td key={role.id} className="px-3 py-3.5">
                  <span className="relative inline-flex">
                    <LevelControl
                      levels={module.levels}
                      value={draft.levelOf(role.id, module.key)}
                      onChange={(level) => draft.setLevel(role.id, module.key, level)}
                      label={`${role.name}: ${module.label}`}
                      disabled={draft.isSaving}
                    />
                    <ChangedDot show={draft.isLevelChanged(role.id, module.key)} />
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Per-role accordions for phones and narrow layouts. */
function MobileGrid({ roles, draft }: PermissionGridProps) {
  // undefined = never toggled: the first role starts open.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [ownerOpen, setOwnerOpen] = useState(false);

  return (
    <div className="xl:hidden space-y-3">
      {/* Owner: locked, shown for reference */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          aria-expanded={ownerOpen}
          onClick={() => setOwnerOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        >
          <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${ROLE_META.OWNER.tile}`}>
            <i aria-hidden="true" className={`ph-bold ph-${ROLE_META.OWNER.icon}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">Owner</span>
              <i aria-hidden="true" className="ph-fill ph-lock-simple text-xs text-slate-400" />
            </span>
            <span className="block text-[11px] font-semibold text-slate-400">Full access to every module · can&apos;t be changed</span>
          </span>
          <i aria-hidden="true" className={`ph-bold ph-caret-down text-slate-400 transition-transform ${ownerOpen ? "rotate-180" : ""}`} />
        </button>
        {ownerOpen && (
          <ul className="border-t border-slate-100 divide-y divide-slate-50">
            {ACCESS_MODULES.map((module) => (
              <li key={module.key} className="flex items-center justify-between gap-3 px-4 py-3">
                <ModuleLabel module={module} />
                <OwnerLevel module={module} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {roles.map((role, index) => {
        const isOpen = expanded[role.id] ?? index === 0;
        const meta = ROLE_META[role.key];
        const enabled = ACCESS_MODULES.filter((m) => draft.levelOf(role.id, m.key) !== "NONE").length;
        const changes = ACCESS_MODULES.filter((m) => draft.isLevelChanged(role.id, m.key)).length;
        const panelId = `role-panel-${role.id}`;
        return (
          <div key={role.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setExpanded((prev) => ({ ...prev, [role.id]: !isOpen }))}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${meta.tile}`}>
                <i aria-hidden="true" className={`ph-bold ph-${meta.icon}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900">{role.name}</span>
                  {changes > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-600">
                      {pluralize(changes, "change")}
                    </span>
                  )}
                </span>
                <span className="block text-[11px] font-semibold text-slate-400">
                  {enabled} of {ACCESS_MODULES.length} modules enabled
                </span>
              </span>
              <i aria-hidden="true" className={`ph-bold ph-caret-down text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <ul id={panelId} className="border-t border-slate-100 divide-y divide-slate-50">
                {ACCESS_MODULES.map((module) => (
                  <li key={module.key} className="px-4 py-3 space-y-2.5">
                    <ModuleLabel module={module} />
                    <div className="relative">
                      <LevelControl
                        fullWidth
                        levels={module.levels}
                        value={draft.levelOf(role.id, module.key)}
                        onChange={(level) => draft.setLevel(role.id, module.key, level)}
                        label={`${role.name}: ${module.label}`}
                        disabled={draft.isSaving}
                      />
                      <ChangedDot show={draft.isLevelChanged(role.id, module.key)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Modules x roles access grid: a table on wide screens, accordions below. */
export default function PermissionGrid(props: PermissionGridProps) {
  return (
    <>
      <DesktopGrid {...props} />
      <MobileGrid {...props} />
    </>
  );
}
