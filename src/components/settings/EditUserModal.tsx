"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface User {
  id: string;
  idNumber: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: "ADMIN" | "STAFF" | "PHOTOGRAPHER";
  status: "ACTIVE" | "PENDING" | "INACTIVE";
}

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
  isCurrentUser: boolean;
}

const ROLE_LABELS = {
  ADMIN: "Studio Admin",
  STAFF: "Staff",
  PHOTOGRAPHER: "Photographer",
};

const STATUS_LABELS = {
  ACTIVE: "Active",
  PENDING: "Pending",
  INACTIVE: "Inactive",
};

export default function EditUserModal({ user, onClose, onSuccess, isCurrentUser }: EditUserModalProps) {
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const roleRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) setRoleDropdownOpen(false);
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) setStatusDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, role, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update user");
      }
      toast.success("User updated successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isCurrentUser) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }
      toast.success("User deleted successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-visible bg-white rounded-2xl border border-gray-100 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 rounded-t-2xl">
          <DialogTitle className="text-xl font-bold text-slate-900">
            Edit Team Member
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Update user details, access roles, and status.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6 bg-slate-50/50 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {/* User ID (Readonly) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                User ID
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={`#MDuser-${String(user.idNumber).padStart(3, '0')}`}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 border border-gray-200 rounded-xl text-xs font-mono text-slate-900 font-bold cursor-not-allowed"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`#MDuser-${String(user.idNumber).padStart(3, '0')}`);
                    toast.success("User ID copied!");
                  }}
                  className="p-3 bg-white border border-gray-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
                  title="Copy User ID"
                >
                  <i className="ph ph-copy text-lg"></i>
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g. John Doe"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
              />
            </div>

            {/* Email (Readonly) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={user.email || ""}
                disabled
                className="w-full px-4 py-3 bg-slate-100 border border-gray-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Mobile Number (For WhatsApp)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="E.g. 919876543210"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Role Dropdown */}
              <div className="relative" ref={roleRef}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Role
                </label>
                <div 
                  onClick={() => !isCurrentUser && setRoleDropdownOpen(!roleDropdownOpen)}
                  className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm transition-all shadow-sm flex items-center justify-between ${isCurrentUser ? "bg-slate-100 cursor-not-allowed text-slate-500" : "cursor-pointer hover:border-orange-200"}`}
                >
                  <span className="font-medium">{ROLE_LABELS[role]}</span>
                  <i className={`ph ph-caret-down text-slate-400 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>
                {roleDropdownOpen && !isCurrentUser && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] py-1.5 animate-in fade-in zoom-in-95 duration-100">
                    {(Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>).map((r) => (
                      <div 
                        key={r} 
                        onClick={() => { setRole(r); setRoleDropdownOpen(false); }}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${role === r ? "bg-orange-50 text-orange-700 font-bold" : "hover:bg-slate-50 text-slate-700 font-medium"}`}
                      >
                        {ROLE_LABELS[r]}
                        {role === r && <i className="ph-fill ph-check text-orange-500"></i>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Dropdown */}
              <div className="relative" ref={statusRef}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Status
                </label>
                <div 
                  onClick={() => !isCurrentUser && setStatusDropdownOpen(!statusDropdownOpen)}
                  className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm transition-all shadow-sm flex items-center justify-between ${isCurrentUser ? "bg-slate-100 cursor-not-allowed text-slate-500" : "cursor-pointer hover:border-orange-200"}`}
                >
                  <span className="font-medium">{STATUS_LABELS[status]}</span>
                  <i className={`ph ph-caret-down text-slate-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>
                {statusDropdownOpen && !isCurrentUser && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] py-1.5 animate-in fade-in zoom-in-95 duration-100">
                    {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((s) => (
                      <div 
                        key={s} 
                        onClick={() => { setStatus(s); setStatusDropdownOpen(false); }}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${status === s ? "bg-orange-50 text-orange-700 font-bold" : "hover:bg-slate-50 text-slate-700 font-medium"}`}
                      >
                        {STATUS_LABELS[s]}
                        {status === s && <i className="ph-fill ph-check text-orange-500"></i>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isCurrentUser && (
            <div className="pt-4 border-t border-red-100">
              {showDeleteConfirm ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-900 mb-1">Are you absolutely sure?</p>
                  <p className="text-xs text-red-700 mb-3">This action cannot be undone. This will permanently delete the user account and remove their data from our servers.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting..." : "Yes, Delete User"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="flex-1 bg-white hover:bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-semibold cursor-pointer hover:bg-red-50 transition-colors"
                >
                  <i className="ph ph-trash text-lg"></i>
                  Remove User
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-white sm:justify-between items-center rounded-b-2xl">
          <button
            onClick={onClose}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving && <i className="ph ph-spinner animate-spin"></i>}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
