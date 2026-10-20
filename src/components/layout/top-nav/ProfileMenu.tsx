"use client";

import { useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useDismiss } from "./useDismiss";
import type { NotificationPreferences } from "./useNotificationPreferences";

export interface NavUser {
  name: string;
  email: string;
  role: string;
  initials: string;
  isStudioOwner: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Studio Owner",
  STAFF: "Staff",
  PHOTOGRAPHER: "Photographer",
};

interface ProfileMenuProps {
  user: NavUser;
  preferences: NotificationPreferences;
  /** Classes for the avatar trigger button (differs between the personal and studio headers). */
  buttonClassName: string;
}

export default function ProfileMenu({ user, preferences, buttonClassName }: ProfileMenuProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useDismiss(profileRef, () => setIsProfileOpen(false));
  const { emailNotifs, pushNotifs, toggleEmail, togglePush } = preferences;

  return (
    <div className="relative" ref={profileRef}>
      <button
        type="button"
        onClick={() => setIsProfileOpen(!isProfileOpen)}
        aria-label="Open profile menu"
        aria-expanded={isProfileOpen}
        className={buttonClassName}
      >
        {user.initials}
      </button>

      {isProfileOpen && (
        <>
          <div className="fixed inset-0 z-[45] md:hidden" aria-hidden="true" onClick={() => setIsProfileOpen(false)}></div>
          <div className="fixed md:absolute top-[80px] md:top-[calc(100%+10px)] left-4 right-4 md:left-auto md:right-0 md:w-[320px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 p-5 z-50 max-h-[calc(100dvh-100px)] md:max-h-[70dvh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-5 shrink-0">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <i className="ph ph-sign-out text-[1.1rem]"></i> Sign Out
              </button>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                aria-label="Close profile menu"
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className="ph ph-x text-[1.1rem]"></i>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0 relative">
                {user.isStudioOwner && (
                  <i className="ph-fill ph-crown absolute -top-1 -left-1 text-orange-400 text-sm bg-white rounded-full p-0.5 shadow-sm"></i>
                )}
                {user.initials}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex flex-col overflow-hidden w-full">
                <span className="font-bold text-[0.95rem] text-slate-900 leading-tight truncate">{user.name}</span>
                <span className="text-[0.75rem] text-slate-500 truncate">{user.email}</span>
                <span className="text-[0.65rem] text-slate-500 mt-1 truncate">Role: <strong className="text-slate-700">{ROLE_LABELS[user.role] || user.role}</strong></span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest">Notification Preferences</div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleEmail(); }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${emailNotifs ? 'bg-orange-50 text-orange-500 hover:bg-orange-100' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  title={emailNotifs ? "Disable Email Alerts" : "Enable Email Alerts"}
                  aria-label={emailNotifs ? "Disable Email Alerts" : "Enable Email Alerts"}
                  aria-pressed={emailNotifs}
                >
                  <i className={`text-[1.3rem] transition-transform duration-300 ${emailNotifs ? 'ph-fill ph-envelope-simple scale-110' : 'ph ph-envelope-simple'}`}></i>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePush();
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${pushNotifs ? 'bg-blue-50 text-blue-500 hover:bg-blue-100' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  title={pushNotifs ? "Disable Push Alerts" : "Enable Push Alerts"}
                  aria-label={pushNotifs ? "Disable Push Alerts" : "Enable Push Alerts"}
                  aria-pressed={pushNotifs}
                >
                  <i className={`text-[1.3rem] transition-transform duration-300 ${pushNotifs ? 'ph-fill ph-device-mobile scale-110' : 'ph ph-device-mobile'}`}></i>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
