"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
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

export default function OrderDetailsPanel() {
  const { isGiftOrderDetailsOpen, giftOrderDetailsId, closeGiftOrderDetails } = useGlobalForm();
  
  const { data, error, mutate } = useSWR(giftOrderDetailsId ? `/api/gifts/orders/${giftOrderDetailsId}` : null, fetcher);
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

  const customData = order?.customData || {};
  const totalAmount = Number(customData.amount) || 0;
  const advanceAmount = order?.transactions?.find((t: any) => !t.deletedAt && t.description?.startsWith('Advance'))?.amount ?? Number(customData.advanceAmount) ?? 0;
  const collectedAmount = order?.transactions?.filter((t: any) => !t.deletedAt).reduce((sum: number, tx: any) => sum + tx.amount, 0) || advanceAmount;
  const dueAmount = Math.max(0, totalAmount - collectedAmount);
  const progressPercent = totalAmount > 0 ? Math.round((collectedAmount / totalAmount) * 100) : 0;

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
      if (!txRes.ok) throw new Error("Failed to create due collection transaction");
      const newDueAmount = Math.max(0, dueAmount - collectVal);
      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "DELIVERED",
          customData: { ...customData, dueAmount: newDueAmount }
        }),
      });
      if (!res.ok) throw new Error("Failed to update order status");
      mutate();
      globalMutate('/api/gifts/orders');
      setCollectionSuccess(true);
      setTimeout(() => { setShowDueCollection(false); setCollectionSuccess(false); }, 2000);
    } catch (err: any) {
      setCollectionError(err.message || "Failed to process collection.");
    } finally {
      setIsCollecting(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/gifts/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: editForm.clientName,
          clientPhone: editForm.clientPhone,
          quantity: Number(editForm.quantity),
          dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
          customData: { ...customData, amount: Number(editForm.amount), advanceAmount: Number(editForm.advanceAmount), dueAmount: Number(editForm.dueAmount), paymentMode: editForm.paymentMode },
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
      const res = await fetch(`/api/gifts/orders/${order.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete order");
      globalMutate('/api/gifts/orders');
      closeGiftOrderDetails();
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
      } finally {
        setIsGeneratingInvoice(false);
      }
    }, 100);
  };

  const currentStatusIndex = order ? STATUS_OPTIONS.findIndex(s => s.value === order.status) : 0;

  return (
    <Dialog open={isGiftOrderDetailsOpen} onOpenChange={(open) => {
      if (!open) closeGiftOrderDetails();
    }}>
      <DialogContent className="max-w-[850px] w-[95vw] p-0 bg-[#F5F6F8] overflow-hidden border-0 shadow-none h-[90vh] md:h-[95vh] flex flex-col rounded-[2rem]">
        {(!order && !error) ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 min-h-[400px]">
            <Loader2 className="h-10 w-10 text-orange-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading order details...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 min-h-[400px]">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Error Loading Order</h3>
            <p className="text-slate-500">Could not fetch order details. Please try again.</p>
            <button onClick={() => closeGiftOrderDetails()} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">Close</button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col w-full mx-auto"
          >
            {/* Minimal Header */}
            <header className="shrink-0 sticky top-0 z-40 bg-[#F5F6F8] px-4 md:px-8 py-5 md:py-6 flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <button 
                  onClick={() => closeGiftOrderDetails()}
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all hover:-translate-x-0.5 hover:shadow-sm"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight">{order.orderNumber || `Order #${order.id.slice(-6).toUpperCase()}`}</h1>
                  <p className="text-xs text-slate-500 font-medium">Viewing order details</p>
                </div>
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-12">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 md:gap-8 items-start">
                 {/* Content logic here (omitted for brevity in template, will assume full component) */}
                 {/* ...Rest of components like Status, Financials, etc. using the defined order, editForm, etc... */}
              </div>
            </main>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
