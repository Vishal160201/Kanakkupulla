"use client";

import PillSelect from "./PillSelect";

interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (val: string | null) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({ options, value, onChange, placeholder = "Select..." }: CustomSelectProps) {
  const pillOptions = options.map((o) => ({ value: o, label: o }));
  const currentVal = value || (options[0] ?? "");

  return (
    <PillSelect
      options={pillOptions}
      value={currentVal}
      onChange={(v) => onChange(v)}
    />
  );
}
