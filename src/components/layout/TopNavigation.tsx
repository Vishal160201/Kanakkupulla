"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useMobileNav } from "../providers/MobileNavProvider";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function TopNavigation() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { toggleSidebar } = useMobileNav();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearchLoading } = useSWR(
    debouncedQuery.length >= 2 ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetcher
  );

  const { data: session } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const { data: notificationsData, mutate: mutateNotifications } = useSWR(
    session ? "/api/notifications?limit=20" : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;
  const unreadReminderCount = notificationsData?.unreadReminderCount || 0;
  const prevUnreadCount = useRef(unreadCount);

  const { data: systemInfo } = useSWR("/api/ping", fetcher, { refreshInterval: 60000 });
  const [pushNotifs, setPushNotifs] = useState(true);



  const [emailNotifs, setEmailNotifs] = useState(true);

  // Swipe-to-dismiss state for mobile notifications
  const [startY, setStartY] = useState<number | null>(null);
  const [deltaY, setDeltaY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      setDeltaY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (deltaY > 100) {
      setIsNotificationsOpen(false);
    }
    setStartY(null);
    setDeltaY(0);
  };

  const updatePreferences = async (email: boolean, push: boolean) => {
    setEmailNotifs(email);
    setPushNotifs(push);
    await fetch("/api/users/me/preferences", {
      method: "PATCH",
      body: JSON.stringify({ emailNotifications: email, pushNotifications: push }),
      headers: { "Content-Type": "application/json" }
    });
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert("Push notifications are not supported in this browser (or require HTTPS/localhost). Preference saved but push is disabled.");
      updatePreferences(emailNotifs, true);
      return;
    }
    
    updatePreferences(emailNotifs, true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BM7mYrnONkCPpx7wemRCy4R7r7eD8ZuDGAU9NOE-K1gvS7apjLkhRTfYgJ_LonMla20uX61yHvbt1yUak20CXiI"
        });
        await fetch('/api/notifications/push', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        alert("Push notification permission was denied in browser settings.");
      }
    } catch (e) {
      alert("Failed to subscribe to push notifications. Ensure you are on HTTPS or localhost.");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearchFocused(false);
        setIsNotificationsOpen(false);
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  
  const handleMarkAsRead = async (id: string, link?: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      mutateNotifications();
      setIsNotificationsOpen(false);
      if (link) router.push(link);
    } catch (e) {
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
      mutateNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSnooze = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}/snooze`, { method: "PATCH" });
      mutateNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const userName = session?.user?.name || "Studio User";
  const userEmail = session?.user?.email || "user@example.com";
  const userRole = (session?.user as any)?.role || "STAFF";
  const userInitials = userName.substring(0, 2).toUpperCase();
  const isStudioOwner = userRole === "ADMIN";

  const getNotificationIcon = (type: string) => {
      return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${type === 'PAYMENT_DUE_REMINDER' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
          <i className={`ph-fill ${
            type?.includes('BOOKING') || type === 'HOT_DATE_ALERT' ? 'ph-calendar-check' : 
            type?.includes('PAYMENT') ? 'ph-receipt' : 
            type?.includes('ORDER') ? 'ph-package' : 
            'ph-bell'} text-[1.1rem]`}></i>
        </div>
      );
  };

  const roleLabels: Record<string, string> = {
    ADMIN: "Studio Owner",
    STAFF: "Staff",
    PHOTOGRAPHER: "Photographer",
  };
  
  let title = "Moondot studio";
  if (pathname.includes("bookings")) title = "Bookings Management";
  else if (pathname.includes("galleries")) title = "Galleries Management";
  else if (pathname.includes("analytics")) title = "Analytics";
  else if (pathname.includes("transactions")) title = "Ledger & Analytics";
  else if (pathname.includes("settings")) title = "Settings";
  else if (pathname.includes("gifts")) title = "Gifts & Frames";
  
  return (
    <header className={`relative flex ${title ? 'justify-between' : 'justify-end'} items-center px-4 md:px-10 py-4 md:py-5 bg-slate-50 z-50`}>
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <i className="ph-bold ph-list text-[1.4rem]"></i>
        </button>

        {pathname.includes("settings") && (
          <button 
            onClick={() => {
              const search = new URLSearchParams(window.location.search);
              search.set("menu", "open");
              router.push(`${pathname}?${search.toString()}`);
            }}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-orange-50 border border-orange-200 text-orange-600 shadow-sm hover:bg-orange-100 transition-colors"
          >
            <i className="ph-bold ph-faders text-[1.4rem]"></i>
          </button>
        )}

        {title && title === "Moondot studio" ? (
          <div className="relative hidden sm:block">
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Montserrat:wght@300;400;600&display=swap');
              .studio-brand {
                font-family: 'Alex Brush', cursive;
                font-weight: 400;
                font-size: 5.8rem;
                line-height: 1.1;
                background: linear-gradient(135deg, #0f172a 0%, #334155 50%, #020617 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                display: flex;
                align-items: center;
                gap: 15px;
                padding-left: 20px;
                padding-right: 20px;
                margin-top: -15px;
                margin-bottom: -10px;
              }
              .studio-brand-accent {
                font-family: 'Montserrat', sans-serif;
                font-weight: 500;
                font-size: 1.2rem;
                text-transform: uppercase;
                letter-spacing: 0.35em;
                background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-top: 40px;
              }
            `}</style>
            <div className="studio-brand">
              Moondot <span className="studio-brand-accent hidden md:inline">Studio</span>
            </div>
          </div>
        ) : (
          title && <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 tracking-tight hidden sm:block">{title}</h1>
        )}
      </div>
      
      <div className="flex items-center gap-3 md:gap-5">
        <div ref={searchRef} className="relative">
          <button 
            className="md:hidden w-[45px] h-[45px] flex items-center justify-center rounded-full bg-white border border-gray-200 text-slate-600 shadow-sm"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
          >
            <i className="ph-bold ph-magnifying-glass text-[1.4rem]"></i>
          </button>

          <div className={`
            absolute right-0 top-14 md:top-auto md:relative md:flex bg-white border border-gray-200 rounded-2xl md:rounded-full px-4 py-2 items-center gap-2.5 w-[calc(100vw-32px)] sm:w-[300px] shadow-lg md:shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent z-[100]
            ${isMobileSearchOpen ? 'flex' : 'hidden'}
          `}>
            <input 
              type="text" 
              placeholder="Search bookings, transactions..." 
              className="border-none outline-none bg-transparent w-full font-sans text-[0.9rem] text-slate-900 placeholder:text-slate-400" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              autoFocus={isMobileSearchOpen}
            />
            {isSearchLoading ? (
              <i className="ph-bold ph-spinner animate-spin text-blue-500 text-[1.2rem]"></i>
            ) : (
              <i className="ph-bold ph-magnifying-glass text-slate-400 text-[1.2rem] hidden md:block"></i>
            )}
          </div>
          
          {isSearchFocused && searchQuery.length >= 2 && (
            <>
              <div className="fixed inset-0 z-[90] md:hidden" onClick={() => setIsSearchFocused(false)}></div>
              <div className="fixed md:absolute top-[80px] md:top-[calc(100%+8px)] left-4 right-4 md:left-0 md:right-auto md:w-[400px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-[100] max-h-[calc(100dvh-100px)] md:max-h-[60dvh] overflow-y-auto no-scrollbar">
                <div className="px-4 pb-2 text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-2">Search Results</div>
              
              {!isSearchLoading && (!searchResults?.results || searchResults.results.length === 0) ? (
                <div className="px-4 py-6 text-center flex flex-col items-center justify-center text-slate-400">
                  <i className="ph-fill ph-ghost text-3xl mb-2 text-slate-300"></i>
                  <p className="text-sm">No results found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {searchResults?.results?.map((item: any) => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setIsSearchFocused(false);
                        setSearchQuery("");
                        router.push(item.link);
                      }}
                      className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors group"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-${item.color}-50 text-${item.color}-500 flex items-center justify-center group-hover:bg-${item.color}-500 group-hover:text-white transition-colors shrink-0`}>
                        <i className={`ph-fill ${item.icon} text-lg`}></i>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[0.9rem] font-bold text-slate-900 truncate">{item.title}</span>
                        <span className="text-[0.75rem] text-slate-500 truncate">{item.subtitle}</span>
                      </div>
                      <i className="ph-bold ph-caret-right text-slate-300 group-hover:text-slate-500 transition-colors"></i>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </>
          )}
        </div>
        
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="bg-white border border-gray-200 rounded-full w-[45px] h-[45px] flex items-center justify-center relative cursor-pointer shadow-sm hover:bg-slate-50 transition-colors"
          >
            <i className="ph-fill ph-bell text-slate-600 text-[1.4rem]"></i>
            {unreadCount + unreadReminderCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[0.65rem] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white box-content shadow-sm">
                {unreadCount + unreadReminderCount > 99 ? '99+' : unreadCount + unreadReminderCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <>
              <div className="fixed inset-0 z-[45] md:hidden bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsNotificationsOpen(false)}></div>
              <div 
                className={`fixed md:absolute inset-x-0 bottom-0 md:bottom-auto md:top-[calc(100%+10px)] md:left-auto md:right-0 md:w-[380px] bg-white rounded-t-3xl md:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border-t md:border border-gray-100 z-50 flex flex-col max-h-[85dvh] md:max-h-[70dvh] overflow-hidden transform origin-bottom md:origin-top-right ${deltaY === 0 ? 'transition-all animate-slide-up-mobile md:animate-none' : ''}`}
                style={{ transform: deltaY > 0 ? `translateY(${deltaY}px)` : undefined }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="w-[40px] h-[4px] bg-[#e2e8f0] rounded-[2px] mx-auto my-[8px] md:hidden shrink-0"></div>
                <div className="flex justify-between items-center px-5 pb-5 pt-2 md:p-4 border-b border-gray-100 bg-slate-50/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-[1.1rem] md:text-[0.95rem]">Notifications</h3>
                  </div>
                {unreadCount + unreadReminderCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="text-[0.75rem] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="max-h-[60dvh] overflow-y-auto no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                    <i className="ph-fill ph-bell-slash text-3xl mb-2 text-slate-300"></i>
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {(() => {
                      const todayNotifs = notifications.filter((n: any) => {
                        const d = new Date(n.createdAt);
                        const now = new Date();
                        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                      });
                      const earlierNotifs = notifications.filter((n: any) => {
                        const d = new Date(n.createdAt);
                        const now = new Date();
                        return !(d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear());
                      });

                      const renderNotif = (notification: any) => (
                        <div 
                          key={notification.id}
                          onClick={() => handleMarkAsRead(notification.id, notification.actionUrl)}
                          className={`p-4 border-b border-gray-50 flex gap-3 cursor-pointer transition-colors group ${!notification.isRead ? 'bg-blue-50/30 hover:bg-blue-50/60' : 'bg-white hover:bg-slate-50'}`}
                        >
                          {getNotificationIcon(notification.type)}
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <span className={`text-[0.85rem] truncate ${!notification.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{notification.title}</span>
                              <span className="text-[0.65rem] text-slate-400 shrink-0 whitespace-nowrap mt-0.5">
                                {new Date(notification.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </div>
                            <p className={`text-[0.8rem] line-clamp-2 ${!notification.isRead ? 'text-slate-700' : 'text-slate-500'}`}>
                              {notification.message}
                            </p>
                            {[
                              'ORDER_STATUS_STALE', 'BOOKING_STATUS_STALE', 'PAYMENT_DUE_REMINDER', 
                              'ADVANCE_NOT_COLLECTED', 'GALLERY_NOT_DELIVERED', 'ALBUM_PENDING_REMINDER'
                            ].includes(notification.type) && (
                              <button
                                onClick={(e) => handleSnooze(notification.id, e)}
                                className="mt-2 text-[0.7rem] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded hover:bg-orange-100 transition-colors self-start"
                              >
                                Snooze 1 day
                              </button>
                            )}
                          </div>
                          {!notification.isRead && (
                            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${notification.type?.includes('REMINDER') ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                          )}
                        </div>
                      );

                      return (
                        <>
                          {todayNotifs.length > 0 && (
                            <>
                              <div className="bg-slate-50 px-4 py-1.5 border-b border-gray-100 text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10">Today</div>
                              {todayNotifs.map(renderNotif)}
                            </>
                          )}
                          {earlierNotifs.length > 0 && (
                            <>
                              <div className="bg-slate-50 px-4 py-1.5 border-b border-gray-100 text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10">Earlier</div>
                              {earlierNotifs.map(renderNotif)}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            </>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-[45px] h-[45px] rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-base cursor-pointer shadow-sm transition-colors hover:bg-slate-800"
          >
            {userInitials}
          </div>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-[45] md:hidden" onClick={() => setIsProfileOpen(false)}></div>
              <div className="fixed md:absolute top-[80px] md:top-[calc(100%+10px)] left-4 right-4 md:left-auto md:right-0 md:w-[320px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 p-5 z-50 max-h-[calc(100dvh-100px)] md:max-h-[70dvh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-5 shrink-0">
                <button 
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <i className="ph ph-sign-out text-[1.1rem]"></i> Sign Out
                </button>
                <button 
                  onClick={() => setIsProfileOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <i className="ph ph-x text-[1.1rem]"></i>
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-lg shrink-0 relative">
                  {isStudioOwner && (
                    <i className="ph-fill ph-crown absolute -top-1 -left-1 text-orange-400 text-sm bg-white rounded-full p-0.5 shadow-sm"></i>
                  )}
                  {userInitials}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex flex-col overflow-hidden w-full">
                  <span className="font-bold text-[0.95rem] text-slate-900 leading-tight truncate">{userName}</span>
                  <span className="text-[0.75rem] text-slate-500 truncate">{userEmail}</span>
                  <span className="text-[0.65rem] text-slate-500 mt-1 truncate">Role: <strong className="text-slate-700">{roleLabels[userRole] || userRole}</strong></span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest">Notification Preferences</div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); updatePreferences(!emailNotifs, pushNotifs); }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${emailNotifs ? 'bg-orange-50 text-orange-500 hover:bg-orange-100' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                    title={emailNotifs ? "Disable Email Alerts" : "Enable Email Alerts"}
                  >
                    <i className={`text-[1.3rem] transition-transform duration-300 ${emailNotifs ? 'ph-fill ph-envelope-simple scale-110' : 'ph ph-envelope-simple'}`}></i>
                  </button>

                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation();
                      if (!pushNotifs) subscribeToPush();
                      else updatePreferences(emailNotifs, false);
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${pushNotifs ? 'bg-blue-50 text-blue-500 hover:bg-blue-100' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                    title={pushNotifs ? "Disable Push Alerts" : "Enable Push Alerts"}
                  >
                    <i className={`text-[1.3rem] transition-transform duration-300 ${pushNotifs ? 'ph-fill ph-device-mobile scale-110' : 'ph ph-device-mobile'}`}></i>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </header>
  );
}
