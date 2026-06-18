"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (val: string | null) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({ options, value, onChange, placeholder = "Select...", className }: CustomSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className || "w-full rounded-xl border-gray-200"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent sideOffset={4} className="rounded-xl border-gray-200 shadow-lg">
        {options.map((option) => (
          <SelectItem key={option} value={option} className="cursor-pointer focus:bg-orange-50 focus:text-orange-600 rounded-lg mx-1 my-0.5">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
