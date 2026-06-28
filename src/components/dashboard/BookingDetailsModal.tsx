"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { deleteBookingAction, updateBookingStatusAction } from "@/app/actions";
import { toast } from "sonner";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { Trash2, Receipt, FileText, Upload, Wallet,
  Clock, MapPin, Tag, UserCircle, Calendar, Link as LinkIcon, Phone, Mail, Info,
  Camera, Image as ImageIcon, LayoutList, Users, FolderOpen, Package,
  BookOpen, Maximize, Images, Activity
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const getSectionIcon = (title: string) => {
  const t = (title || '').toLowerCase();
  if (t.includes('event') || t.includes('shoot')) return <Camera className="w-5 h-5 text-indigo-500" />;
  if (t.includes('album') || t.includes('deliverable') || t.includes('photo')) return <ImageIcon className="w-5 h-5 text-emerald-500" />;
  if (t.includes('payment') || t.includes('finance')) return <Wallet className="w-5 h-5 text-emerald-500" />;
  if (t.includes('client') || t.includes('contact') || t.includes('detail')) return <UserCircle className="w-5 h-5 text-blue-500" />;
  if (t.includes('team') || t.includes('crew') || t.includes('assign')) return <Users className="w-5 h-5 text-orange-500" />;
  return <LayoutList className="w-5 h-5 text-slate-500" />;
}

const getFieldIcon = (field: any) => {
  const name = (field.name || '').toLowerCase();
  
  // Specific complex matches
  if (name.includes('album type') || name.includes('book')) return <BookOpen className="w-4 h-4 text-emerald-500" />;
  if (name.includes('photo') || name.includes('image') || name.includes('picture') || name.includes('pic')) return <Images className="w-4 h-4 text-violet-500" />;
  if (name.includes('status') || name.includes('state')) return <Activity className="w-4 h-4 text-orange-500" />;
  if (name.includes('size') || name.includes('dimension')) return <Maximize className="w-4 h-4 text-blue-500" />;
  
  if (name.includes('email') || name.includes('mail')) return <Mail className="w-4 h-4 text-blue-500" />;
  if (name.includes('name') || name.includes('client')) return <UserCircle className="w-4 h-4 text-indigo-500" />;
  if (name.includes('location') || name.includes('address') || name.includes('city') || name.includes('venue')) return <MapPin className="w-4 h-4 text-rose-500" />;
  if (name.includes('note') || name.includes('remark') || name.includes('description')) return <FileText className="w-4 h-4 text-yellow-600" />;
  if (name.includes('date')) return <Calendar className="w-4 h-4 text-blue-500" />;
  if (name.includes('time')) return <Clock className="w-4 h-4 text-purple-500" />;
  if (name.includes('user') || name.includes('person') || name.includes('designer') || name.includes('photographer')) return <Users className="w-4 h-4 text-indigo-500" />;
  if (name.includes('amount') || name.includes('price') || name.includes('cost')) return <Wallet className="w-4 h-4 text-emerald-500" />;
  if (name.includes('category') || name.includes('shoot type')) return <FolderOpen className="w-4 h-4 text-violet-500" />;
  if (name.includes('inclusion') || name.includes('package') || name.includes('item')) return <Package className="w-4 h-4 text-amber-500" />;
  if (name.includes('type')) return <Tag className="w-4 h-4 text-rose-500" />;
  if (name.includes('link') || name.includes('url')) return <LinkIcon className="w-4 h-4 text-blue-500" />;
  if (name.includes('phone') || name.includes('contact') || name.includes('mobile')) return <Phone className="w-4 h-4 text-emerald-500" />;
  
  return <Info className="w-4 h-4 text-slate-400" />;
};

export default function BookingDetailsModal() {
  const router = useRouter();
  const { openBookingForm, isBookingDetailsOpen, bookingDetailsId, closeBookingDetails } = useGlobalForm();
  
  const { data: fetchedBooking, isLoading: isBookingLoading, mutate: refreshBooking } = useSWR(
    bookingDetailsId ? `/api/bookings/${bookingDetailsId}` : null,
    fetcher
  );
  
  const booking = bookingDetailsId && fetchedBooking ? {
    ...fetchedBooking,
    customData: typeof fetchedBooking.customData === 'string' ? 
      (() => { try { return JSON.parse(fetchedBooking.customData); } catch(e) { return {}; } })() : 
      (fetchedBooking.customData || {})
  } : null;

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [layoutSchema, setLayoutSchema] = useState<any>(null);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);

  const { data: layoutRes } = useSWR("/api/settings/layouts/BOOKING_FORM", fetcher);
  const { data: usersRes } = useSWR("/api/users", fetcher);

  useEffect(() => {
    if (layoutRes?.schema) setLayoutSchema(layoutRes.schema);
    if (usersRes) setTeamUsers(usersRes);
  }, [layoutRes, usersRes]);

  const standardFieldMap: Record<string, string> = {
    fld_b_client: 'title', fld_b_phone: 'phone', fld_b_email: 'email',
    fld_b_date: 'date', fld_b_time: 'time', fld_b_category: 'category',
    fld_b_location: 'location', fld_b_status: 'status', fld_b_package: 'package', fld_b_advance: 'advance'
  };

  const statusField = layoutSchema?.sections?.flatMap((s: any) => s.fields).find((f: any) => f.type === 'STATUS_PICKER' || f.id === 'fld_b_status');
  const isStatusPicker = statusField?.type === 'STATUS_PICKER';
  const statusOptions = isStatusPicker ? (statusField.statusOptions || []) : [];
  
  const currentOpt = isStatusPicker ? statusOptions.find((o: any) => o.label === booking?.status) : null;

  const changeStatus = async (newStatus: string) => {
    if (!booking) return;
    setIsUpdatingStatus(true);
    const res = await updateBookingStatusAction(booking.id, newStatus);
    setIsUpdatingStatus(false);
    if (res.success) {
      toast.success(`Status updated to ${newStatus}`);
      setIsStatusDropdownOpen(false);
      refreshBooking();
    } else {
      toast.error("Failed to update status");
    }
  };

  const confirmDelete = async () => {
    if (booking) {
      setIsDeleting(true);
      try {
        const res = await deleteBookingAction(booking.id);
        if (res.success) {
          toast.success("Booking deleted successfully!");
          setIsDeleteConfirmOpen(false);
          closeBookingDetails();
        } else {
          toast.error("Failed to delete booking.");
        }
      } catch (error) {
        toast.error('Failed to delete booking');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const generateInvoice = async () => {
    setIsGeneratingInvoice(true);
    try {
      const element = document.getElementById('invoice-template');
      if (!element) {
        toast.error("Invoice template not found");
        return;
      }
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${booking.bookingNumber || booking.id.slice(-6).toUpperCase()}.pdf`);
      toast.success("Invoice generated successfully!");
    } catch (error) {
      toast.error("Failed to generate invoice");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const exportBooking = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('booking-details-content');
      if (!element) return;
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Booking_Export_${booking.bookingNumber || booking.id.slice(-6).toUpperCase()}.pdf`);
      toast.success("Booking exported successfully!");
    } catch (error) {
      toast.error("Failed to export booking");
    } finally {
      setIsExporting(false);
    }
  };

  const isFieldVisibleForRender = (rule: any) => {
    if (!rule) return true;
    const dependsOnKey = rule.dependsOn || rule.fieldId;
    if (!dependsOnKey) return true;
    const depFieldName = standardFieldMap[dependsOnKey] || dependsOnKey;
    const standardDepVal = (booking as any)[depFieldName];
    const depVal = (standardDepVal !== undefined && standardDepVal !== null && standardDepVal !== '') 
      ? standardDepVal 
      : booking.customData?.[depFieldName] || booking.customData?.[dependsOnKey];

    const ruleValues: string[] = rule.values || (rule.value ? [rule.value] : []);
    if (rule.operator === 'EQUALS') return ruleValues.includes(depVal as string);
    else if (rule.operator === 'NOT_EQUALS') return !ruleValues.includes(depVal as string);
    else if (rule.operator === 'CONTAINS') {
      if (typeof depVal === 'string' || Array.isArray(depVal)) return ruleValues.some(v => depVal.includes(v));
      return false;
    }
    if (rule.dependsOn && Array.isArray(rule.values) && !rule.operator) return rule.values.includes(depVal);
    return true;
  };

  const getDynamicFieldId = (names: string[]) => {
    if (!layoutSchema || !layoutSchema.sections) return null;
    for (const section of layoutSchema.sections) {
      if (!section.fields) continue;
      const field = section.fields.find((f: any) => names.includes((f.name || '').toLowerCase()));
      if (field) return field.id;
    }
    return null;
  };

  const albumDesignerId = getDynamicFieldId(['album designer', 'album worker']);
  const albumDesignerVal = albumDesignerId ? booking?.customData?.[albumDesignerId] : null;

  return (
    <Dialog open={isBookingDetailsOpen} onOpenChange={(open) => {
      if (!open) closeBookingDetails();
    }}>
      <DialogContent className="!max-w-[1300px] w-[95vw] h-[95vh] p-0 bg-[#F5F6F8] border-0 overflow-hidden flex flex-col rounded-[2rem] shadow-2xl">
        <DialogTitle className="sr-only">Booking Details</DialogTitle>
        
        {(!booking) ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4" />
            <p className="text-slate-500 font-medium">Loading booking details...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
            
            {/* Header Sticky */}
            <header className="shrink-0 sticky top-0 z-40 bg-white/50 backdrop-blur-xl border-b border-slate-200/50 px-4 md:px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg tracking-wider">
                    {booking.bookingNumber || `#${booking.id.slice(-6).toUpperCase()}`}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-[#0B1E40] tracking-tight">{booking.client?.name || booking.title || booking.customData?.fld_b_client || "Untitled Booking"}</h1>
                
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center shrink-0">
                      <Tag className="w-3 h-3 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Category</p>
                      <p className="text-sm font-semibold text-slate-700">{booking.category || "N/A"}</p>
                    </div>
                  </div>
                  
                  {isStatusPicker && (
                    <div className="flex items-center gap-2 relative">
                      <button 
                        onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${currentOpt?.color || 'bg-white border-slate-200'} transition-all`}
                      >
                        <div className={`w-2 h-2 rounded-full ${currentOpt?.color ? 'bg-white' : 'bg-slate-400'}`} />
                        <span className={`text-sm font-bold ${currentOpt?.color ? 'text-white' : 'text-slate-700'}`}>{booking.status}</span>
                      </button>
                      {isStatusDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50">
                          {statusOptions.map((opt: any) => (
                            <button
                              key={opt.label}
                              onClick={() => changeStatus(opt.label)}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-slate-50 ${booking.status === opt.label ? 'text-indigo-600 bg-indigo-50' : 'text-slate-700'}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
                <button 
                  onClick={exportBooking}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {isExporting ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />} Export
                </button>
                <button 
                  onClick={generateInvoice}
                  disabled={isGeneratingInvoice}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0B1E40] text-white hover:bg-[#152a55] rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {isGeneratingInvoice ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Receipt className="w-4 h-4" />} Invoice
                </button>
              </div>
            </header>

            {/* Scrollable Content Area */}
            <main id="booking-details-content" className="flex-1 overflow-y-auto px-6 py-6">
              
              {/* Top Info Strip */}
              <div className="w-full bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-slate-100">
                <div className="flex items-center gap-4 w-full lg:px-4">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Booking ID</p>
                    <p className="font-bold text-slate-800">{booking.bookingNumber || `#${booking.id.slice(-6).toUpperCase()}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full lg:px-6">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Created By</p>
                    <p className="font-bold text-slate-800">{booking.createdByUser?.name || 'Harish'}</p>
                    <p className="text-xs text-slate-500">{new Date(booking.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full lg:px-6">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Updated By</p>
                    <p className="font-bold text-slate-800">System</p>
                    <p className="text-xs text-slate-500">{new Date(booking.updatedAt || booking.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full lg:px-6">
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Album Designer</p>
                    <p className="font-bold text-slate-800">{albumDesignerVal ? teamUsers.find(u => u.id === albumDesignerVal)?.name || albumDesignerVal : "Unassigned"}</p>
                  </div>
                </div>
              </div>

              {/* Grid Area */}
              <div className="w-full">
                
                {/* Masonry Columns for Dynamic Sections & Client Info */}
                <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
                  
                  {/* Client Info Card */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm break-inside-avoid">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4">
                      <UserCircle className="w-5 h-5 text-indigo-500" />
                      <h3 className="font-bold text-[#0B1E40]">Client Info</h3>
                    </div>
                    <div className="space-y-5">
                      <div className="flex items-start gap-3 w-full">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                          <UserCircle className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Client Name</p>
                          <p className="font-bold text-slate-800 text-sm whitespace-pre-wrap break-words">{booking.client?.name || booking.title || booking.customData?.fld_b_client || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 w-full">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                          <Phone className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Phone Number</p>
                          <p className="font-bold text-slate-800 text-sm whitespace-pre-wrap break-words">{booking.client?.phone || booking.phone || booking.customData?.fld_b_phone || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 w-full">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                          <Mail className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Email Address</p>
                          <p className="font-bold text-slate-800 text-sm whitespace-pre-wrap break-words">{booking.client?.email || booking.email || booking.customData?.fld_b_email || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {layoutSchema?.sections?.filter((s: any) => isFieldVisibleForRender(s.visibilityRule) && s.title?.toLowerCase() !== 'financials' && s.title?.toLowerCase() !== 'financial')
                    .sort((a: any, b: any) => {
                      const titleA = (a.title || '').toLowerCase();
                      const titleB = (b.title || '').toLowerCase();
                      if (titleA.includes('event')) return -1;
                      if (titleB.includes('event')) return 1;
                      if (titleA.includes('album')) return -1;
                      if (titleB.includes('album')) return 1;
                      return 0;
                    })
                    .map((section: any) => {
                      const visibleFields = section.fields?.filter((f: any) => {
                        const fname = (f.name || '').toLowerCase();
                        if (f.id === 'fld_b_client' || f.id === 'fld_b_phone' || f.id === 'fld_b_email') return false; // Handled in client info
                        if (fname.includes('attachment') || f.type === 'FILE' || f.type === 'ATTACHMENT') return false;
                        if (fname === 'status' || fname === 'date') return false;
                        return isFieldVisibleForRender(f.visibilityRule);
                      }) || [];
                      
                      if (visibleFields.length === 0) return null;

                      // Identify status field inside section to drive timeline
                      const sectionStatusField = section.fields?.find((f: any) => (f.name||'').toLowerCase().includes('status'));
                      let currentSectionStatus = null;
                      if (sectionStatusField) {
                        currentSectionStatus = standardFieldMap[sectionStatusField.id] ? (booking as any)[standardFieldMap[sectionStatusField.id]] : booking.customData?.[sectionStatusField.id];
                      }

                      return (
                        <div key={section.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm break-inside-avoid">
                          <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4">
                            {getSectionIcon(section.title)}
                            <h3 className="font-bold text-[#0B1E40]">{section.title}</h3>
                          </div>
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-5 flex-1 min-w-0">
                              {visibleFields.map((field: any) => {
                                const standardKey = standardFieldMap[field.id];
                                let val = standardKey ? (booking as any)[standardKey] : booking.customData?.[field.id];
                                
                                const fname = (field.name || '').toLowerCase();
                                if (val && (field.type === 'USER_PICKLIST' || field.type === 'MULTI_USER_PICKLIST' || fname.includes('photographer') || fname.includes('designer'))) {
                                  let ids: string[] = [];
                                  if (typeof val === 'string') {
                                    if (val.startsWith('[')) {
                                      try { ids = JSON.parse(val); } catch(e) { ids = [val]; }
                                    } else {
                                      ids = val.split(',').map(s => s.trim());
                                    }
                                  } else if (Array.isArray(val)) {
                                    ids = val;
                                  } else {
                                    ids = [String(val)];
                                  }
                                  val = ids.map((id: string) => teamUsers.find((u: any) => u.id === id)?.name || id).join(', ');
                                } else if (val && field.type === 'DATE') {
                                  val = new Date(val).toLocaleDateString();
                                }

                                if (val === undefined || val === null || val === '') val = "N/A";
                                if (Array.isArray(val)) val = val.join(', ');

                                return (
                                  <div key={field.id} className="flex items-start gap-3 w-full">
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                                      {getFieldIcon(field)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{field.name}</p>
                                      <p className="font-bold text-slate-800 text-sm whitespace-pre-wrap break-words">{val}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {(section.title.toLowerCase().includes('album') || section.title.toLowerCase().includes('event')) && (() => {
                              const steps = section.title.toLowerCase().includes('album') 
                                ? ['Pending', 'Designing', 'Printing', 'Delivered'] 
                                : ['Pending', 'Confirmed', 'Completed'];
                                
                              return (
                                <div className="shrink-0 w-28 pt-2">
                                  <div className="relative border-l-2 border-slate-100 ml-2 space-y-6">
                                    {steps.map((step, idx) => {
                                      const isActive = currentSectionStatus === step || (!currentSectionStatus && idx === 0);
                                      const isPast = steps.indexOf(currentSectionStatus) > idx;
                                      return (
                                        <div key={step} className="relative pl-5">
                                          <div className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-white ${(isActive || isPast) ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                                          <p className={`font-bold text-xs ${(isActive || isPast) ? 'text-slate-800' : 'text-slate-400'}`}>{step}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Package & Payment */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#0B1E40]">Package & Payment</h3>
                        <p className="text-xs text-slate-500">Summary of package details and payment status.</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div className="bg-orange-50/50 rounded-2xl p-4 flex items-center justify-between border border-orange-100">
                        <div>
                          <p className="text-xs font-bold text-orange-600/70 mb-1">Total Amount</p>
                          <p className="text-2xl font-black text-orange-700">₹{booking.order?.package || booking.customData?.fld_b_package || '0'}</p>
                        </div>
                        <Wallet className="w-8 h-8 text-orange-200" />
                      </div>
                      <div className="bg-emerald-50/50 rounded-2xl p-4 flex items-center justify-between border border-emerald-100">
                        <div>
                          <p className="text-xs font-bold text-emerald-600/70 mb-1">Paid</p>
                          <p className="text-2xl font-black text-emerald-700">₹{booking.advance || booking.customData?.fld_b_advance || '0'}</p>
                        </div>
                        <Wallet className="w-8 h-8 text-emerald-200" />
                      </div>
                      <div className="bg-rose-50/50 rounded-2xl p-4 flex items-center justify-between border border-rose-100">
                        <div>
                          <p className="text-xs font-bold text-rose-600/70 mb-1">Pending Due</p>
                          <p className="text-2xl font-black text-rose-700">
                            ₹{(Number(booking.order?.package || booking.customData?.fld_b_package || 0) - Number(booking.order?.advance || booking.customData?.fld_b_advance || 0))}
                          </p>
                        </div>
                        <Receipt className="w-8 h-8 text-rose-200" />
                      </div>
                    </div>
                    
                    <div className="mt-6 flex items-center gap-4">
                      <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, (Number(booking.order?.advance || booking.customData?.fld_b_advance || 0) / Math.max(1, Number(booking.order?.package || booking.customData?.fld_b_package || 1))) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs font-bold text-slate-600 w-16 text-right">
                        {Math.round((Number(booking.order?.advance || booking.customData?.fld_b_advance || 0) / Math.max(1, Number(booking.order?.package || booking.customData?.fld_b_package || 1))) * 100)}% Paid
                      </p>
                    </div>
                  </div>

                  {/* Bottom Extra Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-6">
                        <FileText className="w-5 h-5 text-yellow-600" />
                        <h3 className="font-bold text-[#0B1E40]">Notes</h3>
                      </div>
                      <div className="flex-1 flex items-center justify-between mt-auto">
                        <p className="text-sm text-slate-400 font-medium">No notes added</p>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-bold border border-slate-200 transition-colors">
                          + Add Note
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-6">
                        <LinkIcon className="w-5 h-5 text-blue-500" />
                        <h3 className="font-bold text-[#0B1E40]">Attachments (0)</h3>
                      </div>
                      <div className="flex-1 flex items-center justify-between mt-auto">
                        <p className="text-sm text-slate-400 font-medium">No files uploaded yet</p>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-bold border border-blue-200 transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Upload Files
                        </button>
                      </div>
                    </div>
                  </div>
                  
                </div>
            </main>

            {/* Bottom Sticky Action Bar */}
            <div className="shrink-0 h-20 bg-white border-t border-slate-200/60 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-6 flex items-center justify-between z-40 rounded-b-[2rem]">
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Action Center</p>
                <p className="text-sm font-bold text-slate-800 border-l border-slate-200 pl-3">Viewing: {booking.bookingNumber || `#${booking.id.slice(-6).toUpperCase()}`}</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    openBookingForm(booking.id, undefined);
                    closeBookingDetails();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm transition-colors"
                >
                  Edit Booking
                </button>
                <button 
                  onClick={() => closeBookingDetails()}
                  className="px-8 py-2.5 bg-[#0B1E40] text-white hover:bg-[#152a55] rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-900/20"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        )}
      </DialogContent>
      
      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl p-6 bg-white border-0 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Booking?</h3>
            <p className="text-slate-500 mb-8 font-medium">This action cannot be undone. This will permanently remove the booking and all related data.</p>
            <div className="flex items-center gap-3 w-full">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : "Yes, Delete"}
              </button>
            </div>
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
                <span className="font-bold text-[#1F2937] text-[0.95rem] uppercase">{Number(booking?.order?.due || 0) > 0 ? 'DRAFT' : 'PAID'}</span>
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
                  {Array.isArray(booking?.inclusions) && booking!.inclusions.length > 0 ? booking!.inclusions.map((item: string, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{idx + 1}</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{item}</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">1</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{idx === 0 ? Number(booking?.order?.package || 0).toFixed(2) : "0.00"}</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{idx === 0 ? Number(booking?.order?.package || 0).toFixed(2) : "0.00"}</td>
                    </tr>
                  )) : (
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">1</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{booking?.category || 'Standard'} Package</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">1</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{Number(booking?.order?.package || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{Number(booking?.order?.package || 0).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end">
              <div className="w-[320px] flex flex-col">
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.85rem] text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{Number(booking?.order?.package || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.85rem] text-gray-500">
                  <span>Tax / GST (0%)</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.95rem] font-bold">
                  <span className="text-[#1F2937]">Total Amount</span>
                  <span className="text-[#B66D42]">₹{Number(booking?.order?.package || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.85rem] text-gray-500">
                  <span>Paid</span>
                  <span>₹{Number(booking?.order?.advance || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.95rem] font-bold">
                  <span className="text-[#1F2937]">Balance Due</span>
                  <span className="text-[#B66D42]">₹{Number(booking?.order?.due || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-end pt-3 text-[0.65rem] font-bold text-[#B66D42] tracking-wider uppercase">
                  PAYMENT PROGRESS: <span className="ml-2">{Math.round(((Number(booking?.order?.advance || 0)) / (Number(booking?.order?.package || 1) || 1)) * 100)}% Paid</span>
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
