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
  const prevUnreadCount = useRef(unreadCount);

  const isAdminOrOwner = (session?.user as any)?.role === "STUDIO_OWNER" || (session?.user as any)?.role === "ADMIN";

  const { data: waStatusData, mutate: mutateWA } = useSWR(
    isAdminOrOwner ? "/api/whatsapp/status" : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);



  const [waPhoneNumber, setWaPhoneNumber] = useState("");
  const [isPairingLoading, setIsPairingLoading] = useState(false);

  const requestPairingCode = async () => {
    if (!waPhoneNumber) return;
    setIsPairingLoading(true);
    try {
      const res = await fetch('/api/whatsapp/pair', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: waPhoneNumber }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert("Failed to get pairing code: " + (data.error || "Please try again or check your server logs. WhatsApp may have rate-limited this number."));
      }
      mutateWA();
    } catch (e) {
      console.error(e);
      alert("Failed to get pairing code. Please try again.");
    } finally {
      setIsPairingLoading(false);
    }
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
      console.error('Push error:', e);
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
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`/api/notifications/read-all`, { method: "POST" });
      mutateNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const userName = session?.user?.name || "Studio User";
  const userEmail = session?.user?.email || "user@example.com";
  const userRole = (session?.user as any)?.role || "STAFF";
  const userInitials = userName.substring(0, 2).toUpperCase();
  const isStudioOwner = userRole === "ADMIN";

  const roleLabels: Record<string, string> = {
    ADMIN: "Studio Owner",
    STAFF: "Staff",
    PHOTOGRAPHER: "Photographer",
  };
  
  // Simple logic to set page title
  let title = "Moondot studio";
  if (pathname.includes("bookings")) title = "Bookings Management";
  else if (pathname.includes("galleries")) title = "Galleries Management";
  else if (pathname.includes("analytics")) title = "Analytics";
  else if (pathname.includes("transactions")) title = "Ledger & Analytics";
  else if (pathname.includes("settings")) title = "Settings";
  
  return (
    <header className={`relative flex ${title ? 'justify-between' : 'justify-end'} items-center px-4 md:px-10 py-4 md:py-5 bg-slate-50 z-50`}>
      <div className="flex items-center gap-3">
        {/* Hamburger Menu (Mobile Only) */}
        <button 
          onClick={toggleSidebar}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <i className="ph-bold ph-list text-[1.4rem]"></i>
        </button>

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
        {/* Search Bar - Responsive */}
        <div ref={searchRef} className="relative">
          {/* Mobile Search Icon */}
          <button 
            className="md:hidden w-[45px] h-[45px] flex items-center justify-center rounded-full bg-white border border-gray-200 text-slate-600 shadow-sm"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
          >
            <i className="ph-bold ph-magnifying-glass text-[1.4rem]"></i>
          </button>

          {/* Desktop Search Bar or Expanded Mobile Search */}
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
            <div className="absolute top-[calc(100%+8px)] right-0 md:left-0 w-[calc(100vw-32px)] sm:w-[400px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-[100] max-h-[400px] overflow-y-auto no-scrollbar">
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
          )}
        </div>
        
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="bg-white border border-gray-200 rounded-full w-[45px] h-[45px] flex items-center justify-center relative cursor-pointer shadow-sm hover:bg-slate-50 transition-colors"
          >
            <i className="ph-fill ph-bell text-slate-600 text-[1.4rem]"></i>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[0.65rem] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white box-content shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute top-[calc(100%+10px)] right-0 w-[calc(100vw-32px)] sm:w-[350px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 z-50 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-[0.95rem]">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="text-[0.75rem] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                    <i className="ph-fill ph-bell-slash text-3xl mb-2 text-slate-300"></i>
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map((notification: any) => (
                      <div 
                        key={notification.id}
                        onClick={() => handleMarkAsRead(notification.id, notification.link)}
                        className={`p-4 border-b border-gray-50 flex gap-3 cursor-pointer transition-colors ${notification.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/30 hover:bg-blue-50/60'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notification.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                          <i className={`ph-fill ${notification.type === 'BOOKING' ? 'ph-calendar-check' : notification.type === 'PAYMENT' ? 'ph-receipt' : notification.type === 'ALERT' ? 'ph-warning-circle' : 'ph-bell'} text-[1.1rem]`}></i>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className={`text-[0.85rem] truncate ${notification.isRead ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>{notification.title}</span>
                            <span className="text-[0.65rem] text-slate-400 shrink-0 whitespace-nowrap mt-0.5">
                              {(() => {
                                const d = new Date(notification.createdAt);
                                const now = new Date();
                                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                const yesterday = new Date(today);
                                yesterday.setDate(yesterday.getDate() - 1);
                                const notifDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                if (notifDate.getTime() === today.getTime()) return `Today ${timeStr}`;
                                if (notifDate.getTime() === yesterday.getTime()) return `Yesterday ${timeStr}`;
                                return `${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} ${timeStr}`;
                              })()}
                            </span>
                          </div>
                          <p className={`text-[0.8rem] line-clamp-2 ${notification.isRead ? 'text-slate-500' : 'text-slate-700'}`}>
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
            <div className="absolute top-[calc(100%+10px)] right-0 w-[calc(100vw-32px)] sm:w-[260px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 p-5 z-50">
              <div className="flex justify-between items-center mb-5">
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

              {isAdminOrOwner && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest">WhatsApp Bot</div>
                    <div className="flex items-center gap-1.5">
                      {!waStatusData ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                          <span className="text-[0.65rem] font-bold text-blue-500">Connecting...</span>
                        </>
                      ) : (
                        <>
                          <div className={`w-2 h-2 rounded-full ${waStatusData.status === 'READY' ? 'bg-green-500' : waStatusData.status === 'AWAITING_QR' ? 'bg-yellow-500 animate-pulse' : waStatusData.status === 'ERROR' ? 'bg-red-600' : 'bg-red-500'}`}></div>
                          <span className="text-[0.65rem] font-bold text-slate-500">{waStatusData.status === 'READY' ? 'Connected' : waStatusData.status === 'AWAITING_QR' ? 'Login' : waStatusData.status === 'ERROR' ? 'Error' : 'Disconnected'}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {!waStatusData ? (
                     <div className="flex flex-col items-center p-3 bg-blue-50 rounded-xl border border-blue-100 gap-2">
                       <i className="ph-fill ph-spinner-gap text-blue-500 text-2xl animate-spin"></i>
                       <span className="text-[0.65rem] text-blue-600 text-center font-semibold">Waking up bot server...</span>
                       <span className="text-[0.55rem] text-blue-400 text-center">This can take up to 60 seconds on Render.</span>
                     </div>
                  ) : waStatusData.status === 'ERROR' ? (
                     <div className="flex flex-col items-center p-3 bg-red-50 rounded-xl border border-red-100 gap-2">
                       <i className="ph-fill ph-warning-circle text-red-500 text-2xl"></i>
                       <span className="text-[0.65rem] text-red-600 text-center font-semibold">Failed to start WhatsApp Bot in this environment.</span>
                       <span className="text-[0.55rem] text-red-400 text-center break-all">{waStatusData.error || "Unknown Error"}</span>
                       <button onClick={() => { fetch('/api/whatsapp/status'); mutateWA(); }} className="mt-1 px-3 py-1 bg-red-100 text-red-600 text-[0.65rem] font-bold rounded hover:bg-red-200 transition-colors">
                         Retry Connection
                       </button>
                     </div>
                  ) : waStatusData.status === 'READY' ? (
                     <button 
                       onClick={async () => {
                         await fetch('/api/whatsapp/logout', { method: 'POST' });
                         mutateWA();
                       }}
                       className="w-full py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
                     >
                       Disconnect Bot
                     </button>
                  ) : waStatusData.pairingCode ? (
                     <div className="flex flex-col items-center p-3 bg-slate-50 rounded-xl border border-gray-200">
                       <span className="text-[1.5rem] font-mono font-bold tracking-[0.2em] text-slate-800">{waStatusData.pairingCode.match(/.{1,4}/g)?.join('-') || waStatusData.pairingCode}</span>
                       <span className="text-[0.65rem] text-slate-500 mt-2 text-center">Open WhatsApp &gt; Linked Devices &gt; Link with Phone Number</span>
                     </div>
                  ) : waStatusData.qrCode ? (
                     <div className="flex flex-col items-center p-2 bg-slate-50 rounded-xl border border-gray-200">
                       <img src={waStatusData.qrCode} alt="WhatsApp Login QR" className="w-full max-w-[150px] rounded-lg" />
                       <span className="text-[0.65rem] text-slate-500 mt-2 text-center">Open WhatsApp &gt; Linked Devices &gt; Scan QR</span>
                       
                       <div className="w-full mt-3 pt-3 border-t border-gray-200 flex flex-col gap-2">
                         <span className="text-[0.65rem] font-bold text-slate-500 uppercase text-center">OR Link with Phone</span>
                         <div className="flex gap-2">
                           <input type="text" value={waPhoneNumber} onChange={e => setWaPhoneNumber(e.target.value)} placeholder="+919876543210" className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white" />
                           <button onClick={requestPairingCode} disabled={isPairingLoading} className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 disabled:opacity-50">
                             {isPairingLoading ? '...' : 'Get Code'}
                           </button>
                         </div>
                       </div>
                     </div>
                  ) : null}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </header>
  );
}
