"use client";

import React, { useState } from 'react';
import CustomDropdown from "@/components/ui/CustomDropdown";
import { cn } from "@/lib/utils";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";

import { updateAlbumTrackingAction } from "@/app/actions";
import { toast } from "sonner";

interface AlbumStatusClientProps {
  albums: any[];
  teamUsers?: any[];
  initialTab?: string;
}


const ALBUM_STATUS_OPTIONS = [
  'Shoot completed',
  'Designing',
  'Album Work in Progress',
  'Printing',
  'Album Completed',
  'Ready for delivery',
  'Delivered'
];

export default function AlbumStatusClient({ albums: initialAlbums, teamUsers = [], initialTab = 'Pending' }: AlbumStatusClientProps) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const { openBookingDetails } = useGlobalForm();
  const [activeTab, setActiveTab] = useState<'Pending' | 'All' | 'Work in Progress' | 'Completed' | 'Delivered' | 'Overdue'>(initialTab as any);
  const [searchQuery, setSearchQuery] = useState('');

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
    }
  };


  const selectedAlbum = albums.find(a => a.id === selectedAlbumId) || null;

  // Derive metrics
  const workInProgressCount = albums.filter(a => {
    const status = (a.status || '').trim().toLowerCase();
    return ['shoot completed', 'designing', 'printing', 'album work in progress'].includes(status);
  }).length;
  
  const completedCount = albums.filter(a => {
    const status = (a.status || '').trim().toLowerCase();
    return ['album completed', 'ready for delivery'].includes(status);
  }).length;

  const deliveredCount = albums.filter(a => {
    const status = (a.status || '').trim().toLowerCase();
    return status === 'delivered';
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
      if (deliveryDate < new Date() && a.status?.toLowerCase() !== 'delivered') {
        return true;
      }
    }
    return false;
  }).length;

  const filteredAlbums = albums.filter(a => {
    // Tab filter
    const status = (a.status || '').trim().toLowerCase();
    
    if (activeTab === 'Pending' && !['shoot completed', 'designing', 'printing', 'album work in progress', 'album completed', 'ready for delivery'].includes(status)) return false;
    if (activeTab === 'Work in Progress' && !['shoot completed', 'designing', 'printing', 'album work in progress'].includes(status)) return false;
    if (activeTab === 'Completed' && !['album completed', 'ready for delivery'].includes(status)) return false;
    if (activeTab === 'Delivered' && status !== 'delivered') return false;
    if (activeTab === 'Overdue') {
      let customData: any = {};
      try { customData = typeof a.customData === 'string' ? JSON.parse(a.customData) : (a.customData || {}); } catch(e) {}
      const deliveryDateStr = customData.album_delivery_date || customData.delivery_date;
      if (!deliveryDateStr) return false;
      const deliveryDate = new Date(deliveryDateStr);
      if (deliveryDate >= new Date() || status === 'delivered') return false;
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

  const totalCount = albums.length;

  return (
    <div className="view-section active w-full fade-in-up">
      <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-10">
        
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div onClick={() => setActiveTab('Work in Progress')} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 text-2xl">
              <i className="ph-fill ph-chart-pie-slice"></i>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">{workInProgressCount}</div>
              <div className="text-sm font-bold text-slate-800">Album Work in Progress</div>
              <div className="text-xs text-slate-500 mt-0.5">Active albums in designing</div>
            </div>
          </div>
          <div onClick={() => setActiveTab('Completed')} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 border-b-4 border-b-emerald-400 cursor-pointer hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 text-2xl">
              <i className="ph-fill ph-check-circle"></i>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">{completedCount}</div>
              <div className="text-sm font-bold text-slate-800">Album Completed</div>
              <div className="text-xs text-slate-500 mt-0.5">Ready for delivery</div>
            </div>
          </div>
          <div onClick={() => setActiveTab('Delivered')} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 border-b-4 border-b-blue-400 cursor-pointer hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-2xl">
              <i className="ph-fill ph-truck"></i>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">{deliveredCount}</div>
              <div className="text-sm font-bold text-slate-800">Delivered Today</div>
              <div className="text-xs text-slate-500 mt-0.5">Albums delivered today</div>
            </div>
          </div>
          <div onClick={() => setActiveTab('Overdue')} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 border-b-4 border-b-red-400 cursor-pointer hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-2xl">
              <i className="ph-fill ph-warning-circle"></i>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">{overdueCount}</div>
              <div className="text-sm font-bold text-slate-800">Overdue Albums</div>
              <div className="text-xs text-slate-500 mt-0.5">Past delivery date</div>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto overflow-x-auto">
              {['Pending', 'All', 'Work in Progress', 'Completed', 'Delivered', 'Overdue'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${activeTab === tab ? 'text-purple-700 border border-purple-200 bg-purple-50/50' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                >
                  {tab}
                </button>
              ))}
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
                      <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Designer</th>
                      <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Delivery Date</th>
                      <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                      <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Progress</th>
                      <th className="p-5 text-[0.7rem] font-black text-slate-400 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAlbums.map((a: any) => {
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
                    
                    let statusLabel = a.status || 'Pending';
                    let statusColor = 'bg-slate-100 text-slate-700';
                    let progress = parseInt(cData.album_progress || '0');
                    
                    if (statusLabel.toLowerCase() === 'album work in progress' || statusLabel.toLowerCase() === 'designing') {
                      statusLabel = 'Album Work in Progress';
                      statusColor = 'bg-orange-100 text-orange-700';
                      if (progress === 0) progress = 45;
                    } else if (statusLabel.toLowerCase() === 'album completed' || statusLabel.toLowerCase() === 'ready for delivery') {
                      statusLabel = 'Album Completed';
                      statusColor = 'bg-emerald-100 text-emerald-700';
                      if (progress === 0) progress = 100;
                    } else if (statusLabel.toLowerCase() === 'delivered') {
                      statusColor = 'bg-blue-100 text-blue-700';
                      if (progress === 0) progress = 100;
                    }

                    return (
                      <tr key={a.id} className={`hover:bg-slate-50/80 transition-colors ${selectedAlbumId === a.id ? 'bg-slate-50' : ''}`}>
                        <td className="p-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center text-slate-500 font-black uppercase text-lg">
                              {a.client?.name?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-slate-800 text-sm">{a.client?.name}</div>
                              <div className="text-xs text-slate-500 font-medium">{a.category} • {formattedShootDate}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 whitespace-nowrap">
                          <span className="text-purple-600 font-black text-sm">{a.bookingNumber || `BK-${a.id.substring(a.id.length - 4).toUpperCase()}`}</span>
                        </td>
                        <td className="p-5 whitespace-nowrap">
      <CustomDropdown 
        options={[{ label: "Unassigned", value: "" }, ...teamUsers.map(u => ({ label: u.name, value: u.id }))]}
        value={designerId || ""} 
        onChange={(val) => handleUpdateAlbum(a.id, { customData: { designer: val } })}
        className="w-40 bg-transparent border-none outline-none shadow-none text-xs font-black"
        placeholder="Unassigned"
      />
   </td>
                        <td className="p-5 whitespace-nowrap flex flex-col">
      <input 
        type="date"
        value={deliveryDateStr ? new Date(deliveryDateStr).toISOString().split('T')[0] : ""}
        onChange={(e) => handleUpdateAlbum(a.id, { customData: { album_delivery_date: e.target.value } })}
        className="bg-transparent text-xs font-black text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none focus:border-purple-400 cursor-pointer"
      />
      {deliveryDateStr && new Date(deliveryDateStr) < new Date() && statusLabel.toLowerCase() !== 'delivered' && (
        <div className="text-[0.65rem] text-orange-500 font-bold mt-0.5">Overdue by {Math.floor((new Date().getTime() - new Date(deliveryDateStr).getTime()) / (1000 * 3600 * 24))} days</div>
      )}
   </td>
                        <td className="p-5 whitespace-nowrap">
      <CustomDropdown 
        options={ALBUM_STATUS_OPTIONS}
        value={a.status || ""} 
        onChange={(val) => {
          let newProgress = progress;
          if (val === 'Delivered' || val.includes('Completed')) newProgress = 100;
          handleUpdateAlbum(a.id, { status: val, customData: { album_progress: newProgress.toString() } });
        }}
        className={cn("w-36 rounded-lg text-[0.75rem] font-black border-none", statusColor)}
        placeholder="Select Status"
      />
   </td>
                        <td className="p-5 w-32 whitespace-nowrap">
      <div className="flex items-center justify-between text-[0.75rem] font-black text-slate-800 mb-1">
        <span>{progress}%</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="100" 
        value={progress}
        onChange={(e) => handleUpdateAlbum(a.id, { customData: { album_progress: e.target.value } })}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
      />
   </td>
                        <td className="p-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setSelectedAlbumId(a.id);
                                openBookingDetails(a.id);
                              }}
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
            
            {/* Pagination Mock */}
            {totalCount > 0 && filteredAlbums.length > 0 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 mt-auto">
                <div className="flex gap-1">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600"><i className="ph-bold ph-caret-left"></i></button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700 font-bold text-sm">1</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 font-bold text-sm">2</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600"><i className="ph-bold ph-caret-right"></i></button>
                </div>
                <div className="text-xs font-bold text-slate-500">
                  Showing 1 to {Math.min(filteredAlbums.length, 10)} of {filteredAlbums.length} albums
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

                let statusLabel = selectedAlbum.status || 'Pending';
                let statusColor = 'bg-slate-100 text-slate-700';
                let progress = parseInt(cData.album_progress || '0');
                
                if (statusLabel.toLowerCase() === 'album work in progress' || statusLabel.toLowerCase() === 'designing') {
                  statusLabel = 'Album Work in Progress';
                  statusColor = 'bg-orange-100 text-orange-700';
                  if (progress === 0) progress = 45;
                } else if (statusLabel.toLowerCase() === 'album completed' || statusLabel.toLowerCase() === 'ready for delivery') {
                  statusLabel = 'Album Completed';
                  statusColor = 'bg-emerald-100 text-emerald-700';
                  if (progress === 0) progress = 100;
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
    <input 
      type="date"
      value={deliveryDateStr ? new Date(deliveryDateStr).toISOString().split('T')[0] : ""}
      onChange={(e) => handleUpdateAlbum(selectedAlbum.id, { customData: { album_delivery_date: e.target.value } })}
      className="bg-transparent border-b border-dashed border-slate-300 outline-none cursor-pointer"
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
                      <div className="grid grid-cols-[110px_1fr] text-[0.85rem] items-center">
                        <div className="text-slate-500 font-medium">Progress</div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-normal">:</span>
                          <span className="font-black text-slate-800">{progress}%</span>
                          <div className="w-24 bg-slate-200 rounded-full h-1.5 ml-2">
                            <div className={`h-1.5 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
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
                            <div className="font-black text-slate-800 text-[0.8rem]">Shoot Completed</div>
                            <div className="text-[0.7rem] text-slate-400 font-medium">{formattedShootDate}</div>
                          </div>
                        </div>

                        <div className="relative">
                          <div className={`absolute -left-[1.65rem] w-4 h-4 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm ${progress >= 10 ? 'bg-white border-orange-400' : 'bg-slate-200'}`}>
                            {progress >= 10 && <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>}
                          </div>
                          <div className="flex justify-between items-start -mt-0.5">
                            <div className={`font-black text-[0.8rem] ${progress >= 10 ? 'text-slate-800' : 'text-slate-400'}`}>Album Work Started</div>
                            <div className="text-[0.7rem] text-slate-400 font-medium">{progress >= 10 ? 'Started' : 'Pending'}</div>
                          </div>
                        </div>

                        <div className="relative">
                          <div className={`absolute -left-[1.65rem] w-4 h-4 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm ${progress >= 100 ? 'bg-emerald-500' : 'bg-white border-slate-200'}`}>
                             {progress >= 100 && <i className="ph-bold ph-check text-white text-[0.45rem]"></i>}
                          </div>
                          <div className="flex justify-between items-start -mt-0.5">
                            <div className={`font-black text-[0.8rem] ${progress >= 100 ? 'text-slate-800' : 'text-slate-400'}`}>Album Completed</div>
                            <div className="text-[0.7rem] text-slate-400 font-medium">{progress >= 100 ? 'Completed' : 'Pending'}</div>
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
                      <button className="w-full mt-3 py-3 rounded-xl bg-purple-700 text-white font-bold text-sm hover:bg-purple-800 flex items-center justify-center gap-2 shadow-md transition-colors">
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
