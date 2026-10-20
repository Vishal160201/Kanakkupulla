import Link from "next/link";
import type { HeatmapSegment } from "./overviewData";
import { Tooltip } from "@/components/ui/Tooltip";

interface OverviewKpiCardsProps {
  todayIncome: number;
  todayExpense: number;
  todayNet: number;
  todayCashNet: number;
  todayUpiNet: number;
  highestExpenseCategory: HeatmapSegment | null;
}

const wholeRupees = (value: number) =>
  value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const pillStyle = {
  background: "linear-gradient(145deg, #ffffff 0%, #f3f4f6 100%)",
  boxShadow: "2px 2px 5px rgba(0,0,0,0.03), -2px -2px 5px rgba(255,255,255,1), inset 0 0 0 1px rgba(255,255,255,0.6)"
};

function TodayDots() {
  return (
    <div className="flex gap-0.5">
      <div className="w-[1.5px] h-[1.5px] rounded-full bg-slate-500"></div>
      <div className="w-[1.5px] h-[1.5px] rounded-full bg-slate-500"></div>
      <div className="w-[1.5px] h-[1.5px] rounded-full bg-slate-500"></div>
    </div>
  );
}

function ModePill({ label, value, iconClass, iconColor }: { label: string; value: number; iconClass: string; iconColor: string }) {
  return (
    <div
      className="rounded-[8px] sm:rounded-[12px] px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2"
      style={pillStyle}
    >
      <div className={`${iconColor} drop-shadow-sm`}>
        <i className={`${iconClass} text-[0.85rem] sm:text-[1.1rem]`}></i>
      </div>
      <div className="flex flex-col">
        <span className="text-[0.5rem] sm:text-[0.55rem] font-extrabold text-slate-500 uppercase tracking-wider leading-none">{label}</span>
        <span className="text-[0.75rem] sm:text-[0.9rem] font-bold text-[#1a1f36] leading-tight">₹{wholeRupees(value)}</span>
      </div>
    </div>
  );
}

export default function OverviewKpiCards({ todayIncome, todayExpense, todayNet, todayCashNet, todayUpiNet, highestExpenseCategory }: OverviewKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-5 mb-8">
      {/* Today's Income */}
      <Link href="/transactions/allTransactions?view=day&type=INCOME" className="block outline-none group min-w-0">
        <div className="bg-white rounded-lg sm:rounded-[18px] md:rounded-[22px] p-3 sm:p-4 md:p-5 shadow-sm sm:shadow-[0_18px_45px_rgba(15,23,42,0.08)] border border-slate-100/80 flex flex-col justify-between h-[130px] md:h-[150px] animate-slide-up hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 transition-all relative overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-orange-200" style={{ animationDelay: "100ms" }}>
          <div className="flex justify-between items-start gap-1.5 sm:gap-2">
            <div className="min-w-0">
              <span className="text-[0.55rem] sm:text-[0.6rem] md:text-[0.65rem] font-extrabold text-slate-500 uppercase tracking-[1px]">Today&apos;s Income</span>
              <div className="text-[0.95rem] sm:text-[1.2rem] md:text-[1.5rem] font-extrabold text-slate-950 mt-1.5 sm:mt-2 md:mt-3 leading-none truncate">₹{wholeRupees(todayIncome)}</div>
            </div>
            <span className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg text-emerald-600 bg-emerald-50 flex items-center justify-center shrink-0">
              <i className="ph-bold ph-trend-up text-xs sm:text-sm md:text-base"></i>
            </span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="text-[0.65rem] sm:text-[0.75rem] text-slate-500 font-bold">Today</div>
            <svg viewBox="0 0 130 54" className="w-[70px] sm:w-[90px] md:w-[110px] h-[30px] sm:h-[38px] md:h-[46px] overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient id="incomeSpark" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6ee7d3" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <path d="M4 40 L17 28 L30 29 L43 25 L56 29 L69 19 L82 24 L95 25 L108 15 L126 3" fill="none" stroke="url(#incomeSpark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength="100" strokeDasharray="100" strokeDashoffset="100" className="animate-dash" style={{ animationDelay: "450ms" }} />
            </svg>
          </div>
        </div>
      </Link>

      {/* Today's Expenses */}
      <Link href="/transactions/allTransactions?view=day&type=EXPENSE" className="block outline-none group min-w-0">
        <div className="bg-white rounded-lg sm:rounded-[18px] md:rounded-[22px] p-3 sm:p-4 md:p-5 shadow-sm sm:shadow-[0_18px_45px_rgba(15,23,42,0.08)] border border-slate-100/80 flex flex-col justify-between h-[130px] md:h-[150px] animate-slide-up hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 transition-all relative overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-orange-200" style={{ animationDelay: "150ms" }}>
          <div className="flex justify-between items-start gap-1.5 sm:gap-2">
            <div className="min-w-0">
              <span className="text-[0.55rem] sm:text-[0.6rem] md:text-[0.65rem] font-extrabold text-slate-500 uppercase tracking-[1px]">Today&apos;s Expenses</span>
              <div className="text-[0.95rem] sm:text-[1.2rem] md:text-[1.5rem] font-extrabold text-slate-950 mt-1.5 sm:mt-2 md:mt-3 leading-none truncate">₹{wholeRupees(todayExpense)}</div>
            </div>
            <span className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg text-rose-600 bg-rose-50 flex items-center justify-center shrink-0">
              <i className="ph-bold ph-trend-down text-xs sm:text-sm md:text-base"></i>
            </span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="text-[0.65rem] sm:text-[0.75rem] text-slate-500 font-bold">Today</div>
            <svg viewBox="0 0 130 54" className="w-[70px] sm:w-[90px] md:w-[110px] h-[30px] sm:h-[38px] md:h-[46px] overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient id="expenseSpark" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <path d="M4 18 L17 15 L30 18 L43 16 L56 23 L69 14 L82 22 L95 18 L108 28 L126 33" fill="none" stroke="url(#expenseSpark)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength="100" strokeDasharray="100" strokeDashoffset="100" className="animate-dash" style={{ animationDelay: "500ms" }} />
            </svg>
          </div>
        </div>
      </Link>

      {/* Net Today */}
      {/* Full width on phones so the amount and Cash/UPI pills keep their side-by-side layout */}
      <Link href="/transactions/allTransactions?view=day" className="block outline-none group min-w-0 max-sm:col-span-2">
        <div
          className="rounded-lg sm:rounded-[18px] md:rounded-[22px] p-2.5 sm:p-4 shadow-[0_8px_32px_rgba(15,23,42,0.04)] flex flex-col h-[130px] md:h-[150px] animate-slide-up transition-all relative overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-orange-200 group-hover:-translate-y-0.5 group-hover:shadow-md"
          style={{
            animationDelay: "200ms",
            background: "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(245,248,255,0.85) 100%)",
            backdropFilter: "blur(12px)",
            boxShadow: "inset 0 0 0 1px rgba(184, 134, 11, 0.25), 0 10px 40px -10px rgba(0,0,0,0.08)"
          }}
        >
          {/* Top Row */}
          <div className="flex justify-between items-start gap-1 relative z-10">
            <span className="text-[0.55rem] sm:text-[0.6rem] md:text-[0.65rem] font-bold text-slate-500 uppercase tracking-[1px]">Net Today</span>
            <div
              className="px-1.5 sm:px-2 py-0.5 rounded-md shadow-sm border border-white/50"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(220,230,245,0.6) 100%)",
                boxShadow: "inset 0 1px 1px white, 0 2px 4px rgba(0,0,0,0.05)"
              }}
            >
              <span className={`text-[0.45rem] sm:text-[0.55rem] font-extrabold tracking-[0.8px] drop-shadow-sm ${todayNet >= 0 ? 'text-slate-500' : 'text-rose-600'}`}>
                {todayNet >= 0 ? 'HEALTHY' : 'DEFICIT'}
              </span>
            </div>
          </div>

          {/* Main Value + Pills side by side */}
          <div className="flex items-center justify-between gap-2 flex-1 relative z-10 mt-2 sm:mt-3 min-w-0">
            <Tooltip content={`₹${todayNet.toLocaleString('en-IN')}`}>
              <div className="text-[1.1rem] sm:text-[1.4rem] md:text-[1.6rem] font-black text-[#1a1f36] leading-none truncate">
                ₹{wholeRupees(todayNet)}
              </div>
            </Tooltip>

            <div className="flex flex-col gap-1.5 shrink-0">
              {/* CASH Pill */}
              <ModePill label="Cash" value={todayCashNet} iconClass="ph-fill ph-money" iconColor="text-emerald-600" />
              {/* UPI Pill */}
              <ModePill label="UPI" value={todayUpiNet} iconClass="ph-bold ph-qr-code" iconColor="text-indigo-600" />
            </div>
          </div>

          {/* Background Chart / Bottom text */}
          <div className="absolute bottom-0 left-0 right-0 h-[40px] pointer-events-none flex flex-col justify-end overflow-hidden rounded-b-lg sm:rounded-b-[18px] md:rounded-b-[22px]">
            {/* Faint Background Line */}
            <svg viewBox="0 0 200 40" className="absolute bottom-2 left-0 w-full h-[30px] opacity-20" preserveAspectRatio="none">
              <path d="M0,20 Q20,5 40,20 T80,20 T120,15 T160,25 T200,10" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {/* Main Line */}
            <svg viewBox="0 0 200 40" className="absolute bottom-2 left-0 w-full h-[30px]" preserveAspectRatio="none">
              <path d="M0,35 Q20,25 40,30 T80,25 T120,32 T160,20 T200,28" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" className="animate-dash" strokeDasharray="300" strokeDashoffset="300" style={{ animationDelay: "550ms" }} />
            </svg>

            <div className="flex items-center justify-center gap-1.5 mb-1 opacity-60">
              <TodayDots />
              <span className="text-[0.45rem] sm:text-[0.55rem] font-bold text-slate-500 uppercase tracking-widest leading-none">Today</span>
              <TodayDots />
            </div>
          </div>

        </div>
      </Link>

      {/* Top Expense */}
      <Link href={`/transactions/allTransactions?categories=${highestExpenseCategory ? encodeURIComponent(highestExpenseCategory.category) : ''}`} className="block outline-none group min-w-0 max-sm:col-span-2">
        <div className="bg-white rounded-lg sm:rounded-[18px] md:rounded-[22px] p-3 sm:p-4 md:p-5 shadow-sm sm:shadow-[0_18px_45px_rgba(15,23,42,0.08)] border border-slate-100/80 flex flex-col justify-between h-[130px] md:h-[150px] animate-slide-up hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 transition-all relative overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-orange-200" style={{ animationDelay: "250ms" }}>
          <span className="text-[0.55rem] sm:text-[0.6rem] md:text-[0.65rem] font-extrabold text-slate-500 uppercase tracking-[1px]">Top Expense</span>
          <div className="flex items-center justify-between gap-1.5 sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[0.7rem] sm:text-[0.85rem] md:text-[0.95rem] font-extrabold text-slate-950 leading-tight truncate">
                {highestExpenseCategory ? highestExpenseCategory.category : 'No expenses'}
              </p>
              <p className="text-[0.55rem] sm:text-[0.65rem] md:text-[0.75rem] text-slate-500 font-medium mt-0.5 leading-snug truncate">
                of total expenses
              </p>
            </div>
            <div className="relative w-[48px] h-[32px] sm:w-[64px] sm:h-[42px] md:w-[80px] md:h-[52px] shrink-0">
              <svg viewBox="0 0 120 78" className="w-full h-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id="topExpenseGauge" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                <path d="M 18 66 A 42 42 0 0 1 102 66" fill="none" stroke="#eef2f7" strokeWidth="14" strokeLinecap="round" />
                <path d="M 18 66 A 42 42 0 0 1 102 66" fill="none" stroke="url(#topExpenseGauge)" strokeWidth="14" strokeLinecap="round" strokeDasharray="132" strokeDashoffset="132">
                  <animate attributeName="stroke-dashoffset" from="132" to={highestExpenseCategory ? 132 - (highestExpenseCategory.pct * 132) : 132} dur="1.5s" begin="600ms" fill="freeze" />
                </path>
              </svg>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 font-extrabold text-[0.6rem] sm:text-[0.8rem] md:text-[1rem] text-slate-950 leading-none">
                {highestExpenseCategory ? Math.round(highestExpenseCategory.pct * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
