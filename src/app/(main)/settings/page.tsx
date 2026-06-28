"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import UserManagement from "@/components/settings/UserManagement";
import RolesPermissions from "@/components/settings/RolesPermissions";
import LayoutsFieldsBuilder from "@/components/settings/LayoutsFieldsBuilder";
import SystemPreferences from "@/components/settings/SystemPreferences";
import ReminderPreferences from "@/components/settings/ReminderPreferences";
import RecycleBin from "@/components/settings/RecycleBin";
import GoogleDriveIntegration from "@/components/settings/integrations/GoogleDriveIntegration";
import WhatsAppIntegration from "@/components/settings/integrations/WhatsAppIntegration";

const GROUPS = [
  {
    label: "General",
    items: [
      { id: "system", label: "System Preferences", icon: "ph-gear-fine" },
      { id: "notifications", label: "Notification Preferences", icon: "ph-bell" },
    ]
  },
  {
    label: "Team",
    items: [
      { id: "users", label: "Users & Team", icon: "ph-users-three" },
      { id: "permissions", label: "Roles & Permissions", icon: "ph-shield-check" },
    ]
  },
  {
    label: "Customization",
    items: [
      { id: "layouts", label: "Layouts & Fields", icon: "ph-layout" },
    ]
  },
  {
    label: "Integrations",
    items: [
      { id: "google-drive", label: "Google Drive", icon: "ph-google-logo" },
      { id: "whatsapp-bot", label: "WhatsApp Bot", icon: "ph-whatsapp-logo" },
    ]
  },
  {
    label: "Data",
    items: [
      { id: "recycle-bin", label: "Recycle Bin", icon: "ph-trash" },
    ]
  }
] as const;

type SectionId = typeof GROUPS[number]["items"][number]["id"];

function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize from URL or default to 'system'
  const initialSection = (searchParams.get("section") as SectionId) || "system";
  
  // Validate that the section exists, otherwise fallback to 'system'
  const isValidSection = GROUPS.some(g => g.items.some(i => i.id === initialSection));
  const validInitialSection = isValidSection ? initialSection : "system";

  const [activeSection, setActiveSection] = useState<SectionId>(validInitialSection);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // For transition animations
  const [displayedSection, setDisplayedSection] = useState<SectionId>(validInitialSection);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sync state with URL params without full page reload
  useEffect(() => {
    const section = searchParams.get("section") as SectionId;
    if (section && GROUPS.some(g => g.items.some(i => i.id === section)) && section !== activeSection) {
      setActiveSection(section);
      setDisplayedSection(section);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("menu") === "open") {
      setIsMobileMenuOpen(true);
      window.history.replaceState(null, '', `?section=${activeSection}`);
    }
  }, [searchParams, activeSection]);

  // Handle section switch with animation
  const handleSectionSwitch = (id: SectionId) => {
    if (id === activeSection) return;
    setIsTransitioning(true);
    setActiveSection(id);
    setIsMobileMenuOpen(false);
    
    // Update URL without triggering navigation/scroll
    window.history.replaceState(null, '', `?section=${id}`);
    
    setTimeout(() => {
      setDisplayedSection(id);
      setIsTransitioning(false);
    }, 150); // Delay half the transition duration to swap components
  };

  const getActiveItem = () => {
    for (const group of GROUPS) {
      for (const item of group.items) {
        if (item.id === activeSection) return item;
      }
    }
    return GROUPS[0].items[0];
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full py-4 px-3 overflow-y-auto no-scrollbar">
      {GROUPS.map((group, groupIdx) => (
        <div key={group.label} className={groupIdx > 0 ? "mt-6" : ""}>
          <div className="px-3 mb-2 text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">
            {group.label}
          </div>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionSwitch(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[0.85rem] font-semibold outline-none ${
                    isActive 
                      ? "bg-orange-50 text-orange-600" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <i className={`${isActive ? "ph-fill" : "ph"} ${item.icon} text-lg ${isActive ? "text-orange-500" : "text-slate-400"}`}></i>
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-6 lg:gap-8 relative">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-[220px] shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm h-[calc(100vh-140px)] sticky top-6">
        <SidebarContent />
      </aside>

      {/* Mobile Bottom Sheet Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end" style={{ animation: "fadeIn 0.2s ease-out forwards" }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div 
            className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden" 
            style={{ animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full"></div>
            </div>
            <div className="flex justify-between items-center px-6 pb-2 border-b border-gray-100">
              <h3 className="font-bold text-slate-800">Settings Menu</h3>
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                <i className="ph-bold ph-x"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 pb-8">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div 
          className={`transition-all duration-300 ease-in-out ${
            isTransitioning ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"
          }`}
        >
          {displayedSection === "users" && <UserManagement />}
          {displayedSection === "permissions" && <RolesPermissions />}
          {displayedSection === "layouts" && <LayoutsFieldsBuilder />}
          {displayedSection === "recycle-bin" && <RecycleBin />}
          {displayedSection === "google-drive" && <GoogleDriveIntegration />}
          {displayedSection === "whatsapp-bot" && <WhatsAppIntegration />}
          {displayedSection === "system" && <SystemPreferences />}
          {displayedSection === "notifications" && <ReminderPreferences />}
        </div>
      </div>
      
      {/* Add keyframes for inline animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}

export default function SettingsPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading settings...</div>}>
      <SettingsPage />
    </Suspense>
  );
}
