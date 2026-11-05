"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CableProvider, CableSubscriberRow } from "@/types/cable";
import { ConfirmDialog, EmptyState, FieldError, InventoryDialog, SearchInput, cardClass, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import CustomDropdown from "@/components/ui/CustomDropdown";
import PermissionTooltip from "@/components/shared/PermissionTooltip";
import Checkbox, { CheckboxMark } from "@/components/ui/Checkbox";
import { errorMessage, sendJson, useDebouncedValue } from "@/components/inventory/inventoryUtils";
import { cn } from "@/lib/utils";
import { useCanManageCable, useRevalidateCable } from "./useCableData";

const NO_GROUP = "No group";
const NEW_GROUP = "__new__";
/** Rows a list renders at once; search narrows the rest */
const SHOWN = 300;

const plural = (n: number) => `${n} subscriber${n === 1 ? "" : "s"}`;
const matchesSearch = (s: CableSubscriberRow, q: string) => !q || [s.name, s.tamilName, s.externalId, s.phone, s.vcNumber, s.oldVcNumber, s.area, s.groupName].some((v) => v?.toLowerCase().includes(q));

/** Puts subscribers in a group (null: out of their group). */
async function assignGroup(shopId: string, ids: string[], groupName: string | null) {
  return sendJson<{ moved: number }>("/api/cable/groups", "POST", { shopId, ids, groupName });
}

/** Renames a group for everyone in it (also merges it into an existing group of that name). */
export function RenameGroupDialog({ shopId, from, onClose }: { shopId: string; from: string; onClose: (renamedTo?: string) => void }) {
  const revalidate = useRevalidateCable();
  const [to, setTo] = useState(from);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const name = to.trim();
    if (!name) return setError("Enter the new name.");
    if (name === from) return onClose();
    setSaving(true);
    try {
      const r = await sendJson<{ renamed: number }>("/api/cable/groups", "PATCH", { shopId, from, to: name });
      toast.success(`Group renamed to ${name}`, { description: `${plural(r.renamed)} moved.` });
      revalidate();
      onClose(name);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <InventoryDialog
      open
      onClose={() => onClose()}
      busy={saving}
      size="sm"
      eyebrow="Subscriber group"
      title={`Rename ${from}`}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onClose()} disabled={saving} className={cn(secondaryButtonClass, "h-10")}>Cancel</button>
          <button type="submit" form="rename-group" disabled={saving} className={cn(primaryButtonClass, "h-10")}>
            {saving ? <i className="ph ph-circle-notch animate-spin" aria-hidden="true" /> : <i className="ph-bold ph-check" aria-hidden="true" />} Rename
          </button>
        </div>
      }
    >
      <form
        id="rename-group"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor="rename-group-input" className={labelClass}>New name</label>
        <input id="rename-group-input" autoFocus value={to} maxLength={60} onChange={(e) => setTo(e.target.value)} className={cn(inputClass, error && inputErrorClass)} aria-invalid={!!error} />
        <FieldError message={error} />
        <p className="mt-2 text-[11px] font-semibold text-slate-400">Using the name of another group merges the two.</p>
      </form>
    </InventoryDialog>
  );
}

/** Checkbox list of subscribers with search. */
function PickList({ subs, picked, onToggle, showGroup }: { subs: CableSubscriberRow[]; picked: Set<string>; onToggle: (ids: string[], on: boolean) => void; showGroup?: boolean }) {
  const shown = subs.slice(0, SHOWN);
  const allOn = shown.length > 0 && shown.every((s) => picked.has(s.id));
  return (
    <div>
      {shown.length > 0 && (
        <Checkbox
          checked={allOn}
          onChange={(on) => onToggle(shown.map((s) => s.id), on)}
          size="sm"
          className="px-3 py-2"
          labelClassName="text-[11px] font-extrabold uppercase tracking-[1.2px] text-slate-400"
          label={`Select all ${shown.length < subs.length ? `${shown.length} shown` : shown.length}`}
        />
      )}
      <ul className="space-y-0.5">
        {shown.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={picked.has(s.id)}
              onClick={() => onToggle([s.id], !picked.has(s.id))}
              className={cn("w-full text-left flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300", picked.has(s.id) && "bg-orange-50/60 hover:bg-orange-50")}
            >
              <CheckboxMark checked={picked.has(s.id)} size="sm" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-slate-800 truncate">
                  {s.name}
                  {s.tamilName && <span className="ml-1.5 font-semibold text-slate-500">{s.tamilName}</span>}
                </span>
                <span className="block text-[11px] font-semibold text-slate-400 truncate">{[s.oldVcNumber ?? s.vcNumber, s.externalId, s.phone].filter(Boolean).join(" · ")}</span>
              </span>
              {showGroup && <span className="shrink-0 text-[11px] font-bold text-slate-400">{s.groupName ?? NO_GROUP}</span>}
            </button>
          </li>
        ))}
      </ul>
      {subs.length > SHOWN && <p className="px-3 pt-2 text-[11px] font-semibold text-slate-400">Showing {SHOWN} of {subs.length}. Search to find the rest.</p>}
    </div>
  );
}

/** Adds subscribers to a group; with no group given, asks for a name first (a new group). */
function AddToGroupDialog({ shopId, group, subs, preselected, groups, onClose }: { shopId: string; group: string | null; subs: CableSubscriberRow[]; preselected?: string[]; groups: string[]; onClose: (savedTo?: string) => void }) {
  const revalidate = useRevalidateCable();
  const [name, setName] = useState(group ?? "");
  const [picked, setPicked] = useState(() => new Set(preselected));
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search).trim().toLowerCase();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Moving picked members into a new group: just the name, no list
  const fixedPick = !!preselected?.length;
  const candidates = subs.filter((s) => s.groupName !== group && matchesSearch(s, q));
  const toggle = (ids: string[], on: boolean) =>
    setPicked((p) => {
      const next = new Set(p);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  const save = async () => {
    const to = name.trim();
    if (!to) return setError("Enter the group name.");
    if (picked.size === 0) return setError("Pick at least one subscriber.");
    setSaving(true);
    try {
      const r = await assignGroup(shopId, [...picked], to);
      toast.success(`${plural(r.moved)} in ${to}`);
      revalidate();
      onClose(to);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <InventoryDialog
      open
      onClose={() => onClose()}
      busy={saving}
      size={fixedPick ? "sm" : "lg"}
      eyebrow="Subscriber group"
      title={group ? `Add to ${group}` : "New group"}
      subtitle={fixedPick ? `Moves ${plural(picked.size)} into it.` : "Subscribers already in another group move to this one."}
      footer={
        <div className="flex items-center justify-end gap-2">
          {!fixedPick && <span className="mr-auto text-sm font-bold text-slate-500">{picked.size} picked</span>}
          <button type="button" onClick={() => onClose()} disabled={saving} className={cn(secondaryButtonClass, "h-10")}>Cancel</button>
          <button type="submit" form="add-to-group" disabled={saving} className={cn(primaryButtonClass, "h-10")}>
            {saving ? <i className="ph ph-circle-notch animate-spin" aria-hidden="true" /> : <i className="ph-bold ph-check" aria-hidden="true" />} {group ? "Add" : "Create group"}
          </button>
        </div>
      }
    >
      <form
        id="add-to-group"
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {!group && (
          <div>
            <label htmlFor="new-group-name" className={labelClass}>Group name</label>
            <input id="new-group-name" autoFocus value={name} maxLength={60} placeholder="Eg. Street 4, Line B" onChange={(e) => setName(e.target.value)} className={cn(inputClass, error && !name.trim() && inputErrorClass)} />
            {groups.includes(name.trim()) && <p className="mt-2 text-[11px] font-semibold text-slate-400">{name.trim()} already exists: they join it.</p>}
          </div>
        )}
        {!fixedPick && (
          <div className="space-y-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, VC, ID, phone or group" autoFocus={!!group} />
            <div className="max-h-[50vh] overflow-y-auto -mx-1">
              {candidates.length === 0 ? <EmptyState icon="magnifying-glass" title="No subscribers to add" message={q ? `Nothing matches "${search.trim()}".` : "Everyone is in this group already."} /> : <PickList subs={candidates} picked={picked} onToggle={toggle} showGroup />}
            </div>
          </div>
        )}
        <FieldError message={error} />
      </form>
    </InventoryDialog>
  );
}

/** Area / line groups: who is in each, adding people, moving them between groups, renaming. */
export default function GroupingTab({ shopId, provider, subscribers }: { shopId: string; provider: CableProvider; subscribers: CableSubscriberRow[] }) {
  const canManage = useCanManageCable();
  const revalidate = useRevalidateCable();
  const all = subscribers.filter((s) => s.provider === provider);
  const sizes = new Map<string, number>();
  for (const s of all) if (s.groupName) sizes.set(s.groupName, (sizes.get(s.groupName) ?? 0) + 1);
  const groups = [...sizes.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const ungrouped = all.filter((s) => !s.groupName).length;

  const [current, setCurrent] = useState<string>(() => groups[0] ?? NO_GROUP);
  const group = current === NO_GROUP || sizes.has(current) ? current : (groups[0] ?? NO_GROUP);
  const isNone = group === NO_GROUP;
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search).trim().toLowerCase();
  const members = all.filter((s) => (isNone ? !s.groupName : s.groupName === group));
  const shown = members.filter((s) => matchesSearch(s, q));

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const pickedHere = members.filter((s) => picked.has(s.id)).map((s) => s.id);
  const toggle = (ids: string[], on: boolean) =>
    setPicked((p) => {
      const next = new Set(p);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  const open = (g: string) => {
    setCurrent(g);
    setPicked(new Set());
    setSearch("");
  };

  const [dialog, setDialog] = useState<{ kind: "add" | "new" | "rename" | "ungroup" } | { kind: "move-new"; ids: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const move = async (ids: string[], to: string | null) => {
    setBusy(true);
    try {
      const r = await assignGroup(shopId, ids, to);
      toast.success(to ? `${plural(r.moved)} moved to ${to}` : `${plural(r.moved)} taken out of ${group}`);
      setPicked(new Set());
      setDialog(null);
      await revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const groupButton = (g: string, count: number) => (
    <button
      key={g}
      type="button"
      onClick={() => open(g)}
      aria-pressed={group === g}
      className={cn(
        "w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors",
        group === g ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
        g === NO_GROUP && group !== g && "text-slate-400"
      )}
    >
      <span className="truncate">{g}</span>
      <span className={cn("shrink-0 text-xs font-extrabold", group === g ? "text-white/70" : "text-slate-400")}>{count}</span>
    </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 sm:gap-5 items-start">
      <div className={cn(cardClass, "p-3")}>
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <span className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-slate-400">Groups · {groups.length}</span>
          <PermissionTooltip allowed={canManage}>
            <button type="button" onClick={() => setDialog({ kind: "new" })} disabled={!canManage} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-50">
              <i className="ph-bold ph-plus" aria-hidden="true" /> New group
            </button>
          </PermissionTooltip>
        </div>
        <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
          {groups.map((g) => groupButton(g, sizes.get(g)!))}
          {groupButton(NO_GROUP, ungrouped)}
        </div>
      </div>

      <div className={cn(cardClass, "p-4 sm:p-5")}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-slate-900 truncate">{group}</h2>
            <p className="text-xs font-semibold text-slate-400">{isNone ? `${plural(members.length)} not in any group` : plural(members.length)}</p>
          </div>
          {canManage && !isNone && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setDialog({ kind: "add" })} className={primaryButtonClass}>
                <i className="ph-bold ph-user-plus" aria-hidden="true" /> Add subscribers
              </button>
              <button type="button" onClick={() => setDialog({ kind: "rename" })} className={secondaryButtonClass}>
                <i className="ph-bold ph-pencil-simple" aria-hidden="true" /> Rename
              </button>
              <button type="button" onClick={() => setDialog({ kind: "ungroup" })} aria-label={`Delete group ${group}`} title="Delete group" className={cn(secondaryButtonClass, "text-rose-600 hover:text-rose-700")}>
                <i className="ph-bold ph-trash" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {members.length > 0 && <SearchInput value={search} onChange={setSearch} placeholder="Search name, VC, ID or phone" />}

        {canManage && pickedHere.length > 0 && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-2">
            <span className="text-sm font-bold text-slate-700 sm:mr-auto">{pickedHere.length} selected</span>
            <div className="w-full sm:w-52">
              <CustomDropdown
                placeholder="Move to…"
                value=""
                options={[...groups.filter((g) => g !== group).map((g) => ({ value: g, label: g })), { value: NEW_GROUP, label: "New group…", icon: "plus" }]}
                onChange={(to) => (to === NEW_GROUP ? setDialog({ kind: "move-new", ids: pickedHere }) : void move(pickedHere, to))}
              />
            </div>
            {!isNone && (
              <button type="button" disabled={busy} onClick={() => void move(pickedHere, null)} className={cn(secondaryButtonClass, "h-[45px]")}>
                <i className="ph-bold ph-user-minus" aria-hidden="true" /> Remove from group
              </button>
            )}
          </div>
        )}

        <div className="mt-3">
          {members.length === 0 ? (
            <EmptyState icon="users-three" title={isNone ? "Everyone is in a group" : "No one in this group"} message={isNone ? "New subscribers from a sync show up here." : "Add subscribers to fill it."} />
          ) : shown.length === 0 ? (
            <EmptyState icon="magnifying-glass" title="No matching subscribers" message={`Nothing matches "${search.trim()}".`} />
          ) : canManage ? (
            <PickList subs={shown} picked={picked} onToggle={toggle} />
          ) : (
            <ul className="space-y-0.5">
              {shown.slice(0, SHOWN).map((s) => (
                <li key={s.id} className="px-3 py-2 text-sm font-bold text-slate-800">{s.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(dialog?.kind === "add" || dialog?.kind === "new" || dialog?.kind === "move-new") && (
        <AddToGroupDialog
          shopId={shopId}
          group={dialog.kind === "add" ? group : null}
          subs={all}
          groups={groups}
          preselected={dialog.kind === "move-new" ? dialog.ids : undefined}
          onClose={(to) => {
            setDialog(null);
            if (to) open(to);
          }}
        />
      )}
      {dialog?.kind === "rename" && (
        <RenameGroupDialog
          shopId={shopId}
          from={group}
          onClose={(to) => {
            setDialog(null);
            if (to) open(to);
          }}
        />
      )}
      <ConfirmDialog
        open={dialog?.kind === "ungroup"}
        title={`Delete ${group}?`}
        message={`Its ${plural(members.length)} move to No group. No subscriber is deleted.`}
        confirmLabel="Delete group"
        busyLabel="Deleting…"
        icon="trash"
        busy={busy}
        onConfirm={() => void move(members.map((s) => s.id), null)}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
