"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useDismiss } from "./useDismiss";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  link: string;
  icon: string;
  color: string;
}

interface SearchResponse {
  results?: SearchResult[];
}

export default function GlobalSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  useDismiss(searchRef, () => setIsSearchFocused(false));

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearchLoading } = useSWR<SearchResponse>(
    debouncedQuery.length >= 2 ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetcher
  );

  return (
    <div ref={searchRef} className="relative">
      <button
        className="md:hidden w-[45px] h-[45px] flex items-center justify-center rounded-full bg-white border border-gray-200 text-slate-600 shadow-sm"
        onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
        type="button"
        aria-label="Search"
        aria-expanded={isMobileSearchOpen}
      >
        <i className="ph-bold ph-magnifying-glass text-[1.4rem]"></i>
      </button>

      <div className={`
        absolute right-0 top-14 md:top-auto md:relative md:flex bg-white border border-gray-200 rounded-2xl md:rounded-full px-4 py-2 items-center gap-2.5 w-[calc(100vw-32px)] sm:w-[300px] shadow-lg md:shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent z-[100]
        ${isMobileSearchOpen ? 'flex' : 'hidden'}
      `}>
        <input
          type="text"
          aria-label="Search bookings and transactions"
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
          <div className="fixed inset-0 z-[90] md:hidden" aria-hidden="true" onClick={() => setIsSearchFocused(false)}></div>
          <div className="fixed md:absolute top-[80px] md:top-[calc(100%+8px)] left-4 right-4 md:left-0 md:right-auto md:w-[400px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-[100] max-h-[calc(100dvh-100px)] md:max-h-[60dvh] overflow-y-auto no-scrollbar">
            <div className="px-4 pb-2 text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-2">Search Results</div>

          {!isSearchLoading && (!searchResults?.results || searchResults.results.length === 0) ? (
            <div className="px-4 py-6 text-center flex flex-col items-center justify-center text-slate-400">
              <i className="ph-fill ph-ghost text-3xl mb-2 text-slate-300"></i>
              <p className="text-sm">No results found for &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {searchResults?.results?.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setIsSearchFocused(false);
                    setSearchQuery("");
                    router.push(item.link);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-${item.color}-50 text-${item.color}-500 flex items-center justify-center group-hover:bg-${item.color}-500 group-hover:text-white transition-colors shrink-0`}>
                    <i className={`ph-fill ${item.icon} text-lg`}></i>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[0.9rem] font-bold text-slate-900 truncate">{item.title}</span>
                    <span className="text-[0.75rem] text-slate-500 truncate">{item.subtitle}</span>
                  </div>
                  <i className="ph-bold ph-caret-right text-slate-300 group-hover:text-slate-500 transition-colors"></i>
                </button>
              ))}
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
}
