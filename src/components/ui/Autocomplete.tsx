"use client";

import { useState, useRef, useEffect } from 'react';

interface AutocompleteProps {
  suggestions: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  error?: boolean;
}

export default function Autocomplete({ suggestions, value, onChange, placeholder = "", className = "form-control", style, error }: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes((value || '').toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input 
        type="text"
        className={`flex h-[45px] w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-200'
        } ${className || ''}`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (value.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
      />
      
      {isOpen && filteredSuggestions.length > 0 && value.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[1000] max-h-[200px] overflow-y-auto py-2">
          {filteredSuggestions.map((suggestion) => (
            <div 
              key={suggestion}
              className="px-4 py-2.5 cursor-pointer bg-transparent hover:bg-slate-50 text-slate-900 font-medium transition-colors"
              onClick={() => {
                onChange(suggestion);
                setIsOpen(false);
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
