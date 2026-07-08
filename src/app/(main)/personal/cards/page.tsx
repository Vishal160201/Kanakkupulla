"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { toast } from "sonner";
import { Plus, Minus, AlertCircle, CreditCard, Timer, Edit2, Trash2 } from "lucide-react";
import styles from './cards.module.css';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const SWATCH_COLORS = ['#1a56db', '#7c3aed', '#16a34a', '#ef4444', '#f59e0b', '#0f172a'];
const NETWORKS = [
  { label: 'Visa', value: 'Visa' },
  { label: 'Mastercard', value: 'Mastercard' },
  { label: 'RuPay', value: 'RuPay' },
  { label: 'Amex', value: 'Amex' }
];

const RealisticCard = ({ card, isActive = true, onEdit, onDelete, isBusy = false }: { card: any, isActive?: boolean, onEdit?: () => void, onDelete?: () => void, isBusy?: boolean }) => {
  const color = card.color || '#1a56db';
  const [showActions, setShowActions] = useState(false);
  
  return (
    <div 
      className={`relative w-full aspect-[1.586/1] rounded-[20px] group transition-all duration-300 ease-out cursor-pointer`}
      onClick={() => setShowActions(!showActions)}
      style={{ 
        transform: isActive ? 'scale(1.03) translateY(-4px)' : 'scale(0.97)',
        opacity: isActive ? 1 : 0.85,
        boxShadow: isActive ? '0 12px 30px rgba(0,0,0,0.15)' : 'none'
      }}
    >
      <div 
        className="w-full h-full relative rounded-[20px] border border-white/10 overflow-hidden"
        style={{ 
          background: `color-mix(in srgb, ${color} 60%, black)`
        }}
      >
        <div className="absolute inset-0 w-full h-full p-6 flex flex-col justify-between">
          {/* Subtle wave overlay */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)' }}></div>
          
          <div className="relative z-10 flex justify-between items-start">
            <span className="text-white font-bold text-lg tracking-wide">{card.bank}</span>
            <div className="flex gap-2 items-center">
              {(onEdit || onDelete) && (
                <div className={`transition-opacity flex items-center gap-1.5 mr-2 ${showActions ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}`}>
                  {onEdit && <button disabled={isBusy} onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-white/60 hover:text-white transition-colors bg-black/20 p-1.5 rounded-md disabled:opacity-50"><Edit2 size={14} /></button>}
                  {onDelete && <button disabled={isBusy} onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-white/60 hover:text-rose-400 transition-colors bg-black/20 p-1.5 rounded-md disabled:opacity-50"><Trash2 size={14} /></button>}
                </div>
              )}
              <span className="text-white/90 italic font-bold text-sm tracking-wide">{card.network}</span>
            </div>
          </div>

          <div className="relative z-10 my-auto ml-1 opacity-90 flex justify-between items-end">
            <svg width="40" height="30" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="30" rx="4" fill="#eab308"/>
              <path d="M0 10h40M0 20h40M15 0v30M25 0v30" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
            </svg>
            
            <div className="flex flex-col items-end mr-2">
              <span className="text-white/40 text-[9px] font-bold tracking-widest uppercase">CVV</span>
              <span className="text-white/90 font-mono text-sm tracking-wider">{card.cvv}</span>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-2">
            <div className="text-white font-mono text-xl tracking-[0.15em] drop-shadow-sm min-h-[28px]">
              {card.lastFour ? `••••  ••••  ••••  ${card.lastFour}` : ''}
            </div>
            <div className="flex justify-between items-end min-h-[20px]">
              <div className="text-white/70 text-sm uppercase tracking-wider font-semibold">
                {card.name}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-white/40 text-[9px] font-bold tracking-widest uppercase">Valid Thru</span>
                <span className="text-white/90 font-mono text-sm tracking-wider">{card.expiryDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PersonalCardsPage() {
  const { data: cardsRaw, mutate, isLoading } = useSWR('/api/personal/cards', fetcher);
  const cards = cardsRaw === undefined ? undefined : (Array.isArray(cardsRaw) ? cardsRaw : (cardsRaw?.cards ?? cardsRaw?.data ?? []));
  
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    
    // Find the first card element to get its width (including gap)
    const cardElement = container.querySelector('.card-item') as HTMLElement;
    if (!cardElement) return;
    
    // The total width of a card item plus the gap (which is 1rem = 16px here)
    const cardWidth = cardElement.offsetWidth + 16;
    
    const index = Math.round(container.scrollLeft / cardWidth);
    
    // Only update if it actually changed to avoid re-renders
    if (cards && index >= 0 && index < cards.length) {
      setActiveCardIndex(index);
    }
  }, [cards]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 150);
    };

    container.addEventListener('scroll', debouncedScroll);
    return () => {
      container.removeEventListener('scroll', debouncedScroll);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);

  const activeCard = cards?.[activeCardIndex];
  const { data: summary, mutate: mutateSummary } = useSWR(activeCard ? `/api/personal/summary?cardId=${activeCard.id}` : null, fetcher);
  const { data: emisRaw } = useSWR('/api/personal/emis', fetcher);
  const emis = emisRaw === undefined ? undefined : (Array.isArray(emisRaw) ? emisRaw : (emisRaw?.emis ?? emisRaw?.data ?? []));
  const activeEmis = emis?.filter((e: any) => e.cardId === activeCard?.id);

  const { mutate: globalMutate } = useSWRConfig();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', bank: '', network: 'Visa', lastFour: '', type: 'CREDIT', billingDate: '', dueDate: '', creditLimit: '', manualBalance: '', color: SWATCH_COLORS[0], cvv: '', expiryDate: '', balance: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [manualLimit, setManualLimit] = useState("");
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const limitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingLimit && limitInputRef.current) {
      limitInputRef.current.focus();
    }
  }, [isEditingLimit]);

  const handleEdit = (card: any) => {
    setEditId(card.id);
    setFormData({
      name: card.name || '',
      bank: card.bank || '',
      network: card.network || 'Visa',
      lastFour: card.lastFour || '',
      type: card.type || 'CREDIT',
      billingDate: card.billingDate?.toString() || '',
      dueDate: card.dueDate?.toString() || '',
      creditLimit: card.type === 'CREDIT' ? (card.creditLimit?.toString() || '') : (card.manualBalance?.toString() || ''),
      manualBalance: card.manualBalance?.toString() || '',
      balance: card.balance?.toString() || '',
      color: card.color || SWATCH_COLORS[0],
      cvv: card.cvv || '',
      expiryDate: card.expiryDate || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    setIsSubmitting(true);
    try {
      mutate(cards?.filter((c: any) => c.id !== id), { revalidate: false });
      const res = await fetch(`/api/personal/cards/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Card deleted');
      mutate();
      globalMutate('/api/personal/cards');
    } catch (e) {
      toast.error('Failed to delete');
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
    }
    setFormData({...formData, expiryDate: val});
  };

  const handleTypeChange = (newType: 'CREDIT' | 'DEBIT') => {
    if (newType === formData.type) return;
    setFormData({
      ...formData,
      type: newType,
      ...(newType === 'DEBIT' ? {
        billingDate: '',
        dueDate: '',
        creditLimit: '',
        balance: ''
      } : {})
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = { ...formData };
      const url = editId ? `/api/personal/cards/${editId}` : '/api/personal/cards';
      const method = editId ? 'PATCH' : 'POST';
      
      const optimisticCard = { ...payload, id: editId || 'temp-id' };
      if (editId) {
        mutate(cards?.map((c: any) => c.id === editId ? { ...c, ...optimisticCard } : c), { revalidate: false });
      } else {
        mutate([optimisticCard, ...(cards || [])], { revalidate: false });
      }
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(editId ? "Card updated!" : "Card added!");
      setFormData({ name: '', bank: '', network: 'Visa', lastFour: '', type: 'CREDIT', billingDate: '', dueDate: '', creditLimit: '', manualBalance: '', color: SWATCH_COLORS[0], cvv: '', expiryDate: '', balance: '' });
      setEditId(null);
      setIsFormOpen(false);
      mutate();
      globalMutate('/api/personal/cards');
    } catch (error) {
      toast.error("Failed to save card");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLimitSave = async () => {
    if (!activeCard) return;
    setIsEditingLimit(false);
    
    const isCredit = activeCard.type === 'CREDIT';
    const fieldName = isCredit ? 'creditLimit' : 'manualBalance';
    const currentValue = activeCard[fieldName];

    if (manualLimit && parseFloat(manualLimit) !== currentValue) {
      try {
        await fetch(`/api/personal/cards/${activeCard.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [fieldName]: manualLimit })
        });
        mutate();
        toast.success("Balance updated");
      } catch(e) { toast.error("Update failed") }
    }
  }

  let dueDateAlert = false;
  let nextDueDate = null;
  if (activeCard?.dueDate) {
    const now = new Date();
    nextDueDate = new Date(now.getFullYear(), now.getMonth(), activeCard.dueDate);
    if (now.getDate() > activeCard.dueDate) {
      nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, activeCard.dueDate);
    }
    const diffDays = (nextDueDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    if (diffDays >= 0 && diffDays <= 5) dueDateAlert = true;
  }

  const spendAmount = summary?.totalSpentCycle || 0;
  
  // Calculate limit or balance
  const limitValue = activeCard?.type === 'CREDIT' ? activeCard.creditLimit : activeCard?.manualBalance;
  const availableLimit = activeCard?.type === 'CREDIT' && limitValue ? limitValue - spendAmount : limitValue;
  const isLowLimit = activeCard?.type === 'CREDIT' && availableLimit !== null && limitValue > 0 && (availableLimit / limitValue) < 0.2;

  // Empty state handling
  if (!isLoading && (!cards || cards.length === 0)) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">My Cards</h2>
        </div>
        
        {isFormOpen && (
          <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col gap-6 mb-4 animate-[fadeSlideUp_300ms_ease-out]">
            <div className="w-full max-w-sm mx-auto animate-[scaleIn_300ms_ease-out]">
              <RealisticCard card={formData} />
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Form fields same as below, abstracted slightly for readability if needed, but duplicating is fine for page */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Bank Name</label>
                  <input required value={formData.bank} onChange={e => setFormData({...formData, bank: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. HDFC" />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Card Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. Millennia" />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Last 4 Digits</label>
                  <input required maxLength={4} pattern="[0-9]{4}" value={formData.lastFour} onChange={e => setFormData({...formData, lastFour: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. 1234" />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-1 z-40">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Network</label>
                  <div className="h-[42px]">
                    <CustomDropdown options={NETWORKS} value={formData.network} onChange={val => setFormData({...formData, network: val as string})} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Type</label>
                  <div className="flex bg-slate-100 rounded-lg p-1 h-[42px]">
                    <button type="button" onClick={() => handleTypeChange('CREDIT')} className={`flex-1 rounded-md text-xs font-bold transition-all ${formData.type === 'CREDIT' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Credit</button>
                    <button type="button" onClick={() => handleTypeChange('DEBIT')} className={`flex-1 rounded-md text-xs font-bold transition-all ${formData.type === 'DEBIT' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Debit</button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">CVV</label>
                  <input maxLength={4} value={formData.cvv} onChange={e => setFormData({...formData, cvv: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. 123" />
                </div>
                
                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Expiry Date</label>
                  <input maxLength={5} value={formData.expiryDate} onChange={handleExpiryChange} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="MM/YY" />
                </div>
                
                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Current Bal</label>
                  <input type="number" value={formData.manualBalance} onChange={e => setFormData({...formData, manualBalance: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0.00" />
                </div>
                
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Color Theme</label>
                  <div className="flex items-center gap-2 h-[42px]">
                    {SWATCH_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({...formData, color: c})}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${formData.color === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      >
                      </button>
                    ))}
                  </div>
                </div>

                {formData.type === 'CREDIT' && (
                  <>
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Credit Limit</label>
                      <input type="number" value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0.00" />
                    </div>
                    
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Billing Date (1-31)</label>
                      <input type="number" min="1" max="31" value={formData.billingDate} onChange={e => setFormData({...formData, billingDate: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="12" />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Due Date (1-31)</label>
                      <input type="number" min="1" max="31" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="2" />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-slate-200 transition-colors">Cancel</button>
                <button disabled={isSubmitting} type="submit" className="bg-slate-900 text-white px-8 py-2.5 rounded-full font-bold text-sm shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:bg-slate-800 transition-transform active:scale-95 disabled:opacity-50">
                  {isSubmitting ? "Adding..." : "Add Card"}
                </button>
              </div>
            </form>
          </div>
        )}

        {!isFormOpen && (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-[rgba(0,0,0,0.06)] rounded-[20px] shadow-sm">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <CreditCard size={32} strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Add your first card</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm text-center">Track your credit card limits, due dates, and debit card balances efficiently.</p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-orange-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-[0_2px_8px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(249,115,22,0.4)] transition-all flex items-center gap-2"
            >
              <Plus size={18} strokeWidth={3} /> Add Card
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">My Cards</h2>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-[0_2px_8px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(249,115,22,0.4)] transition-all flex items-center gap-2"
        >
          {isFormOpen ? <Minus size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
          {isFormOpen ? "Close" : "Add Card"}
        </button>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFormOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col gap-6 mb-4">
          <div className="w-full max-w-sm mx-auto animate-[scaleIn_300ms_ease-out]">
            <RealisticCard card={formData} />
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Bank Name</label>
                <input required value={formData.bank} onChange={e => setFormData({...formData, bank: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. HDFC" />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Card Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. Millennia" />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Last 4 Digits</label>
                <input required maxLength={4} pattern="[0-9]{4}" value={formData.lastFour} onChange={e => setFormData({...formData, lastFour: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. 1234" />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-1 z-40">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Network</label>
                <div className="h-[42px]">
                  <CustomDropdown options={NETWORKS} value={formData.network} onChange={val => setFormData({...formData, network: val as string})} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Type</label>
                <div className="flex bg-slate-100 rounded-lg p-1 h-[42px]">
                  <button type="button" onClick={() => handleTypeChange('CREDIT')} className={`flex-1 rounded-md text-xs font-bold transition-all ${formData.type === 'CREDIT' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Credit</button>
                  <button type="button" onClick={() => handleTypeChange('DEBIT')} className={`flex-1 rounded-md text-xs font-bold transition-all ${formData.type === 'DEBIT' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Debit</button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">CVV</label>
                <input maxLength={4} value={formData.cvv} onChange={e => setFormData({...formData, cvv: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. 123" />
              </div>
              
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Expiry Date</label>
                <input maxLength={5} value={formData.expiryDate} onChange={handleExpiryChange} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="MM/YY" />
              </div>
              
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Current Bal</label>
                <input type="number" value={formData.manualBalance} onChange={e => setFormData({...formData, manualBalance: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0.00" />
              </div>
              
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Color Theme</label>
                <div className="flex items-center gap-2 h-[42px]">
                  {SWATCH_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({...formData, color: c})}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${formData.color === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    >
                    </button>
                  ))}
                </div>
              </div>

              {formData.type === 'CREDIT' && (
                <>
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Credit Limit</label>
                    <input type="number" value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0.00" />
                  </div>
                  
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Billing Date (1-31)</label>
                    <input type="number" min="1" max="31" value={formData.billingDate} onChange={e => setFormData({...formData, billingDate: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="12" />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Due Date (1-31)</label>
                    <input type="number" min="1" max="31" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="h-[42px] px-3 border border-[rgba(0,0,0,0.1)] rounded-[10px] text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="2" />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end mt-2">
              <button disabled={isSubmitting} type="submit" className="bg-slate-900 text-white px-8 py-2.5 rounded-full font-bold text-sm shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:bg-slate-800 transition-transform active:scale-95 disabled:opacity-50">
                {isSubmitting ? "Adding..." : "Add Card"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-[10px] uppercase tracking-widest font-semibold text-slate-400">Loading cards...</div>
      ) : (
        <>
          {/* Carousel */}
          <div 
            ref={carouselRef}
            className={`flex overflow-x-auto ${styles.hideScrollbar} snap-x snap-mandatory gap-4 py-4 -mx-4 px-4 sm:mx-0 sm:px-0`}
            style={{ scrollBehavior: 'smooth' }}
          >
            {cards?.map((card: any, index: number) => (
              <div 
                key={card.id} 
                className={`${styles.cardItem} card-item flex-shrink-0 snap-center w-[85%] max-w-[320px] transition-all duration-300 cursor-pointer`}
                style={{ animationDelay: `${index * 80}ms` }}
                onClick={(e) => {
                  setActiveCardIndex(index);
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
              >
                <RealisticCard card={card} isActive={index === activeCardIndex} onEdit={() => handleEdit(card)} onDelete={() => handleDelete(card.id)} />
              </div>
            ))}
            {/* Spacer for right edge so last card can be centered */}
            <div className="flex-shrink-0 w-[15%] snap-center"></div>
          </div>

          {/* Spends Summary */}
          {activeCard && (
            <div className={`${styles.spendSummary} bg-white border border-[rgba(0,0,0,0.06)] rounded-[20px] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 tracking-tight">Summary & Spends</h3>
                {dueDateAlert && nextDueDate && (
                  <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 border border-orange-200">
                    <AlertCircle size={12} strokeWidth={3} /> Due {nextDueDate.toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Statement Cycle</span>
                  <span className="text-sm font-semibold text-slate-700">
                    {summary?.statementStart ? new Date(summary.statementStart).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'N/A'} - {summary?.statementEnd ? new Date(summary.statementEnd).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'N/A'}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spends this cycle</span>
                  <span className="text-lg font-bold text-rose-500 tabular-nums font-mono">
                    ₹{spendAmount.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {activeCard.type === 'CREDIT' ? 'Available Limit' : 'Current Balance'}
                  </span>
                  
                  {isEditingLimit ? (
                    <input 
                      ref={limitInputRef}
                      type="number" 
                      value={manualLimit} 
                      onChange={e => setManualLimit(e.target.value)}
                      onBlur={handleLimitSave}
                      onKeyDown={(e) => e.key === 'Enter' && handleLimitSave()}
                      className="h-8 px-2 border-b-2 border-orange-500 bg-orange-50 text-orange-600 font-bold tabular-nums font-mono focus:outline-none w-32" 
                    />
                  ) : (
                    <span 
                      onClick={() => { setManualLimit(limitValue?.toString() || ""); setIsEditingLimit(true); }}
                      className={`text-lg font-bold tabular-nums font-mono cursor-text border-b border-dashed ${isLowLimit ? 'text-rose-600 border-rose-300' : 'text-slate-900 border-slate-300'}`}
                    >
                      {limitValue ? `₹${(availableLimit !== null ? availableLimit : limitValue).toLocaleString()}` : 'Set Limit'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Linked EMIs */}
          <div className={`${styles.emisSection} flex flex-col gap-3`}>
            <h3 className="font-bold text-slate-900 tracking-tight text-sm px-1">Linked EMIs</h3>
            
            {activeEmis && activeEmis.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeEmis.map((emi: any) => (
                  <div key={emi.id} className="bg-white border border-[rgba(0,0,0,0.06)] rounded-[16px] p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800 text-sm">{emi.title}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{emi.paidMonths}/{emi.totalMonths} Months</span>
                      </div>
                      <span className="text-orange-500 font-bold tabular-nums font-mono text-sm">₹{emi.emiAmount.toLocaleString()}/mo</span>
                    </div>
                    
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 rounded-full transition-all duration-600 ease-out"
                        style={{ width: `${(emi.paidMonths / emi.totalMonths) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="text-[10px] font-semibold text-slate-500">
                      Next Due: {emi.nextDueDate ? new Date(emi.nextDueDate).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50/50 border border-slate-100 rounded-[16px] flex flex-col items-center justify-center py-6 gap-2">
                <Timer size={24} strokeWidth={1.5} className="text-slate-300" />
                <span className="text-slate-400 text-sm font-semibold">No EMIs linked to this card</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
