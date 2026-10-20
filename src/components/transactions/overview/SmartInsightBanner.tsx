import type { HeatmapSegment } from "./overviewData";

export default function SmartInsightBanner({ highestExpenseCategory }: { highestExpenseCategory: HeatmapSegment | null }) {
  return (
    <div className="mb-8">
      <div className="bg-[#FFF7F0] rounded-[2rem] p-6 sm:p-8 flex flex-col xl:flex-row items-center gap-6 shadow-sm border border-[#FFE8D6]">

        {/* Main Insight Text */}
        <div className="flex items-center gap-5 flex-1 w-full">
          <div className="w-14 h-14 rounded-full bg-[#FFE6D5] flex items-center justify-center shrink-0">
            <i className="ph-fill ph-lightbulb text-[#F97316] text-[1.8rem]"></i>
          </div>
          <div>
            <h3 className="text-[1.2rem] font-black text-slate-900 mb-1">Smart Insight</h3>
            <p className="text-[0.9rem] text-slate-600 font-medium">
              Your largest expense is <span className="font-bold text-slate-800">{highestExpenseCategory ? highestExpenseCategory.category : 'N/A'} ({highestExpenseCategory ? Math.round(highestExpenseCategory.pct * 100) : 0}%)</span>.<br className="hidden sm:block" />
              Try reviewing high recurring expenses to save more.
            </p>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          {/* Save Potential */}
          <div className="bg-white rounded-2xl p-4 flex items-center gap-4 w-full sm:w-auto min-w-[240px] shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[#ECFDF5] flex items-center justify-center shrink-0">
              <i className="ph-bold ph-trend-up text-[#059669] text-xl"></i>
            </div>
            <div>
              <p className="text-[0.8rem] font-bold text-slate-500 mb-0.5">You save potential</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[1.2rem] font-black text-[#059669]">₹{Math.round((highestExpenseCategory?.amount || 0) * 0.1).toLocaleString('en-IN')}</span>
                <span className="text-[0.8rem] font-bold text-slate-400">/mo</span>
              </div>
              <p className="text-[0.7rem] font-semibold text-slate-400 mt-0.5">by optimizing top categories</p>
            </div>
          </div>

          {/* Stay on Track */}
          <div className="bg-white rounded-2xl p-4 flex items-center gap-4 w-full sm:w-auto min-w-[240px] shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
              <i className="ph-bold ph-shield-check text-[#2563EB] text-xl"></i>
            </div>
            <div>
              <p className="text-[0.8rem] font-bold text-slate-500 mb-0.5">Stay on track</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[1.2rem] font-black text-[#2563EB]">₹439</span>
                <span className="text-[0.8rem] font-bold text-[#2563EB]">ahead</span>
              </div>
              <p className="text-[0.7rem] font-semibold text-slate-400 mt-0.5">of last week&apos;s average</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
