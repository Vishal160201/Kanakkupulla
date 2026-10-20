"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { RolesResponse, TeamMember } from "@/types/settings";
import OwnersOnlyState from "../common/OwnersOnlyState";
import { useIsOwner } from "../common/useIsOwner";
import NotificationGrid from "./NotificationGrid";
import PermissionGrid from "./PermissionGrid";
import RoleOverview from "./RoleOverview";
import SaveBar from "./SaveBar";
import { useRolesDraft } from "./useRolesDraft";

type Tab = "permissions" | "notifications";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "permissions", label: "Permissions", icon: "ph-shield-check" },
  { id: "notifications", label: "Notifications", icon: "ph-bell" },
];

function Tabs({ active, onChange, counts }: { active: Tab; onChange: (tab: Tab) => void; counts: Record<Tab, number> }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label="Roles settings" className="inline-flex w-full sm:w-auto rounded-2xl bg-slate-100 p-1">
      {TABS.map((tab, index) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`roles-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`roles-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const next = (index + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
              onChange(TABS[next].id);
              refs.current[next]?.focus();
            }}
            className={`flex-1 sm:flex-none h-10 px-4 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
              isActive ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <i aria-hidden="true" className={`${isActive ? "ph-fill" : "ph-bold"} ${tab.icon}`} />
            {tab.label}
            {counts[tab.id] > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-extrabold inline-flex items-center justify-center">
                {counts[tab.id]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[132px] rounded-2xl bg-white border border-slate-100 animate-pulse" />
        ))}
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-16 rounded-2xl bg-white border border-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

function RolesEditor() {
  const { data, error, isLoading, mutate } = useSWR<RolesResponse>("/api/roles", fetcher, { revalidateOnFocus: false });
  const { data: users } = useSWR<TeamMember[]>("/api/users", fetcher);
  const [tab, setTab] = useState<Tab>("permissions");
  const draft = useRolesDraft(data, () => mutate());

  const ownerCount = Array.isArray(users) ? users.filter((u) => u.role === "OWNER").length : null;

  if (isLoading && !data) return <LoadingState />;
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center">
        <p className="text-sm font-bold text-rose-700">Couldn&apos;t load roles</p>
        <p className="mt-1 text-xs font-medium text-rose-600">{error?.message || "Please try again."}</p>
        <button
          type="button"
          onClick={() => mutate()}
          className="mt-3 h-9 px-4 rounded-xl bg-white border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Tabs active={tab} onChange={setTab} counts={{ permissions: draft.permissionChanges, notifications: draft.notificationChanges }} />
      </div>

      {tab === "permissions" ? (
        <div id="roles-panel-permissions" role="tabpanel" aria-labelledby="roles-tab-permissions" className="space-y-4">
          <RoleOverview roles={draft.roles} ownerCount={ownerCount} draft={draft} />

          <div className="flex items-start gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
            <i aria-hidden="true" className="ph-bold ph-info text-indigo-500 text-lg mt-0.5 shrink-0" />
            <p className="text-xs font-semibold leading-relaxed text-indigo-900/80">
              Admin and Staff are given per shop in Users &amp; Team. Studio-wide modules use a person&apos;s highest role
              across their studio shops.
            </p>
          </div>

          <PermissionGrid roles={draft.roles} draft={draft} />

          <p className="px-1 text-[11px] font-semibold leading-relaxed text-slate-400">
            Settings, shops, users, layouts, integrations and permanent deletes in the Recycle Bin stay with Owners. Anyone
            who can manage Bookings can record booking advances, and anyone who can manage Gifts &amp; Frames can record
            gift-order payments.
          </p>
        </div>
      ) : (
        <div id="roles-panel-notifications" role="tabpanel" aria-labelledby="roles-tab-notifications" className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <i aria-hidden="true" className="ph-bold ph-bell-ringing text-orange-500 text-lg mt-0.5 shrink-0" />
            <p className="text-xs font-semibold leading-relaxed text-slate-600">
              Choose which roles get each alert. Admin and Staff alerts go to people holding that role in at least one
              shop. When reminders fire is set in Notification Preferences.
            </p>
          </div>
          <NotificationGrid roles={draft.roles} draft={draft} />
        </div>
      )}

      <SaveBar changeCount={draft.changeCount} isSaving={draft.isSaving} onDiscard={draft.discard} onSave={() => void draft.save()} />
    </>
  );
}

/** Settings → Roles & Permissions (owners only). */
export default function RolesPermissionsPage() {
  const { isOwner, isLoading } = useIsOwner();

  return (
    <div className="flex flex-col">
      <div className="mb-5">
        <h2 className="text-xl sm:text-[1.6rem] font-extrabold text-slate-900 tracking-tight">Roles &amp; Permissions</h2>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Decide what Admins and Staff can do in the shops they&apos;re given, and who gets which alerts.
        </p>
      </div>
      {isLoading ? <LoadingState /> : isOwner ? <RolesEditor /> : <OwnersOnlyState />}
    </div>
  );
}
