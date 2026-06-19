import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS: Record<string, string> = {
  "Photography Session": "ph-camera",
  "Equipment": "ph-wrench",
  "Utilities": "ph-lightning",
  "Rent": "ph-house",
  "Software": "ph-code",
  "Travel": "ph-airplane",
  "Marketing": "ph-megaphone",
  "Misc": "ph-dots-three-circle",
};

const MODE_ICONS: Record<string, string> = {
  "UPI": "ph-qr-code",
  "Cash": "ph-money",
  "Bank Transfer": "ph-bank",
  "Card": "ph-credit-card",
};

export default async function OverviewPage() {
  // --- Data Fetching ---
  const today = new Date();
  
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const [
    totalEarningsAgg,
    monthlyRevenueAgg,
    totalBookings,
    completedShootsCount,
    upcomingShoots,
    pendingRetouch,
    activeOrders,
    totalActiveOrders,
    todayTransactions,
    todayIncomeAgg,
    todayExpenseAgg
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
      where: { deletedAt: null }
    }),
    prisma.booking.count({
      where: { deletedAt: null, date: { lt: today } }
    }),
    prisma.booking.findMany({
      where: { deletedAt: null, date: { gte: today } },
      include: { order: true, client: true },
      orderBy: { date: 'asc' },
      take: 3
    }),
    prisma.booking.count({
      where: { deletedAt: null, date: { lt: today, gte: twoWeeksAgo } }
    }),
    prisma.productOrder.findMany({
      where: { status: { not: 'DELIVERED' } },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 1
    }),
    prisma.productOrder.count({
      where: { status: { not: 'DELIVERED' } }
    }),
    prisma.transaction.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      orderBy: { date: 'desc' },
      take: 10
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME', date: { gte: todayStart, lte: todayEnd } }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'EXPENSE', date: { gte: todayStart, lte: todayEnd } }
    })
  ]);

  const totalEarnings = totalEarningsAgg._sum.amount || 0;
  const monthlyRevenue = monthlyRevenueAgg._sum.amount || 0;
  const topOrder = activeOrders[0];
  const todayIncome = todayIncomeAgg._sum.amount || 0;
  const todayExpense = todayExpenseAgg._sum.amount || 0;
  const todayNet = todayIncome - todayExpense;

  return (
    <section id="view-dashboard" className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto animate-[fadeIn_0.4s_ease-out] pb-20">
      {/* Hero Card */}
      <div className="bg-slate-900 rounded-[20px] p-8 mb-4 text-white relative overflow-hidden shadow-2xl transition-transform duration-300 hover:-translate-y-1 flex justify-between items-center group">
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

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-200">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-green-50 text-green-500 flex items-center justify-center">
              <i className="ph-fill ph-address-book text-[1.1rem]"></i>
            </div>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Total Bookings</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">{totalBookings}</div>
          </div>
        </div>
        
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

        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-200">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
              <i className="ph-fill ph-package text-[1.1rem]"></i>
            </div>
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Priority</span>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Gallery Deliveries</div>
            <div className="flex items-baseline gap-1">
              <span className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">{pendingRetouch}</span>
              <span className="text-[1rem] font-bold text-slate-500">Due</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-200">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
              <i className="ph-fill ph-gift text-[1.1rem]"></i>
            </div>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Active</span>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Gift Shop Orders</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">{totalActiveOrders}</div>
          </div>
        </div>
      </div>

      {/* ═══════ TODAY'S TRANSACTIONS — Full-Width Showcase ═══════ */}
      <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl mb-2 transition-transform duration-300 hover:-translate-y-1 group">
        {/* Animated Glow Orbs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-orange-500 rounded-full blur-[120px] opacity-15 group-hover:opacity-25 transition-opacity duration-700" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-violet-500 rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500 rounded-full blur-[160px] opacity-[0.04]" />

        {/* Header Bar */}
        <div className="relative z-10 flex items-center justify-between px-8 pt-7 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <i className="ph-bold ph-receipt text-white text-lg" />
            </div>
            <div>
              <h3 className="text-white text-[1.15rem] font-extrabold tracking-tight leading-tight">Today&apos;s Transactions</h3>
              <p className="text-slate-400 text-[0.7rem] font-semibold tracking-wide uppercase">{today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          <Link href="/dashboard/transactions" className="text-[0.8rem] font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
            View All <i className="ph-bold ph-arrow-right" />
          </Link>
        </div>

        {/* Summary Strip */}
        <div className="relative z-10 grid grid-cols-3 gap-4 px-8 py-5">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <i className="ph-bold ph-arrow-down-left text-emerald-400 text-xs" />
              </div>
              <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[1px]">Income</span>
            </div>
            <span className="text-white text-[1.5rem] font-extrabold tracking-tight">₹{todayIncome.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                <i className="ph-bold ph-arrow-up-right text-red-400 text-xs" />
              </div>
              <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[1px]">Expense</span>
            </div>
            <span className="text-white text-[1.5rem] font-extrabold tracking-tight">₹{todayExpense.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-lg ${todayNet >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                <i className={`ph-bold ${todayNet >= 0 ? 'ph-trend-up text-emerald-400' : 'ph-trend-down text-red-400'} text-xs`} />
              </div>
              <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-[1px]">Net Today</span>
            </div>
            <span className={`text-[1.5rem] font-extrabold tracking-tight ${todayNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {todayNet >= 0 ? '+' : ''}₹{todayNet.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Transaction List */}
        <div className="relative z-10 px-8 pb-7">
          {todayTransactions.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm border border-dashed border-white/10 rounded-2xl p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                <i className="ph ph-receipt text-3xl text-slate-500" />
              </div>
              <p className="text-slate-400 font-semibold text-sm">No transactions recorded today</p>
              <p className="text-slate-500 text-xs mt-1">Add your first transaction to see it here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {todayTransactions.map((txn, idx) => (
                <div
                  key={txn.id}
                  className="group/item flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-sm rounded-2xl px-5 py-3.5 border border-white/[0.06] hover:border-white/15 transition-all duration-200 cursor-pointer"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg ${
                      txn.type === 'INCOME'
                        ? 'bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 text-emerald-400 shadow-emerald-500/10'
                        : 'bg-gradient-to-br from-red-400/20 to-red-600/20 text-red-400 shadow-red-500/10'
                    }`}>
                      <i className={`ph-fill ${CATEGORY_ICONS[txn.category] || 'ph-dots-three-circle'}`} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-[0.9rem] leading-tight">{txn.category}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[0.55rem] font-extrabold uppercase tracking-[0.5px] ${
                          txn.type === 'INCOME'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}>{txn.type}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {txn.description && (
                          <span className="text-slate-500 text-[0.75rem] font-medium truncate max-w-[200px]">{txn.description}</span>
                        )}
                        <span className="text-slate-600 text-[0.65rem] flex items-center gap-1">
                          <i className={`ph-fill ${MODE_ICONS[txn.paymentMode] || 'ph-wallet'} text-[0.6rem]`} />
                          {txn.paymentMode}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 text-[0.7rem] font-semibold">
                      {txn.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                    <span className={`text-[1.05rem] font-extrabold tracking-tight ${
                      txn.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {txn.type === 'INCOME' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Split Section */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[1.2rem] font-extrabold text-slate-900 tracking-tight">Upcoming Shoots</h3>
            <Link href="/bookings/overview" className="text-[0.85rem] font-semibold text-slate-500 flex items-center gap-1 hover:text-slate-900 transition-colors">
              View Calendar <i className="ph-fill ph-calendar-blank"></i>
            </Link>
          </div>
          
          <div className="flex flex-col gap-4">
            {upcomingShoots.length === 0 ? (
               <div className="bg-white border border-dashed border-gray-300 rounded-[20px] p-8 text-center text-slate-400">
                 <p className="font-medium">No upcoming shoots found.</p>
                 <Link href="/bookings/overview" className="text-orange-500 text-sm font-bold mt-2 inline-block">Add Booking</Link>
               </div>
            ) : upcomingShoots.map(shoot => (
              <div key={shoot.id} className="bg-orange-50 border border-orange-200 rounded-[20px] p-4 flex items-center justify-between cursor-pointer shadow-sm transition-all hover:translate-x-1 hover:shadow-md hover:bg-orange-100/50">
                <div className="flex items-center gap-4">
                  <div className="w-[40px] h-[40px] rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center text-[1.2rem]">
                    <i className="ph-fill ph-camera"></i>
                  </div>
                  <div className="flex flex-col">
                    <span className="bg-orange-100 text-orange-700 w-max px-2 py-0.5 rounded-md text-[0.6rem] font-extrabold uppercase tracking-[0.5px] mb-1">{shoot.category}</span>
                    <h4 className="text-[1rem] font-extrabold text-slate-900 leading-tight tracking-tight mb-0.5">{shoot.client.name}</h4>
                    <p className="text-slate-500 text-[0.8rem] font-medium mt-0.5">{shoot.date.toLocaleDateString()} at {shoot.time} - {shoot.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5 pl-4 border-l border-orange-200">
                  <div className="flex flex-col items-end">
                    <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-[0.5px] mb-0.5">Amount</span>
                    <span className="text-[1rem] font-extrabold text-slate-900 leading-tight">₹{shoot.order?.package.toLocaleString('en-IN') || '0'}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-[0.5px] mb-0.5">Status</span>
                    <span className={`text-[0.9rem] font-bold leading-tight ${shoot.status === 'Confirmed' ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {shoot.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[1.2rem] font-extrabold text-slate-900 tracking-tight">Gift Shop Tracking</h3>
            <i className="ph-fill ph-shopping-cart text-orange-500 text-[1.3rem]"></i>
          </div>
          
          {topOrder ? (
            <div className="bg-white border border-gray-200 rounded-[20px] p-5 shadow-sm transition-all hover:border-orange-200 hover:-translate-y-1 hover:shadow-md cursor-pointer">
              <div className="flex flex-col">
                <div className="flex justify-between items-end mb-2.5">
                  <span className="font-extrabold text-slate-900 text-[0.95rem]">{topOrder.product.name} ({topOrder.quantity}x)</span>
                  <span className="font-bold text-slate-500 text-[0.75rem]">{topOrder.status}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                  <div className={`h-full rounded-full ${
                    topOrder.status === 'PENDING' ? 'bg-amber-500 w-[20%]' :
                    topOrder.status === 'PROCESSING' ? 'bg-blue-500 w-[50%]' :
                    topOrder.status === 'SHIPPED' ? 'bg-indigo-500 w-[80%]' : 'bg-emerald-500 w-[100%]'
                  }`}></div>
                </div>
                <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-[0.5px]">For: {topOrder.clientName}</div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-gray-200 rounded-[20px] p-8 text-center text-slate-400">
               <i className="ph ph-package text-3xl mb-2 opacity-50"></i>
               <p className="font-medium text-sm">No active product orders.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
