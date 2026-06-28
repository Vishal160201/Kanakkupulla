"use client";
import React from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HighPriorityAlerts() {
  const { data, mutate } = useSWR('/api/notifications?priority=HIGH&isRead=false', fetcher);
  const alerts = data?.notifications || [];

  const handleDismiss = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      mutate();
    } catch (e) {
      console.error("Failed to dismiss alert");
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-6">
      {alerts.map((alert: any) => (
        <div key={alert.id} className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3 flex items-start md:items-center justify-between gap-3 shadow-sm animate-fade-in-up">
          <div className="flex items-center gap-3">
            <i className="ph-fill ph-warning-circle text-red-500 text-xl shrink-0 mt-0.5 md:mt-0"></i>
            <div>
              <p className="text-[0.85rem] font-bold text-red-800 leading-tight">{alert.title}</p>
              <p className="text-[0.75rem] font-medium text-red-700/80">{alert.message}</p>
            </div>
          </div>
          <button 
            onClick={() => handleDismiss(alert.id)}
            className="text-red-400 hover:text-red-600 transition-colors shrink-0"
            title="Dismiss"
          >
            <i className="ph ph-x text-lg"></i>
          </button>
        </div>
      ))}
    </div>
  );
}
