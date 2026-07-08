"use client";

import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
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

interface SidebarContentProps {
  groups: typeof GROUPS;
  activeSection: SectionId;
  onSectionSwitch: (id: SectionId) => void;
  isCollapsed?: boolean;
}

const SidebarContent = ({ groups, activeSection, onSectionSwitch, isCollapsed = false }: SidebarContentProps) => {
  const router = useRouter();
  return (
  <div className="flex flex-col h-full py-4 px-3 overflow-y-auto no-scrollbar overflow-x-hidden">
    <button 
      onClick={() => router.push('/')} 
      className={`flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-800 transition-colors mb-4 ${isCollapsed ? 'justify-center px-0' : ''}`}
      title={isCollapsed ? "Back" : undefined}
    >
      <i className="ph-bold ph-arrow-left text-lg shrink-0"></i>
      {!isCollapsed && <span className="text-[0.85rem] font-bold">Back</span>}
    </button>

    {groups.map((group, groupIdx) => (
      <div key={group.label} className={groupIdx > 0 ? "mt-6" : ""}>
        <div className={`mb-2 text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest ${isCollapsed ? 'hidden' : 'px-3'}`}>
          {group.label}
        </div>
        <div className="flex flex-col gap-1">
          {group.items.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionSwitch(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 text-[0.85rem] font-semibold outline-none ${
                  isCollapsed ? 'justify-center px-0' : 'px-3'
                } ${
                  isActive 
                    ? "bg-orange-50 text-orange-600" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <i className={`${isActive ? "ph-fill" : "ph"} ${item.icon} text-lg shrink-0 ${isActive ? "text-orange-500" : "text-slate-400"}`}></i>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
)};

function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeSection = (searchParams.get("section") as SectionId) ?? "system";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('settingsPanelCollapsed');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('settingsPanelCollapsed', String(next));
      return next;
    });
  };
  
  // For transition animations
  const [displayedSection, setDisplayedSection] = useState<SectionId>(activeSection);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sync displayed section with active section if it changes externally
  if (activeSection !== displayedSection && !isTransitioning) {
    setDisplayedSection(activeSection);
  }

  // Handle section switch with animation
  const handleSectionSwitch = useCallback((id: SectionId) => {
    if (id === activeSection) return;
    setIsTransitioning(true);
    setIsMobileMenuOpen(false);
    
    router.push(`?section=${id}`, { scroll: false });
    
    setTimeout(() => {
      setDisplayedSection(id);
      setIsTransitioning(false);
    }, 150); // Delay half the transition duration to swap components
  }, [activeSection, router]);

  const groupsMemo = useMemo(() => GROUPS, []);

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-6 lg:gap-8 relative">
      
      {/* Desktop Sidebar */}
      <aside className={`hidden md:block shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm h-[calc(100vh-140px)] sticky top-6 transition-all duration-200 ease-in-out ${isCollapsed ? 'w-[56px]' : 'w-[220px]'}`}>
        <SidebarContent 
          groups={groupsMemo} 
          activeSection={activeSection} 
          onSectionSwitch={handleSectionSwitch} 
          isCollapsed={isCollapsed}
        />
        {/* Toggle Button */}
        <button 
          onClick={toggleCollapse}
          className="absolute -right-3 top-10 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-orange-500 hover:text-orange-600 shadow-sm z-10 transition-colors"
        >
          <i className={`ph-bold animate-heartbeat ${isCollapsed ? 'ph-caret-right' : 'ph-caret-left'}`}></i>
        </button>
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
              <SidebarContent 
                groups={groupsMemo} 
                activeSection={activeSection} 
                onSectionSwitch={handleSectionSwitch} 
              />
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
