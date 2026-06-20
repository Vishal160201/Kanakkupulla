"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { UserItem } from "./MultiUserPicklist";

interface UserPicklistProps {
  users: UserItem[];
  value: string; // Stored as a single ID
  onChange: (val: string) => void;
  placeholder?: string;
  error?: boolean;
}

export default function UserPicklist({ users, value, onChange, placeholder = "Select user...", error }: UserPicklistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedUser = users.find(u => u.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Area */}
      <div 
        className={`h-[45px] w-full rounded-xl border bg-white px-3 py-2 transition-colors cursor-pointer flex items-center justify-between ${
          error ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-200 hover:border-orange-300'
        } ${isOpen ? 'ring-2 ring-orange-500/50 border-orange-500' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {!selectedUser ? (
          <span className="text-[0.95rem] text-slate-400 ml-1">{placeholder}</span>
        ) : (
          <div className="flex items-center gap-2 w-full">
            {selectedUser.image ? (
              <img src={selectedUser.image} alt={selectedUser.name} className="w-7 h-7 rounded-full object-cover shadow-sm border border-white" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[0.65rem] font-bold shadow-sm border border-white shrink-0">
                {getInitials(selectedUser.name)}
              </div>
            )}
            <span className="text-[0.9rem] font-bold text-slate-700 truncate">{selectedUser.name}</span>
          </div>
        )}
        
        <div className="text-slate-400 shrink-0 pointer-events-none">
          <i className={`ph-bold ph-caret-${isOpen ? 'up' : 'down'}`}></i>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-[100] max-h-[250px] overflow-y-auto py-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {users.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 text-center font-medium">No users found.</div>
          ) : (
            users.map(u => {
              const isSelected = value === u.id;
              return (
                <div 
                  key={u.id}
                  className={`px-4 py-2.5 cursor-pointer flex items-center justify-between transition-colors hover:bg-orange-50/80 ${isSelected ? 'bg-orange-50/50' : ''}`}
                  onClick={() => {
                    onChange(isSelected ? "" : u.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    {u.image ? (
                      <img src={u.image} alt={u.name} className={`w-8 h-8 rounded-full object-cover shadow-sm border border-white ${u.isBusy ? 'grayscale opacity-60' : ''}`} />
                    ) : (
                      <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[0.7rem] font-bold shadow-sm border border-white shrink-0 ${u.isBusy ? 'text-slate-400' : 'text-slate-600'}`}>
                        {getInitials(u.name)}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className={`text-[0.85rem] font-bold ${isSelected ? 'text-orange-700' : (u.isBusy ? 'text-slate-400 line-through' : 'text-slate-700')}`}>{u.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[0.6rem] font-semibold text-slate-400 uppercase tracking-wider">{u.role}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                        <span className={`text-[0.6rem] font-bold uppercase tracking-wider ${u.isBusy ? 'text-red-500' : 'text-emerald-500'}`}>
                          {u.isBusy ? 'Busy' : 'Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
                      <i className="ph-bold ph-check text-[0.7rem]"></i>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
