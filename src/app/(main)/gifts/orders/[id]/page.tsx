"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Edit2,
  Image as ImageIcon,
  Loader2,
  Package,
  Phone,
  Save,
  Trash2,
  User,
  AlertTriangle,
  FileDown,
  Printer,
  Link as LinkIcon,
  X,
  Settings,
  PackageOpen,
  ShoppingBag,
  Receipt,
  Wallet,
  TrendingUp,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import DatePickerInput from "@/components/ui/DatePickerInput";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_OPTIONS = [
  { value: "PENDING", label: "PENDING", icon: PackageOpen, text: "text-red-500", bg: "bg-red-50", border: "border-red-200", solidBg: "bg-red-500", shadow: "shadow-red-500/30", line: "bg-red-400", textLabel: "text-red-600" },
  { value: "PROCESSING", label: "IN PRODUCTION", icon: Settings, text: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200", solidBg: "bg-amber-500", shadow: "shadow-amber-500/30", line: "bg-amber-400", textLabel: "text-amber-600" },
  { value: "READY", label: "READY FOR PICKUP", icon: ShoppingBag, text: "text-green-500", bg: "bg-green-50", border: "border-green-200", solidBg: "bg-green-500", shadow: "shadow-green-500/30", line: "bg-green-400", textLabel: "text-green-600" },
  { value: "DELIVERED", label: "DELIVERED", icon: CheckCircle2, text: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200", solidBg: "bg-blue-500", shadow: "shadow-blue-500/30", line: "bg-blue-400", textLabel: "text-blue-600" },
];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const { data, error, mutate } = useSWR(`/api/gifts/orders/${resolvedParams.id}`, fetcher);
  const order = data?.order;

  // Custom notification state
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  // Deleting state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status updating state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (order && !isEditing) {
      setEditForm({
        clientName: order.clientName,
        clientPhone: order.clientPhone || "",
        quantity: order.quantity,
        amount: order.customData?.amount || 0,
        advanceAmount: order.customData?.advanceAmount || 0,
        dueAmount: order.customData?.dueAmount || 0,
        dueDate: order.customData?.dueDate || "",
        paymentMode: order.customData?.paymentMode || "CASH",
      });
    }
  }, [order, isEditing]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF9] p-8 flex items-center justify-center">
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl font-medium border border-red-100 flex items-center gap-3 shadow-sm">
          <AlertTriangle size={20} />
          Failed to load order.
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
      </div>
    );
  }

  const customData = order.customData || {};
  const totalAmount = Number(customData.amount) || 0;
  const advanceAmount = Number(customData.advanceAmount) || 0;
  const dueAmount = Number(customData.dueAmount) || 0;

  // Calculate payment status
  let paymentStatus = "UNPAID";
  let paymentColor = "text-red-700 bg-red-50 border-red-200";
  if (totalAmount === 0) {
    paymentStatus = "N/A";
    paymentColor = "text-slate-500 bg-slate-100 border-slate-200";
  } else if (dueAmount <= 0 && advanceAmount > 0) {
    paymentStatus = "PAID";
    paymentColor = "text-green-700 bg-green-50 border-green-200";
  } else if (advanceAmount > 0) {
    paymentStatus = "PARTIAL";
    paymentColor = "text-orange-700 bg-orange-50 border-orange-200";
  }

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === order.status) return;
    setIsUpdatingStatus(newStatus);
    try {
      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      mutate();
      showNotification("Order status updated", "success");
    } catch (err) {
      showNotification("Failed to update status", "error");
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const updatedCustomData = {
        ...customData,
        amount: Number(editForm.amount),
        advanceAmount: Number(editForm.advanceAmount),
        dueAmount: Number(editForm.dueAmount),
        dueDate: editForm.dueDate,
        paymentMode: editForm.paymentMode,
      };

      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: editForm.clientName,
          clientPhone: editForm.clientPhone,
          quantity: Number(editForm.quantity),
          customData: updatedCustomData,
        }),
      });

      if (!res.ok) throw new Error("Failed to save changes");
      await mutate();
      setIsEditing(false);
      showNotification("Order updated successfully", "success");
    } catch (err) {
      showNotification("Failed to save changes", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete order");
      router.push("/gifts");
    } catch (err) {
      showNotification("Failed to delete order", "error");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDownloadInvoice = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("INVOICE", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Order ID: #${order.id.slice(-6).toUpperCase()}`, 20, 40);
    doc.text(`Date: ${format(new Date(order.createdAt), "MMM dd, yyyy")}`, 20, 50);
    
    doc.text("Client Information:", 20, 70);
    doc.setFont("helvetica", "bold");
    doc.text(`${order.clientName}`, 20, 80);
    doc.setFont("helvetica", "normal");
    doc.text(`${order.clientPhone || "N/A"}`, 20, 90);
    
    doc.text("Product Details:", 120, 70);
    doc.setFont("helvetica", "bold");
    doc.text(`${order.product?.name} (x${order.quantity})`, 120, 80);
    
    doc.line(20, 100, 190, 100);
    
    doc.setFont("helvetica", "bold");
    doc.text("Financial Summary", 20, 120);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Amount: Rs. ${totalAmount}`, 20, 130);
    doc.text(`Advance Paid: Rs. ${advanceAmount}`, 20, 140);
    doc.text(`Due Amount: Rs. ${dueAmount}`, 20, 150);
    
    doc.text(`Payment Status: ${paymentStatus}`, 120, 130);
    doc.text(`Order Status: ${order.status}`, 120, 140);
    if (customData.dueDate) {
      doc.text(`Due Date: ${format(new Date(customData.dueDate), "MMM dd, yyyy")}`, 120, 150);
    }
    
    doc.save(`Invoice_${order.id.slice(-6).toUpperCase()}.pdf`);
  };

  const currentStatusIndex = STATUS_OPTIONS.findIndex(s => s.value === order.status);

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-4 md:p-8 pb-24 font-sans relative">
      
      {/* Inline Notification Banner */}
      <div 
        className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full font-semibold shadow-lg border transition-all duration-300 flex items-center gap-2 text-sm",
          notification ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none",
          notification?.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
        )}
      >
        {notification?.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        {notification?.message}
      </div>

      <div className="w-full max-w-[1400px] mx-auto animate-[fadeIn_0.3s_ease-out] print-section">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex items-start gap-4">
            <button 
              onClick={() => router.push("/gifts")}
              className="w-10 h-10 mt-1 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all shadow-sm active:scale-95"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
                  Order #{order.id.slice(-6).toUpperCase()}
                </h1>
                <span className={cn("px-2.5 py-1 rounded-md text-[0.65rem] font-bold tracking-widest uppercase border", 
                  STATUS_OPTIONS.find(s => s.value === order.status)?.bg,
                  STATUS_OPTIONS.find(s => s.value === order.status)?.text,
                  STATUS_OPTIONS.find(s => s.value === order.status)?.border
                )}>
                  {STATUS_OPTIONS.find(s => s.value === order.status)?.label || order.status}
                </span>
              </div>
              <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1.5 flex flex-wrap items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                {format(new Date(order.createdAt), "MMMM dd, yyyy 'at' h:mm a")}
                <span className="text-slate-300 mx-1">•</span>
                <Clock size={14} className="text-slate-400" />
                {formatDistanceToNowStrict(new Date(order.createdAt))} ago
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            {isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-colors shadow-sm"
                >
                  Cancel Edit
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Details
                </button>
              </>
            ) : (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-2xl border border-red-100">
                    <button 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                    >
                      {isDeleting ? <Loader2 size={14} className="animate-spin" /> : "Confirm"}
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 bg-white text-red-600 border border-red-200 font-bold text-xs rounded-xl hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-red-600 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm mr-1"
                    title="Delete Order"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all shadow-sm"
                  title="Edit Details"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => window.print()}
                  className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all shadow-sm"
                  title="Print"
                >
                  <Printer size={18} />
                </button>
                <button 
                  onClick={handleDownloadInvoice}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
                >
                  <FileDown size={16} /> <span className="hidden sm:inline">Download Invoice</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Status Tracker */}
          <div className="bg-white rounded-3xl py-3 md:py-4 px-4 md:px-8 border border-slate-100 shadow-sm flex flex-col justify-center col-span-1 lg:col-span-12 relative z-20">
            
            <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto min-w-[300px] px-2">
              {/* Timeline Background Track */}
              <div className="absolute left-10 right-10 top-8 flex items-center z-0">
                <div 
                  className={cn("h-[2px] transition-all duration-1000 ease-out relative", STATUS_OPTIONS[currentStatusIndex > 0 ? currentStatusIndex : 0]?.line)}
                  style={{ width: `${(currentStatusIndex / (STATUS_OPTIONS.length - 1)) * 100}%` }}
                >
                  {/* Little dot at the end of the active line */}
                  <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full", STATUS_OPTIONS[currentStatusIndex > 0 ? currentStatusIndex : 0]?.line)}></div>
                </div>
                <div className="h-[2px] border-t-2 border-dashed border-slate-200 flex-1"></div>
              </div>
              
              {STATUS_OPTIONS.map((status, index) => {
                const isCompleted = index < currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const isPending = index > currentStatusIndex;
                const isUpdating = isUpdatingStatus === status.value;
                const Icon = status.icon;

                return (
                  <div key={status.value} className="flex flex-col items-center relative bg-white px-3 z-10 group cursor-pointer" onClick={() => handleStatusChange(status.value)}>
                    
                    {/* Circle Icon Container */}
                    <div className="h-16 flex items-center justify-center">
                      {isCompleted && (
                        <div className={cn("relative w-12 h-12 rounded-full flex items-center justify-center border-[3px] transition-transform group-hover:scale-105", status.bg, status.border)}>
                          <Icon size={18} className={status.text} />
                          <div className={cn("absolute top-0 right-0 w-4 h-4 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm", status.solidBg)}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        </div>
                      )}

                      {isCurrent && (
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className={cn("absolute inset-0 rounded-full animate-[ping_2s_ease-in-out_infinite] opacity-60", status.bg)}></div>
                          <div className={cn("absolute inset-2 rounded-full border-2", status.bg, status.border)}></div>
                          <div className={cn("absolute inset-4 rounded-full shadow-lg flex items-center justify-center text-white z-10 transition-transform group-hover:scale-105", status.solidBg, status.shadow)}>
                            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Icon size={18} />}
                          </div>
                          {/* Sparkles for Delivered */}
                          {index === 3 && (
                            <>
                              <div className={cn("absolute top-0 left-1 w-1 h-1 rounded-full animate-bounce", status.solidBg)}></div>
                              <div className={cn("absolute bottom-2 right-0 w-0.5 h-0.5 rounded-full", status.solidBg)}></div>
                              <div className={cn("absolute top-3 right-1 w-1 h-1 rounded-full", status.solidBg)}></div>
                            </>
                          )}
                        </div>
                      )}

                      {isPending && (
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-[3px] border-slate-100 transition-transform group-hover:scale-105 group-hover:border-slate-200">
                          {isUpdating ? <Loader2 size={18} className="animate-spin text-slate-400" /> : <Icon size={18} className="text-slate-300" />}
                        </div>
                      )}
                    </div>
                    
                    {/* Text Labels - Shown on Hover */}
                    <div className="absolute top-full mt-3 flex flex-col items-center opacity-0 translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50">
                      <span className="text-[0.65rem] font-bold uppercase tracking-widest text-center whitespace-nowrap bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-xl">
                        {status.label}
                      </span>
                      {isCurrent && (
                        <span className={cn("px-2 py-0.5 rounded-full text-[0.6rem] font-bold mt-1 shadow-sm", status.bg, status.textLabel)}>CURRENT</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Client & Product Info */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col h-full print-section col-span-1 lg:col-span-7">
            <h3 className="font-bold text-slate-800 mb-8">Order Details</h3>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Left Column: Client */}
              <div className="xl:border-r border-slate-100 xl:pr-8">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-6">
                  <User size={16} /> Client Information
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Client Name</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.clientName}
                        onChange={e => setEditForm({...editForm, clientName: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    ) : (
                      <div className="text-lg font-bold text-slate-800 leading-tight">{order.clientName}</div>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Phone</label>
                    {isEditing ? (
                      <input 
                        type="tel" 
                        value={editForm.clientPhone}
                        onChange={e => setEditForm({...editForm, clientPhone: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Phone size={14} className="text-slate-400" />
                        {order.clientPhone || "Not provided"}
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>

              {/* Right Column: Product */}
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-6">
                  <Package size={16} /> Product Information
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Product</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                      {customData.image ? (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/50 overflow-hidden shadow-sm shrink-0">
                          <img src={customData.image} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200/50 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                          <ImageIcon size={20} strokeWidth={1.5} />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-800">{order.product?.name}</div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">ID: {order.product?.id}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Quantity</label>
                    {isEditing ? (
                      <input 
                        type="number" 
                        min="1"
                        value={editForm.quantity}
                        onChange={e => setEditForm({...editForm, quantity: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    ) : (
                      <div className="text-lg font-bold text-slate-800">{order.quantity} x</div>
                    )}
                  </div>

                  <div>
                    <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Due Date</label>
                    {isEditing ? (
                      <div className="w-full">
                        <DatePickerInput 
                          value={editForm.dueDate}
                          onChange={(dateStr) => setEditForm({...editForm, dueDate: dateStr})}
                          className="flex h-[44px] w-full items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition-colors focus-within:border-blue-500"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Calendar size={14} className="text-slate-400" />
                        {customData.dueDate ? format(new Date(customData.dueDate), "MMM dd, yyyy") : "Not set"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm flex flex-col h-full print-section col-span-1 lg:col-span-5">
            {/* Header */}
            <div className="flex items-start sm:items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Financials</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Overview of booking payments</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">
                <CheckCircle2 size={14} />
                {totalAmount > 0 ? Math.round((advanceAmount / totalAmount) * 100) : 0}% Collected
              </div>
            </div>

            <div className="border-t border-slate-100 mb-6 -mx-6"></div>

            {isEditing ? (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-auto">
                <div>
                  <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Total Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input 
                      type="text" 
                      value={editForm.amount}
                      onChange={e => {
                        const amtText = e.target.value.replace(/[^0-9]/g, '');
                        const amt = Number(amtText) || 0;
                        const adv = Number(editForm.advanceAmount) || 0;
                        setEditForm({...editForm, amount: amtText, dueAmount: Math.max(0, amt - adv)});
                      }}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-7 pr-3 py-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Advance Paid</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input 
                      type="text" 
                      value={editForm.advanceAmount}
                      onChange={e => {
                        const advText = e.target.value.replace(/[^0-9]/g, '');
                        const adv = Number(advText) || 0;
                        const amt = Number(editForm.amount) || 0;
                        setEditForm({...editForm, advanceAmount: advText, dueAmount: Math.max(0, amt - adv)});
                      }}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-7 pr-3 py-2 text-green-600 font-bold focus:border-green-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Due Amount</label>
                  <div className="relative flex items-center w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 h-[44px]">
                    <span className="text-slate-400 font-bold text-sm mr-2">₹</span>
                    <span className="text-red-500 font-bold text-lg">{editForm.dueAmount}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col mt-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Left: Total Amount */}
                  <div>
                    <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total Amount</div>
                    <div className="text-3xl font-black text-slate-800 mb-2">₹{totalAmount.toLocaleString()}</div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 text-[0.65rem] font-bold rounded-md border border-green-100">
                      <TrendingUp size={12} /> 0% vs last month
                    </div>
                  </div>
                  
                  {/* Right: Progress */}
                  <div className="md:border-l border-slate-100 md:pl-6 flex flex-col justify-center">
                    <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Collection Progress</div>
                    <div className="flex items-end gap-2 mb-2">
                      <div className="text-2xl font-black text-slate-800 leading-none">{totalAmount > 0 ? Math.round((advanceAmount / totalAmount) * 100) : 0}%</div>
                      <div className="text-green-600 font-bold text-xs mb-0.5">Collected</div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full mb-2 overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${totalAmount > 0 ? Math.round((advanceAmount / totalAmount) * 100) : 0}%` }}></div>
                    </div>
                    <div className="flex items-center gap-3 text-[0.65rem] font-bold text-slate-500">
                      <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Collected ₹{advanceAmount.toLocaleString()}</div>
                      <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Pending ₹{dueAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Card 1: Advance */}
                  <div className="bg-green-50/50 p-3 rounded-2xl border border-green-100 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <div className="w-8 h-8 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-sm">
                        <Wallet size={14} />
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-green-200 flex items-center justify-center text-green-400">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    </div>
                    <div className="text-[0.6rem] font-bold text-green-700/70 uppercase tracking-widest mb-0.5 relative z-10">Advance Paid</div>
                    <div className="text-xl font-black text-slate-800 relative z-10">₹{advanceAmount.toLocaleString()}</div>
                  </div>

                  {/* Card 2: Due Amount */}
                  <div className="bg-red-50/50 p-3 rounded-2xl border border-red-100 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <div className="w-8 h-8 rounded-xl bg-red-400 text-white flex items-center justify-center shadow-sm">
                        <Receipt size={14} />
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-red-200 flex items-center justify-center text-red-400">
                        <Clock size={12} strokeWidth={3} />
                      </div>
                    </div>
                    <div className="text-[0.6rem] font-bold text-red-700/70 uppercase tracking-widest mb-0.5 relative z-10">Due Amount</div>
                    <div className="text-xl font-black text-slate-800 relative z-10">₹{dueAmount.toLocaleString()}</div>
                  </div>

                  {/* Card 3: Mode of Payment */}
                  <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-sm">
                        <CreditCard size={14} />
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-indigo-200 flex items-center justify-center text-indigo-300">
                        <span className="text-base leading-none">-</span>
                      </div>
                    </div>
                    <div className="text-[0.6rem] font-bold text-indigo-700/70 uppercase tracking-widest mb-0.5 relative z-10">Mode of Payment</div>
                    <div className="text-xl font-black text-slate-800 relative z-10">{customData.paymentMode || "None"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
