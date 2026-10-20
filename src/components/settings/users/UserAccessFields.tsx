"use client";

import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import { Tooltip } from "@/components/ui/Tooltip";
import ShopIcon from "@/components/shops/ShopIcon";
import { shopTypeOf } from "@/components/providers/ShopProvider";
import { SHOP_TYPE_GROUPS, SHOP_TYPE_LABELS } from "@/lib/shopModules";
import type { Shop } from "@/types/shops";
import type { AccessRole } from "@/types/settings";
import Switch from "../common/Switch";
import { ROLE_META } from "../roles/roleMeta";

/** shopId -> roleId (missing = no access). */
export type AssignmentDraft = Record<string, string>;

interface UserAccessFieldsProps {
  isOwner: boolean;
  onOwnerChange: (next: boolean) => void;
  /** When set, the Owner switch is locked and this explains why. */
  ownerLockedReason?: string;
  shops: Shop[];
  roles: AccessRole[];
  isLoadingOptions?: boolean;
  optionsError?: boolean;
  assignments: AssignmentDraft;
  onAssign: (shopId: string, roleId: string) => void;
  error?: string;
  disabled?: boolean;
}

const GROUP_LABELS: Record<"STUDIO" | "OTHERS", string> = { STUDIO: "Studio", OTHERS: "Others" };

/** Owner switch + "Access by shop" role pickers, shared by the invite and edit dialogs. */
export default function UserAccessFields({
  isOwner,
  onOwnerChange,
  ownerLockedReason,
  shops,
  roles,
  isLoadingOptions,
  optionsError,
  assignments,
  onAssign,
  error,
  disabled,
}: UserAccessFieldsProps) {
  const activeShops = shops.filter((s) => !s.isArchived);
  const groups = (["STUDIO", "OTHERS"] as const)
    .map((group) => ({ group, shops: activeShops.filter((s) => SHOP_TYPE_GROUPS[shopTypeOf(s)] === group) }))
    .filter((g) => g.shops.length > 0);

  const options: DropdownOption[] = [
    { label: "No access", value: "", icon: "prohibit" },
    ...roles.map((r) => ({ label: r.name, value: r.id, icon: ROLE_META[r.key]?.icon ?? "user", hint: ROLE_META[r.key] ? undefined : r.key })),
  ];
  const assignedCount = activeShops.filter((s) => assignments[s.id]).length;

  return (
    <div className="space-y-3">
      {/* Owner */}
      <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${isOwner ? "border-orange-200 bg-orange-50/60" : "border-slate-200 bg-white"}`}>
        <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${isOwner ? ROLE_META.OWNER.tile : "bg-slate-100 text-slate-400"}`}>
          <i aria-hidden="true" className="ph-bold ph-crown" />
        </span>
        <span className="min-w-0 flex-1">
          <span id="owner-switch-label" className="block text-sm font-extrabold text-slate-900">Owner</span>
          <span className="block text-[11px] font-semibold text-slate-500">Full access to everything, in every shop</span>
        </span>
        <Tooltip content={ownerLockedReason}>
          <span className="inline-flex">
            <Switch checked={isOwner} onChange={onOwnerChange} label="Owner: full access to everything" locked={!!ownerLockedReason} disabled={disabled} />
          </span>
        </Tooltip>
      </div>

      {/* Access by shop */}
      {!isOwner && (
        <div>
          <div className="flex items-end justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Access by shop</span>
            <span className="text-[11px] font-semibold text-slate-400">
              {assignedCount} of {activeShops.length} shops
            </span>
          </div>

          <div className={`rounded-2xl border bg-white overflow-hidden ${error ? "border-rose-300" : "border-slate-200"}`}>
            {isLoadingOptions ? (
              <div className="p-3 space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-slate-50 animate-pulse" />
                ))}
              </div>
            ) : optionsError ? (
              <p className="p-4 text-center text-sm font-semibold text-rose-600">Couldn&apos;t load shops or roles. Close and try again.</p>
            ) : activeShops.length === 0 ? (
              <p className="p-4 text-center text-sm font-semibold text-slate-500">Add a shop in Settings → Shops first.</p>
            ) : (
              groups.map(({ group, shops: groupShops }) => (
                <div key={group}>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{GROUP_LABELS[group]}</div>
                  <ul className="divide-y divide-slate-50">
                    {groupShops.map((shop) => (
                      <li key={shop.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span
                          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm text-white shadow-sm"
                          style={{ backgroundColor: shop.color }}
                        >
                          <ShopIcon icon={shop.icon} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-800">{shop.name}</span>
                          <span className="block text-[10px] font-semibold text-slate-400">{SHOP_TYPE_LABELS[shopTypeOf(shop)]}</span>
                        </span>
                        <div className="w-[136px] sm:w-[160px] shrink-0">
                          <CustomDropdown
                            options={options}
                            value={assignments[shop.id] ?? ""}
                            onChange={(roleId) => onAssign(shop.id, roleId)}
                            placeholder="No access"
                            className="[&>button]:h-10 [&>button]:text-sm [&>button]:px-3"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
          {error ? (
            <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1">
              <i aria-hidden="true" className="ph-bold ph-warning-circle" />
              {error}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] font-medium text-slate-400">
              Members only see the shops they&apos;re given. What Admin and Staff can do is set in Roles &amp; Permissions.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
