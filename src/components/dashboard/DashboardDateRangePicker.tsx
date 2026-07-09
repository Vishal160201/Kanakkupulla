import React, { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { useSWRConfig } from 'swr';

type DateRange = { startDate: Date; endDate: Date };
type RangeOption = 'Today' | 'This Week' | 'This Month' | 'Custom';

interface DashboardDateRangePickerProps {
  onRangeChange: (range: DateRange | null) => void;
}

export default function DashboardDateRangePicker({ onRangeChange }: DashboardDateRangePickerProps) {
  const [selected, setSelected] = useState<RangeOption>('This Month');
  const { mutate } = useSWRConfig();

  const ranges: Record<RangeOption, DateRange> = {
    'Today': { startDate: new Date(), endDate: new Date() },
    'This Week': { startDate: startOfWeek(new Date()), endDate: endOfWeek(new Date()) },
    'This Month': { startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()) },
    'Custom': { startDate: new Date(), endDate: new Date() }, // Fallback for custom
  };

  const handleSelect = (val: string) => {
    const option = val as RangeOption;
    setSelected(option);
    if (option !== 'Custom') {
      onRangeChange(ranges[option]);
    }
    
    // Invalidate any dashboard overview cache to force fresh data on next render
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/api/dashboard/overview'),
      undefined,
      { revalidate: true }
    );
  };

  return (
    <div className="w-[180px]">
      <CustomDropdown
        options={[
          { label: 'Today', value: 'Today' },
          { label: 'This Week', value: 'This Week' },
          { label: 'This Month', value: 'This Month' },
          { label: 'Custom', value: 'Custom' }
        ]}
        value={selected}
        onChange={handleSelect}
        className="font-bold shadow-sm"
      />
    </div>
  );
}
