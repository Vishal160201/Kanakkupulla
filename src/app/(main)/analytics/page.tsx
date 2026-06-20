import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalEarningsAgg,
    monthlyRevenueAgg,
    completedShootsCount,
    pendingRetouch
  ] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME' }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME', date: { gte: currentMonthStart } }
    }),
    prisma.booking.count({
      where: { deletedAt: null, date: { lt: today } }
    }),
    prisma.booking.count({
      where: { deletedAt: null, date: { lt: today, gte: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000) } }
    })
  ]);

  const totalEarnings = totalEarningsAgg._sum.amount || 0;
  const monthlyRevenue = monthlyRevenueAgg._sum.amount || 0;

  return (
    <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto animate-[fadeIn_0.4s_ease-out]">
      
      {/* Hero Card */}
      <div className="bg-slate-900 rounded-[20px] p-8 text-white relative overflow-hidden shadow-2xl transition-transform duration-300 hover:-translate-y-1 flex justify-between items-center group">
        <div className="absolute -top-[50px] -right-[50px] w-[250px] h-[250px] bg-orange-500 rounded-full blur-[90px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <div className="relative z-10">
          <div className="text-slate-400 text-[0.75rem] font-bold tracking-[1px] mb-1.5 uppercase">Total Combined Earnings</div>
          <div className="text-[2.5rem] font-extrabold mb-4 tracking-tight text-white drop-shadow-md">
            ₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          
          <div className="flex gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[0.5px]">Shoots Completed</span>
              <span className="text-[1.2rem] font-extrabold text-white">{completedShootsCount}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[0.5px]">Pending Retouch</span>
              <span className="text-[1.2rem] font-extrabold text-white">{pendingRetouch}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end relative z-10 bg-white/5 backdrop-blur-sm px-5 py-4 rounded-xl border border-white/10 group-hover:bg-white/10 transition-colors">
          <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[0.5px]">Growth Velocity</span>
          <span className="text-[1.8rem] font-extrabold text-white flex items-center gap-2">
            +14% <i className="ph-bold ph-trend-up text-orange-400"></i>
          </span>
          <span className="text-slate-400 text-[0.8rem] mt-1 font-medium">vs last month</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-200">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center">
              <i className="ph-bold ph-currency-inr text-[1.1rem]"></i>
            </div>
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Monthly</span>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Monthly Revenue</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">₹{(monthlyRevenue/1000).toFixed(1)}k</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col mt-4">
        <h2 className="text-[1.3rem] font-extrabold text-slate-900 tracking-tight mb-2">Detailed Analytics</h2>
        <p className="font-bold text-[0.85rem] text-slate-500">More charts and detailed metrics will go here.</p>
      </div>
    </div>
  );
}
