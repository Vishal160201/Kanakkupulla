"use client";

import { useState } from "react";
import { toast } from "sonner";

interface InviteUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES = [
  { value: "STAFF", label: "Staff", description: "Can manage bookings and view transactions" },
  { value: "PHOTOGRAPHER", label: "Photographer", description: "Can view and manage galleries" },
  { value: "ADMIN", label: "Studio Admin", description: "Full access to all features" },
];

export default function InviteUserModal({ onClose, onSuccess }: InviteUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STAFF");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ tempPassword: string; userName: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite user");

      setResult({ tempPassword: data.tempPassword, userName: data.user.name });
      toast.success("User invited successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    if (result) {
      navigator.clipboard.writeText(result.tempPassword);
      toast.success("Password copied to clipboard");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-gray-100 w-full max-w-[440px] mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <i className="ph-fill ph-user-plus text-orange-500 text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {result ? "Invite Sent!" : "Invite Team Member"}
              </h3>
              <p className="text-xs text-slate-500">
                {result ? "Share these credentials" : "Add a new user to your studio"}
              </p>
            </div>
          </div>
          <button
            onClick={result ? onSuccess : onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <i className="ph ph-x text-lg"></i>
          </button>
        </div>

        {result ? (
          /* Success State */
          <div className="p-7">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <i className="ph-fill ph-check-circle text-green-600 text-lg"></i>
                <span className="font-semibold text-green-800 text-sm">User created successfully</span>
              </div>
              <p className="text-green-700 text-sm">
                <strong>{result.userName}</strong> has been added to your team.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                Temporary Password
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 font-mono text-sm text-slate-900 tracking-wider">
                  {result.tempPassword}
                </code>
                <button
                  onClick={handleCopyPassword}
                  className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  title="Copy password"
                >
                  <i className="ph ph-copy text-lg"></i>
                </button>
              </div>
              <p className="text-[0.7rem] text-slate-400 mt-2.5">
                Share this password securely. The user should change it after first login.
              </p>
            </div>

            <button
              onClick={onSuccess}
              className="w-full mt-5 bg-slate-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-7">
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arjun Kumar"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. arjun@studio.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Role Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                  Assign Role
                </label>
                <div className="space-y-2">
                  {ROLES.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        role === r.value
                          ? "border-orange-300 bg-orange-50 shadow-sm"
                          : "border-gray-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.value}
                        checked={role === r.value}
                        onChange={(e) => setRole(e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        role === r.value ? "border-orange-500" : "border-gray-300"
                      }`}>
                        {role === r.value && <div className="w-2 h-2 rounded-full bg-orange-500"></div>}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-900">{r.label}</span>
                        <p className="text-[0.7rem] text-slate-500">{r.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="ph-fill ph-paper-plane-tilt text-base"></i>
                    Send Invite
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
