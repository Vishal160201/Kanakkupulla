"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FILTER_TABS, tabDotClass } from "./albumUtils";

interface AlbumFilterBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

/** Status filter dropdown + search box. */
export default function AlbumFilterBar({ activeTab, onTabChange, searchQuery, onSearchChange }: AlbumFilterBarProps) {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
      <div className="relative w-full sm:w-auto" ref={filterDropdownRef}>
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={isFilterDropdownOpen}
          onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
          className="flex items-center justify-between gap-2 w-full sm:w-[220px] bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${tabDotClass(activeTab)}`} />
            <span>{activeTab}</span>
          </div>
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isFilterDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-[fadeIn_0.15s_ease-out]">
            {FILTER_TABS.map(tab => (
              <button
                type="button"
                key={tab}
                onClick={() => {
                  onTabChange(tab);
                  setIsFilterDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm font-bold transition-colors ${
                  activeTab === tab
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${tabDotClass(tab)}`} />
                <span>{tab}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="relative w-full sm:w-64">
          <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            aria-label="Search albums"
            placeholder="Search album, client, booking..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-purple-400 bg-white"
          />
        </div>

      </div>
    </div>
  );
}
