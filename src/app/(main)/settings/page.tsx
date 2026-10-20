"use client";

import { useState, Suspense, useCallback, useMemo, useSyncExternalStore } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import UserManagement from "@/components/settings/UserManagement";
import RolesPermissions from "@/components/settings/RolesPermissions";
import LayoutsFieldsBuilder from "@/components/settings/LayoutsFieldsBuilder";
import SystemPreferences from "@/components/settings/SystemPreferences";
import ReminderPreferences from "@/components/settings/ReminderPreferences";
import RecycleBin from "@/components/settings/RecycleBin";
import GoogleDriveIntegration from "@/components/settings/integrations/GoogleDriveIntegration";
import WhatsAppIntegration from "@/components/settings/integrations/WhatsAppIntegration";
import ShopsSettings from "@/components/settings/shops/ShopsSettings";
import { Tooltip } from "@/components/ui/Tooltip";
import OwnersOnlyState from "@/components/settings/common/OwnersOnlyState";
import { useIsOwner, useRecycleBinAccess } from "@/components/settings/common/useIsOwner";

/**
 * Who sees a section: "owner" = owners only, "recycle" = owners and members whose access
 * includes the Recycle Bin, "all" = everyone.
 */
type SectionAccess = "owner" | "recycle" | "all";

const GROUPS = [
  {
    label: "General",
    items: [
      { id: "system", label: "System Preferences", icon: "ph-gear-fine", access: "owner" },
      { id: "notifications", label: "Notification Preferences", icon: "ph-bell", access: "owner" },
      { id: "shops", label: "Shops", icon: "ph-storefront", access: "owner" },
    ]
  },
  {
    label: "Team",
    items: [
      { id: "users", label: "Users & Team", icon: "ph-users-three", access: "owner" },
      { id: "permissions", label: "Roles & Permissions", icon: "ph-shield-check", access: "owner" },
    ]
  },
  {
    label: "Customization",
    items: [
      { id: "layouts", label: "Layouts & Fields", icon: "ph-layout", access: "owner" },
    ]
  },
  {
    label: "Integrations",
    items: [
      { id: "google-drive", label: "Google Drive", icon: "ph-google-logo", access: "owner" },
      { id: "whatsapp-bot", label: "WhatsApp Bot", icon: "ph-whatsapp-logo", access: "owner" },
    ]
  },
  {
    label: "Data",
    items: [
      { id: "recycle-bin", label: "Recycle Bin", icon: "ph-trash", access: "recycle" },
    ]
  }
] as const satisfies readonly { label: string; items: readonly { id: string; label: string; icon: string; access: SectionAccess }[] }[];

type SectionId = typeof GROUPS[number]["items"][number]["id"];

interface SettingsGroup {
  label: string;
  items: readonly { id: SectionId; label: string; icon: string }[];
}

const SECTION_ACCESS = new Map<string, SectionAccess>(GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.access] as const)));

// Sidebar collapsed preference, persisted in localStorage and read via
// useSyncExternalStore (server/hydration snapshot = expanded).
const COLLAPSED_KEY = "settingsPanelCollapsed";
const collapsedListeners = new Set<() => void>();

const subscribeCollapsed = (listener: () => void) => {
  collapsedListeners.add(listener);
  return () => {
    collapsedListeners.delete(listener);
  };
};
const getCollapsedSnapshot = () => localStorage.getItem(COLLAPSED_KEY) === "true";
const getCollapsedServerSnapshot = () => false;

const setCollapsedPreference = (next: boolean) => {
  localStorage.setItem(COLLAPSED_KEY, String(next));
  collapsedListeners.forEach((listener) => listener());
};

interface SidebarContentProps {
  groups: readonly SettingsGroup[];
  activeSection: SectionId;
  onSectionSwitch: (id: SectionId) => void;
  isCollapsed?: boolean;
}

const SidebarContent = ({ groups, activeSection, onSectionSwitch, isCollapsed = false }: SidebarContentProps) => {
  const router = useRouter();
  return (
  <div className="flex flex-col h-full py-4 px-3 overflow-y-auto overflow-x-hidden">
    <Tooltip content={isCollapsed ? "Back" : undefined} side="right">
      <button
        type="button"
        onClick={() => router.push('/')}
        aria-label={isCollapsed ? "Back" : undefined}
        className={`flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-800 transition-colors mb-4 [@media(max-height:820px)]:mb-2 ${isCollapsed ? 'justify-center px-0' : ''}`}
      >
        <i className="ph-bold ph-arrow-left text-lg shrink-0"></i>
        {!isCollapsed && <span className="text-[0.85rem] font-bold">Back</span>}
      </button>
    </Tooltip>

    {groups.map((group, groupIdx) => (
      <div key={group.label} className={groupIdx > 0 ? "mt-6 [@media(max-height:820px)]:mt-2.5" : ""}>
        <div className={`mb-2 text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest ${isCollapsed ? 'hidden' : 'px-3'}`}>
          {group.label}
        </div>
        <div className="flex flex-col gap-1">
          {group.items.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <Tooltip key={item.id} content={isCollapsed ? item.label : undefined} side="right">
                <button
                  type="button"
                  onClick={() => onSectionSwitch(item.id)}
                  aria-label={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3 py-2.5 [@media(max-height:820px)]:py-1.5 rounded-xl transition-all duration-200 text-[0.85rem] font-semibold outline-none ${
                    isCollapsed ? 'justify-center px-0' : 'px-3'
                  } ${
                    isActive
                      ? "bg-orange-50 text-orange-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <i className={`${isActive ? "ph-fill" : "ph"} ${item.icon} text-lg shrink-0 ${isActive ? "text-orange-500" : "text-slate-400"}`}></i>
                  {!isCollapsed && <span className="min-w-0 truncate whitespace-nowrap text-left leading-tight">{item.label}</span>}
                </button>
              </Tooltip>
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

  const { isOwner, isLoading: isAccessLoading } = useIsOwner();
  // Members see the Recycle Bin when their access includes it (View or more in any shop).
  const { canView: canSeeRecycleBin } = useRecycleBinAccess();
  const canSee = useCallback(
    (id: string) => {
      const access = SECTION_ACCESS.get(id);
      if (!access) return false;
      if (access === "all") return true;
      if (access === "recycle") return isOwner || canSeeRecycleBin;
      return isOwner;
    },
    [isOwner, canSeeRecycleBin]
  );

  // A missing, unknown or (for members) owner-only section falls back to a section they can open.
  const requestedSection = searchParams.get("section");
  const defaultSection: SectionId = isOwner || isAccessLoading ? "system" : canSeeRecycleBin ? "recycle-bin" : "notifications";
  const activeSection: SectionId =
    requestedSection && SECTION_ACCESS.has(requestedSection) && (isAccessLoading || canSee(requestedSection))
      ? (requestedSection as SectionId)
      : defaultSection;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isCollapsed = useSyncExternalStore(subscribeCollapsed, getCollapsedSnapshot, getCollapsedServerSnapshot);

  const toggleCollapse = () => setCollapsedPreference(!isCollapsed);
  
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

  const groupsMemo = useMemo<readonly SettingsGroup[]>(
    () =>
      isAccessLoading
        ? []
        : GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => canSee(item.id)) })).filter(
            (group) => group.items.length > 0
          ),
    [isAccessLoading, canSee]
  );

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-6 lg:gap-8 relative">
      
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm h-[calc(100vh-140px)] sticky top-6 transition-all duration-200 ease-in-out ${isCollapsed ? 'w-[56px]' : 'w-[232px]'}`}>
        <SidebarContent 
          groups={groupsMemo} 
          activeSection={activeSection} 
          onSectionSwitch={handleSectionSwitch} 
          isCollapsed={isCollapsed}
        />
        {/* Toggle Button */}
        <button
          type="button"
          aria-label={isCollapsed ? "Expand settings menu" : "Collapse settings menu"}
          onClick={toggleCollapse}
          className="absolute -right-3 top-10 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-orange-500 hover:text-orange-600 shadow-sm z-10 transition-colors"
        >
          <i className={`ph-bold animate-heartbeat ${isCollapsed ? 'ph-caret-right' : 'ph-caret-left'}`}></i>
        </button>
      </aside>

      {/* Mobile Bottom Sheet Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end" style={{ animation: "fadeIn 0.2s ease-out forwards" }}>
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
              <button aria-label="Close settings menu" onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
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
          {isAccessLoading ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex items-center justify-center gap-3 text-slate-400">
              <i aria-hidden="true" className="ph ph-circle-notch animate-spin text-lg" />
              Loading settings…
            </div>
          ) : !canSee(displayedSection) ? (
            <OwnersOnlyState title="Only owners can open this section" />
          ) : (
            <>
              {displayedSection === "users" && <UserManagement />}
              {displayedSection === "permissions" && <RolesPermissions />}
              {displayedSection === "layouts" && <LayoutsFieldsBuilder />}
              {displayedSection === "recycle-bin" && <RecycleBin />}
              {displayedSection === "google-drive" && <GoogleDriveIntegration />}
              {displayedSection === "whatsapp-bot" && <WhatsAppIntegration />}
              {displayedSection === "system" && <SystemPreferences />}
              {displayedSection === "notifications" && <ReminderPreferences />}
              {displayedSection === "shops" && <ShopsSettings />}
            </>
          )}
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
