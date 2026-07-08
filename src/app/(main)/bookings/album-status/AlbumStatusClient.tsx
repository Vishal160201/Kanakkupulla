"use client";

import React, { useState, useEffect, useRef } from 'react';
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { cn } from "@/lib/utils";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";

import { updateAlbumTrackingAction } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { mutate as globalMutate } from 'swr';
import { FolderClock, PenTool, Printer, Package, ChevronRight, AlertTriangle, ChevronDown } from 'lucide-react';
import styles from './album-status.module.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  FolderClock: <FolderClock size={18} />,
  PenTool:     <PenTool size={18} />,
  Printer:     <Printer size={18} />,
  Package:     <Package size={18} />,
  AlertTriangle: <AlertTriangle size={18} />,
};

const STATUS_CARDS = [
  {
    status: 'Pending',
    label: 'Pending album works',
    sublabel: 'Awaiting design start',
    icon: 'FolderClock',
    iconBg: 'rgba(251,146,60,0.12)',
    iconColor: '#f97316',
    accentColor: '#f97316',
  },
  {
    status: 'Overdue',
    label: 'Overdue Albums',
    sublabel: 'Past delivery date',
    icon: 'AlertTriangle',
    iconBg: 'rgba(239,68,68,0.12)',
    iconColor: '#ef4444',
    accentColor: '#ef4444',
  },
  {
    status: 'Designing',
    label: 'Designing',
    sublabel: 'Album in design process',
    icon: 'PenTool',
    iconBg: 'rgba(168,85,247,0.12)',
    iconColor: '#a855f7',
    accentColor: '#a855f7',
  },
  {
    status: 'Sent for printing',
    label: 'Sent for printing',
    sublabel: 'In printing & production',
    icon: 'Printer',
    iconBg: 'rgba(59,130,246,0.12)',
    iconColor: '#3b82f6',
    accentColor: '#3b82f6',
  },
  {
    status: 'Ready for delivery',
    label: 'Ready for delivery',
    sublabel: 'Albums ready to ship',
    icon: 'Package',
    iconBg: 'rgba(34,197,94,0.12)',
    iconColor: '#22c55e',
    accentColor: '#22c55e',
  },
];


interface AlbumStatusClientProps {
  albums: any[];
  teamUsers?: any[];
  initialTab?: string;
}


const ALBUM_STATUS_OPTIONS = [
  'Pending',
  'Designing',
  'Sent for printing',
  'Ready for delivery',
  'Delivered'
];

export default function AlbumStatusClient({ albums: initialAlbums, teamUsers = [], initialTab = 'Pending' }: AlbumStatusClientProps) {
  const [albums, setAlbums] = useState(initialAlbums);
  const router = useRouter();

  useEffect(() => {
    setAlbums(initialAlbums);
  }, [initialAlbums]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const { openBookingDetails } = useGlobalForm();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const counts = React.useMemo(() => {
    const arr = Array.isArray(albums) ? albums : (albums ?? []);
    return {
      'Pending': arr.filter((b: any) => {
        let cd: any = {};
        try { cd = typeof b.customData === 'string' ? JSON.parse(b.customData) : (b.customData || {}); } catch(e) {}
        return (cd.fld_b_album_status || 'Pending') === 'Pending';
      }).length,
      'Designing': arr.filter((b: any) => {
        let cd: any = {};
        try { cd = typeof b.customData === 'string' ? JSON.parse(b.customData) : (b.customData || {}); } catch(e) {}
        return cd.fld_b_album_status === 'Designing';
      }).length,
      'Sent for printing': arr.filter((b: any) => {
        let cd: any = {};
        try { cd = typeof b.customData === 'string' ? JSON.parse(b.customData) : (b.customData || {}); } catch(e) {}
        return cd.fld_b_album_status === 'Sent for printing';
      }).length,
      'Ready for delivery': arr.filter((b: any) => {
        let cd: any = {};
        try { cd = typeof b.customData === 'string' ? JSON.parse(b.customData) : (b.customData || {}); } catch(e) {}
        return cd.fld_b_album_status === 'Ready for delivery';
      }).length,
      'Overdue': arr.filter((b: any) => {
        let cd: any = {};
        try { cd = typeof b.customData === 'string' ? JSON.parse(b.customData) : (b.customData || {}); } catch(e) {}
        const deliveryDateStr = cd.album_delivery_date || cd.delivery_date;
        if (deliveryDateStr) {
          const deliveryDate = new Date(deliveryDateStr);
          const aStatus = (cd.fld_b_album_status || '').trim().toLowerCase();
          if (deliveryDate < new Date() && aStatus !== 'delivered') return true;
        }
        return false;
      }).length,
    }
  }, [albums]);

  const handleUpdateAlbum = async (bookingId: string, updates: { status?: string, customData?: any }) => {
    // Optimistic update
    setAlbums(prev => prev.map(a => {
      if (a.id === bookingId) {
        let newCustomData = typeof a.customData === 'string' ? JSON.parse(a.customData) : (a.customData || {});
        if (updates.customData) {
          newCustomData = { ...newCustomData, ...updates.customData };
        }
        return {
          ...a,
          status: updates.status !== undefined ? updates.status : a.status,
          customData: JSON.stringify(newCustomData)
        };
      }
      return a;
    }));

    const res = await updateAlbumTrackingAction(bookingId, updates);
    if (!res.success) {
      toast.error(res.error || "Failed to update album");
      // Revert optimistic update ideally, but skipping for brevity
    } else {
      toast.success("Album updated");
      globalMutate(
        (key) => typeof key === 'string' && (key.startsWith('/api/bookings') || key.startsWith('/api/dashboard')),
        undefined,
        { revalidate: true }
      );
      router.refresh();
    }
  };


  const selectedAlbum = albums.find(a => a.id === selectedAlbumId) || null;

  const workInProgressCount = albums.filter(a => {
    let customData: any = {};
    try { customData = typeof a.customData === 'string' ? JSON.parse(a.customData) : (a.customData || {}); } catch(e) {}
    const aStatus = (customData.fld_b_album_status || '').trim().toLowerCase();
    return ['designing', 'sent for printing'].includes(aStatus);
  }).length;
  
  const completedCount = albums.filter(a => {
    let customData: any = {};
    try { customData = typeof a.customData === 'string' ? JSON.parse(a.customData) : (a.customData || {}); } catch(e) {}
    const aStatus = (customData.fld_b_album_status || '').trim().toLowerCase();
    return aStatus === 'ready for delivery';
  }).length;

  const deliveredCount = albums.filter(a => {
    let customData: any = {};
    try { customData = typeof a.customData === 'string' ? JSON.parse(a.customData) : (a.customData || {}); } catch(e) {}
    const aStatus = (customData.fld_b_album_status || '').trim().toLowerCase();
    return aStatus === 'delivered';
  }).length;

  // Simple overdue check logic
  const overdueCount = albums.filter(a => {
    let customData: any = {};
    try {
      customData = typeof a.customData === 'string' ? JSON.parse(a.customData) : (a.customData || {});
    } catch(e) {}
    
    const deliveryDateStr = customData.album_delivery_date || customData.delivery_date;
    if (deliveryDateStr) {
      const deliveryDate = new Date(deliveryDateStr);
      const aStatus = (customData.fld_b_album_status || '').trim().toLowerCase();
      if (deliveryDate < new Date() && aStatus !== 'delivered') {
        return true;
      }
    }
    return false;
  }).length;

  const filteredAlbums = albums.filter(a => {
    let customData: any = {};
    try { customData = typeof a.customData === 'string' ? JSON.parse(a.customData) : (a.customData || {}); } catch(e) {}
    const aStatus = (customData.fld_b_album_status || 'pending').trim().toLowerCase();
    
    if (activeTab === 'Pending') {
      if (aStatus !== 'pending') return false;
    }
    if (activeTab === 'Designing') {
      if (aStatus !== 'designing') return false;
    }
    if (activeTab === 'Sent for printing') {
      if (aStatus !== 'sent for printing') return false;
    }
    if (activeTab === 'Ready for delivery') {
      if (aStatus !== 'ready for delivery') return false;
    }
    if (activeTab === 'Work in Progress') {
      if (!['designing', 'sent for printing'].includes(aStatus)) return false;
    }
    if (activeTab === 'Completed') {
      if (aStatus !== 'ready for delivery') return false;
    }
    if (activeTab === 'Delivered') {
      if (aStatus !== 'delivered') return false;
    }
    if (activeTab === 'Overdue') {
      const deliveryDateStr = customData.album_delivery_date || customData.delivery_date;
      if (!deliveryDateStr) return false;
      const deliveryDate = new Date(deliveryDateStr);
      if (deliveryDate >= new Date() || aStatus === 'delivered') return false;
    }
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = a.client?.name.toLowerCase().includes(q) || 
                    a.bookingNumber?.toLowerCase().includes(q) || 
                    a.id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const ITEMS_PER_PAGE = 25;
  const totalPages = Math.max(1, Math.ceil(filteredAlbums.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAlbums = filteredAlbums.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  const totalCount = albums.length;

  return (
    <div className="view-section active w-full fade-in-up">
      <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-10">
        
        {/* Metrics Cards */}
        <div className={styles.cardRow}>
          {STATUS_CARDS.map((card, index) => (
            <div
              key={card.status}
              className={`bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer ${styles.cardAnim}`}
              style={{ animationDelay: `${index * 80}ms`, ...(activeTab === card.status ? { borderColor: card.accentColor, boxShadow: `0 4px 12px ${card.iconBg}` } : {}) }}
              onClick={() => setActiveTab(card.status)}
            >
              <div className="flex justify-between items-start">
                <div 
                  className="w-[32px] h-[32px] rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: card.iconBg, color: card.iconColor }}
                >
                  {ICON_MAP[card.icon]}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">{card.label}</div>
                <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">
                  {(counts as any)[card.status] ?? 0}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Row */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
            <div className="relative w-full sm:w-auto" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="flex items-center justify-between gap-2 w-full sm:w-[220px] bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    activeTab === 'Pending' ? 'bg-slate-400' :
                    activeTab === 'Overdue' ? 'bg-red-500' :
                    activeTab === 'Designing' ? 'bg-orange-500' :
                    activeTab === 'Sent for printing' ? 'bg-purple-500' :
                    activeTab === 'Ready for delivery' ? 'bg-emerald-500' :
                    activeTab === 'Delivered' ? 'bg-blue-500' : 'bg-slate-800'
                  }`} />
                  <span>{activeTab}</span>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isFilterDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-[fadeIn_0.15s_ease-out]">
                  {['Pending', 'Overdue', 'Designing', 'Sent for printing', 'Ready for delivery', 'Delivered', 'All'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab as any);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm font-bold transition-colors ${
                        activeTab === tab 
                          ? 'bg-purple-50 text-purple-700' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        tab === 'Pending' ? 'bg-slate-400' :
                        tab === 'Overdue' ? 'bg-red-500' :
                        tab === 'Designing' ? 'bg-orange-500' :
                        tab === 'Sent for printing' ? 'bg-purple-500' :
                        tab === 'Ready for delivery' ? 'bg-emerald-500' :
                        tab === 'Delivered' ? 'bg-blue-500' : 'bg-slate-800'
                      }`} />
                      <span>{tab}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input 
                  type="text" 
                  placeholder="Search album, client, booking..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-purple-400 bg-white"
                />
              </div>
              <button className="btn btn-outline border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-4 py-2 font-bold text-sm shadow-sm flex items-center gap-2">
                <i className="ph ph-funnel"></i> Filters
              </button>
            </div>
          </div>
        )}

        {/* Main Content Split */}
        <div className="flex flex-col lg:flex-row gap-6 mt-2">
          
          {/* Left Column - List */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {filteredAlbums.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Client / Event</th>
                      <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Booking ID</th>
                      <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Designer</th>
                      <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Delivery Date</th>
                      <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                      <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedAlbums.map((a: any) => {
                    let cData: any = {};
                    try {
                      cData = typeof a.customData === 'string' ? JSON.parse(a.customData) : (a.customData || {});
                    } catch(e) {}

                    const bDate = a.date instanceof Date ? a.date.toISOString().split('T')[0] : a.date?.split('T')[0];
                    const formattedShootDate = bDate ? new Date(bDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                    const designerId = cData.designer || cData.fld_b_photographers;
   const designerUser = teamUsers.find(u => u.id === designerId);
   const designer = designerUser ? designerUser.name : (designerId || 'Unassigned');
                    
                    const deliveryDateStr = cData.album_delivery_date || cData.delivery_date;
                    const formattedDeliveryDate = deliveryDateStr ? new Date(deliveryDateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set';
                    
                    let statusLabel = cData.fld_b_album_status || 'Pending';
                    let statusColor = 'bg-slate-100 text-slate-700';
                    let progress = parseInt(cData.album_progress || '0');
                    
                    if (statusLabel.toLowerCase() === 'designing') {
                      statusColor = 'bg-orange-100 text-orange-700';
                      if (progress === 0) progress = 25;
                    } else if (statusLabel.toLowerCase() === 'sent for printing') {
                      statusColor = 'bg-purple-100 text-purple-700';
                      if (progress === 0) progress = 50;
                    } else if (statusLabel.toLowerCase() === 'ready for delivery') {
                      statusColor = 'bg-emerald-100 text-emerald-700';
                      if (progress === 0) progress = 75;
                    } else if (statusLabel.toLowerCase() === 'delivered') {
                      statusColor = 'bg-blue-100 text-blue-700';
                      if (progress === 0) progress = 100;
                    }

                    return (
                      <tr key={a.id} className={`hover:bg-slate-50/80 transition-colors ${selectedAlbumId === a.id ? 'bg-slate-50' : ''}`}>
                        <td 
                          className="p-5 whitespace-nowrap cursor-pointer group"
                          onClick={() => openBookingDetails(a.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center text-slate-500 font-black uppercase text-lg group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                              {a.client?.name?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-slate-800 text-sm group-hover:text-purple-600 transition-colors">{a.client?.name}</div>
                              <div className="text-xs text-slate-500 font-medium">{a.category} • {formattedShootDate}</div>
                            </div>
                          </div>
                        </td>
                        <td 
                          className="p-5 whitespace-nowrap cursor-pointer"
                          onClick={() => openBookingDetails(a.id)}
                        >
                          <span className="text-purple-600 font-black text-sm hover:underline">
                            {a.bookingNumber || `BK-${a.id.substring(a.id.length - 4).toUpperCase()}`}
                          </span>
                        </td>
                        <td className="p-5 whitespace-nowrap align-middle">
      <CustomDropdown 
        options={[{ label: "Unassigned", value: "" }, ...teamUsers.map(u => ({ label: u.name, value: u.id }))]}
        value={designerId || ""} 
        onChange={(val) => handleUpdateAlbum(a.id, { customData: { designer: val } })}
        className="w-40 mx-auto"
        placeholder="Unassigned"
      />
   </td>
                        <td className="p-5 whitespace-nowrap align-middle">
      <div className="w-40 mx-auto flex flex-col items-center">
        <DatePickerInput 
          value={deliveryDateStr ? new Date(deliveryDateStr).toISOString().split('T')[0] : ""}
          onChange={(val) => handleUpdateAlbum(a.id, { customData: { album_delivery_date: val } })}
        />
        {deliveryDateStr && new Date(deliveryDateStr) < new Date() && statusLabel.toLowerCase() !== 'delivered' && (
          <div className="text-[0.65rem] text-orange-500 font-bold mt-1 text-center">Overdue by {Math.floor((new Date().getTime() - new Date(deliveryDateStr).getTime()) / (1000 * 3600 * 24))} days</div>
        )}
      </div>
    </td>
                        <td className="p-5 whitespace-nowrap align-middle">
      <CustomDropdown 
        options={ALBUM_STATUS_OPTIONS}
        value={cData.fld_b_album_status || "Pending"} 
        onChange={(val) => {
          let newProgress = progress;
          if (val === 'Delivered') newProgress = 100;
          let updates: any = { customData: { fld_b_album_status: val, album_progress: newProgress.toString() } };
          if (val === 'Delivered') updates.status = 'Delivered';
          handleUpdateAlbum(a.id, updates);
        }}
        className="w-40 mx-auto"
        placeholder="Select Status"
      />
   </td>
                        <td className="p-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedAlbumId(a.id)}
                              className={`px-5 py-1.5 rounded-xl text-sm font-black border transition-colors ${selectedAlbumId === a.id ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}
                            >
                              View
                            </button>
                            <button className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                              <i className="ph-bold ph-dots-three-vertical"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 text-slate-400 h-full">
                <i className="ph-fill ph-images text-5xl mb-4 text-slate-300"></i>
                <p className="font-bold text-lg text-slate-500">No pending albums.</p>
              </div>
            )}
            
            {/* Pagination Controls */}
            {filteredAlbums.length > 0 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 mt-auto">
                <div className="flex gap-1">
                  <button 
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    <i className="ph-bold ph-caret-left"></i>
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button 
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-lg border text-sm font-bold transition-colors",
                        safeCurrentPage === page 
                          ? "border-purple-200 bg-purple-50 text-purple-700" 
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {page}
                    </button>
                  ))}

                  <button 
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    <i className="ph-bold ph-caret-right"></i>
                  </button>
                </div>
                <div className="text-xs font-bold text-slate-500">
                  Showing {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredAlbums.length)} of {filteredAlbums.length} albums
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Detail Panel */}
          {selectedAlbum && (
            <div className="w-full lg:w-[380px] bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col relative sticky top-[80px] h-[calc(100vh-100px)] overflow-y-auto hide-scrollbar">
              <button 
                onClick={() => setSelectedAlbumId(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
              >
                <i className="ph-bold ph-x text-lg"></i>
              </button>
              
              <h3 className="text-lg font-black text-slate-800 pr-8">{selectedAlbum.client?.name} – {selectedAlbum.category}</h3>
              
              {(() => {
                let cData: any = {};
                try {
                  cData = typeof selectedAlbum.customData === 'string' ? JSON.parse(selectedAlbum.customData) : (selectedAlbum.customData || {});
                } catch(e) {}

                let statusLabel = cData.fld_b_album_status || 'Pending';
                let statusColor = 'bg-slate-100 text-slate-700';
                let progress = parseInt(cData.album_progress || '0');
                
                if (statusLabel.toLowerCase() === 'designing') {
                  statusColor = 'bg-orange-100 text-orange-700';
                  if (progress === 0) progress = 25;
                } else if (statusLabel.toLowerCase() === 'sent for printing') {
                  statusColor = 'bg-purple-100 text-purple-700';
                  if (progress === 0) progress = 50;
                } else if (statusLabel.toLowerCase() === 'ready for delivery') {
                  statusColor = 'bg-emerald-100 text-emerald-700';
                  if (progress === 0) progress = 75;
                } else if (statusLabel.toLowerCase() === 'delivered') {
                  statusColor = 'bg-blue-100 text-blue-700';
                  if (progress === 0) progress = 100;
                }

                const bDate = selectedAlbum.date instanceof Date ? selectedAlbum.date.toISOString().split('T')[0] : selectedAlbum.date?.split('T')[0];
                const formattedShootDate = bDate ? new Date(bDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                
                const designerId = cData.designer || cData.fld_b_photographers;
   const designerUser = teamUsers.find(u => u.id === designerId);
   const designer = designerUser ? designerUser.name : (designerId || 'Unassigned');
                const deliveryDateStr = cData.album_delivery_date || cData.delivery_date;
                const formattedDeliveryDate = deliveryDateStr ? new Date(deliveryDateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set';
                
                return (
                  <>
                    <div className="mt-3">
                      <span className={`px-2.5 py-1 rounded-md text-[0.7rem] font-bold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-8 space-y-4">
                      <div className="grid grid-cols-[110px_1fr] text-[0.85rem] items-center">
                        <div className="text-slate-500 font-medium">Booking ID</div>
                        <div className="font-black text-slate-800 flex items-center gap-2"><span className="text-slate-400 font-normal">:</span> {selectedAlbum.bookingNumber || `BK-${selectedAlbum.id.substring(selectedAlbum.id.length - 4).toUpperCase()}`}</div>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] text-[0.85rem] items-center">
                        <div className="text-slate-500 font-medium">Shoot Date</div>
                        <div className="font-black text-slate-800 flex items-center gap-2"><span className="text-slate-400 font-normal">:</span> {formattedShootDate}</div>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] text-[0.85rem] items-center">
                        <div className="text-slate-500 font-medium">Designer</div>
                        <div className="font-black text-slate-800 flex items-center gap-2">
    <span className="text-slate-400 font-normal">:</span> 
    <CustomDropdown 
      options={[{ label: "Unassigned", value: "" }, ...teamUsers.map(u => ({ label: u.name, value: u.id }))]}
      value={designerId || ""} 
      onChange={(val) => handleUpdateAlbum(selectedAlbum.id, { customData: { designer: val } })}
      className="w-40 border-b border-dashed border-slate-300 rounded-none shadow-none bg-transparent"
      placeholder="Unassigned"
    />
  </div>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] text-[0.85rem] items-center">
                        <div className="text-slate-500 font-medium">Delivery Date</div>
                        <div className="font-black text-slate-800 flex items-center gap-2">
    <span className="text-slate-400 font-normal">:</span> 
    <DatePickerInput 
      value={deliveryDateStr ? new Date(deliveryDateStr).toISOString().split('T')[0] : ""}
      onChange={(val) => handleUpdateAlbum(selectedAlbum.id, { customData: { album_delivery_date: val } })}
      className="flex items-center justify-between bg-white text-[0.8rem] border border-slate-200 rounded-lg px-3 py-1.5 outline-none hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer w-[140px] h-[34px]"
    />
    {deliveryDateStr && new Date(deliveryDateStr) < new Date() && statusLabel.toLowerCase() !== 'delivered' && (
      <span className="text-orange-500 font-bold ml-1">(Overdue)</span>
    )}
  </div>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] text-[0.85rem] items-center">
                        <div className="text-slate-500 font-medium">Album Size</div>
                        <div className="font-black text-slate-800 flex items-center gap-2"><span className="text-slate-400 font-normal">:</span> {cData.album_size || 'Not specified'}</div>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] text-[0.85rem] items-center">
                        <div className="text-slate-500 font-medium">Pages</div>
                        <div className="font-black text-slate-800 flex items-center gap-2"><span className="text-slate-400 font-normal">:</span> {cData.album_pages || 'Not specified'}</div>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] text-[0.85rem] items-center">
                        <div className="text-slate-500 font-medium">Album Type</div>
                        <div className="font-black text-slate-800 flex items-center gap-2"><span className="text-slate-400 font-normal">:</span> {cData.fld_b_album_type || cData.album_type || 'Premium'}</div>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] text-[0.85rem] items-start">
                        <div className="text-slate-500 font-medium">Remarks</div>
                        <div className="font-black text-slate-800 flex items-center gap-2"><span className="text-slate-400 font-normal">:</span> {cData.album_remarks || 'Designing in progress'}</div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 relative">
                      <h4 className="font-black text-slate-800 text-sm mb-6">Timeline</h4>
                      
                      <div className="relative pl-6 space-y-7">
                        <div className="absolute left-[7px] top-[8px] bottom-[15px] w-[2px] bg-slate-100"></div>
                        
                        <div className="relative">
                          <div className="absolute -left-[1.65rem] w-4 h-4 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center shadow-sm">
                            <i className="ph-bold ph-check text-white text-[0.45rem]"></i>
                          </div>
                          <div className="flex justify-between items-start -mt-0.5">
                            <div className="font-black text-slate-800 text-[0.8rem]">Pending</div>
                            <div className="text-[0.7rem] text-slate-400 font-medium">{formattedShootDate}</div>
                          </div>
                        </div>

                        <div className="relative">
                          <div className={`absolute -left-[1.65rem] w-4 h-4 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm ${progress >= 25 ? 'bg-white border-orange-400' : 'bg-slate-200'}`}>
                            {progress >= 25 && <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>}
                          </div>
                          <div className="flex justify-between items-start -mt-0.5">
                            <div className={`font-black text-[0.8rem] ${progress >= 25 ? 'text-slate-800' : 'text-slate-400'}`}>Designing</div>
                            <div className="text-[0.7rem] text-slate-400 font-medium">{progress >= 25 ? 'Started' : 'Pending'}</div>
                          </div>
                        </div>

                        <div className="relative">
                          <div className={`absolute -left-[1.65rem] w-4 h-4 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm ${progress >= 50 ? 'bg-white border-purple-400' : 'bg-slate-200'}`}>
                            {progress >= 50 && <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>}
                          </div>
                          <div className="flex justify-between items-start -mt-0.5">
                            <div className={`font-black text-[0.8rem] ${progress >= 50 ? 'text-slate-800' : 'text-slate-400'}`}>Sent for printing</div>
                            <div className="text-[0.7rem] text-slate-400 font-medium">{progress >= 50 ? 'Sent' : 'Pending'}</div>
                          </div>
                        </div>

                        <div className="relative">
                          <div className={`absolute -left-[1.65rem] w-4 h-4 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm ${progress >= 75 ? 'bg-emerald-500' : 'bg-white border-slate-200'}`}>
                             {progress >= 75 && <i className="ph-bold ph-check text-white text-[0.45rem]"></i>}
                          </div>
                          <div className="flex justify-between items-start -mt-0.5">
                            <div className={`font-black text-[0.8rem] ${progress >= 75 ? 'text-slate-800' : 'text-slate-400'}`}>Ready for delivery</div>
                            <div className="text-[0.7rem] text-slate-400 font-medium">{progress >= 75 ? 'Ready' : 'Pending'}</div>
                          </div>
                        </div>

                        <div className="relative">
                          <div className={`absolute -left-[1.65rem] w-4 h-4 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm ${statusLabel.toLowerCase() === 'delivered' ? 'bg-blue-500' : 'bg-white border-slate-200'}`}>
                             {statusLabel.toLowerCase() === 'delivered' && <i className="ph-bold ph-check text-white text-[0.45rem]"></i>}
                          </div>
                          <div className="flex justify-between items-start -mt-0.5">
                            <div className={`font-black text-[0.8rem] ${statusLabel.toLowerCase() === 'delivered' ? 'text-slate-800' : 'text-slate-400'}`}>Delivered</div>
                            <div className="text-[0.7rem] text-slate-400 font-medium">{statusLabel.toLowerCase() === 'delivered' ? 'Delivered' : 'Pending'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-slate-100 pt-6">
                      <h4 className="font-black text-slate-800 text-sm mb-4">Quick Actions</h4>
                      <div className="flex items-center gap-3">
                        <button className="flex-1 py-2.5 rounded-xl border border-purple-200 text-purple-700 font-bold text-xs hover:bg-purple-50 flex items-center justify-center gap-2 transition-colors">
                          <i className="ph-bold ph-upload-simple"></i> Upload Draft
                        </button>
                        <button 
                          onClick={() => {
                            if (selectedAlbumId) openBookingDetails(selectedAlbumId);
                          }}
                          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
                        >
                          <i className="ph-bold ph-eye"></i> View Details
                        </button>
                      </div>
                      <button 
                        onClick={() => handleUpdateAlbum(selectedAlbum.id, { status: 'Delivered', customData: { fld_b_album_status: 'Delivered', album_progress: '100' } })}
                        className="w-full mt-3 py-3 rounded-xl bg-purple-700 text-white font-bold text-sm hover:bg-purple-800 flex items-center justify-center gap-2 shadow-md transition-colors"
                      >
                        <i className="ph-bold ph-check-circle"></i> Mark as Completed
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
