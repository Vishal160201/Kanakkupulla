"use client";

import { useBookings } from "../providers/BookingProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Booking } from "@/types";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

import DatePickerInput from "../ui/DatePickerInput";
import MultiUserPicklist from "../ui/MultiUserPicklist";
import { deleteBookingAction, updateBookingStatusAction, saveBookingAction } from "@/app/actions";
import { toast } from "sonner";


const fetcher = (url: string) => fetch(url).then(r => r.json());

interface BookingDetailsModalProps {
  booking: Booking | null;
  onClose?: () => void;
  onRefresh?: () => void;
}

export default function BookingDetailsModal({ booking, onClose, onRefresh }: BookingDetailsModalProps) {
  const router = useRouter();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [layoutSchema, setLayoutSchema] = useState<any>(null);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isAddAttachmentOpen, setIsAddAttachmentOpen] = useState(false);
  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [installments, setInstallments] = useState<{amount: string, date: string}[]>([]);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!booking) return;
    setIsExportMenuOpen(false);
    try {
      if (format === 'csv') {
        const escapeCsv = (val: any) => {
          if (val === null || val === undefined || val === '') return '""';
          let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        };
        const headers = ['ID', 'Client', 'Phone', 'Email', 'Category', 'Date', 'Time', 'Location', 'Status', 'Package Amount', 'Advance', 'Due', 'Installments', 'Inclusions', 'Notes', 'Custom Data'];
        const rows = [[
          escapeCsv(booking.bookingNumber || booking.id.substring(0, 8)),
          escapeCsv(booking.title),
          escapeCsv(booking.phone || booking.customData?.fld_b_phone),
          escapeCsv(booking.email || booking.customData?.fld_b_email),
          escapeCsv(booking.category),
          escapeCsv(booking.date ? new Date(booking.date).toLocaleDateString() : ''),
          escapeCsv(booking.time),
          escapeCsv(booking.location),
          escapeCsv(booking.status),
          escapeCsv(booking.package || (booking as any).order?.package || booking.customData?.fld_b_package),
          escapeCsv(booking.advance || (booking as any).order?.advance || booking.customData?.fld_b_advance),
          escapeCsv(booking.due || (booking as any).order?.due),
          escapeCsv((booking as any).order?.installments),
          escapeCsv(booking.inclusions),
          escapeCsv(booking.notes),
          escapeCsv(booking.customData)
        ]];
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `booking-${booking.bookingNumber || booking.id.substring(0, 8)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const { jsPDF } = await import("jspdf");
        const html2canvas = (await import("html2canvas")).default;
        
        const element = document.getElementById('pdf-content');
        if (!element) {
          toast.error("Could not generate PDF");
          return;
        }

        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#F5F6F8' });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`booking-${booking.bookingNumber || booking.id.substring(0, 8)}.pdf`);
      }
      toast.success("Export successful!");
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    }
  };

  const generateInvoice = async () => {
    setIsGeneratingInvoice(true);
    setTimeout(async () => {
      try {
        const element = document.getElementById('invoice-template');
        if (!element) return;
        const html2canvas = (await import("html2canvas")).default;
        const { jsPDF } = await import("jspdf");
        
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`invoice-${booking?.bookingNumber || booking?.id?.substring(0, 8)}.pdf`);
        toast.success("Invoice generated successfully!");
      } catch (error) {
        toast.error("Failed to generate invoice");
        console.error(error);
      } finally {
        setIsGeneratingInvoice(false);
      }
    }, 100);
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditData({
         title: booking?.title || '',
         category: booking?.category || 'Wedding',
         date: booking?.date ? new Date(booking.date).toISOString().split('T')[0] : '',
         time: booking?.time || '',
         location: booking?.location || '',
         phone: booking?.phone || (booking as any)?.client?.phone || '',
         email: booking?.email || (booking as any)?.client?.email || '',
         packageName: booking?.packageName || booking?.customData?.fld_b_package_name || '',
         inclusions: Array.isArray(booking?.inclusions) ? booking.inclusions.join(', ') : (typeof booking?.inclusions === 'string' ? booking.inclusions : ''),
         package: booking?.package || (booking as any)?.order?.package?.toString() || booking?.customData?.fld_b_package?.toString() || '',
         advance: booking?.advance || (booking as any)?.order?.advance?.toString() || booking?.customData?.fld_b_advance?.toString() || '',
         due: booking?.due || (booking as any)?.order?.due?.toString() || '',
         status: booking?.status || 'Confirmed',
         photographers: booking?.photographers || booking?.customData?.fld_b_photographers || booking?.customData?.team || []
      });
    }
    if (!isEditing) { setInstallments((booking as any)?.order?.installments || []); }
    setIsEditing(!isEditing);
  };

  useEffect(() => {
    let fp: any = null;
    if (isEditing && timeInputRef.current) {
      fp = flatpickr(timeInputRef.current, {
        enableTime: true,
        noCalendar: true,
        dateFormat: "h:i K",
        defaultDate: editData.time || '10:00 AM',
        onChange: (_, dateStr) => setEditData((prev: any) => ({...prev, time: dateStr}))
      });
    }
    return () => { if (fp) fp.destroy(); };
  }, [isEditing]);

  const handleSaveEdit = async () => {
    setIsLoading(true);
    try {
    const errors: Record<string, boolean> = {};
    if (!editData.title?.trim()) errors.title = true;
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fill in the highlighted mandatory fields.");
      setIsLoading(false);
      return;
    }
    setFormErrors({});

      const formData = new FormData();
      formData.append("id", booking?.id || "");
      Object.entries(editData).forEach(([k, v]) => {
        if (k === 'inclusions') {
          // parse comma separated string to JSON string array for inclusions
          const arr = String(v).split(',').map(s => s.trim()).filter(Boolean);
          formData.append(k, JSON.stringify(arr));
        } else {
          formData.append(k, String(v));
        }
      });
      
      let finalInstallments = installments;
      if (finalInstallments.length === 0 && Number(editData.advance) > 0) {
        finalInstallments = [{ amount: editData.advance.toString(), date: new Date().toISOString().split('T')[0] }];
      }
      formData.append("installments", JSON.stringify(finalInstallments));
      const res = await saveBookingAction(formData);
      if (res.success) {
        toast.success("Booking updated successfully!");
        setIsEditing(false);
        if (onRefresh) onRefresh();
        else window.location.reload();
      } else {
        toast.error("Failed to update booking. Check inputs.");
        console.error(res.errors);
      }
    } catch (e) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsClosing(false);
  }, [booking]);

  const updateBookingAPI = async (data: any) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/bookings/${booking?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok && onRefresh) {
        toast.success("Updated successfully!");
        onRefresh();
      } else if (res.ok) {
        toast.success("Updated successfully!");
        window.location.reload(); // fallback
      } else {
        toast.error("Failed to update booking");
      }
    } catch (e) {
      console.error("Error updating booking", e);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = () => {
    if(!booking) return;
    setNewNote(booking.notes || booking.customData?.notes || "");
    setIsAddNoteOpen(true);
  };

  const handleAddAttachment = () => {
    if(!booking) return;
    setNewAttachmentName("Attachment");
    setNewAttachmentUrl("");
    setIsAddAttachmentOpen(true);
  };

  const { data: layoutRes } = useSWR("/api/settings/layouts/BOOKING_FORM", fetcher);
  const { data: usersRes } = useSWR("/api/users", fetcher);

  useEffect(() => {
    if (layoutRes?.schema) setLayoutSchema(layoutRes.schema);
    if (usersRes) setTeamUsers(usersRes);
  }, [layoutRes, usersRes]);

  const getCustomFieldLabel = (fieldId: string) => {
    if (!layoutSchema || !layoutSchema.sections) return fieldId;
    for (const section of layoutSchema.sections) {
      const field = section.fields?.find((f: any) => f.id === fieldId);
      if (field) return field.name;
    }
    return fieldId;
  };

  const FIELD_ICONS: Record<string, string> = {
    SINGLE_LINE: "ph-text-t", MULTI_LINE: "ph-text-align-left", PICK_LIST: "ph-list-dashes",
    STATUS_PICKER: "ph-palette", MULTI_SELECT: "ph-list-checks", DATE: "ph-calendar-blank",
    CHECKBOX: "ph-check-square", CURRENCY: "ph-currency-inr", PERCENTAGE: "ph-percent",
    NUMBER: "ph-hash", DECIMAL: "ph-math-operations", EMAIL: "ph-envelope-simple",
    PHONE: "ph-phone", USER_PICKLIST: "ph-user", MULTI_USER_PICKLIST: "ph-users"
  };

  const standardFieldMap: Record<string, string> = {
    fld_b_client: 'title', fld_b_phone: 'phone', fld_b_email: 'email',
    fld_b_date: 'date', fld_b_time: 'time', fld_b_category: 'category',
    fld_b_location: 'location', fld_b_status: 'status', fld_b_package: 'package', fld_b_advance: 'advance'
  };



  const statusField = layoutSchema?.sections?.flatMap((s: any) => s.fields).find((f: any) => f.type === 'STATUS_PICKER' || f.id === 'fld_b_status');
  const isStatusPicker = statusField?.type === 'STATUS_PICKER';
  const statusOptions = isStatusPicker ? (statusField.statusOptions || []) : [];
  
  const currentOpt = isStatusPicker ? statusOptions.find((o: any) => o.label === booking?.status) : null;
  const statusColor = currentOpt ? currentOpt.color : (booking?.status === 'Confirmed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : booking?.status === 'Pending' ? 'bg-red-500' : 'bg-orange-500');

  const changeStatus = async (newStatus: string) => {
    if (!booking) return;
    setIsUpdatingStatus(true);
    const res = await updateBookingStatusAction(booking.id, newStatus);
    setIsUpdatingStatus(false);
    
    if (res.success) {
      toast.success(`Status updated to ${newStatus}`);
      setIsStatusDropdownOpen(false);
    } else {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (booking) {
      setIsDeleting(true);
      const res = await deleteBookingAction(booking.id);
      setIsDeleting(false);
      if (res.success) {
        toast.success("Booking deleted successfully!");
        setIsDeleteConfirmOpen(false);
        router.back();
      } else {
        toast.error("Failed to delete booking.");
      }
    }
  };

  return (
    <Dialog open={!!booking && !isDeleteConfirmOpen} onOpenChange={(open) => {
      if (!open) router.back();
    }}>
      {booking && (
      <DialogContent className="max-w-[1100px] sm:max-w-[1100px] p-0 bg-[#F5F6F8] rounded-[2rem] overflow-hidden border-0 shadow-2xl !rounded-[2rem] h-[95vh] flex flex-col">
         {/* Main scrollable area */}
         <div className="flex-1 overflow-y-auto p-6 md:p-8">
             
             
             {/* New Revamped Layout Begins Here */}
             <div id="pdf-content" className="max-w-[1100px] mx-auto flex flex-col gap-6 p-4">
                
                {/* Header Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-transparent">
                   <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                         <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-800 font-bold text-[0.8rem] rounded-full">
                           <i className="ph-fill ph-folder text-orange-600"></i>
                           {booking.bookingNumber || booking.id.substring(0, 8)}
                         </span>
                      </div>
                      {isEditing ? (
                        <input className={`text-[2.5rem] font-black text-[#0B1E40] leading-none tracking-tight bg-transparent border-b-2 ${formErrors.title ? "border-red-500" : "border-blue-500"} focus:outline-none w-full mb-2`} value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} placeholder="Client Name" />
                      ) : (
                        <h1 className="text-[2.5rem] font-black text-[#0B1E40] leading-none tracking-tight mb-2">
                           {booking.title || 'Untitled Booking'}
                        </h1>
                      )}
                      <div className="flex items-center gap-4 mt-1">
                         <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                               <i className="ph-fill ph-squares-four text-indigo-500 text-lg"></i>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-slate-400 text-[0.65rem] font-bold uppercase tracking-wider leading-tight">Category</span>
                               {isEditing ? (
                                 <Select value={editData.category} onValueChange={v => setEditData({...editData, category: v})}>
                                    <SelectTrigger className="w-[120px] bg-transparent border-b border-gray-300 font-bold text-[#0B1E40] text-[0.95rem] shadow-none p-0 h-6">
                                       <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                       <SelectItem value="Wedding">Wedding</SelectItem>
                                       <SelectItem value="Fashion">Fashion</SelectItem>
                                       <SelectItem value="Baby & Kids">Baby & Kids</SelectItem>
                                       <SelectItem value="Corporate">Corporate</SelectItem>
                                    </SelectContent>
                                 </Select>
                               ) : (
                                 <span className="text-[#0B1E40] font-bold text-[0.95rem] leading-tight">{booking.category || 'Uncategorized'}</span>
                               )}
                            </div>
                         </div>
                         
                         {isStatusPicker && (
                            <div className="relative ml-4 z-50">
                              <button 
                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                disabled={isUpdatingStatus}
                                className={`flex items-center gap-2.5 bg-white px-4 py-2 rounded-full border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm cursor-pointer ${isUpdatingStatus ? 'opacity-50' : ''}`}
                              >
                                <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`}></div>
                                <span className="font-bold text-[0.9rem] text-[#0B1E40]">{booking.status}</span>
                                <i className={`ph-bold ph-caret-down text-slate-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`}></i>
                              </button>
                              {isStatusDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 p-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 animate-in fade-in slide-in-from-top-2 w-64 max-h-[250px] overflow-y-auto">
                                   {statusOptions.map((opt: any, idx: number) => (
                                     <button
                                       key={idx}
                                       onClick={() => changeStatus(opt.label)}
                                       className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[0.9rem] font-bold transition-colors ${booking.status === opt.label ? 'bg-slate-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                     >
                                       <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`}></div>
                                       <span className="truncate">{opt.label}</span>
                                       {booking.status === opt.label && <i className="ph-bold ph-check ml-auto text-slate-400"></i>}
                                     </button>
                                   ))}
                                </div>
                              )}
                            </div>
                         )}
                      </div>
                   </div>

                   <div className="flex items-center gap-3" data-html2canvas-ignore="true">
                      <button onClick={handleDeleteClick} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 rounded-xl font-bold text-[0.9rem] text-red-500 hover:bg-red-50 hover:border-red-300 shadow-sm transition-colors">
                         <i className="ph-bold ph-trash text-lg"></i> Delete
                      </button>
                      <div className="relative z-50">
                        <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-[0.9rem] text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                           <i className="ph-bold ph-share-network text-lg"></i> Export
                        </button>
                        {isExportMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)}></div>
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
                      <button onClick={generateInvoice} disabled={isGeneratingInvoice} className="flex items-center gap-2 px-6 py-2.5 bg-[#0B1E40] text-white rounded-xl font-bold text-[0.9rem] hover:bg-[#152a52] shadow-md transition-colors disabled:opacity-50">
                         <i className={`ph-bold ${isGeneratingInvoice ? 'ph-spinner animate-spin' : 'ph-printer'} text-lg`}></i> {isGeneratingInvoice ? 'Generating...' : 'Invoice'}
                      </button>
                   </div>
                </div>

                {/* Top Info Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-4 px-6 flex flex-wrap md:flex-nowrap items-center justify-between gap-6 overflow-hidden relative">
                   <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                         <i className="ph-fill ph-file-text text-orange-500 text-xl"></i>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest">Booking ID</span>
                         <span className="font-bold text-[#0B1E40] text-[0.95rem]">{booking.bookingNumber || booking.id.substring(0, 8)}</span>
                      </div>
                   </div>
                   <div className="w-px h-10 bg-gray-100 hidden md:block"></div>
                   <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                         <i className="ph-fill ph-calendar-blank text-blue-500 text-xl"></i>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest">Created On</span>
                         <span className="font-bold text-[#0B1E40] text-[0.95rem]">{(booking as any).createdAt ? new Date((booking as any).createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}</span>
                      </div>
                   </div>
                   <div className="w-px h-10 bg-gray-100 hidden md:block"></div>
                   <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                         <i className="ph-fill ph-clock-counter-clockwise text-orange-500 text-xl"></i>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest">Last Updated</span>
                         <span className="font-bold text-[#0B1E40] text-[0.95rem]">{(booking as any).updatedAt ? new Date((booking as any).updatedAt).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) : 'Unknown'}</span>
                      </div>
                   </div>
                   <div className="w-px h-10 bg-gray-100 hidden md:block"></div>
                   <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0 overflow-hidden">
                         {booking.customData?.fld_b_assigned_to ? (
                             <span className="font-black text-purple-700 text-[0.8rem]">{(teamUsers.find(u => u.id === booking.customData?.fld_b_assigned_to)?.name || 'UN').substring(0,2).toUpperCase()}</span>
                         ) : (
                             <i className="ph-fill ph-user text-purple-500 text-xl"></i>
                         )}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest">Assigned To</span>
                         <span className="font-bold text-[#0B1E40] text-[0.95rem]">{booking.customData?.fld_b_assigned_to ? teamUsers.find(u => u.id === booking.customData?.fld_b_assigned_to)?.name || 'Unknown' : 'Unassigned'}</span>
                      </div>
                   </div>
                </div>

                {/* 3 Main Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   {/* Client Information */}
                   <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                      <div className="flex justify-between items-center mb-6">
                         <div className="flex items-center gap-2.5">
                            <i className="ph-duotone ph-user text-indigo-500 text-xl"></i>
                            <h3 className="text-[1.05rem] font-black text-[#0B1E40]">Client Information</h3>
                         </div>
                         <button onClick={handleEditToggle} data-html2canvas-ignore="true" className="flex items-center gap-1.5 text-blue-500 font-bold text-[0.8rem] hover:text-blue-600 transition-colors">
                           <i className="ph-bold ph-pencil-simple"></i> {isEditing ? 'Editing...' : 'Edit'}
                         </button>
                      </div>
                      <div className="flex flex-col gap-5">
                         <div className="flex items-center gap-4">
                            <i className="ph-fill ph-phone text-emerald-500 text-xl shrink-0"></i>
                            {isEditing ? (
                               <input className={`font-bold text-[#0B1E40] text-[0.95rem] border-b focus:outline-none bg-transparent w-full ${formErrors.phone ? "border-red-500" : "border-gray-300"}`} value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Phone" />
                            ) : (
                               <span className="font-bold text-[#0B1E40] text-[0.95rem]">{booking.phone || booking.customData?.fld_b_phone || 'N/A'}</span>
                            )}
                         </div>
                         <div className="flex items-center gap-4">
                            <i className="ph-fill ph-envelope-simple text-emerald-500 text-xl shrink-0"></i>
                            {isEditing ? (
                               <input className="font-bold text-[#0B1E40] text-[0.95rem] truncate border-b border-gray-300 focus:outline-none bg-transparent w-full" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} placeholder="Email" />
                            ) : (
                               <span className="font-bold text-[#0B1E40] text-[0.95rem] truncate">{booking.email || booking.customData?.fld_b_email || 'N/A'}</span>
                            )}
                         </div>
                         
                      </div>
                   </div>

                   {/* Event Details */}
                   <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                      <div className="flex justify-between items-center mb-6">
                         <div className="flex items-center gap-2.5">
                            <i className="ph-duotone ph-calendar-blank text-blue-500 text-xl"></i>
                            <h3 className="text-[1.05rem] font-black text-[#0B1E40]">Event Details</h3>
                         </div>
                      </div>
                      <div className="flex flex-col gap-4">
                         <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                               <i className="ph-fill ph-calendar-blank text-blue-500 text-[1.1rem]"></i>
                            </div>
                            {isEditing ? (
                              <DatePickerInput value={editData.date} onChange={date => setEditData({...editData, date})} hasError={formErrors.date} className={`font-bold text-[#0B1E40] text-[0.95rem] border-b focus:outline-none bg-transparent w-full pb-1 ${formErrors.date ? "border-red-500" : "border-gray-300"}`} />
                            ) : (
                              <span className="font-bold text-[#0B1E40] text-[0.95rem]">
                                 {booking.date ? new Date(booking.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                              </span>
                            )}
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                               <i className="ph-fill ph-clock text-purple-500 text-[1.1rem]"></i>
                            </div>
                            {isEditing ? (
                              <Select value={editData.time} onValueChange={v => setEditData({...editData, time: v})}>
                                  <SelectTrigger className={`w-full bg-transparent border-b font-bold text-[#0B1E40] text-[0.95rem] shadow-none px-0 py-1 h-8 ${formErrors.time ? "border-red-500" : "border-gray-300"}`}>
                                     <SelectValue placeholder="Select Time" />
                                  </SelectTrigger>
                                  <SelectContent>
                                     <SelectItem value="06:00 AM">06:00 AM</SelectItem>
<SelectItem value="07:00 AM">07:00 AM</SelectItem>
<SelectItem value="08:00 AM">08:00 AM</SelectItem>
<SelectItem value="09:00 AM">09:00 AM</SelectItem>
<SelectItem value="10:00 AM">10:00 AM</SelectItem>
<SelectItem value="11:00 AM">11:00 AM</SelectItem>
<SelectItem value="12:00 PM">12:00 PM</SelectItem>
<SelectItem value="01:00 PM">01:00 PM</SelectItem>
<SelectItem value="02:00 PM">02:00 PM</SelectItem>
<SelectItem value="03:00 PM">03:00 PM</SelectItem>
<SelectItem value="04:00 PM">04:00 PM</SelectItem>
<SelectItem value="05:00 PM">05:00 PM</SelectItem>
<SelectItem value="06:00 PM">06:00 PM</SelectItem>
<SelectItem value="07:00 PM">07:00 PM</SelectItem>
<SelectItem value="08:00 PM">08:00 PM</SelectItem>
<SelectItem value="09:00 PM">09:00 PM</SelectItem>
                                  </SelectContent>
                               </Select>
                            ) : (
                              <span className="font-bold text-[#0B1E40] text-[0.95rem]">{booking.time || booking.customData?.fld_b_time || 'N/A'}</span>
                            )}
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                               <i className="ph-fill ph-map-pin text-emerald-500 text-[1.1rem]"></i>
                            </div>
                            {isEditing ? (
                               <input className={`font-bold text-[#0B1E40] text-[0.95rem] border-b focus:outline-none bg-transparent w-full ${formErrors.location ? "border-red-500" : "border-gray-300"}`} value={editData.location} onChange={e => setEditData({...editData, location: e.target.value})} placeholder="Location" />
                            ) : (
                               <span className="font-bold text-[#0B1E40] text-[0.95rem]">{booking.location || booking.customData?.fld_b_location || 'N/A'}</span>
                            )}
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                               <i className="ph-fill ph-bookmark-simple text-orange-500 text-[1.1rem]"></i>
                            </div>
                            {isEditing ? (
                                 <Select value={editData.category} onValueChange={v => setEditData({...editData, category: v})}>
                                    <SelectTrigger className="w-full font-bold text-[#0B1E40] text-[0.95rem] border-b border-gray-300 bg-transparent rounded-none px-0 shadow-none focus:ring-0">
                                       <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                       <SelectItem value="Wedding">Wedding</SelectItem>
                                       <SelectItem value="Fashion">Fashion</SelectItem>
                                       <SelectItem value="Baby & Kids">Baby & Kids</SelectItem>
                                       <SelectItem value="Corporate">Corporate</SelectItem>
                                    </SelectContent>
                                 </Select>
                            ) : (
                              <span className="font-bold text-[#0B1E40] text-[0.95rem]">{booking.category || booking.customData?.fld_b_category || 'N/A'}</span>
                            )}
                         </div>
                      </div>
                   </div>

                   {/* Timeline */}
                   <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                      <div className="flex justify-between items-center mb-6">
                         <h3 className="text-[1.05rem] font-black text-[#0B1E40]">Timeline</h3>
                      </div>
                      <div className="flex flex-col relative">
                         {(() => {
                           const activeIndex = statusOptions.findIndex((o: any) => o.label === booking.status);
                           const isCompleted = activeIndex === statusOptions.length - 1 && booking.status === 'Completed';
                           
                           return statusOptions.map((opt: any, idx: number) => {
                             const isPast = activeIndex > idx || isCompleted;
                             const isCurrent = activeIndex === idx && !isCompleted;
                             
                             let circleClass = '';
                             let icon = null;
                             
                             if (isPast) {
                               circleClass = 'bg-emerald-500 shadow-[0_0_0_4px_white] z-20';
                               icon = <i className="ph-bold ph-check text-white text-xs"></i>;
                             } else if (isCurrent) {
                               circleClass = 'bg-blue-500 border-[6px] border-white shadow-[0_0_0_1px_#3b82f6] z-20';
                               icon = <div className="w-1.5 h-1.5 rounded-full bg-white"></div>;
                             } else {
                               circleClass = 'bg-gray-200 border-[4px] border-white z-20';
                             }
                             
                             return (
                               <div key={idx} className="flex gap-4 mb-5 relative">
                                  {idx < statusOptions.length - 1 && (
                                     <div className={`absolute left-[11px] top-6 h-[calc(100%+20px)] w-0.5 z-0 ${isPast ? 'bg-emerald-500' : 'bg-gray-100'}`}></div>
                                  )}
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${circleClass}`}>
                                     {icon}
                                  </div>
                                  <div className="flex flex-col z-10 bg-white/50 pr-2">
                                     <span className={`font-bold text-[0.9rem] ${isCurrent || isPast ? 'text-[#0B1E40]' : 'text-slate-500'}`}>{opt.label}</span>
                                     <span className="text-slate-400 text-[0.7rem] font-semibold mt-0.5">{isCurrent ? 'In Progress' : isPast ? 'Completed' : 'Pending'}</span>
                                  </div>
                               </div>
                             );
                           });
                         })()}
                      </div>
                   </div>
                </div>

                {/* Package & Payment */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col mt-2">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                         <i className="ph-fill ph-camera text-orange-500 text-xl"></i>
                      </div>
                      <div className="flex flex-col">
                         <h3 className="text-[1.1rem] font-black text-[#0B1E40]">Package & Payment</h3>
                         <span className="text-[0.8rem] font-medium text-slate-500">Summary of package details and payment status.</span>
                      </div>
                   </div>
                   
                   {isEditing ? (
                     <div className="flex flex-col 2xl:flex-row 2xl:items-start justify-between gap-8 mb-8 pl-1">
                        <div className="flex flex-col flex-1 min-w-[280px]">
                          <span className="text-[0.75rem] font-bold text-slate-400 mb-2">Inclusions</span>
                          <div className="flex flex-wrap gap-3 mt-1">
                             {["Photography", "Videography", "Drone", "Candid", "Traditional", "Album"].map(inc => {
                               const selected = editData.inclusions?.split(',').map((s:string) => s.trim()).includes(inc);
                               return (
                                 <button type="button" key={inc} onClick={() => {
                                    let current = editData.inclusions?.split(',').map((s:string) => s.trim()).filter(Boolean) || [];
                                    if (selected) current = current.filter((c:string) => c !== inc);
                                    else current.push(inc);
                                    setEditData({...editData, inclusions: current.join(', ')});
                                 }} className={`px-4 py-2 font-bold text-[0.8rem] rounded-xl border transition-all ${selected ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/20' : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'}`}>
                                   {inc}
                                 </button>
                               );
                             })}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap xl:flex-nowrap items-start gap-6 xl:gap-8 mt-6 2xl:mt-0">
                           {/* 1. Total Amount */}
                           <div className="flex flex-col bg-orange-50/50 p-4 rounded-2xl border border-orange-50 min-w-[140px]">
                              <span className="text-[0.75rem] font-bold text-slate-500 mb-2">Total Amount</span>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input type="number" className="h-[45px] w-[140px] rounded-xl border border-orange-200 bg-white pl-8 pr-4 text-[1.1rem] font-black text-amber-700 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={editData.package} onChange={e => {
                                  const pkg = e.target.value;
                                  const advance = editData.advance || 0;
                                  const due = Math.max(0, Number(pkg) - advance);
                                  setEditData({...editData, package: pkg, due});
                                }} placeholder="Amount" />
                              </div>
                           </div>

                           <div className="hidden xl:block w-px h-16 bg-gray-100 mt-2"></div>
                           
                           {/* 2. Paid */}
                           <div className="flex flex-col min-w-[140px]">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[0.75rem] font-bold text-slate-400">Paid</span>
                                <button type="button" onClick={() => {
                                  if (installments.length === 0 && Number(editData.advance) > 0) {
                                    setInstallments([
                                      { amount: editData.advance.toString(), date: new Date().toISOString().split('T')[0] },
                                      { amount: '', date: new Date().toISOString().split('T')[0] }
                                    ]);
                                  } else {
                                    setInstallments([...installments, { amount: '', date: new Date().toISOString().split('T')[0] }]);
                                  }
                                }} className="text-[0.7rem] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors">
                                  <i className="ph-bold ph-plus"></i> Add Installment
                                </button>
                              </div>
                              {installments.length === 0 ? (
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                  <input type="number" className="h-[45px] w-[140px] rounded-xl border border-gray-200 bg-white pl-8 pr-4 text-[1.1rem] font-black text-emerald-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={editData.advance} onChange={e => {
                                    const advance = e.target.value;
                                    const pkg = editData.package || 0;
                                    const due = Math.max(0, pkg - Number(advance));
                                    setEditData({...editData, advance, due});
                                  }} placeholder="Amount" />
                                </div>
                               ) : (
                                 <div className="flex flex-col gap-2 min-w-[240px]">
                                    {installments.map((inst, idx) => (
                                      <div key={idx} className="flex gap-2 items-center">
                                        <div className="flex-1 relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[0.8rem]">₹</span>
                                          <input type="number" value={inst.amount} onChange={(e) => {
                                             const newInst = [...installments];
                                             newInst[idx].amount = e.target.value;
                                             setInstallments(newInst);
                                             
                                             const sum = newInst.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                                             const pkg = editData.package || 0;
                                             const due = Math.max(0, pkg - sum);
                                             setEditData({...editData, advance: sum, due});
                                          }} className="h-[40px] w-full rounded-xl border border-gray-200 bg-white pl-7 pr-3 text-[0.95rem] font-bold text-emerald-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="Amt" />
                                        </div>
                                        <div className="flex-1">
                                          <DatePickerInput value={inst.date} onChange={(date) => {
                                             const newInst = [...installments];
                                             newInst[idx].date = date;
                                             setInstallments(newInst);
                                          }} className="flex h-[40px] w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 text-[0.85rem] focus:border-orange-500" />
                                        </div>
                                        <button type="button" onClick={() => {
                                           const newInst = installments.filter((_, i) => i !== idx);
                                           setInstallments(newInst);
                                           const sum = newInst.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                                           const pkg = editData.package || 0;
                                           const due = Math.max(0, pkg - sum);
                                           setEditData({...editData, advance: sum, due});
                                        }} className="w-[40px] h-[40px] rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
                                          <i className="ph-bold ph-trash"></i>
                                        </button>
                                      </div>
                                    ))}
                                    <div className="text-[0.85rem] text-slate-600 font-bold self-start mt-1 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
                                      Total Paid: <span className="text-emerald-600 text-[1.05rem]">₹{editData.advance || '0'}</span>
                                    </div>
                                 </div>
                               )}
                           </div>

                           <div className="hidden xl:block w-px h-16 bg-gray-100 mt-2"></div>
                           
                           {/* 3. Pending Due */}
                           <div className="flex flex-col min-w-[140px]">
                              <span className="text-[0.75rem] font-bold text-slate-400 mb-2">Pending Due</span>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-300 font-bold">₹</span>
                                <input type="number" disabled className="h-[45px] w-[140px] rounded-xl border border-red-100 bg-red-50/50 pl-8 pr-4 text-[1.1rem] font-black text-red-500 cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={editData.due} readOnly />
                              </div>
                           </div>
                        </div>
                     </div>
                   ) : (
                     <div className="flex flex-col mb-2">
                        <div className="flex flex-col mb-8">
                           <span className="text-[0.9rem] font-bold text-[#0B1E40] mb-4">Inclusions</span>
                           <div className="flex flex-wrap gap-3">
                              {(Array.isArray(booking.inclusions) ? booking.inclusions : Array.isArray(booking.customData?.fld_b_inclusions) ? booking.customData.fld_b_inclusions : booking.customData?.fld_b_inclusions?.split(',') || ['Photography', 'Videography']).map((inc: string, i: number) => {
                                 const label = inc.trim();
                                 let icon = "ph-check-circle";
                                 let colorClass = "bg-slate-50 text-slate-700";
                                 let iconColorClass = "text-slate-500";
                                 if (label === 'Photography') { icon = "ph-camera-plus"; colorClass = "bg-orange-50 text-[#0B1E40]"; iconColorClass = "text-orange-600"; }
                                 else if (label === 'Videography') { icon = "ph-film-strip"; colorClass = "bg-indigo-50 text-[#0B1E40]"; iconColorClass = "text-indigo-600"; }
                                 else if (label === 'Drone') { icon = "ph-airplane-tilt"; colorClass = "bg-sky-50 text-[#0B1E40]"; iconColorClass = "text-sky-600"; }
                                 else if (label === 'Candid') { icon = "ph-camera"; colorClass = "bg-rose-50 text-[#0B1E40]"; iconColorClass = "text-rose-600"; }
                                 else if (label === 'Traditional') { icon = "ph-image"; colorClass = "bg-emerald-50 text-[#0B1E40]"; iconColorClass = "text-emerald-600"; }
                                 else if (label === 'Album') { icon = "ph-book-open"; colorClass = "bg-amber-50 text-[#0B1E40]"; iconColorClass = "text-amber-600"; }
                                 
                                 return (
                                    <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[0.8rem] ${colorClass}`}>
                                       <i className={`ph-fill ${icon} ${iconColorClass} text-[1.1rem]`}></i>
                                       <span>{label}</span>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>

                        <div className="w-full h-px bg-gray-100 mb-8"></div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                           <div className="flex items-center justify-between p-5 rounded-2xl border border-orange-100/80 bg-orange-50/20">
                              <div className="flex flex-col">
                                 <span className="text-[0.75rem] font-bold text-slate-500 mb-1">Total Amount</span>
                                 <span className="font-black text-amber-800 text-[1.8rem] leading-none tracking-tight">₹{parseFloat(booking.package || '0').toLocaleString()}</span>
                              </div>
                              <div className="w-11 h-11 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                                 <i className="ph-fill ph-wallet text-orange-500 text-[1.4rem]"></i>
                              </div>
                           </div>

                           <div className="flex items-center justify-between p-5 rounded-2xl border border-emerald-100/80 bg-emerald-50/20">
                              <div className="flex flex-col">
                                 <span className="text-[0.75rem] font-bold text-slate-500 mb-1">Paid</span>
                                 <span className="font-black text-emerald-600 text-[1.8rem] leading-none tracking-tight">₹{parseFloat(booking.advance || '0').toLocaleString()}</span>
                              </div>
                              <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                 <i className="ph-fill ph-shield-check text-emerald-500 text-[1.4rem]"></i>
                              </div>
                           </div>

                           <div className="flex items-center justify-between p-5 rounded-2xl border border-red-100/80 bg-red-50/20">
                              <div className="flex flex-col">
                                 <span className="text-[0.75rem] font-bold text-slate-500 mb-1">Pending Due</span>
                                 <span className="font-black text-red-500 text-[1.8rem] leading-none tracking-tight">₹{parseFloat(booking.due || '0').toLocaleString()}</span>
                              </div>
                              <div className="w-11 h-11 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                                 <i className="ph-fill ph-receipt text-red-500 text-[1.4rem]"></i>
                              </div>
                           </div>
                        </div>
                     </div>
                   )}

                    {(() => {
                       const advance = parseFloat(isEditing ? editData.advance : booking.advance || '0');
                       const total = parseFloat(isEditing ? editData.package : booking.package || '0');
                       const divisor = total > 0 ? total : 1;
                       const percentage = Math.round(Math.min(100, (advance / divisor) * 100));
                       return (
                          <div className="flex items-center gap-4">
                             <div className="flex-1 h-2.5 bg-gray-100 rounded-full relative">
                                <div className="h-full bg-amber-600 rounded-full transition-all duration-1000 relative" style={{ width: `${percentage}%` }}>
                                   {percentage > 0 && (
                                     <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[14px] h-[14px] bg-amber-700 rounded-full translate-x-1/2"></div>
                                   )}
                                </div>
                             </div>
                             <span className="text-[0.8rem] font-bold text-slate-600 shrink-0">{percentage}% Paid</span>
                          </div>
                       );
                    })()}
                 </div>
                 
                 {/* Notes, Attachments, Photographers */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
                   <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                      <div className="flex items-center gap-2 mb-4">
                         <i className="ph-fill ph-note text-yellow-500 text-lg"></i>
                         <h3 className="text-[0.95rem] font-black text-[#0B1E40]">Notes</h3>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                         <span className="text-slate-400 text-[0.85rem] font-medium">{booking.notes || booking.customData?.notes ? '1 note added' : 'No notes added'}</span>
                         <button 
                            onClick={handleAddNote}
                            disabled={isLoading}
                            className="px-4 py-2 border border-dashed border-gray-300 rounded-xl text-slate-500 font-bold text-[0.8rem] hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                            <i className="ph-bold ph-plus"></i> Add Note
                         </button>
                      </div>
                   </div>

                   <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                      <div className="flex items-center gap-2 mb-4">
                         <i className="ph-fill ph-paperclip text-blue-500 text-lg"></i>
                         <h3 className="text-[0.95rem] font-black text-[#0B1E40]">Attachments {(booking.attachments || booking.customData?.attachments)?.length ? `(${(booking.attachments || booking.customData?.attachments).length})` : '(0)'}</h3>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                         <span className="text-slate-400 text-[0.85rem] font-medium">{(booking.attachments || booking.customData?.attachments)?.length ? `${(booking.attachments || booking.customData?.attachments).length} files uploaded` : 'No files uploaded yet'}</span>
                         <button 
                            onClick={handleAddAttachment}
                            disabled={isLoading}
                            className="px-4 py-2 border border-dashed border-blue-200 bg-blue-50/50 rounded-xl text-blue-600 font-bold text-[0.8rem] hover:bg-blue-50 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                            <i className="ph-bold ph-upload-simple"></i> Upload Files
                         </button>
                      </div>
                   </div>

                   <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2">
                            <i className="ph-duotone ph-users text-blue-500 text-lg"></i>
                            <h3 className="text-[0.95rem] font-black text-[#0B1E40]">Photographers</h3>
                         </div>
                      </div>
                      {isEditing ? (
                         <div className="mt-auto">
                            <MultiUserPicklist 
                               users={teamUsers} 
                               value={Array.isArray(editData.photographers) ? editData.photographers.join(',') : ''} 
                               onChange={(val) => setEditData({...editData, photographers: val ? val.split(',').filter(Boolean) : []})} 
                               placeholder="Assign photographers..." 
                            />
                         </div>
                      ) : (
                         <div className="flex items-center justify-between mt-auto">
                            <div className="flex -space-x-2">
                               {(() => {
                                  const photogs = booking.photographers || booking.customData?.fld_b_photographers || booking.customData?.team || [];
                                  const users = Array.isArray(photogs) ? photogs.map(id => teamUsers.find(u => u.id === id)).filter(Boolean) : [];
                                  
                                  if (users.length === 0) {
                                    return <span className="text-slate-400 text-[0.8rem] italic ml-1">None assigned</span>;
                                  }
                                  
                                  return users.slice(0, 3).map((u, i) => (
                                    <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-${30-i} ${['bg-orange-100 text-orange-700', 'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700'][i%3]}`}>
                                       <span className="text-[0.65rem] font-black">{(u.name||'UN').substring(0,2).toUpperCase()}</span>
                                    </div>
                                  ));
                               })()}
                               {(() => {
                                  const photogs = booking.photographers || booking.customData?.fld_b_photographers || booking.customData?.team || [];
                                  if (Array.isArray(photogs) && photogs.length > 3) {
                                     return (
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-2 border-white shadow-sm z-0">
                                           <span className="text-[0.6rem] font-bold text-slate-500">+{photogs.length - 3}</span>
                                        </div>
                                     );
                                  }
                                  return null;
                               })()}
                            </div>
                            <span className="text-slate-400 text-[0.8rem] font-bold">
                              {(() => {
                                 const p = booking.photographers || booking.customData?.fld_b_photographers || booking.customData?.team || [];
                                 const len = Array.isArray(p) ? p.length : 0;
                                 return `${len} photographer${len === 1 ? '' : 's'}`;
                              })()}
                            </span>
                         </div>
                      )}
                   </div>
                </div>

                {/* Client References */}
                {(booking as any).galleryUrl && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-2 mb-8">
                   <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-2">
                         <i className="ph-duotone ph-users-three text-[#0B1E40] text-xl"></i>
                         <h3 className="text-[1.1rem] font-black text-[#0B1E40]">Client References</h3>
                      </div>
                      <a href={(booking as any).galleryUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-bold text-[0.85rem] cursor-pointer hover:underline">View Link</a>
                   </div>
                   <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-3">
                     <i className="ph-bold ph-link text-slate-400 text-lg"></i>
                     <a href={(booking as any).galleryUrl} target="_blank" rel="noreferrer" className="text-blue-500 font-bold text-[0.9rem] hover:underline truncate">{(booking as any).galleryUrl}</a>
                   </div>
                </div>
                )}

                </div>
             </div>
             {/* New Revamped Layout Ends Here */}


         {/* Flat Action Center Footer */}
         <div className="shrink-0 bg-white border-t border-gray-100 px-6 py-4 flex flex-col md:flex-row justify-between items-center z-50">
            <div className="flex items-center gap-3">
               <span className="text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">Action Center</span>
               <span className="font-bold text-[#0B1E40] text-[0.95rem]">Viewing: {booking.bookingNumber || booking.id.substring(0,8)}</span>
            </div>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
               {isEditing ? (
                 <>
                   <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-gray-100 text-[#0B1E40] text-[0.95rem] font-bold rounded-xl hover:bg-gray-200 transition-colors ml-2" disabled={isLoading}>
                     Cancel Edit
                   </button>
                   <button onClick={handleSaveEdit} className="px-8 py-2.5 bg-blue-600 text-[0.95rem] text-white font-bold rounded-xl hover:bg-blue-700 transition-colors ml-2 shadow-md shadow-blue-500/30 flex items-center gap-2" disabled={isLoading}>
                     {isLoading ? "Saving..." : <><i className="ph-bold ph-floppy-disk text-lg"></i> Save Changes</>}
                   </button>
                 </>
               ) : (
                 <>
                   <button onClick={handleEditToggle} className="text-[#0B1E40] text-[0.95rem] font-bold hover:text-blue-600 transition-colors flex items-center gap-2">
                     <i className="ph-bold ph-pencil-simple text-lg"></i> Edit Booking
                   </button>
                   <button onClick={() => router.back()} className="px-8 py-2.5 bg-[#0B1E40] text-[0.95rem] text-white font-bold rounded-xl hover:bg-[#152a52] transition-colors ml-2">
                     Close
                   </button>
                 </>
               )}
            </div>
         </div>
      </DialogContent>
    
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={(open) => !open && setIsDeleteConfirmOpen(false)}>
        {booking && (
        <DialogContent className="max-w-[400px] p-8 text-center bg-white rounded-3xl border-0 shadow-2xl !rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-3xl mx-auto mb-5">
            <i className="ph-fill ph-trash"></i>
          </div>
          <DialogTitle className="text-xl font-extrabold text-slate-900 mb-2">Delete Booking</DialogTitle>
          <p className="text-slate-500 text-[0.95rem] leading-relaxed mb-8">
            Are you sure you want to delete the booking for <strong className="text-slate-900">{booking.title}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <button className="flex-1 px-5 py-2.5 rounded-full font-bold text-[0.95rem] text-slate-700 bg-white border border-gray-200 hover:bg-slate-50 transition-colors" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeleting}>Cancel</button>
            <button className="flex-1 px-5 py-2.5 rounded-full font-bold text-[0.95rem] text-white bg-red-500 hover:bg-red-600 shadow-md transition-all flex items-center justify-center gap-2" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </DialogContent>
        )}
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
         <DialogContent className="max-w-[400px] p-8 bg-white rounded-3xl border-0 shadow-2xl !rounded-3xl">
           <DialogTitle className="text-xl font-extrabold text-[#0B1E40] mb-4">Add Note</DialogTitle>
           <textarea 
             className="w-full min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[0.9rem]"
             placeholder="Enter note for this booking..."
             value={newNote}
             onChange={(e) => setNewNote(e.target.value)}
           ></textarea>
           <div className="flex gap-3 mt-6">
             <button className="flex-1 px-5 py-2.5 rounded-xl font-bold text-slate-500 bg-gray-50 hover:bg-gray-100 transition-colors" onClick={() => setIsAddNoteOpen(false)} disabled={isLoading}>Cancel</button>
             <button className="flex-1 px-5 py-2.5 rounded-xl font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50" onClick={() => {
                updateBookingAPI({ notes: newNote });
                setIsAddNoteOpen(false);
             }} disabled={isLoading}>Save Note</button>
           </div>
         </DialogContent>
      </Dialog>

      {/* Add Attachment Modal */}
      <Dialog open={isAddAttachmentOpen} onOpenChange={setIsAddAttachmentOpen}>
         <DialogContent className="max-w-[400px] p-8 bg-white rounded-3xl border-0 shadow-2xl !rounded-3xl">
           <DialogTitle className="text-xl font-extrabold text-[#0B1E40] mb-4">Add Attachment</DialogTitle>
           <div className="flex flex-col gap-4">
             <div className="flex flex-col gap-1.5">
               <label className="text-[0.8rem] font-bold text-slate-500">File Name</label>
               <input 
                 type="text"
                 className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[0.9rem]"
                 placeholder="e.g. Final Album"
                 value={newAttachmentName}
                 onChange={(e) => setNewAttachmentName(e.target.value)}
               />
             </div>
             <div className="flex flex-col gap-1.5">
               <label className="text-[0.8rem] font-bold text-slate-500">Attachment URL</label>
               <input 
                 type="url"
                 className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[0.9rem]"
                 placeholder="https://..."
                 value={newAttachmentUrl}
                 onChange={(e) => setNewAttachmentUrl(e.target.value)}
               />
             </div>
           </div>
           <div className="flex gap-3 mt-8">
              <button className="flex-1 px-5 py-2.5 rounded-xl font-bold text-slate-500 bg-gray-50 hover:bg-gray-100 transition-colors" onClick={() => setIsAddAttachmentOpen(false)} disabled={isLoading}>Cancel</button>
             <button className="flex-1 px-5 py-2.5 rounded-xl font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-50" onClick={() => {
                if(!newAttachmentUrl || !newAttachmentName) return;
                const existingAttachments = Array.isArray(booking?.attachments) ? booking?.attachments : 
                             (Array.isArray(booking?.customData?.attachments) ? booking?.customData?.attachments : []);
                const newAttachments = [...existingAttachments, { name: newAttachmentName, url: newAttachmentUrl, addedAt: new Date().toISOString() }];
                updateBookingAPI({ attachments: newAttachments });
                setIsAddAttachmentOpen(false);
             }} disabled={isLoading || !newAttachmentName || !newAttachmentUrl}>Upload File</button>
           </div>
         </DialogContent>
      </Dialog>

      {/* Off-screen Invoice Template */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '800px', backgroundColor: '#ffffff', zIndex: -10 }}>
         <div id="invoice-template" className="w-[800px] bg-white pt-6 px-12 pb-12 text-[#1F2937]" style={{ fontFamily: 'sans-serif' }}>
            <div className="flex justify-between items-start">
               <div className="flex items-center">
                  <style dangerouslySetInnerHTML={{__html: "@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');"}} />
                  <span className="text-[#1F2937] leading-none" style={{ fontFamily: '"Great Vibes", cursive', fontSize: '4.5rem', fontWeight: 400 }}>Moondot</span>
                  <span className="ml-3 text-[0.8rem] text-[#B66D42] tracking-[0.35em] font-medium uppercase mt-4" style={{ fontFamily: 'Inter, sans-serif' }}>STUDIO</span>
               </div>
               <div className="border-l-[3px] border-gray-300 pl-5 pt-1">
                  <h1 className="text-[2.2rem] font-black text-[#1F2937] tracking-[0.1em] uppercase leading-none">Invoice</h1>
                  <p className="text-[#B66D42] font-bold mt-3 text-sm">Booking {booking?.bookingNumber?.startsWith('#') ? '' : '#'}{booking?.bookingNumber || booking?.id?.substring(0, 8)}</p>
               </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-12 border-t border-gray-200 pt-6">
              <div className="flex flex-col border-r border-gray-200">
                <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Invoice No.</span>
                <span className="font-bold text-[#1F2937] text-[0.95rem]">{booking?.bookingNumber || booking?.id?.substring(0, 8)}-INV</span>
              </div>
              <div className="flex flex-col border-r border-gray-200 pl-4">
                <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Invoice Date</span>
                <span className="font-bold text-[#1F2937] text-[0.95rem]">{new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
              </div>
              <div className="flex flex-col border-r border-gray-200 pl-4">
                <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Event Date</span>
                <span className="font-bold text-[#1F2937] text-[0.95rem]">{booking?.date ? new Date(booking.date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : 'TBD'}</span>
              </div>
              <div className="flex flex-col pl-4">
                <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Status</span>
                <span className="font-bold text-[#1F2937] text-[0.95rem] uppercase">{Number(booking?.due || 0) > 0 ? 'DRAFT' : 'PAID'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 mt-8 bg-[#F8F9FA] border-y border-gray-200">
              <div className="p-5 pr-6 flex flex-col gap-2">
                <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-1">Billed To</span>
                <span className="text-[0.9rem] text-[#1F2937]">{booking?.title || 'Client Name'}</span>
                <span className="text-[0.9rem] text-[#1F2937]">Phone: {booking?.phone || booking?.customData?.fld_b_phone || 'N/A'}</span>
                <span className="text-[0.9rem] text-[#1F2937]">Email: {booking?.email || booking?.customData?.fld_b_email || 'N/A'}</span>
                <span className="text-[0.9rem] text-[#1F2937]">Event: {booking?.category || 'Event'} — {booking?.location || 'Location'}</span>
              </div>
              <div className="p-5 pl-6 flex flex-col gap-2 border-l border-gray-200">
                <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-1">From</span>
                <span className="text-[0.9rem] text-[#1F2937]">Moondot Studio</span>
                <span className="text-[0.9rem] text-[#1F2937]">Photography & Videography</span>
                <span className="text-[0.9rem] text-[#1F2937]">Chennai, Tamil Nadu, India</span>
                <span className="text-[0.9rem] text-[#1F2937]">Email: hello@moondotstudio.in</span>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-[0.7rem] font-black text-[#1F2937] tracking-[0.15em] uppercase mb-3">Package & Services</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1F2937] text-white">
                    <th className="py-2.5 px-4 text-[0.7rem] font-bold tracking-wider w-[5%]">#</th>
                    <th className="py-2.5 px-4 text-[0.7rem] font-bold tracking-wider w-[55%]">DESCRIPTION</th>
                    <th className="py-2.5 px-4 text-[0.7rem] font-bold tracking-wider w-[10%]">QTY</th>
                    <th className="py-2.5 px-4 text-[0.7rem] font-bold tracking-wider w-[15%]">RATE (₹)</th>
                    <th className="py-2.5 px-4 text-[0.7rem] font-bold tracking-wider w-[15%]">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(booking?.inclusions) && booking!.inclusions.length > 0 ? booking!.inclusions.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{idx + 1}</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{item}</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">1</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{idx === 0 ? Number(booking?.package || 0).toFixed(2) : "0.00"}</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{idx === 0 ? Number(booking?.package || 0).toFixed(2) : "0.00"}</td>
                    </tr>
                  )) : (
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">1</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{booking?.category || 'Standard'} Package</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">1</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{Number(booking?.package || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{Number(booking?.package || 0).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end">
              <div className="w-[320px] flex flex-col">
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.85rem] text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{Number(booking?.package || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.85rem] text-gray-500">
                  <span>Tax / GST (0%)</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.95rem] font-bold">
                  <span className="text-[#1F2937]">Total Amount</span>
                  <span className="text-[#B66D42]">₹{Number(booking?.package || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.85rem] text-gray-500">
                  <span>Paid</span>
                  <span>₹{Number(booking?.advance || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.95rem] font-bold">
                  <span className="text-[#1F2937]">Balance Due</span>
                  <span className="text-[#B66D42]">₹{Number(booking?.due || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-end pt-3 text-[0.65rem] font-bold text-[#B66D42] tracking-wider uppercase">
                  PAYMENT PROGRESS: <span className="ml-2">{Math.round(((Number(booking?.advance || 0)) / (Number(booking?.package || 1) || 1)) * 100)}% Paid</span>
                </div>
              </div>
            </div>

            <div className="mt-16">
              <h3 className="text-[0.7rem] font-black text-[#1F2937] tracking-[0.15em] uppercase mb-4 text-right">Terms & Notes</h3>
              <div className="text-[0.85rem] text-[#1F2937] space-y-2.5">
                <p className="flex items-start gap-2"><span className="text-[#B66D42] font-bold">—</span> A 50% advance is required to confirm the booking; the balance is due on or before the event date.</p>
                <p className="flex items-start gap-2"><span className="text-[#B66D42] font-bold">—</span> Edited photos and the highlight film will be delivered within 6–8 weeks of the event.</p>
                <p className="flex items-start gap-2"><span className="text-[#B66D42] font-bold">—</span> Final printed album delivery timelines depend on the album size and design revisions chosen.</p>
                <p className="flex items-start gap-2"><span className="text-[#B66D42] font-bold">—</span> Cancellations within 15 days of the event date are non-refundable.</p>
              </div>
              <p className="text-[#B66D42] italic text-[0.95rem] mt-6" style={{ fontFamily: 'Georgia, serif' }}>Thank you for choosing Moondot Studio to capture your celebration.</p>
            </div>
         </div>
      </div>
    </Dialog>
  );
}
