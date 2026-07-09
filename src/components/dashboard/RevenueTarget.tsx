import React from 'react';

interface RevenueTargetProps {
  currentRevenue: number;
}

export default function RevenueTarget({ currentRevenue }: RevenueTargetProps) {
  const target = 500000; 
  
  const progress = Math.min((currentRevenue / target) * 100, 100);
  const isGoalReached = progress >= 100;

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[110px]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[0.95rem] font-extrabold text-slate-900 tracking-tight">Period Target</h3>
        <span className="text-[0.6rem] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">₹{(target/1000).toFixed(0)}k Goal</span>
      </div>
      
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-[1.4rem] font-extrabold text-slate-900 tracking-tight">₹{currentRevenue.toLocaleString('en-IN')}</span>
        <span className="text-xs font-semibold text-slate-400">of ₹{target.toLocaleString('en-IN')}</span>
      </div>

      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden relative mb-1.5">
        <div 
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${
            isGoalReached 
              ? 'bg-emerald-500' 
              : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-[0.65rem] font-semibold text-slate-400">
        <span>0%</span>
        {isGoalReached ? (
          <span className="text-emerald-500 flex items-center gap-1 font-bold">Goal Reached! <i className="ph-fill ph-check-circle"></i></span>
        ) : (
          <span>{progress.toFixed(1)}%</span>
        )}
      </div>
    </div>
  );
}
