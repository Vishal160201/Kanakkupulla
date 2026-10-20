"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Shop } from "@/types/shops";
import type { AccessRole, CreateUserInput } from "@/types/settings";
import UserAccessFields, { type AssignmentDraft } from "./users/UserAccessFields";
import { readError } from "./users/userHelpers";

interface InviteUserModalProps {
  shops: Shop[];
  roles: AccessRole[];
  isLoadingOptions: boolean;
  optionsError: boolean;
  onClose: () => void;
  /** Called after the invite went through (refresh the team list). */
  onSuccess: () => void;
}

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "assignments", string>>;

const inputClass =
  "w-full px-4 py-2.5 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all";
const labelClass = "text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
      <i aria-hidden="true" className="ph-bold ph-warning-circle" />
      {message}
    </p>
  );
}

export default function InviteUserModal({ shops, roles, isLoadingOptions, optionsError, onClose, onSuccess }: InviteUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentDraft>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ tempPassword: string; userName: string } | null>(null);

  const activeShopIds = new Set(shops.filter((s) => !s.isArchived).map((s) => s.id));

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Enter a name";
    if (!email.trim()) next.email = "Enter an email address";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email address";
    if (!isOwner && !Object.entries(assignments).some(([shopId, roleId]) => roleId && activeShopIds.has(shopId))) {
      next.assignments = "Give access to at least one shop, or make them an Owner";
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body: CreateUserInput = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      isOwner,
      assignments: isOwner
        ? []
        : Object.entries(assignments)
            .filter(([shopId, roleId]) => roleId && activeShopIds.has(shopId))
            .map(([shopId, roleId]) => ({ shopId, roleId })),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { message, errors: serverErrors } = await readError(res, "Failed to invite user");
        if (serverErrors) setErrors(serverErrors as FieldErrors);
        toast.error(message);
        return;
      }
      const data = (await res.json()) as { tempPassword: string; user: { name: string | null } };
      setResult({ tempPassword: data.tempPassword, userName: data.user?.name || name.trim() });
      toast.success("User invited");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.tempPassword);
    toast.success("Password copied to clipboard");
  };

  const close = result ? onSuccess : onClose;

  return (
    <Dialog open onOpenChange={(open) => !open && !submitting && close()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-[520px] rounded-3xl border-0 bg-white p-0 shadow-2xl gap-0 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]"
      >
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-orange-50 flex items-center justify-center">
              <i aria-hidden="true" className={`ph-fill ${result ? "ph-check-circle" : "ph-user-plus"} text-orange-500 text-xl`} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-extrabold text-slate-900">{result ? "Invite sent" : "Invite team member"}</DialogTitle>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{result ? "Share these credentials" : "Add someone and choose what they can open"}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            disabled={submitting}
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <i aria-hidden="true" className="ph-bold ph-x" />
          </button>
        </div>

        {result ? (
          <div className="p-5 sm:p-6 overflow-y-auto">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <p className="text-green-800 text-sm font-semibold">
                <strong>{result.userName}</strong> has been added to your team.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Temporary password</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate bg-white border border-slate-200 rounded-lg px-4 py-2.5 font-mono text-sm text-slate-900 tracking-wider">
                  {result.tempPassword}
                </code>
                <Tooltip content="Copy password">
                  <button
                    type="button"
                    aria-label="Copy password"
                    onClick={copyPassword}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    <i aria-hidden="true" className="ph ph-copy text-lg" />
                  </button>
                </Tooltip>
              </div>
              <p className="text-[0.7rem] text-slate-400 mt-2.5">Share this password securely. They should change it after the first login.</p>
            </div>
            <button
              type="button"
              onClick={onSuccess}
              className="w-full mt-5 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col min-h-0">
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="invite-name" className={labelClass}>Full name</label>
                <input
                  id="invite-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arjun Kumar"
                  aria-invalid={!!errors.name}
                  className={`${inputClass} ${errors.name ? "border-rose-400" : "border-slate-200"}`}
                  autoFocus
                />
                <FieldError message={errors.name} />
              </div>
              <div>
                <label htmlFor="invite-email" className={labelClass}>Email address</label>
                <input
                  id="invite-email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. arjun@studio.com"
                  aria-invalid={!!errors.email}
                  className={`${inputClass} ${errors.email ? "border-rose-400" : "border-slate-200"}`}
                />
                <FieldError message={errors.email} />
              </div>
              <div>
                <label htmlFor="invite-phone" className={labelClass}>Mobile number (for WhatsApp)</label>
                <input
                  id="invite-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 919876543210"
                  aria-invalid={!!errors.phone}
                  className={`${inputClass} ${errors.phone ? "border-rose-400" : "border-slate-200"}`}
                />
                <FieldError message={errors.phone} />
              </div>

              <UserAccessFields
                isOwner={isOwner}
                onOwnerChange={(next) => {
                  setIsOwner(next);
                  setErrors((prev) => ({ ...prev, assignments: undefined }));
                }}
                shops={shops}
                roles={roles}
                isLoadingOptions={isLoadingOptions}
                optionsError={optionsError}
                assignments={assignments}
                onAssign={(shopId, roleId) => {
                  setAssignments((prev) => ({ ...prev, [shopId]: roleId }));
                  if (roleId) setErrors((prev) => ({ ...prev, assignments: undefined }));
                }}
                error={errors.assignments}
                disabled={submitting}
              />
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? <i aria-hidden="true" className="ph ph-circle-notch animate-spin" /> : <i aria-hidden="true" className="ph-fill ph-paper-plane-tilt" />}
                {submitting ? "Creating…" : "Send invite"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
