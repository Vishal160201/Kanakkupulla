"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function TopNavigation() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const { data: session } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
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
    <header className={`relative flex ${title ? 'justify-between' : 'justify-end'} items-center px-10 py-5 bg-slate-50 z-50`}>
      {title && title === "Moondot studio" ? (
        <div className="relative">
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
            Moondot <span className="studio-brand-accent">Studio</span>
          </div>
        </div>
      ) : (
        title && <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
      )}
      
      <div className="flex items-center gap-5">
        <div ref={searchRef} className="relative">
          <div className="bg-white border border-gray-200 rounded-full px-4 py-2 flex items-center gap-2.5 w-[300px] shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <input 
              type="text" 
              placeholder="Search bookings, transactions..." 
              className="border-none outline-none bg-transparent w-full font-sans text-[0.9rem] text-slate-900 placeholder:text-slate-400" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
            />
            {isSearchLoading ? (
              <i className="ph-bold ph-spinner animate-spin text-blue-500 text-[1.2rem]"></i>
            ) : (
              <i className="ph-bold ph-magnifying-glass text-slate-400 text-[1.2rem]"></i>
            )}
          </div>
          
          {isSearchFocused && searchQuery.length >= 2 && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-[400px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-[100] max-h-[400px] overflow-y-auto no-scrollbar">
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
        
        <button className="bg-white border border-gray-200 rounded-full w-[45px] h-[45px] flex items-center justify-center relative cursor-pointer shadow-sm hover:bg-slate-50 transition-colors">
          <i className="ph-fill ph-bell text-slate-600 text-[1.4rem]"></i>
          <span className="absolute top-[10px] right-[12px] w-2 h-2 bg-red-500 rounded-full border-2 border-white box-content"></span>
        </button>

        <div className="relative">
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-[45px] h-[45px] rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-base cursor-pointer shadow-sm transition-colors hover:bg-slate-800"
          >
            {userInitials}
          </div>

          {isProfileOpen && (
            <div className="absolute top-[calc(100%+10px)] right-0 w-[260px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 p-5 z-50">
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
