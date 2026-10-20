"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import OrderForm from "@/components/gifts/OrderForm";
import OrdersTable from "@/components/gifts/OrdersTable";
import ProductCategoriesStrip from "@/components/gifts/ProductCategoriesStrip";
import AllOrdersList from "@/components/gifts/AllOrdersList";
import { Settings, ShoppingBag, PackageOpen, CalendarClock, CalendarDays } from "lucide-react";
import { isTomorrow, isThisWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import type { GiftOrder, GiftOrdersResponse, GiftProductsResponse } from "@/types/gifts";
import { useAccess } from "@/hooks/useAccess";
import PermissionTooltip from "@/components/shared/PermissionTooltip";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

const NO_ORDERS: GiftOrder[] = [];


export default function GiftsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  // Creating, editing and deleting orders needs Gifts Manage.
  const canManage = useAccess().can("gifts", "MANAGE");

  const { data: productsData } = useSWR<GiftProductsResponse>("/api/gifts/products", fetcher, {
    revalidateOnFocus: false
  });

  const { data: ordersData, mutate } = useSWR<GiftOrdersResponse>("/api/gifts/orders?excludeStatus=DELIVERED", fetcher);

  const orders = ordersData?.orders || NO_ORDERS;
  
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
    return orders.filter((o) => o.product?.id === selectedCategory);
  }, [orders, selectedCategory]);

  // Calculate metrics
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const productionCount = orders.filter((o) => o.status === "PROCESSING").length;
  const readyCount = orders.filter((o) => o.status === "READY").length;
  
  const dueTomorrowCount = orders.filter((o) => o.customData?.dueDate && isTomorrow(new Date(o.customData.dueDate))).length;
  const dueThisWeekCount = orders.filter((o) => o.customData?.dueDate && isThisWeek(new Date(o.customData.dueDate))).length;

  return (
    <div>
      <div className="w-full animate-[fadeIn_0.4s_ease-out] pb-12 flex flex-col gap-8">
        
        {/* Controls row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit relative z-10 order-2 sm:order-1">
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

          <div className="relative w-full sm:w-auto order-1 sm:order-2 flex justify-end">
            {canManage ? (
              <OrderForm 
                products={productsData?.products || []} 
                onOrderCreated={() => mutate()} 
                open={isOrderFormOpen}
                onOpenChange={setIsOrderFormOpen}
                defaultProductId={formDefaultProduct}
              />
            ) : (
              <PermissionTooltip allowed={false} className="flex w-full sm:w-auto">
                <Button disabled className="w-full sm:w-auto h-11 sm:h-9 gap-2 bg-[#8C5E2D] text-white rounded-xl shadow-lg">
                  <PlusCircle size={18} />
                  <span>New Order</span>
                </Button>
              </PermissionTooltip>
            )}
          </div>
        </div>

        {activeTab === "active" ? (
          <>
            {/* Top Metric Cards */}
        <style dangerouslySetInnerHTML={{__html: `
          .stat-cards-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
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
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform duration-300">
                <PackageOpen size={20} />
              </div>
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">New</span>
            </div>
            <div className="mt-4 sm:mt-8">
              <div className="text-[0.65rem] sm:text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">
                PENDING
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{pendingCount.toString().padStart(2, '0')}</span>
                <span className="text-xs font-semibold text-slate-400">Needs review</span>
              </div>
            </div>
          </div>

          {/* In Production Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:scale-110 transition-transform duration-300">
                <Settings size={20} />
              </div>
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">Active</span>
            </div>
            <div className="mt-4 sm:mt-8">
              <div className="text-[0.65rem] sm:text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">
                IN PRODUCTION
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{productionCount.toString().padStart(2, '0')}</span>
                <span className="text-xs font-semibold text-slate-400">+3 since yesterday</span>
              </div>
            </div>
          </div>

          {/* Ready Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-[#F4EDE4] flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag size={20} />
              </div>
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest hidden md:block">Ready</span>
            </div>
            <div className="mt-4 sm:mt-8">
              <div className="text-[0.65rem] sm:text-[0.7rem] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">
                READY FOR PICKUP
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{readyCount.toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Due Tomorrow Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-red-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform duration-300">
                <CalendarClock size={20} />
              </div>
              <span className="text-[0.65rem] font-bold text-red-500 uppercase tracking-widest hidden md:block">Urgent</span>
            </div>
            <div className="mt-4 sm:mt-8">
              <div className="text-[0.65rem] sm:text-[0.7rem] font-bold text-red-500 uppercase tracking-widest mb-1 truncate">
                DUE TOMORROW
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{dueTomorrowCount.toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Due This Week Card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-blue-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300">
                <CalendarDays size={20} />
              </div>
              <span className="text-[0.65rem] font-bold text-blue-500 uppercase tracking-widest hidden md:block">Soon</span>
            </div>
            <div className="mt-4 sm:mt-8">
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
        {canManage && (
        <ProductCategoriesStrip 
          selectedCategory={selectedCategory}
          onCategorySelect={(id) => {
            setSelectedCategory(null);
            setFormDefaultProduct(id);
            setIsOrderFormOpen(true);
          }}
        />
        )}

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
