"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import OrderForm from "@/components/gifts/OrderForm";
import OrdersTable from "@/components/gifts/OrdersTable";
import ProductCategoriesStrip from "@/components/gifts/ProductCategoriesStrip";
import { Plus, Settings, ShoppingBag, Truck, PackageOpen, CalendarClock, CalendarDays } from "lucide-react";
import { isTomorrow, isThisWeek } from "date-fns";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function GiftsPage() {
  const { data: productsData } = useSWR("/api/gifts/products", fetcher, {
    revalidateOnFocus: false
  });

  const { data: ordersData, mutate } = useSWR("/api/gifts/orders", fetcher);

  const orders = ordersData?.orders || [];

  // Calculate metrics
  const pendingCount = orders.filter((o: any) => o.status === "PENDING").length;
  const productionCount = orders.filter((o: any) => o.status === "PROCESSING").length;
  const readyCount = orders.filter((o: any) => o.status === "READY").length;
  
  const dueTomorrowCount = orders.filter((o: any) => o.customData?.dueDate && isTomorrow(new Date(o.customData.dueDate))).length;
  const dueThisWeekCount = orders.filter((o: any) => o.customData?.dueDate && isThisWeek(new Date(o.customData.dueDate))).length;

  return (
    <div className="min-h-screen bg-[#FDFBF9] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100/40 via-[#FDFBF9] to-blue-50/40 p-4 md:p-8">
      <div className="w-full max-w-[1400px] mx-auto animate-[fadeIn_0.4s_ease-out] pb-12 flex flex-col gap-8">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-[2rem] font-black text-[#0F172A] tracking-tight">
              Gift Shop
            </h1>
            <p className="text-slate-500 font-medium italic mt-1 text-sm">
              Managing customized memories for your clients.
            </p>
          </div>
          
          <div className="relative">
            {/* We override the button in the OrderForm trigger via asChild */}
            <OrderForm 
              products={productsData?.products || []} 
              onOrderCreated={() => mutate()} 
            />
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
          
          {/* Pending Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform duration-300">
                <PackageOpen size={20} />
              </div>
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">New</span>
            </div>
            <div className="mt-8">
              <div className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mb-1">
                PENDING
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900">{pendingCount.toString().padStart(2, '0')}</span>
                <span className="text-xs font-semibold text-slate-400">Needs review</span>
              </div>
            </div>
          </div>

          {/* In Production Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:scale-110 transition-transform duration-300">
                <Settings size={20} />
              </div>
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Active</span>
            </div>
            <div className="mt-8">
              <div className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mb-1">
                IN PRODUCTION
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900">{productionCount.toString().padStart(2, '0')}</span>
                <span className="text-xs font-semibold text-slate-400">+3 since yesterday</span>
              </div>
            </div>
          </div>

          {/* Ready Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-[#F4EDE4] flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag size={20} />
              </div>
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest hidden md:block">Ready</span>
            </div>
            <div className="mt-8">
              <div className="text-[0.65rem] sm:text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">
                READY FOR PICKUP
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{readyCount.toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Due Tomorrow Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-red-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform duration-300">
                <CalendarClock size={20} />
              </div>
              <span className="text-[0.65rem] font-bold text-red-500 uppercase tracking-widest hidden md:block">Urgent</span>
            </div>
            <div className="mt-8">
              <div className="text-[0.65rem] sm:text-[0.7rem] font-bold text-red-500 uppercase tracking-widest mb-1 truncate">
                DUE TOMORROW
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{dueTomorrowCount.toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Due This Week Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-blue-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300">
                <CalendarDays size={20} />
              </div>
              <span className="text-[0.65rem] font-bold text-blue-500 uppercase tracking-widest hidden md:block">Soon</span>
            </div>
            <div className="mt-8">
              <div className="text-[0.65rem] sm:text-[0.7rem] font-bold text-blue-500 uppercase tracking-widest mb-1 truncate">
                DUE THIS WEEK
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{dueThisWeekCount.toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Product Categories Strip */}
        <ProductCategoriesStrip />

        {/* Content */}
        <div className="flex flex-col mt-4">
          <OrdersTable 
            orders={orders} 
            onOrderUpdated={() => mutate()} 
          />
        </div>

      </div>
    </div>
  );
}
