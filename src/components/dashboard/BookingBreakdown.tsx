import React, { Component, ReactNode } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface BookingBreakdownProps {
  data?: { name: string; value: number }[];
}

const STATUSES = ['Pending', 'Confirmed', 'Shoot Completed', 'Cancelled'];
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444']; // Orange, Blue, Green, Red

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Failed to load chart.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function BookingBreakdown({ data = [] }: BookingBreakdownProps) {
  // Bind explicitly to the 4 statuses
  const explicitData = STATUSES.map(status => {
    const found = data.find(d => d.name === status);
    return { name: status, value: found ? found.value : 0 };
  }).filter(d => d.value > 0);

  const total = explicitData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 p-3 rounded-2xl shadow-xl shadow-gray-200/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
            <span className="text-slate-500 text-xs font-semibold">{payload[0].name}:</span>
            <span className="text-slate-900 font-bold text-sm">{payload[0].value}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-[20px] p-5 md:p-6 border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-[1.1rem] font-extrabold text-slate-900 tracking-tight">Booking Breakdown</h3>
        <p className="text-slate-400 text-[0.75rem] font-medium">Categories by selected period</p>
      </div>
      
      <div className="w-full h-[220px] flex items-center justify-center relative">
        {total > 0 ? (
          <ErrorBoundary>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={explicitData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1000}
                  animationBegin={100}
                  cornerRadius={5}
                >
                  {explicitData.map((entry, index) => {
                    const colorIndex = STATUSES.indexOf(entry.name);
                    return <Cell key={`cell-${index}`} fill={COLORS[colorIndex >= 0 ? colorIndex : 0]} />;
                  })}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ErrorBoundary>
        ) : (
          <div className="text-slate-400 font-medium">No bookings found for period.</div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {explicitData.map((entry, index) => {
          const colorIndex = STATUSES.indexOf(entry.name);
          const percentage = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[colorIndex >= 0 ? colorIndex : 0] }} />
                <span className="text-slate-700 text-sm font-semibold">{entry.name}</span>
              </div>
              <span className="text-slate-900 text-sm font-bold">{percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
