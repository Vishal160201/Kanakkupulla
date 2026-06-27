"use client";
import React from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Modals from '@/components/dashboard/Modals';
import { useBookings } from '@/components/providers/BookingProvider';
import { useGlobalForm } from '@/components/providers/GlobalFormProvider';

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { setIsFilterModalOpen, filters, setFilters, hasData } = useBookings();
  const { openBookingForm } = useGlobalForm();

  const isOverview = pathname === '/bookings/overview';
  const isUpcoming = pathname === '/bookings/upcoming';
  const isAlbumStatus = pathname === '/bookings/album-status';
  const isTable = pathname === '/bookings/allBookings';
  const hasActiveFilters = filters.categories.length > 0 || filters.statuses.length > 0 || filters.clientName || filters.location || filters.dateStart || filters.dateEnd || filters.amountMin || filters.amountMax;

  const [isExporting, setIsExporting] = React.useState(false);
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExportMenuOpen(false);
    setIsExporting(true);
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      const allBookings = Array.isArray(data) ? data : (data?.items || []);
      
      const filtered = allBookings.filter((b: any) => {
        if (filters.categories.length > 0 && !filters.categories.includes(b.category)) return false;
        if (filters.statuses.length > 0 && !filters.statuses.includes(b.status)) return false;
        if (filters.clientName && !b.client?.name?.toLowerCase().includes(filters.clientName.toLowerCase())) return false;
        const bDate = b.date.split('T')[0];
        if (filters.dateStart && bDate < filters.dateStart) return false;
        if (filters.dateEnd && bDate > filters.dateEnd) return false;
        return true;
      });

      const sorted = [...filtered].sort((a: any, b: any) => a.date.localeCompare(b.date));

      if (sorted.length === 0) {
        alert("No data available to export with current filters.");
        setIsExporting(false);
        return;
      }

      if (format === 'csv') {
        const escapeCsv = (val: any) => {
          if (val === null || val === undefined || val === '') return '""';
          let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        };

        const headers = [
          "ID", "Client Name", "Client Phone", "Client Email", "Category", 
          "Date", "Time", "Location", "Status", "Package Name", 
          "Package Amount", "Advance", "Due", "Installments", "Photographers", 
          "Inclusions", "Notes", "Gallery URL", "Contract URL", "Custom Data"
        ];
        
        const rows = sorted.map((b: any) => [
          escapeCsv(b.bookingNumber || b.id.substring(b.id.length - 6).toUpperCase()),
          escapeCsv(b.client?.name),
          escapeCsv(b.client?.phone),
          escapeCsv(b.client?.email),
          escapeCsv(b.category),
          escapeCsv(b.date?.split('T')[0]),
          escapeCsv(b.time),
          escapeCsv(b.location),
          escapeCsv(b.status),
          escapeCsv(b.packageName),
          escapeCsv(b.order?.package),
          escapeCsv(b.order?.advance),
          escapeCsv(b.order?.due),
          escapeCsv(b.order?.installments),
          escapeCsv(b.photographers),
          escapeCsv(b.inclusions),
          escapeCsv(b.notes),
          escapeCsv(b.galleryUrl),
          escapeCsv(b.contractUrl),
          escapeCsv(b.customData)
        ]);
        const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const { jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;
        const doc = new jsPDF();
        doc.text("Bookings Schedule", 14, 15);
        const tableData = sorted.map((b: any) => [
          b.bookingNumber || b.id.substring(b.id.length - 6).toUpperCase(),
          b.client?.name || '',
          b.category,
          b.date.split('T')[0],
          b.time,
          b.location || '',
          b.order?.package?.toString() || '0',
          b.status
        ]);
        autoTable(doc, {
          head: [["ID", "Client", "Category", "Date", "Time", "Location", "Amount", "Status"]],
          body: tableData,
          startY: 20,
        });
        doc.save(`bookings_export_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export schedule.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="view-section active">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex overflow-x-auto hide-scrollbar w-full sm:w-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0" style={{ gap: "10px" }}>
          <Link 
          href="/bookings/overview"
          className={`btn ${isOverview ? 'btn-primary' : 'btn-outline'} sub-nav-btn whitespace-nowrap flex-shrink-0`} 
          style={{ borderRadius: "20px", borderColor: isTable || isUpcoming || isAlbumStatus ? "transparent" : "", textDecoration: "none" }}
        >
          Overview
        </Link>
        <Link 
          href="/bookings/upcoming"
          className={`btn ${isUpcoming ? 'btn-primary' : 'btn-outline'} sub-nav-btn whitespace-nowrap flex-shrink-0`} 
          style={{ borderRadius: "20px", borderColor: isOverview || isTable || isAlbumStatus ? "transparent" : "", textDecoration: "none" }}
        >
          Upcoming Shoots
        </Link>
        <Link 
          href="/bookings/album-status"
          className={`btn ${isAlbumStatus ? 'btn-primary' : 'btn-outline'} sub-nav-btn whitespace-nowrap flex-shrink-0`} 
          style={{ borderRadius: "20px", borderColor: isOverview || isTable || isUpcoming ? "transparent" : "", textDecoration: "none" }}
        >
          Album status
        </Link>
        <Link 
          href="/bookings/allBookings"
          className={`btn ${isTable ? 'btn-primary' : 'btn-outline'} sub-nav-btn whitespace-nowrap flex-shrink-0`} 
          style={{ borderRadius: "20px", borderColor: isOverview || isUpcoming || isAlbumStatus ? "transparent" : "", textDecoration: "none" }}
        >
          All bookings
        </Link>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-start sm:justify-end mt-2 sm:mt-0">
          {isTable && (
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {hasActiveFilters ? (
              <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 overflow-x-auto hide-scrollbar max-w-full">
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#ea580c" }}>Filtered by:</span>
                {filters.categories.length > 0 && <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#c2410c" }}>{filters.categories.join(', ')}</span>}
                {filters.statuses.length > 0 && <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#c2410c" }}>{filters.statuses.join(', ')}</span>}
                {filters.clientName && <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#c2410c" }}>{filters.clientName}</span>}
                {filters.location && <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#c2410c" }}>{filters.location}</span>}
                {(filters.dateStart || filters.dateEnd) && <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#c2410c" }}>{filters.dateStart || 'Any'} to {filters.dateEnd || 'Any'}</span>}
                <button onClick={() => setFilters({ categories: [], statuses: [], clientName: '', location: '', dateStart: '', dateEnd: '', amountMin: '', amountMax: '' })} style={{ background: "none", border: "none", color: "#ea580c", cursor: "pointer", display: "flex", alignItems: "center", marginLeft: "4px" }} title="Clear Filters">
                  <i className="ph-bold ph-x"></i>
                </button>
              </div>
            ) : null}
            <button className="btn btn-outline" onClick={() => setIsFilterModalOpen(true)}><i className="ph-fill ph-funnel icon-3d-styled"></i> Filters</button>
            {hasData && (
              <div className="relative">
                <button 
                  className="btn btn-primary" 
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  ) : (
                    <i className="ph-bold ph-download-simple"></i>
                  )}
                  Export Schedule
                </button>
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1">
                      <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2.5 text-[0.85rem] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <i className="ph-bold ph-file-csv text-lg text-emerald-500"></i> Export as CSV
                      </button>
                      <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2.5 text-[0.85rem] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <i className="ph-bold ph-file-pdf text-lg text-rose-500"></i> Export as PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            </div>
          )}
          
          {isOverview && (
            <button onClick={() => openBookingForm()} className="btn btn-primary" style={{ borderRadius: "20px", display: "flex", alignItems: "center", gap: "6px" }}>
              <i className="ph-bold ph-plus"></i> Add Booking
            </button>
          )}
        </div>
      </div>

      <div className="sub-view active">
        {children}
      </div>

      {/* Shared Modals */}
      <Modals />

      {/* FAB (Camera Booking Icon) */}
      {!isOverview && (
        <div className="fab interactive" onClick={() => openBookingForm()}>
          <i className="ph-fill ph-camera text-2xl"></i>
        </div>
      )}
    </div>
  );
}
