"use client";

import { useState } from "react";
import { toast } from "sonner";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { useShops } from "@/components/providers/ShopProvider";
import { FieldError, Pill, RequiredMark, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/inventory/InventoryUI";
import { errorMessage, formatDate, sendJson } from "@/components/inventory/inventoryUtils";
import type { CableComplaint, CablePerson } from "@/types/cable";
import { cn } from "@/lib/utils";
import { useComplaints, useRevalidateCable } from "./useCableData";
import { daysSince } from "./cableShared";

/** Common faults, offered as one-tap choices (anything else can be typed). */
export const COMMON_ISSUES = ["No internet / LOS red light", "Slow speed", "Wi-Fi not working", "Cable cut", "Router / ONT problem", "No TV signal"];

const UNASSIGNED = "";
export const assigneeOptions = (people: CablePerson[]) => [{ label: "Not assigned", value: UNASSIGNED, icon: "ph-user-circle-dashed" }, ...people.map((p) => ({ label: p.name, value: p.id, icon: "ph-user" }))];

/** Log a fault for a subscriber and (optionally) give it to a line staff member. */
export default function ComplaintForm({ subscriberId, onDone }: { subscriberId: string; onDone: () => void }) {
  const { activeShopId } = useShops();
  const { data } = useComplaints(activeShopId, "open");
  const revalidate = useRevalidateCable();
  const [issue, setIssue] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedToId, setAssignedToId] = useState(UNASSIGNED);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!issue.trim()) return setError("Describe the problem.");
    setSaving(true);
    try {
      await sendJson(`/api/cable/subscribers/${encodeURIComponent(subscriberId)}/complaints`, "POST", { issue: issue.trim(), notes: notes.trim() || null, assignedToId: assignedToId || null });
      toast.success("Complaint logged");
      revalidate();
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      noValidate
      className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 space-y-3 animate-slide-down"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
        <i className="ph-bold ph-wrench text-amber-600" aria-hidden="true" /> Log complaint
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COMMON_ISSUES.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setIssue(i);
              setError(null);
            }}
            className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", issue === i ? "border-amber-300 bg-amber-100 text-amber-800" : "border-slate-200 bg-white text-slate-600 hover:border-amber-200")}
          >
            {i}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="complaint-issue" className={labelClass}>Problem <RequiredMark /></label>
        <input
          id="complaint-issue"
          value={issue}
          maxLength={200}
          onChange={(e) => {
            setIssue(e.target.value);
            setError(null);
          }}
          placeholder="What's wrong?"
          className={inputClass}
        />
        <FieldError message={error} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className={labelClass}>Assign to</span>
          <CustomDropdown options={assigneeOptions(data?.people ?? [])} value={assignedToId} onChange={setAssignedToId} />
        </div>
        <div>
          <label htmlFor="complaint-notes" className={labelClass}>Notes</label>
          <input id="complaint-notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={inputClass} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} disabled={saving} className={cn(secondaryButtonClass, "h-10")}>Cancel</button>
        <button type="submit" disabled={saving} className={cn(primaryButtonClass, "h-10")}>
          {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
          Save complaint
        </button>
      </div>
    </form>
  );
}

/** A complaint with its state; managers can reassign it and mark it fixed / reopen it. */
export function ComplaintRow({ complaint, canManage, people, subscriber }: { complaint: CableComplaint; canManage: boolean; people?: CablePerson[]; subscriber?: React.ReactNode }) {
  const revalidate = useRevalidateCable();
  const [busy, setBusy] = useState(false);
  const fixed = !!complaint.fixedAt;
  const patch = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    try {
      await sendJson(`/api/cable/complaints/${encodeURIComponent(complaint.id)}`, "PATCH", body);
      toast.success(done);
      revalidate();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const days = daysSince(complaint.createdAt);
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-3">
      <div className="min-w-0 flex-1">
        {subscriber}
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("text-sm font-bold truncate", fixed ? "text-slate-500" : "text-slate-900")}>{complaint.issue}</span>
          {fixed ? <Pill tone="green" icon="check">Fixed</Pill> : <Pill tone={days >= 2 ? "red" : "amber"}>{days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`}</Pill>}
        </div>
        <div className="text-[11px] font-semibold text-slate-400 truncate">
          {formatDate(complaint.createdAt)}
          {fixed && <> · fixed {formatDate(complaint.fixedAt)}</>}
          {!people && complaint.assignedToName && <> · {complaint.assignedToName}</>}
          {complaint.notes && <> · {complaint.notes}</>}
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-2 shrink-0">
          {people && !fixed && (
            <div className="w-44">
              <CustomDropdown options={assigneeOptions(people)} value={complaint.assignedToId ?? UNASSIGNED} onChange={(v) => void patch({ assignedToId: v || null }, "Complaint reassigned")} />
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void patch({ fixed: !fixed }, fixed ? "Complaint reopened" : "Marked fixed")}
            className={cn(fixed ? secondaryButtonClass : primaryButtonClass, "h-9 px-3 text-xs", !fixed && "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}
          >
            <i className={busy ? "ph ph-circle-notch animate-spin" : fixed ? "ph-bold ph-arrow-counter-clockwise" : "ph-bold ph-check"} aria-hidden="true" />
            {fixed ? "Reopen" : "Fixed"}
          </button>
        </div>
      )}
    </li>
  );
}
