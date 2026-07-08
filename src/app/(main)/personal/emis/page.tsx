"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { toast } from "sonner";
import { CheckCircle, Trash2, Plus, AlertCircle, X, Calendar, Edit3, IndianRupee, RefreshCw, CalendarDays, CreditCard, Save } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const EMIFieldWrapper = ({ label, icon: Icon, color, children, required }: any) => {
  const colorClasses = {
    purple: "border-purple-200 focus-within:ring-purple-500",
    green: "border-green-200 focus-within:ring-green-500",
    blue: "border-blue-200 focus-within:ring-blue-500",
    orange: "border-orange-200 focus-within:ring-orange-500",
    pink: "border-pink-200 focus-within:ring-pink-500",
    teal: "border-teal-200 focus-within:ring-teal-500",
  };
  const iconBgClasses = {
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-500",
    orange: "bg-orange-100 text-orange-500",
    pink: "bg-pink-100 text-pink-500",
    teal: "bg-teal-100 text-teal-500",
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-slate-700 tracking-wider uppercase">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className={`relative flex items-center p-1.5 border ${colorClasses[color as keyof typeof colorClasses]} rounded-[14px] focus-within:ring-2 transition-all bg-white`}>
        <div className={`w-10 h-10 rounded-xl ${iconBgClasses[color as keyof typeof iconBgClasses]} flex items-center justify-center shrink-0`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 flex items-center h-[40px] w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function PersonalEMIsPage() {
  const { data: emisRaw, mutate, isLoading } = useSWR('/api/personal/emis', fetcher);
  const emis = emisRaw === undefined ? undefined : (Array.isArray(emisRaw) ? emisRaw : (emisRaw?.emis ?? emisRaw?.data ?? []));
  const { data: cardsRaw } = useSWR('/api/personal/cards', fetcher);
  const cards = cardsRaw === undefined ? undefined : (Array.isArray(cardsRaw) ? cardsRaw : (cardsRaw?.cards ?? cardsRaw?.data ?? []));

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '', totalAmount: '', emiAmount: '', totalMonths: '', startDate: new Date().toISOString().split('T')[0], cardId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/personal/emis/${id}`, { method: 'DELETE' });
      toast.success("EMI deleted!");
      setDeletingId(null);
      mutate();
    } catch (e) {
      toast.error("Failed to delete EMI");
    }
  };

  const cardOptions = useMemo(() => {
    const list = [{ label: 'None (Cash/Direct)', value: '' }];
    if (cards) {
      cards.forEach((c: any) => {
        list.push({ label: `${c.bank} - ${c.name}`, value: c.id });
      });
    }
    return list;
  }, [cards]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editId ? `/api/personal/emis/${editId}` : '/api/personal/emis';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(editId ? "EMI updated!" : "EMI added!");
      setFormData({ title: '', totalAmount: '', emiAmount: '', totalMonths: '', startDate: new Date().toISOString().split('T')[0], cardId: '' });
      setEditId(null);
      setIsFormOpen(false);
      mutate();
    } catch (error) {
      toast.error(editId ? "Failed to update EMI" : "Failed to add EMI");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (emi: any) => {
    setFormData({
      title: emi.title,
      totalAmount: emi.totalAmount.toString(),
      emiAmount: emi.emiAmount.toString(),
      totalMonths: emi.totalMonths.toString(),
      startDate: new Date(emi.startDate).toISOString().split('T')[0],
      cardId: emi.cardId || ''
    });
    setEditId(emi.id);
    setIsFormOpen(true);
  };

  const handleMarkPaid = async (id: string) => {
    setMarkingPaidId(id);
    try {
      const res = await fetch(`/api/personal/emis/${id}`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markPaid' })
      });
      if (!res.ok) throw new Error("Failed to mark paid");
      toast.success("EMI Marked as Paid!");
      mutate();
    } catch (e) {
      toast.error("Failed to mark EMI as paid");
    } finally {
      setMarkingPaidId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-[scaleIn_300ms_ease-out]">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">My EMIs</h2>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-orange-500 text-white px-4 py-2 rounded-[12px] font-bold text-sm shadow-[0_2px_8px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(249,115,22,0.4)] transition-all flex items-center gap-2"
        >
          <Plus size={16} strokeWidth={3} />
          Add EMI
        </button>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => { setIsFormOpen(false); setEditId(null); setFormData({ title: '', totalAmount: '', emiAmount: '', totalMonths: '', startDate: new Date().toISOString().split('T')[0], cardId: '' }); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="relative w-full max-w-2xl bg-white rounded-[24px] shadow-2xl overflow-visible"
            >
              <div className="flex items-center justify-between p-6 pb-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                    <Calendar size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{editId ? "Edit EMI" : "Add New EMI"}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{editId ? "Update your EMI details" : "Create a new EMI to track your payments"}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setIsFormOpen(false); setEditId(null); setFormData({ title: '', totalAmount: '', emiAmount: '', totalMonths: '', startDate: new Date().toISOString().split('T')[0], cardId: '' }); }} className="w-10 h-10 flex items-center justify-center bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-slate-100 text-purple-600 hover:bg-slate-50 rounded-full transition-colors self-start">
                  <X size={18} strokeWidth={3} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
                  <EMIFieldWrapper label="EMI TITLE" icon={Edit3} color="purple" required>
                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full h-full bg-transparent border-none outline-none px-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400" placeholder="e.g. Car Loan" />
                  </EMIFieldWrapper>
                  
                  <EMIFieldWrapper label="TOTAL AMOUNT (₹)" icon={IndianRupee} color="green" required>
                    <input required type="number" step="0.01" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} className="w-full h-full bg-transparent border-none outline-none px-3 text-[13px] font-semibold tabular-nums text-slate-700 placeholder:text-slate-400" placeholder="0.00" />
                  </EMIFieldWrapper>
                  
                  <EMIFieldWrapper label="MONTHLY EMI (₹)" icon={RefreshCw} color="blue" required>
                    <input required type="number" step="0.01" value={formData.emiAmount} onChange={e => setFormData({...formData, emiAmount: e.target.value})} className="w-full h-full bg-transparent border-none outline-none px-3 text-[13px] font-semibold tabular-nums text-slate-700 placeholder:text-slate-400" placeholder="0.00" />
                  </EMIFieldWrapper>
                  
                  <EMIFieldWrapper label="TOTAL MONTHS" icon={CalendarDays} color="orange" required>
                    <input required type="number" min="1" value={formData.totalMonths} onChange={e => setFormData({...formData, totalMonths: e.target.value})} className="w-full h-full bg-transparent border-none outline-none px-3 text-[13px] font-semibold tabular-nums text-slate-700 placeholder:text-slate-400" placeholder="e.g. 12" />
                  </EMIFieldWrapper>
                  
                  <div className="z-30 relative">
                    <EMIFieldWrapper label="START DATE" icon={Calendar} color="pink" required>
                      <DatePickerInput value={formData.startDate} onChange={val => setFormData({...formData, startDate: val as string})} className="flex h-[40px] w-full items-center justify-between bg-transparent border-none outline-none px-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 cursor-pointer" />
                    </EMIFieldWrapper>
                  </div>
                  
                  <div className="z-20 relative">
                    <EMIFieldWrapper label="LINKED CARD" icon={CreditCard} color="teal">
                      <CustomDropdown options={cardOptions} value={formData.cardId} onChange={val => setFormData({...formData, cardId: val as string})} className="flex h-[40px] w-full items-center justify-between bg-transparent border-none outline-none px-3 text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 cursor-pointer" />
                    </EMIFieldWrapper>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-2.5 rounded-[12px] font-bold text-sm text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button disabled={isSubmitting} type="submit" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2.5 rounded-[12px] font-bold text-sm shadow-[0_4px_14px_rgba(168,85,247,0.4)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.5)] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                    <Save size={16} strokeWidth={2.5} /> {isSubmitting ? "Saving..." : "Save EMI"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-10 text-center text-[10px] uppercase tracking-widest font-semibold text-slate-400">Loading...</div>
        ) : emis?.length > 0 ? (
          emis.map((emi: any, index: number) => {
            const progress = (emi.paidMonths / emi.totalMonths) * 100;
            const isCompleted = emi.status === 'COMPLETED';
            return (
              <div 
                key={emi.id} 
                className={`bg-white border ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'border-[rgba(0,0,0,0.06)]'} rounded-[16px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition-all duration-200 ease-out flex flex-col justify-between relative overflow-hidden`}
                style={{ animation: `slideUp 400ms ease forwards ${index * 50}ms`, opacity: 0 }}
              >
                {/* Progress bar background */}
                <div className="absolute bottom-0 left-0 h-1.5 bg-orange-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-100 -z-10" />

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold tracking-tight text-slate-900 text-lg">{emi.title}</h3>
                    <p className="text-[13px] font-semibold text-slate-500 tabular-nums">₹{emi.emiAmount.toLocaleString()} / mo</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {deletingId === emi.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-md">
                        <span className="text-[10px] font-bold text-rose-600 px-1 hidden sm:inline uppercase tracking-widest">Delete?</span>
                        <button onClick={() => handleDelete(emi.id)} className="bg-rose-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">No</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(emi)} className="text-slate-300 hover:text-blue-500 transition-colors p-1">
                          <Edit3 size={16} strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setDeletingId(emi.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                    {isCompleted ? (
                      <div className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                        <CheckCircle size={14} strokeWidth={2.5} /> Completed
                      </div>
                    ) : (
                      <div className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-bold tabular-nums">
                        {emi.paidMonths} / {emi.totalMonths} Paid
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Next Due</span>
                    <span className={`text-[13px] font-semibold tabular-nums ${isCompleted ? 'text-slate-400' : 'text-slate-800'}`}>
                      {isCompleted ? '-' : new Date(emi.nextDueDate).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {!isCompleted && (
                    <button
                      onClick={() => handleMarkPaid(emi.id)}
                      disabled={markingPaidId === emi.id}
                      className="bg-orange-50 text-orange-600 hover:bg-orange-100 px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-1 shadow-sm border border-orange-100"
                    >
                      <CheckCircle size={14} strokeWidth={2.5} />
                      {markingPaidId === emi.id ? "Marking..." : "Mark Paid"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold bg-white rounded-[16px] border border-gray-200 border-dashed flex flex-col items-center justify-center gap-2">
            <AlertCircle size={24} strokeWidth={2} className="text-slate-300" />
            <span className="text-[13px]">No EMIs added yet.</span>
          </div>
        )}
      </div>


    </div>
  );
}
