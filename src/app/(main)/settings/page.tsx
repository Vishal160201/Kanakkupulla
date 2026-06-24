"use client";

import { useState } from "react";
import UserManagement from "@/components/settings/UserManagement";
import RolesPermissions from "@/components/settings/RolesPermissions";
import LayoutsFieldsBuilder from "@/components/settings/LayoutsFieldsBuilder";
import SystemPreferences from "@/components/settings/SystemPreferences";
import RecycleBin from "@/components/settings/RecycleBin";

const SECTIONS = [
  { id: "users", label: "User Management", icon: "ph-users-three" },
  { id: "permissions", label: "Roles & Permissions", icon: "ph-shield-check" },
  { id: "layouts", label: "Layouts & Fields", icon: "ph-layout" },
  { id: "recycle-bin", label: "Recycle Bin", icon: "ph-trash" },
  { id: "system", label: "System Preferences", icon: "ph-gear-fine" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("users");

  return (
    <div className="max-w-[1200px] mx-auto">

      <div className="flex flex-col gap-8">
        {/* Top Nav */}
        <div className="w-full">
          <nav className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto no-scrollbar flex">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 flex items-center justify-center gap-2.5 px-5 py-4 text-[0.95rem] font-semibold transition-all duration-150 border-b-[3px] whitespace-nowrap min-w-max ${
                  activeSection === section.id
                    ? "bg-orange-50 text-orange-600 border-b-orange-500"
                    : "text-slate-600 border-b-transparent hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <i className={`ph-fill ${section.icon} text-xl`}></i>
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="w-full">
          {activeSection === "users" && <UserManagement />}
          {activeSection === "permissions" && <RolesPermissions />}
          {activeSection === "layouts" && <LayoutsFieldsBuilder />}
          {activeSection === "recycle-bin" && <RecycleBin />}
          {activeSection === "system" && <SystemPreferences />}
        </div>
      </div>
    </div>
  );
}
