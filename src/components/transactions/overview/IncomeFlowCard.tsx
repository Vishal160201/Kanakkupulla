import Link from "next/link";

interface IncomeFlowCardProps {
  totalIncome: number;
  dayLabels: string[];
  actualFlow: number[];
  maxFlow: number;
}

const axisLabel = (maxFlow: number, fraction: number, fallback: string, round: (v: number) => number) => {
  if (!(maxFlow > 0)) return fallback;
  if (maxFlow >= 1000) return `${((maxFlow * fraction) / 1000).toFixed(1)}k`;
  return round(maxFlow);
};

export default function IncomeFlowCard({ totalIncome, dayLabels, actualFlow, maxFlow }: IncomeFlowCardProps) {
  const peak = Math.max(...actualFlow);

  return (
    <div className="h-full bg-white rounded-[24px] p-5 xl:p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)] border border-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <i className="ph-fill ph-chart-line-up text-xl"></i>
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 leading-tight truncate">Income Flow</h2>
            <p className="text-xs font-bold text-slate-400 mt-1 truncate">Aggregated for selected period</p>
          </div>
        </div>
        <div className="px-2.5 py-2 border border-gray-200 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-colors shrink-0">
          <span className="text-xs font-bold text-slate-600">This week</span>
          <i className="ph-bold ph-caret-down text-slate-400 text-[10px]"></i>
        </div>
      </div>

      {/* Total Income Banner */}
      <div className="bg-[#FFF4ED] rounded-2xl p-4 mb-5">
        <span className="text-xs font-bold text-slate-500 mb-1 block">Total Income</span>
        <span className="text-2xl font-black text-[#F97316] leading-none block">₹{totalIncome.toLocaleString('en-IN')}</span>
      </div>

      <div className="mt-auto w-full flex flex-col">
        {/* Bar Chart Area */}
        <div className="flex h-[178px] relative mb-5">
        {/* Y Axis */}
        <div className="flex flex-col justify-between text-[0.65rem] sm:text-[0.7rem] font-bold text-slate-400 pb-6 pr-2 sm:pr-4 w-10 sm:w-12 shrink-0">
          <span>{axisLabel(maxFlow, 1, '1k', v => v)}</span>
          <span>{axisLabel(maxFlow, 0.75, '', v => Math.round(v * 0.75))}</span>
          <span>{axisLabel(maxFlow, 0.5, '', v => Math.round(v / 2))}</span>
          <span>{axisLabel(maxFlow, 0.25, '', v => Math.round(v * 0.25))}</span>
          <span>₹0</span>
        </div>
        {/* Bars */}
        <div className="flex-1 flex justify-between items-end pb-6 relative">
          {/* Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pb-6 pointer-events-none opacity-50">
            {[0,1,2,3,4].map(i => <div key={i} className="w-full h-px bg-slate-100 border-t border-dashed border-slate-200"></div>)}
          </div>

          {dayLabels.map((day, idx) => {
            const val = actualFlow[idx];
            const isMax = val === peak && val > 0;
            const heightPct = maxFlow > 0 ? (val / maxFlow) * 100 : 0;
            return (
              <div key={day} className="flex flex-col items-center justify-end w-full h-full relative z-10 group">
                <div className="w-full h-full relative flex items-end justify-center">
                  {isMax && (
                    <span className="absolute bottom-[calc(100%+4px)] text-[0.6rem] sm:text-[0.7rem] font-black text-slate-800 whitespace-nowrap">₹{val.toLocaleString('en-IN')}</span>
                  )}
                  <div
                    className={`w-5 sm:w-6 lg:w-8 rounded-t-sm sm:rounded-t-lg transition-all ${isMax ? 'bg-[#F97316]' : 'bg-[#FFDCC3] hover:bg-[#FFB98A]'}`}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  ></div>
                </div>
                <span className="absolute -bottom-6 text-[0.6rem] sm:text-[0.7rem] font-bold text-slate-400">{day.toUpperCase()}</span>
              </div>
            )
          })}
        </div>
      </div>

        <div className="pt-2">
          <Link href="/transactions/allTransactions?view=week&type=INCOME" className="text-sm font-extrabold text-[#F97316] hover:text-orange-600 flex items-center gap-2 w-fit">
            View income <i className="ph-bold ph-arrow-right"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}
