"use client";

import React, { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
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
  Check,
  Paperclip
} from "lucide-react";
import { getProductIcon } from "@/lib/productIcons";
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
  console.log("order.customData:", order?.customData);

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
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  // Deleting state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [showDueCollection, setShowDueCollection] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [showRollbackWarning, setShowRollbackWarning] = useState<string | null>(null);
  const [collectionInput, setCollectionInput] = useState("");
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionSuccess, setCollectionSuccess] = useState(false);
  const [dueCollectionDate, setDueCollectionDate] = useState<string>("");

  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
  const paymentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (paymentDropdownRef.current && !paymentDropdownRef.current.contains(event.target as Node)) {
        setIsPaymentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (order && !isEditing) {
      setEditForm({
        clientName: order.clientName,
        clientPhone: order.clientPhone || "",
        quantity: order.quantity,
        amount: order.customData?.amount || 0,
        advanceAmount: order.customData?.advanceAmount || 0,
        dueAmount: Math.max(0, (Number(order.customData?.amount) || 0) - (order.transactions?.filter((t: any) => !t.deletedAt).reduce((sum: number, tx: any) => sum + tx.amount, 0) || Number(order.customData?.advanceAmount) || 0)),
        dueDate: order.dueDate || "",
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
  const advanceAmount = order.transactions?.find((t: any) => !t.deletedAt && t.description?.startsWith('Advance'))?.amount ?? Number(customData.advanceAmount) ?? 0;
  
  const collectedAmount = order.transactions?.filter((t: any) => !t.deletedAt).reduce((sum: number, tx: any) => sum + tx.amount, 0) || advanceAmount;
  const dueAmount = Math.max(0, totalAmount - collectedAmount);
  
  const progressPercent = totalAmount > 0 ? Math.round((collectedAmount / totalAmount) * 100) : 0;

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
    
    if (order.status === "DELIVERED") {
      setShowRollbackWarning(newStatus);
      return;
    }
    
    if (newStatus === "DELIVERED" && dueAmount > 0) {
      setCollectionInput(dueAmount.toString());
      const isBackdated = order.createdAt && new Date(order.createdAt).getTime() < new Date().setHours(0,0,0,0);
      setDueCollectionDate(isBackdated ? new Date(order.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setShowDueCollection(true);
      return;
    }
    
    await executeStatusUpdate(newStatus);
  };

  const handleConfirmRollback = async () => {
    if (!showRollbackWarning) return;
    await executeStatusUpdate(showRollbackWarning);
    setShowRollbackWarning(null);
  };

  const executeStatusUpdate = async (newStatus: string) => {
    setIsUpdatingStatus(newStatus);
    try {
      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleConfirmCollection = async () => {
    const collectVal = Number(collectionInput) || 0;
    if (collectVal <= 0) {
      setCollectionError("Please enter a valid amount.");
      return;
    }
    
    setCollectionError(null);
    setIsCollecting(true);
    try {
      const txRes = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: collectVal,
          type: "INCOME",
          date: new Date(dueCollectionDate).toISOString(),
          createdAt: new Date(dueCollectionDate).toISOString(),
          category: "GIFTS_AND_FRAMES",
          paymentMode: customData.paymentMode || "Cash",
          status: "SETTLED",
          description: `Due Collection for Order ${order.orderNumber || `#MDorder-${order.id.slice(-6).toUpperCase()}`} - ${order.clientName} (${order.product?.name || 'Unknown Product'})`,
          productOrderId: order.id,
        })
      });
      
      let txData;
      if (!txRes.ok) {
        const text = await txRes.text();
        try {
          txData = JSON.parse(text);
        } catch {
          txData = { error: text };
        }
        console.error("Transaction Creation Error Response:", txData);
        throw new Error(txData.details || txData.error || txData.message || "Failed to create due collection transaction");
      }
      
      txData = await txRes.json();

      const newDueAmount = Math.max(0, dueAmount - collectVal);
      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "DELIVERED",
          customData: {
            dueAmount: newDueAmount
          }
        }),
      });
      
      let patchData;
      if (!res.ok) {
        const text = await res.text();
        try {
          patchData = JSON.parse(text);
        } catch {
          patchData = { error: text };
        }
        console.error("Order Status Update Error Response:", patchData);
        throw new Error(patchData.error || patchData.message || "Failed to update order status");
      }
      
      patchData = await res.json();
      
      mutate();
      router.refresh();
      setCollectionSuccess(true);
      setTimeout(() => {
        setShowDueCollection(false);
        setCollectionSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error("handleConfirmCollection error:", err);
      setCollectionError(err.message || "Failed to process collection.");
    } finally {
      setIsCollecting(false);
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
        paymentMode: editForm.paymentMode,
      };

      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: editForm.clientName,
          clientPhone: editForm.clientPhone,
          quantity: Number(editForm.quantity),
          dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
          customData: updatedCustomData,
        }),
      });

      if (!res.ok) throw new Error("Failed to save changes");
      await mutate();
      router.refresh();
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
        pdf.save(`Invoice_${order.id.slice(-6).toUpperCase()}.pdf`);
        showNotification("Invoice generated successfully!", "success");
      } catch (error) {
        showNotification("Failed to generate invoice", "error");
        console.error(error);
      } finally {
        setIsGeneratingInvoice(false);
      }
    }, 100);
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
              className="w-10 h-10 mt-1 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all shadow-sm active:scale-95 no-print"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
                  {order.orderNumber || `Order #${order.id.slice(-6).toUpperCase()}`}
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
                {showDeleteConfirm && (
                  <div className="fixed sm:static bottom-0 left-0 right-0 z-[100] sm:z-auto p-4 sm:p-1.5 bg-white sm:bg-red-50 border-t border-slate-200 sm:border sm:border-red-100 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] sm:shadow-none flex items-center justify-end sm:justify-start gap-3 sm:gap-2 sm:rounded-2xl animate-[slideUp_0.3s_ease-out] sm:animate-none">
                    <span className="sm:hidden text-red-600 font-bold text-sm mr-auto">Delete Order?</span>
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-5 py-2.5 sm:px-3 sm:py-1.5 bg-slate-100 sm:bg-white text-slate-700 sm:text-red-600 sm:border sm:border-red-200 font-bold text-sm sm:text-xs rounded-xl hover:bg-slate-200 sm:hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-5 py-2.5 sm:px-4 sm:py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 sm:gap-1 disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 size={16} className="animate-spin" /> : "Confirm"}
                    </button>
                  </div>
                )}
                
                {!showDeleteConfirm && (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-white text-slate-400 hover:text-red-600 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm"
                    title="Delete Order"
                  >
                    <Trash2 className="w-5 h-5 sm:w-[18px] sm:h-[18px]" />
                  </button>
                )}
                
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all shadow-sm"
                  title="Edit Details"
                >
                  <Edit2 className="w-5 h-5 sm:w-[18px] sm:h-[18px]" />
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-shrink-0 w-11 h-11 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all shadow-sm"
                  title="Print"
                >
                  <Printer className="w-5 h-5 sm:w-[18px] sm:h-[18px]" />
                </button>
                <button 
                  onClick={generateInvoice}
                  disabled={isGeneratingInvoice}
                  className="flex-shrink-0 w-11 h-11 sm:w-auto sm:px-4 sm:py-2.5 flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50"
                >
                  <FileDown className="w-5 h-5 sm:w-[16px] sm:h-[16px]" /> <span className="hidden sm:inline">{isGeneratingInvoice ? "Generating..." : "Download Invoice"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Status Tracker */}
          <div className="bg-white rounded-3xl py-3 md:py-4 px-4 md:px-8 border border-slate-100 shadow-sm flex flex-col justify-center col-span-1 lg:col-span-12 relative z-20 no-print overflow-hidden">
            
            <div className="w-full pb-2">
              <div className="relative flex items-start justify-between w-full max-w-4xl mx-auto px-0 sm:px-2">
              {/* Timeline Background Track */}
              <div className="absolute left-8 right-8 sm:left-12 sm:right-12 top-8 flex items-center z-0">
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
                  <div key={status.value} className="flex flex-col items-center relative bg-white z-10 group cursor-pointer" onClick={() => handleStatusChange(status.value)}>
                    
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
                    
                    {/* Text Labels - Consistently below icons */}
                    <div className="mt-2 flex flex-col items-center pointer-events-none w-16 sm:w-24">
                      <span className={cn(
                        "text-[11px] font-bold uppercase tracking-widest text-center leading-tight transition-colors",
                        isCurrent ? "text-slate-800" : "text-slate-400"
                      )}>
                        <span className="sm:hidden">{status.label === 'IN PRODUCTION' ? 'IN PROD' : status.label === 'READY FOR PICKUP' ? 'READY' : status.label}</span>
                        <span className="hidden sm:inline">{status.label}</span>
                      </span>
                      {isCurrent && (
                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 shadow-sm", status.bg, status.textLabel)}>CURRENT</span>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>

          {/* Inline Panels */}
          {showRollbackWarning && (
            <div className="col-span-1 lg:col-span-12 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-[fadeIn_0.2s_ease-out]">
              <div>
                <h4 className="text-sm font-bold text-orange-900 mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} /> Immutable Ledger Warning
                </h4>
                <p className="text-xs text-orange-700 font-medium">
                  Rolling back from DELIVERED will <span className="font-bold">NOT</span> reverse the linked collection transactions. You must adjust the ledger manually if needed.
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <button 
                  onClick={() => setShowRollbackWarning(null)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmRollback}
                  disabled={isUpdatingStatus !== null}
                  className="flex-1 sm:flex-none flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-70"
                >
                  {isUpdatingStatus ? <Loader2 size={14} className="animate-spin inline" /> : null}
                  Confirm Rollback
                </button>
              </div>
            </div>
          )}

          {showDueCollection && (
            <div className="col-span-1 lg:col-span-12 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-[fadeIn_0.2s_ease-out] max-h-[200px] sm:max-h-none overflow-y-auto sm:overflow-visible">
              <div>
                <h4 className="text-sm font-bold text-amber-900 mb-1 flex items-center gap-2">
                  <Wallet size={16} /> Collect Due Amount
                </h4>
                <p className="text-xs text-amber-700 font-medium">
                  Marking as DELIVERED requires collecting remaining due (Total: <span className="font-bold">₹{dueAmount.toLocaleString()}</span>).
                </p>
                {collectionError && <p className="text-[0.65rem] font-bold text-red-600 mt-1">{collectionError}</p>}
                {collectionSuccess && <p className="text-[0.65rem] font-bold text-green-600 mt-1">Collection successful!</p>}
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
                <div className="relative w-full sm:w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                  <input 
                    type="number"
                    value={collectionInput}
                    onChange={(e) => setCollectionInput(e.target.value)}
                    disabled={isCollecting || collectionSuccess}
                    className="w-full bg-white border border-amber-200 rounded-xl pl-6 pr-3 py-2 text-slate-800 font-bold text-xs focus:border-amber-400 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="relative w-full sm:w-36">
                  <input
                    type="date"
                    value={dueCollectionDate}
                    onChange={(e) => setDueCollectionDate(e.target.value)}
                    disabled={isCollecting || collectionSuccess}
                    className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-800 font-bold text-xs focus:border-amber-400 focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      setShowDueCollection(false);
                      setCollectionError(null);
                    }}
                    disabled={isCollecting || collectionSuccess}
                    className="flex-1 sm:flex-none px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmCollection}
                    disabled={isCollecting || collectionSuccess}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-70"
                  >
                    {isCollecting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {collectionSuccess ? "Collected" : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          )}

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
                      {(() => {
                        const uiProps = getProductIcon(order.product?.id);
                        const Icon = uiProps.icon;
                        return (
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${uiProps.bg} ${uiProps.color}`}>
                            <Icon size={24} strokeWidth={1.5} />
                          </div>
                        );
                      })()}
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
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                        {order.dueDate ? format(new Date(order.dueDate), "MMM dd, yyyy") : "Not set"}
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
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">
                  <CheckCircle2 size={14} />
                  {progressPercent}% Collected
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 mb-6 -mx-6"></div>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-auto">
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
                  <div className="relative flex items-center w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 h-[40px] md:h-[44px]">
                    <span className="text-slate-400 font-bold text-sm mr-2">₹</span>
                    <span className="text-red-500 font-bold text-lg">{editForm.dueAmount}</span>
                  </div>
                </div>
                <div className="relative" ref={paymentDropdownRef}>
                  <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Payment Method</label>
                  <button
                    type="button"
                    onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                    className="flex h-[40px] md:h-[44px] w-full items-center justify-between bg-slate-50 border-2 border-slate-200 rounded-xl px-4 text-slate-800 font-bold focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <span>{editForm.paymentMode === 'BANK_TRANSFER' ? 'Bank Transfer' : editForm.paymentMode === 'UPI' ? 'UPI' : editForm.paymentMode.charAt(0) + editForm.paymentMode.slice(1).toLowerCase()}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isPaymentDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isPaymentDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-[fadeIn_0.15s_ease-out]">
                      {[
                        { label: 'Cash', value: 'CASH' },
                        { label: 'UPI', value: 'UPI' },
                        { label: 'Card', value: 'CARD' },
                        { label: 'Bank Transfer', value: 'BANK_TRANSFER' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setEditForm({ ...editForm, paymentMode: opt.value });
                            setIsPaymentDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-blue-50 hover:text-blue-700 ${editForm.paymentMode === opt.value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
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
                      <div className="text-2xl font-black text-slate-800 leading-none">{progressPercent}%</div>
                      <div className="text-green-600 font-bold text-xs mb-0.5">Collected</div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full mb-2 overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <div className="flex items-center gap-3 text-[0.65rem] font-bold text-slate-500">
                      <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Collected ₹{collectedAmount.toLocaleString()}</div>
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
                    <div className="text-[0.6rem] font-bold text-indigo-700/70 uppercase tracking-widest mb-0.5 relative z-10">Payment Method</div>
                    <div className="text-xl font-black text-slate-800 relative z-10">{customData.paymentMode || "Not set"}</div>
                  </div>
                </div>

                {order.transactions && order.transactions.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-3">Linked Transactions</div>
                    <div className="space-y-2">
                      {order.transactions.filter((tx: any) => !tx.deletedAt).map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                              <Receipt size={14} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">{tx.description || tx.category}</div>
                              <div className="text-[0.65rem] text-slate-500">{format(new Date(tx.date), "MMM dd, yyyy h:mm a")} • {tx.paymentMode || "Cash"}</div>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-green-600">+₹{tx.amount.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom Attachments Section */}
          {Object.entries(customData).some(([key, val]) => (val as any)?.driveFile || (typeof val === 'string' && val.startsWith('data:image'))) && (
            <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-sm flex flex-col print-section col-span-1 lg:col-span-12 mb-6">
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-6">
                <Paperclip size={16} /> Attachments
              </div>
              <div className="flex flex-wrap gap-4">
                {Object.entries(customData).map(([key, val]: [string, any]) => {
                  if (val?.driveFile) {
                    const fileId = val.driveFile.id || val.driveFile.driveFileId;
                    return (
                      <a key={key} href={val.driveFile.url || val.driveFile.webViewLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer w-fit min-w-[200px]">
                        <img 
                          src={fileId ? `/api/integrations/google/thumbnail?fileId=${fileId}` : val.driveFile.iconUrl} 
                          alt="Drive File" 
                          className="w-8 h-8 object-cover rounded-md bg-slate-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src.includes('/api/integrations/google/thumbnail')) {
                              // Fallback 1: drive.google.com/thumbnail
                              target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200&authuser=0`;
                            } else if (target.src.includes('drive.google.com/thumbnail')) {
                              // Fallback 2: lh3 public URL
                              target.src = `https://lh3.googleusercontent.com/d/${fileId}=w200`;
                            } else {
                              // Fallback 3: Generic icon
                              target.src = val.driveFile.iconUrl;
                              target.className = "w-8 h-8 object-contain";
                            }
                          }}
                        />
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{val.driveFile.name}</span>
                      </a>
                    );
                  }
                  if (typeof val === 'string' && val.startsWith('data:image')) {
                    return (
                      <div key={key} className="w-24 h-24 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(val, '_blank')} title="Click to view full size">
                        <img src={val} alt="Attachment" className="w-full h-full object-cover" />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

        </div>

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
                  <p className="text-[#B66D42] font-bold mt-3 text-sm">Gift Order #MDorder-{order.id.slice(-6).toUpperCase()}</p>
               </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-12 border-t border-gray-200 pt-6">
              <div className="flex flex-col border-r border-gray-200">
                <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Invoice No.</span>
                <span className="font-bold text-[#1F2937] text-[0.95rem]">#MDorder-{order.id.slice(-6).toUpperCase()}-INV</span>
              </div>
              <div className="flex flex-col border-r border-gray-200 pl-4">
                <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Invoice Date</span>
                <span className="font-bold text-[#1F2937] text-[0.95rem]">{new Date(order.createdAt || new Date()).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
              </div>
              <div className="flex flex-col border-r border-gray-200 pl-4">
                <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Due Date</span>
                <span className="font-bold text-[#1F2937] text-[0.95rem]">{order.dueDate ? new Date(order.dueDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A'}</span>
              </div>
              <div className="flex flex-col pl-4">
                <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Status</span>
                <span className="font-bold text-[#1F2937] text-[0.95rem] uppercase">{order.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 mt-8 bg-[#F8F9FA] border-y border-gray-200">
              <div className="p-5 pr-6 flex flex-col gap-2">
                <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-1">Billed To</span>
                <span className="text-[0.9rem] text-[#1F2937]">{order.clientName || 'Client Name'}</span>
                <span className="text-[0.9rem] text-[#1F2937]">Phone: {order.clientPhone || 'N/A'}</span>
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
              <h3 className="text-[0.7rem] font-black text-[#1F2937] tracking-[0.15em] uppercase mb-3">PRODUCT & SERVICES</h3>
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
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">1</td>
                    <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{order.product?.name || "Product"}</td>
                    <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{order.quantity || 1}</td>
                    <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{(totalAmount / (order.quantity || 1)).toFixed(2)}</td>
                    <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end">
              <div className="w-[320px] flex flex-col">
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.85rem] text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.95rem] font-bold">
                  <span className="text-[#1F2937]">Total Amount</span>
                  <span className="text-[#B66D42]">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.85rem] text-gray-500">
                  <span>Advance Paid</span>
                  <span>₹{advanceAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.95rem] font-bold">
                  <span className="text-[#1F2937]">Balance Due</span>
                  <span className="text-[#B66D42]">₹{dueAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-end pt-3 text-[0.65rem] font-bold text-[#B66D42] tracking-wider uppercase">
                  PAYMENT PROGRESS: <span className="ml-2">{progressPercent}% PAID</span>
                </div>
              </div>
            </div>

            <div className="mt-16">
              <h3 className="text-[0.7rem] font-black text-[#1F2937] tracking-[0.15em] uppercase mb-4 text-right">Terms & Notes</h3>
              <div className="text-[0.85rem] text-[#1F2937] space-y-2.5">
                <p className="flex items-start gap-2"><span className="text-[#B66D42] font-bold">—</span> Advance payment required to confirm order.</p>
                <p className="flex items-start gap-2"><span className="text-[#B66D42] font-bold">—</span> Ready for pickup notification will be sent.</p>
                <p className="flex items-start gap-2"><span className="text-[#B66D42] font-bold">—</span> Balance due before delivery.</p>
              </div>
              <p className="text-[#B66D42] italic text-[0.95rem] mt-6" style={{ fontFamily: 'Georgia, serif' }}>Thank you for choosing Moondot Studio to capture your celebration.</p>
            </div>
         </div>
      </div>
      </div>
    </div>
  );
}
