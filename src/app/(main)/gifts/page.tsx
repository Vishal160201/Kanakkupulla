"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import OrderForm from "@/components/gifts/OrderForm";
import OrdersTable from "@/components/gifts/OrdersTable";
import { Plus, Settings, ShoppingBag, Truck, PackageOpen } from "lucide-react";

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Pending Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
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
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
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
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-[#F4EDE4] flex items-center justify-center text-amber-700">
                <ShoppingBag size={20} />
              </div>
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Ready</span>
            </div>
            <div className="mt-8">
              <div className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mb-1">
                READY FOR PICKUP
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900">{readyCount.toString().padStart(2, '0')}</span>
                <span className="text-xs font-semibold text-blue-400">2 pending over 48h</span>
              </div>
            </div>
          </div>

        </div>

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
