"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { deleteBookingAction, updateBookingStatusAction, updateAlbumTrackingAction } from "@/app/actions";
import { toast } from "sonner";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { Trash2, Receipt, FileText, Upload, Wallet,
  Clock, MapPin, Tag, UserCircle, Calendar, Link as LinkIcon, Phone, Mail, Info,
  Camera, Image as ImageIcon, LayoutList, Users, FolderOpen, Package,
  BookOpen, Maximize, Images, Activity, CheckCircle2, XCircle, ChevronDown, Edit3, Send, Play, User, Focus, Gem, Church, Heart, Target
} from "lucide-react";
import BookingStatusStepper from './BookingStatusStepper';
import VerticalStatusStepper from './VerticalStatusStepper';

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

export default function BookingDetailsModal({ standaloneBookingId }: { standaloneBookingId?: string }) {
  const router = useRouter();
  const { openBookingForm, isBookingDetailsOpen, bookingDetailsId: contextBookingId, closeBookingDetails } = useGlobalForm();
  
  const bookingDetailsId = standaloneBookingId || contextBookingId;
  const isVisible = standaloneBookingId ? true : isBookingDetailsOpen;
  
  const { data: fetchedBooking, isLoading: isBookingLoading, mutate: refreshBooking } = useSWR(
    bookingDetailsId ? `/api/bookings/${bookingDetailsId}` : null,
    fetcher
  );
  
  const booking = bookingDetailsId && fetchedBooking ? {
    ...fetchedBooking,
    customData: typeof fetchedBooking.customData === 'string' ? 
      (() => { try { return JSON.parse(fetchedBooking.customData); } catch(e) { return {}; } })() : 
      (fetchedBooking.customData || {}),
    inclusions: typeof fetchedBooking.inclusions === 'string' ?
      (() => { try { return JSON.parse(fetchedBooking.inclusions); } catch(e) { return []; } })() :
      (fetchedBooking.inclusions || []),
  } : null;

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isAlbumStatusDropdownOpen, setIsAlbumStatusDropdownOpen] = useState(false);
  const [layoutSchema, setLayoutSchema] = useState<any>(null);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);

  const { data: layoutRes } = useSWR("/api/settings/layouts/BOOKING_FORM", fetcher);
  const { data: usersRes } = useSWR("/api/users", fetcher);

  useEffect(() => {
    if (layoutRes?.schema) setLayoutSchema(layoutRes.schema);
    if (usersRes) setTeamUsers(Array.isArray(usersRes) ? usersRes : (usersRes.data || []));
  }, [layoutRes, usersRes]);

  const standardFieldMap: Record<string, string> = {
    fld_b_client: 'title', fld_b_phone: 'phone', fld_b_email: 'email',
    fld_b_date: 'date', fld_b_time: 'time', fld_b_category: 'category',
    fld_b_location: 'location', fld_b_status: 'status', fld_b_package: 'package', fld_b_advance: 'advance',
    fld_gallery_delivered: 'galleryDelivered'
  };

  const statusField = layoutSchema?.sections?.flatMap((s: any) => s.fields).find((f: any) => f.id === 'fld_b_status') || layoutSchema?.sections?.flatMap((s: any) => s.fields).find((f: any) => f.type === 'STATUS_PICKER');
  const isStatusPicker = statusField?.type === 'STATUS_PICKER';
  const statusOptions = isStatusPicker ? (statusField.statusOptions || []) : [];
  
  const albumStatusField = layoutSchema?.sections?.flatMap((s: any) => s.fields).find((f: any) => f.id === 'fld_b_album_status');
  const isAlbumStatusPicker = albumStatusField?.type === 'STATUS_PICKER';
  const albumStatusOptions = isAlbumStatusPicker ? (albumStatusField.statusOptions || []) : [];
  
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
      
      // Globally invalidate SWR keys so Bookings list, Calendar, Dashboard, and Album Status sync instantly
      globalMutate(
        (key) => typeof key === 'string' && (key.startsWith('/api/bookings') || key.startsWith('/api/dashboard')),
        undefined,
        { revalidate: true }
      );
      router.refresh();
    } else {
      toast.error("Failed to update status");
    }
  };

  const changeSectionStatus = async (fieldId: string, newStatus: string) => {
    if (!booking) return;
    if (fieldId === 'fld_b_status') {
      return changeStatus(newStatus);
    }
    
    setIsUpdatingStatus(true);
    const res = await updateAlbumTrackingAction(booking.id, { customData: { [fieldId]: newStatus } });
    setIsUpdatingStatus(false);
    
    if (res.success) {
      toast.success(`Status updated to ${newStatus}`);
      refreshBooking();
      globalMutate(
        (key) => typeof key === 'string' && (key.startsWith('/api/bookings') || key.startsWith('/api/dashboard')),
        undefined,
        { revalidate: true }
      );
      router.refresh();
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
          
          globalMutate(
            (key) => typeof key === 'string' && (key.startsWith('/api/bookings') || key.startsWith('/api/dashboard')),
            undefined,
            { revalidate: true }
          );
          router.refresh();
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
      const pdf = new jsPDF({
        orientation: canvas.height > canvas.width ? 'p' : 'l',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
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
      const pdf = new jsPDF({
        orientation: canvas.height > canvas.width ? 'p' : 'l',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
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

  const focusAmountFieldId = (() => {
    if (!layoutSchema || !layoutSchema.sections) return null;
    const focusSection = layoutSchema.sections.find((s: any) => s.title?.toLowerCase() === 'focus');
    if (!focusSection || !focusSection.fields) return null;
    const amountField = focusSection.fields.find((f: any) => (f.name || '').toLowerCase() === 'amount');
    return amountField ? amountField.id : null;
  })();
  const focusAmountVal = focusAmountFieldId && booking?.customData ? booking.customData[focusAmountFieldId] : null;

  const handleClose = () => {
    if (standaloneBookingId) {
      router.back();
    } else {
      closeBookingDetails();
    }
  };

  const content = (
    <div className={`w-full bg-[#F5F6F8] flex flex-col overflow-hidden relative ${standaloneBookingId ? 'h-full min-h-screen' : 'h-[100dvh] sm:h-[90dvh] max-h-[100dvh] sm:max-h-[90dvh] rounded-none sm:rounded-[2rem] shadow-2xl'}`}>
      {(!booking) ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4" />
            <p className="text-slate-500 font-medium">Loading booking details...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
            
            {/* Header Sticky / Card */}
            <header className="shrink-0 sticky top-0 z-40 bg-[#F5F6F8] px-4 md:px-6 py-3 pb-2">
              <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-100 shadow-sm flex flex-col gap-2 relative">
                {/* Top row: ID and actions */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 text-orange-700 text-[10px] font-bold rounded-lg tracking-wider">
                    <FolderOpen className="w-3 h-3" /> {booking.bookingNumber || `#${booking.id.slice(-6).toUpperCase()}`}
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="group flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-red-50 hover:px-3"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-500 group-hover:text-red-600 shrink-0 transition-colors" />
                      <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold text-sm text-red-600 whitespace-nowrap">
                        Delete
                      </span>
                    </button>
                    <button 
                      onClick={exportBooking}
                      disabled={isExporting}
                      className="group flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-white hover:border hover:border-slate-200 hover:shadow-sm hover:px-3 border border-transparent"
                      title="Export"
                    >
                      {isExporting ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" /> : <Upload className="w-5 h-5 text-slate-500 group-hover:text-slate-700 shrink-0 transition-colors" />}
                      <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold text-sm text-slate-700 whitespace-nowrap">
                        Export
                      </span>
                    </button>
                    <button 
                      onClick={generateInvoice}
                      disabled={isGeneratingInvoice}
                      className="group flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-[#0B1E40] hover:px-3"
                      title="Invoice"
                    >
                      {isGeneratingInvoice ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" /> : <Receipt className="w-5 h-5 text-slate-700 group-hover:text-white shrink-0 transition-colors" />}
                      <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold text-sm text-white whitespace-nowrap">
                        Invoice
                      </span>
                    </button>
                  </div>
                </div>
                
                <h1 className="text-xl md:text-2xl font-black text-[#0B1E40] tracking-tight">
                  {booking.client?.name || booking.title || booking.customData?.fld_b_client || "Untitled Booking"}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 md:gap-5 pt-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Category</p>
                      <p className="text-xs font-bold text-[#0B1E40]">{booking.category || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Shoot Date</p>
                      <p className="text-xs font-bold text-[#0B1E40]">
                        {booking.date ? new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A"}
                      </p>
                    </div>
                    <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
                  </div>

                  <div className="hidden md:block w-px h-6 bg-slate-100" />

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-50/50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Start Time</p>
                      <p className="text-xs font-bold text-[#0B1E40]">
                        {booking.time || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:block w-px h-6 bg-slate-100" />

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-red-50/50 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Location</p>
                      <p className="text-xs font-bold text-[#0B1E40]">
                        {booking.location || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:block w-px h-6 bg-slate-100" />

                  {/* Dynamic Status Display */}
                  {(() => {
                    const eventStatus = (booking.status || 'Pending').toLowerCase();
                    const isShootCompleted = eventStatus === 'shoot completed' || eventStatus === 'completed';

                    let statusVal = booking.status || 'Pending';
                    let s = statusVal.toLowerCase();
                    let optionsToRender = isStatusPicker ? statusOptions : [];
                    let onStatusSelect = (val: string) => changeStatus(val);
                    let labelText = "Status";
                    let isPicker = isStatusPicker;
                    let currentActive = booking.status;

                    if (isShootCompleted) {
                      statusVal = booking.customData?.fld_b_album_status || 'Pending';
                      s = statusVal.toLowerCase();
                      labelText = "Album Status";
                      
                      if (isAlbumStatusPicker) {
                        optionsToRender = albumStatusOptions;
                      } else {
                        optionsToRender = [
                          { label: 'Pending' }, { label: 'Designing' },
                          { label: 'Sent for printing' }, { label: 'Ready for delivery' }, { label: 'Delivered' }
                        ];
                      }
                      isPicker = true;
                      onStatusSelect = (val: string) => changeSectionStatus('fld_b_album_status', val);
                      currentActive = statusVal;
                    }

                    let icon = <Clock className="w-3.5 h-3.5 text-indigo-600" />;
                    let bg = 'bg-indigo-100';
                    let ring = 'ring-indigo-500';
                    let text = 'text-indigo-600';
                    let doubleBorder = 'border-indigo-50';

                    if (s === 'confirmed') { icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />; bg = 'bg-emerald-100'; ring = 'ring-emerald-500'; text = 'text-emerald-600'; doubleBorder = 'border-emerald-50'; }
                    else if (s === 'shoot completed') { icon = <Camera className="w-3.5 h-3.5 text-blue-600" />; bg = 'bg-blue-100'; ring = 'ring-blue-500'; text = 'text-blue-600'; doubleBorder = 'border-blue-50'; }
                    else if (s === 'designing') { icon = <Edit3 className="w-3.5 h-3.5 text-blue-600" />; bg = 'bg-blue-100'; ring = 'ring-blue-500'; text = 'text-blue-600'; doubleBorder = 'border-blue-50'; }
                    else if (s === 'sent for printing') { icon = <Send className="w-3.5 h-3.5 text-purple-600" />; bg = 'bg-purple-100'; ring = 'ring-purple-500'; text = 'text-purple-600'; doubleBorder = 'border-purple-50'; }
                    else if (s === 'ready for delivery') { icon = <Package className="w-3.5 h-3.5 text-orange-600" />; bg = 'bg-orange-100'; ring = 'ring-orange-500'; text = 'text-orange-600'; doubleBorder = 'border-orange-50'; }
                    else if (s === 'delivered') { icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />; bg = 'bg-emerald-100'; ring = 'ring-emerald-500'; text = 'text-emerald-600'; doubleBorder = 'border-emerald-50'; }
                    else if (s === 'cancelled') { icon = <XCircle className="w-3.5 h-3.5 text-red-600" />; bg = 'bg-red-100'; ring = 'ring-red-500'; text = 'text-red-600'; doubleBorder = 'border-red-50'; }

                    return (
                      <div className="relative">
                        <div 
                          onClick={() => isPicker && setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          className={`flex items-center gap-2.5 ${isPicker ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ring-1 ring-offset-1 ${bg} ${doubleBorder} ${ring}`}>
                            {icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{labelText}</p>
                              {isPicker && <ChevronDown className="w-2.5 h-2.5 text-slate-400" />}
                            </div>
                            <p className={`text-xs font-bold ${text}`}>{statusVal}</p>
                          </div>
                        </div>

                        {/* Status Dropdown Menu */}
                        {isStatusDropdownOpen && isPicker && (
                          <div className="absolute top-full mt-2 left-0 min-w-[140px] w-full bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-1">
                              {optionsToRender.map((opt: any) => (
                                <button
                                  key={opt.label}
                                  onClick={() => onStatusSelect(opt.label)}
                                  disabled={isUpdatingStatus}
                                  className={`w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between ${opt.label === currentActive ? 'font-bold text-[#0B1E40] bg-slate-50' : 'text-slate-600'}`}
                                >
                                  {opt.label}
                                  {opt.label === currentActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-2 shrink-0" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}


                </div>

                {booking.status === 'Cancelled' && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 w-full animate-fade-in-up">
                    <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-800">Booking Cancelled</p>
                      <p className="text-sm text-red-600 mt-1 leading-relaxed">
                        This booking has linked transactions — cancelling will not auto-delete them. Manage manually in Daily Kanakku.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </header>

            {/* Scrollable Content Area */}
            <main id="booking-details-content" className="flex-1 overflow-y-auto px-6 pb-6">

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
                    <p className="font-bold text-slate-800">{albumDesignerVal ? (teamUsers || []).find(u => u.id === albumDesignerVal)?.name || albumDesignerVal : "Unassigned"}</p>
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

                  {layoutSchema?.sections?.filter((s: any) => isFieldVisibleForRender(s.visibilityRule) && s.title?.toLowerCase() !== 'financials' && s.title?.toLowerCase() !== 'financial' && s.title?.toLowerCase() !== 'focus')
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
                        if (['status', 'date', 'shoot date', 'start time', 'time', 'category', 'shoot category', 'location', 'focus'].includes(fname)) return false;
                        return isFieldVisibleForRender(f.visibilityRule);
                      }) || [];
                      
                      if (visibleFields.length === 0) return null;

                      // Identify status field inside section to drive timeline
                      const sectionStatusField = section.fields?.find((f: any) => {
                        const fname = (f.name||'').toLowerCase();
                        return fname.includes('status') || f.type === 'STATUS_PICKER' || f.id === 'fld_b_album_status' || f.id === 'fld_b_status';
                      });
                      
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
                                  val = ids.map((id: string) => (teamUsers || []).find((u: any) => u.id === id)?.name || id).join(', ');
                                } else if (val && field.type === 'DATE') {
                                  val = new Date(val).toLocaleDateString();
                                }

                                if (val === undefined || val === null || val === '') val = "N/A";
                                
                                const isMultiSelectStringList = typeof val === 'string' && val.includes(',') && val !== "N/A" && (field.type === 'MULTI_PICKLIST' || field.type === 'MULTI_SELECT' || (field.name || '').toLowerCase().includes('inclusion'));
                                
                                if (isMultiSelectStringList) {
                                  const items = val.split(',').map((s: string) => s.trim()).filter(Boolean);
                                  const fnameLower = (field.name || '').toLowerCase();
                                  
                                  const isWedding = fnameLower.includes('wedding');
                                  const titleColorClass = isWedding ? 'text-indigo-600' : 'text-orange-500';
                                  const iconBgClass = isWedding ? 'bg-indigo-50' : 'bg-orange-50';
                                  const MainIcon = isWedding ? Gem : Package;
                                  
                                  return (
                                    <details key={field.id} className="w-full mt-1 mb-3 group" open>
                                      <summary className="flex items-center justify-between mb-3 px-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none outline-none hover:opacity-80 transition-opacity">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-xl ${iconBgClass} flex items-center justify-center`}>
                                            <MainIcon className={`w-4 h-4 ${titleColorClass}`} />
                                          </div>
                                          <p className={`text-[11px] font-black uppercase tracking-wider ${titleColorClass}`}>{field.name}</p>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 ${titleColorClass} opacity-60 transition-transform duration-200 group-open:-rotate-180`} />
                                      </summary>
                                      
                                      <div className="mt-1 ml-[15px] pl-5 border-l-2 border-slate-100/60 flex flex-col gap-1.5">
                                        {items.map((item: string, idx: number) => {
                                          const itemLower = item.toLowerCase();
                                          let ItemIcon = Camera;
                                          let itemColor = "text-indigo-500";
                                          let itemBg = "bg-indigo-50/70";
                                          
                                          if (itemLower.includes('video')) { ItemIcon = Play; itemColor = "text-orange-500"; itemBg = "bg-orange-50/70"; }
                                          else if (itemLower.includes('photo')) { ItemIcon = ImageIcon; itemColor = "text-orange-500"; itemBg = "bg-orange-50/70"; }
                                          else if (itemLower.includes('candid')) { ItemIcon = User; itemColor = "text-orange-500"; itemBg = "bg-orange-50/70"; }
                                          else if (itemLower.includes('drone')) { ItemIcon = Focus; itemColor = "text-orange-500"; itemBg = "bg-orange-50/70"; }
                                          else if (itemLower.includes('engagement')) { ItemIcon = Gem; itemColor = "text-indigo-500"; itemBg = "bg-indigo-50/70"; }
                                          else if (itemLower.includes('pre wedding') || itemLower.includes('post wedding')) { ItemIcon = Heart; itemColor = "text-indigo-500"; itemBg = "bg-indigo-50/70"; }
                                          else if (itemLower.includes('reception')) { ItemIcon = Church; itemColor = "text-indigo-500"; itemBg = "bg-indigo-50/70"; }
                                          
                                          return (
                                            <div key={item} className="flex items-center gap-3 py-1">
                                              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${itemBg}`}>
                                                <ItemIcon className={`w-3 h-3 ${itemColor}`} />
                                              </div>
                                              <p className="text-xs font-semibold text-slate-700">{item}</p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </details>
                                  );
                                }

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
                            
                            {(() => {
                              const isAlbum = section.title.toLowerCase().includes('album');
                              
                              if (isAlbum) {
                                const s = (booking.status || 'Pending').toLowerCase();
                                const isShootCompleted = s === 'shoot completed' || s === 'completed';
                                if (!isShootCompleted) return null;
                              }

                              let options = sectionStatusField?.statusOptions || sectionStatusField?.options || [];
                              
                              if (isAlbum && (!sectionStatusField || options.length === 0)) {
                                options = [
                                  { label: 'Pending' },
                                  { label: 'Designing' },
                                  { label: 'Sent for printing' },
                                  { label: 'Ready for delivery' },
                                  { label: 'Delivered' }
                                ];
                              }

                              if (options.length === 0) return null;

                              // Build dynamic steps from layout settings, excluding 'Cancelled' as it's not a progressive step
                              let steps = options
                                .map((o: any) => typeof o === 'string' ? o : (o.label || o.value))
                                .filter((label: string) => typeof label === 'string' && label.toLowerCase() !== 'cancelled');

                              if (!isAlbum) {
                                const allowedEventSteps = ['pending', 'confirmed', 'shoot completed'];
                                steps = steps.filter((step: string) => allowedEventSteps.includes(step.toLowerCase()));
                              }
                                
                              const effectiveFieldId = sectionStatusField?.id || (isAlbum ? 'fld_b_album_status' : '');
                              const effectiveStatus = currentSectionStatus || (isAlbum ? booking.customData?.fld_b_album_status : null);

                              return (
                                <div className="shrink-0 pt-2 pl-4">
                                  <VerticalStatusStepper 
                                    steps={steps}
                                    currentStatus={effectiveStatus}
                                    sectionTitle={section.title}
                                    onStatusChange={(newStatus) => changeSectionStatus(effectiveFieldId, newStatus)}
                                    isUpdating={isUpdatingStatus}
                                  />
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {/* Focus Card */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full gap-4">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-[#0B1E40]">Focus</h3>
                      </div>
                      <div className="flex-1 flex items-end">
                        <div className="flex items-center gap-4 mt-4">
                          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                            <Wallet className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-bold mb-0.5">Amount</p>
                            <p className="text-base font-black text-slate-800">{focusAmountVal || booking.customData?.fld_b_focus || booking.customData?.focus || '20'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes Card */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full gap-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-600" />
                        <h3 className="font-bold text-[#0B1E40]">Notes</h3>
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <p className="text-sm text-slate-400 font-medium mt-2">No notes added</p>
                        <div className="flex justify-end mt-4">
                          <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-bold border border-slate-200 transition-colors">
                            + Add Note
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Attachments Card */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col h-full gap-4">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-[#0B1E40]">Attachments (0)</h3>
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <p className="text-sm text-slate-400 font-medium mt-2">No files uploaded yet</p>
                        <div className="flex justify-end mt-4">
                          <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-bold border border-blue-200 transition-colors">
                            <Upload className="w-4 h-4" /> Upload Files
                          </button>
                        </div>
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
                  onClick={handleClose}
                  className="px-8 py-2.5 bg-[#0B1E40] text-white hover:bg-[#152a55] rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-900/20"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        )}
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
    </div>
  );

  if (standaloneBookingId) {
    return content;
  }

  return (
    <Dialog open={isVisible} onOpenChange={(open) => {
      if (!open) closeBookingDetails();
    }}>
      <DialogContent className="!max-w-[1300px] w-full sm:w-[95vw] p-0 bg-transparent border-0 shadow-none">
        <DialogTitle className="sr-only">Booking Details</DialogTitle>
        {content}
      </DialogContent>
    </Dialog>
  );
}
