import CalendarWidget from '@/components/dashboard/CalendarWidget';
import UpcomingShoots from '@/components/dashboard/UpcomingShoots';
import prisma from "@/lib/prisma";
import { Booking } from "@/types";

export const dynamic = "force-dynamic";

export default async function BookingsOverviewPage() {
  const dbBookings = await prisma.booking.findMany({
    where: { deletedAt: null },
    include: { client: true, order: true },
    orderBy: { date: 'desc' }
  });

  const systemSetting = await prisma.systemSetting.findUnique({
    where: { key: "UI_PREFERENCES" }
  });
  const prefs = systemSetting?.value as any || { currencySymbol: "₹", hotDateThreshold: 50000 };

  const bookings: Booking[] = dbBookings.map(b => ({
    id: b.id,
    bookingNumber: b.bookingNumber,
    title: b.client.name,
    category: b.category,
    date: b.date.toISOString().split('T')[0],
    time: b.time,
    location: b.location,
    phone: b.client.phone,
    email: b.client.email || '',
    package: b.order?.package.toString() || '',
    advance: b.order?.advance.toString() || '',
    due: b.order?.due.toString() || '',
    status: b.status as any
  }));

  // Calculate Metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;

  let immediateShoots = 0; // Today and Tomorrow
  let thisWeekShoots = 0; // Next 7 days
  let pendingDueAmount = 0; // Due amounts in next 14 days
  let unconfirmedShoots = 0; // Pending status in next 14 days
  // Hot Date calculation based on highest combined package value
  const upcomingDateStats: Record<string, { count: number, totalPackage: number }> = {};
  let hotDateStr = "";
  let maxPackageValue = 0;
  let hotDateCount = 0;

  bookings.forEach(booking => {
    const [year, month, day] = booking.date.split('-').map(Number);
    const bookingDate = new Date(year, month - 1, day);
    bookingDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((bookingDate.getTime() - today.getTime()) / msPerDay);

    if (diffDays >= 0) {
      if (diffDays <= 1) immediateShoots++;
      if (diffDays <= 7) thisWeekShoots++;
      
      if (diffDays <= 14) {
        if (booking.status === 'PENDING') unconfirmedShoots++;
        
        const due = parseFloat(booking.due || "0");
        if (due > 0) pendingDueAmount += due;
      }
      
      // Track stats for hot date
      const dStr = booking.date; // already YYYY-MM-DD
      const pkgValue = parseFloat(booking.package || '0');
      
      if (!upcomingDateStats[dStr]) {
        upcomingDateStats[dStr] = { count: 0, totalPackage: 0 };
      }
      upcomingDateStats[dStr].count += 1;
      upcomingDateStats[dStr].totalPackage += pkgValue;

      // Update max logic
      if (upcomingDateStats[dStr].totalPackage > maxPackageValue) {
        maxPackageValue = upcomingDateStats[dStr].totalPackage;
        hotDateStr = dStr;
        hotDateCount = upcomingDateStats[dStr].count;
      }
    }
  });

  // Decide what to show on the 4th card
  let card4Title = "No Upcoming Dates";
  let card4Value = "None";
  let card4Subtitle: string | null = null;
  let card4Icon = "ph-calendar-blank";
  let card4Badge: string | null = null;

  if (hotDateStr && maxPackageValue >= prefs.hotDateThreshold) {
    card4Title = "Hot Date";
    const [y, m, d] = hotDateStr.split('-').map(Number);
    card4Value = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    card4Subtitle = `${hotDateCount} shoot${hotDateCount > 1 ? 's' : ''} booked`;
    card4Icon = "ph-fire";
    card4Badge = "High Value";
  }

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-red-200 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
              <i className="ph-fill ph-fire text-[1.1rem]"></i>
            </div>
            {immediateShoots > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Urgent</span>}
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Today & Tomorrow</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">{immediateShoots} <span className="text-[0.8rem] text-slate-400 font-semibold">shoots</span></div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-blue-200 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <i className="ph-fill ph-calendar-blank text-[1.1rem]"></i>
            </div>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Pipeline</span>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Next 7 Days</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">{thisWeekShoots} <span className="text-[0.8rem] text-slate-400 font-semibold">shoots</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-green-200 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-green-50 text-green-600 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
              <i className="ph-fill ph-wallet text-[1.1rem]"></i>
            </div>
            {pendingDueAmount > 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">Collect</span>}
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">Upcoming Dues (14d)</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">{prefs.currencySymbol}{pendingDueAmount.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-orange-200 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-[32px] h-[32px] rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <i className={`ph-fill ${card4Icon} text-[1.1rem]`}></i>
            </div>
            {card4Badge && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[0.6rem] font-extrabold uppercase tracking-[0.5px]">{card4Badge}</span>}
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">{card4Title}</div>
            <div className="text-[1.3rem] font-extrabold text-slate-900 leading-none tracking-tight">{card4Value}</div>
            {card4Subtitle && <div className="text-[0.75rem] font-bold text-orange-500 mt-1 truncate">{card4Subtitle}</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-6">
        <CalendarWidget bookings={bookings} />
        <div>
          <UpcomingShoots bookings={bookings} />
        </div>
      </div>
    </>
  );
}

