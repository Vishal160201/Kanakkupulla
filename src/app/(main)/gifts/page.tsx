"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import OrderForm from "@/components/gifts/OrderForm";
import OrdersTable from "@/components/gifts/OrdersTable";
import ProductCategoriesStrip from "@/components/gifts/ProductCategoriesStrip";
import AllOrdersList from "@/components/gifts/AllOrdersList";
import { Plus, Settings, ShoppingBag, Truck, PackageOpen, CalendarClock, CalendarDays } from "lucide-react";
import { isTomorrow, isThisWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function GiftsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const { data: productsData } = useSWR("/api/gifts/products", fetcher, {
    revalidateOnFocus: false
  });

  const { data: ordersData, mutate } = useSWR("/api/gifts/orders?excludeStatus=DELIVERED", fetcher);

  const orders = ordersData?.orders || [];
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [formDefaultProduct, setFormDefaultProduct] = useState<string | null>(null);
  const activeTab = tabParam === "all-orders" ? "all" : "active";
  
  const handleTabChange = (tab: "active" | "all") => {
    if (tab === "all") {
      router.push("/gifts?tab=all-orders");
    } else {
      router.push("/gifts");
    }
  };

  const filteredOrders = useMemo(() => {
    if (!selectedCategory) return orders;
    return orders.filter((o: any) => o.product?.id === selectedCategory);
  }, [orders, selectedCategory]);

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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-[2rem] font-black text-[#0F172A] tracking-tight">
              Gift Shop
            </h1>
            <p className="text-slate-500 font-medium italic mt-1 text-sm">
              Managing customized memories for your clients.
            </p>
          </div>
          
          <div className="relative w-full sm:w-auto">
            {/* We override the button in the OrderForm trigger via asChild */}
            <OrderForm 
              products={productsData?.products || []} 
              onOrderCreated={() => mutate()} 
              open={isOrderFormOpen}
              onOpenChange={setIsOrderFormOpen}
              defaultProductId={formDefaultProduct}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit relative z-10">
          <button 
            onClick={() => handleTabChange("active")}
            className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative", activeTab === "active" ? "text-slate-800 shadow-sm bg-white" : "text-slate-500 hover:text-slate-700")}
          >
            Active Orders
          </button>
          <button 
            onClick={() => handleTabChange("all")}
            className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative", activeTab === "all" ? "text-slate-800 shadow-sm bg-white" : "text-slate-500 hover:text-slate-700")}
          >
            All Orders
          </button>
        </div>

        {activeTab === "active" ? (
          <>
            {/* Top Metric Cards */}
        <style dangerouslySetInnerHTML={{__html: `
          .stat-cards-grid {
            display: grid;
            grid-template-columns: repeat(1, minmax(0, 1fr));
            gap: 1rem;
          }
          @media (min-width: 640px) {
            .stat-cards-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
          @media (max-height: 500px) and (orientation: landscape) {
            .stat-cards-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
          @media (min-width: 768px) {
            .stat-cards-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
          @media (min-width: 1024px) {
            .stat-cards-grid {
              grid-template-columns: repeat(5, minmax(0, 1fr));
              gap: 1.5rem;
            }
          }
        `}} />
        <div className="stat-cards-grid">
          
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
        <ProductCategoriesStrip 
          selectedCategory={selectedCategory}
          onCategorySelect={(id) => {
            setSelectedCategory(null);
            setFormDefaultProduct(id);
            setIsOrderFormOpen(true);
          }}
        />

        {/* Content */}
        <div className="flex flex-col mt-4">
          <OrdersTable 
            orders={filteredOrders} 
            onOrderUpdated={() => mutate()} 
          />
        </div>
        </>
        ) : (
          <AllOrdersList products={productsData?.products || []} />
        )}

      </div>
    </div>
  );
}
