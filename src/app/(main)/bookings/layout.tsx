"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Modals from '@/components/dashboard/Modals';
import { useBookings } from '@/components/providers/BookingProvider';

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { setIsAddModalOpen, setIsFilterModalOpen, filters, setFilters } = useBookings();

  const isOverview = pathname === '/bookings/overview';
  const isTable = pathname === '/bookings/allBookings';
  const hasActiveFilters = filters.categories.length > 0 || filters.statuses.length > 0 || filters.clientName || filters.location || filters.dateStart || filters.dateEnd || filters.amountMin || filters.amountMax;

  return (
    <div className="view-section active">
      <div style={{ display: "flex", gap: "15px", marginBottom: "25px" }}>
        <Link 
          href="/bookings/overview"
          className={`btn ${isOverview ? 'btn-primary' : 'btn-outline'} sub-nav-btn`} 
          style={{ borderRadius: "20px", borderColor: isTable ? "transparent" : "", textDecoration: "none" }}
        >
          Overview
        </Link>
        <Link 
          href="/bookings/allBookings"
          className={`btn ${isTable ? 'btn-primary' : 'btn-outline'} sub-nav-btn`} 
          style={{ borderRadius: "20px", borderColor: isOverview ? "transparent" : "", textDecoration: "none" }}
        >
          All bookings
        </Link>
        
        {isTable && (
          <div style={{ marginLeft: "auto", display: "flex", gap: "15px", alignItems: "center" }}>
            {hasActiveFilters ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#fff7ed", padding: "6px 12px", borderRadius: "20px", border: "1px solid #ffedd5" }}>
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
            <button className="btn btn-primary"><i className="ph-bold ph-download-simple"></i> Export Schedule</button>
          </div>
        )}
      </div>

      <div className="sub-view active">
        {children}
      </div>

      {/* FAB */}
      <div className="fab interactive" onClick={() => setIsAddModalOpen(true)}>
        <i className="ph-fill ph-camera"></i>
      </div>

      {/* Shared Modals */}
      <Modals />
    </div>
  );
}
