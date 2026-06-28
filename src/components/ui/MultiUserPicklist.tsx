"use client";

import { useState, useRef, useEffect } from "react";

export interface UserItem {
  id: string;
  name: string;
  image?: string | null;
  role: string;
  isBusy?: boolean;
}

interface MultiUserPicklistProps {
  users: UserItem[];
  value: string; // Stored as comma-separated IDs
  onChange: (val: string) => void;
  placeholder?: string;
  error?: boolean;
  showAvailability?: boolean;
}

export default function MultiUserPicklist({ users, value, onChange, placeholder = "Select users...", error, showAvailability = false }: MultiUserPicklistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert comma separated string to array of IDs
  const selectedIds = value ? value.split(',').filter(id => id.trim() !== '') : [];
  
  const selectedUsers = users.filter(u => selectedIds.includes(u.id));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleUser = (userId: string) => {
    let newSelectedIds;
    if (selectedIds.includes(userId)) {
      newSelectedIds = selectedIds.filter(id => id !== userId);
    } else {
      newSelectedIds = [...selectedIds, userId];
    }
    onChange(newSelectedIds.join(','));
  };

  const removeUser = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    const newSelectedIds = selectedIds.filter(id => id !== userId);
    onChange(newSelectedIds.join(','));
  };

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
        className={`min-h-[45px] w-full rounded-xl border bg-white px-3 py-2 transition-colors cursor-pointer flex flex-wrap gap-2 items-center ${
          error ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-200 hover:border-orange-300'
        } ${isOpen ? 'ring-2 ring-orange-500/50 border-orange-500' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedUsers.length === 0 ? (
          <span className="text-[0.95rem] text-slate-400 ml-1">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-2 items-center w-full">
            {selectedUsers.map(u => (
              <div 
                key={u.id} 
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full pl-1 pr-2 py-1 transition-colors group"
                onClick={(e) => e.stopPropagation()}
              >
                {u.image ? (
                  <img src={u.image} alt={u.name} className="w-6 h-6 rounded-full object-cover shadow-sm border border-white" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[0.6rem] font-bold shadow-sm border border-white">
                    {getInitials(u.name)}
                  </div>
                )}
                <span className="text-[0.75rem] font-bold text-slate-700">{u.name}</span>
                <button 
                  className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-colors ml-0.5"
                  onClick={(e) => removeUser(e, u.id)}
                >
                  <i className="ph-bold ph-x text-[0.6rem]"></i>
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="absolute right-3 top-[13px] text-slate-400 pointer-events-none">
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
              const isSelected = selectedIds.includes(u.id);
              return (
                <div 
                  key={u.id}
                  className={`px-4 py-2.5 cursor-pointer flex items-center justify-between transition-colors hover:bg-orange-50/80 ${isSelected ? 'bg-orange-50/50' : ''}`}
                  onClick={() => toggleUser(u.id)}
                >
                  <div className="flex items-center gap-3">
                    {u.image ? (
                      <img src={u.image} alt={u.name} className={`w-8 h-8 rounded-full object-cover shadow-sm border border-white ${showAvailability && u.isBusy ? 'grayscale opacity-60' : ''}`} />
                    ) : (
                      <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[0.7rem] font-bold shadow-sm border border-white shrink-0 ${showAvailability && u.isBusy ? 'text-slate-400' : 'text-slate-600'}`}>
                        {getInitials(u.name)}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className={`text-[0.85rem] font-bold ${isSelected ? 'text-orange-700' : (showAvailability && u.isBusy ? 'text-slate-400 line-through' : 'text-slate-700')}`}>{u.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[0.6rem] font-semibold text-slate-400 uppercase tracking-wider">{u.role}</span>
                        {showAvailability && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                            <span className={`text-[0.6rem] font-bold uppercase tracking-wider ${u.isBusy ? 'text-red-500' : 'text-emerald-500'}`}>
                              {u.isBusy ? 'Busy' : 'Available'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300'}`}>
                    {isSelected && <i className="ph-bold ph-check text-[0.7rem]"></i>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
