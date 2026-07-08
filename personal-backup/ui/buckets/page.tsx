"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Layers, Target, Wallet, TrendingDown, MoreHorizontal, CalendarClock, Clock, Plus, History, CheckCircle2, PiggyBank, Shield, Gift, ShoppingCart, User, Wind, Home, Car, Plane, Book, Heart, Star, ChevronLeft, ChevronRight, X, Trash2, Tag, CreditCard, Calendar, ArrowUpRight, ArrowDownLeft, Archive } from "lucide-react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import styles from "./buckets.module.css";

const fetcher = (url: string) => fetch(url).then(res => res.json());
const formatINR = (val: number) => "₹" + val.toLocaleString('en-IN');
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ICON_MAP: Record<string, any> = { Wallet, Shield, Gift, ShoppingCart, User, Wind, Home, Car, Plane, Book, Heart, Star };
const SWATCHES = ['#6366f1','#ef4444','#f97316','#16a34a','#0ea5e9','#8b5cf6','#f59e0b','#0f172a'];

export default function BucketsPage() {
  const { data: bucketsData, mutate: mutateBuckets } = useSWR('/api/personal/buckets', fetcher);
  const [showArchived, setShowArchived] = useState(false);
  const { data: archivedData } = useSWR(showArchived ? '/api/personal/buckets?archived=true' : null, fetcher);
  const { data: summaryData, mutate: mutateSummary } = useSWR('/api/personal/buckets/summary', fetcher);
  const { data: cardsData } = useSWR('/api/personal/cards', fetcher);

  const buckets = Array.isArray(bucketsData?.buckets) ? bucketsData.buckets : [];
  const archivedBuckets = Array.isArray(archivedData?.buckets) ? archivedData.buckets : [];
  const cards = Array.isArray(cardsData?.cards) ? cardsData.cards : (Array.isArray(cardsData) ? cardsData : []);
  const kvbCard = cards.find((c: any) => c.bank.toLowerCase().includes('kvb'));

  const isSeeding = useRef(false);
  useEffect(() => {
    if (bucketsData && buckets.length === 0 && !isSeeding.current) {
      isSeeding.current = true;
      fetch('/api/personal/buckets/seed', { method: 'POST' }).then(() => {
        mutateBuckets();
        mutateSummary();
      });
    }
  }, [bucketsData, buckets.length, mutateBuckets, mutateSummary]);

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const [initialCardId, setInitialCardId] = useState("");

  const handleOpenAddForm = (cardId = "") => {
    setInitialCardId(cardId);
    setIsAddFormOpen(true);
  };

  const activeCard = activeTab !== "ALL" ? cards.find((c: any) => c.id === activeTab) : null;
  const activeBuckets = activeTab === "ALL" ? buckets : buckets.filter((b: any) => b.linkedCardId === activeTab);
  const unlinkedBuckets = activeTab !== "ALL" ? buckets.filter((b: any) => !b.linkedCardId) : [];
  
  const calcStats = () => {
    if (activeTab === "ALL") {
      return {
        totalAllocated: summaryData?.totalAllocated || 0,
        totalTarget: summaryData?.totalTarget || 0,
        freeBalance: summaryData?.freeBalance || 0,
        monthlyOutflow: summaryData?.monthlyOutflow || 0
      };
    } else {
      if (!activeCard) return { totalAllocated: 0, totalTarget: 0, freeBalance: 0, monthlyOutflow: 0 };
      const allocated = activeBuckets.reduce((sum: number, b: any) => sum + (b.savedAmount || 0), 0);
      const target = activeBuckets.reduce((sum: number, b: any) => sum + (b.targetAmount || 0), 0);
      const outflow = activeBuckets.reduce((sum: number, b: any) => sum + (b.monthlyContribution || 0), 0);
      const free = Math.max((activeCard.manualBalance || 0) - allocated, 0);
      return { totalAllocated: allocated, totalTarget: target, freeBalance: free, monthlyOutflow: outflow };
    }
  };
  const stats = calcStats();

  const renderGroupedBuckets = () => {
    const grouped = buckets.reduce((acc: any, b: any) => {
      const key = b.linkedCardId || "UNLINKED";
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    }, {});

    const groups = [];
    cards.forEach((c: any, index: number) => {
      const cardBuckets = grouped[c.id] || [];
      if (cardBuckets.length > 0) {
        groups.push(
          <div key={c.id} className={`${styles.fadeIn} mb-8`} style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {c.bank} ••••{c.lastFour}
              </h3>
            </div>
            <CardAllocationBar card={c} buckets={cardBuckets} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              {cardBuckets.map((bucket: any, idx: number) => (
                <BucketCard key={bucket.id} bucket={bucket} idx={idx} cards={cards} onUpdate={() => { mutateBuckets(); mutateSummary(); }} />
              ))}
            </div>
            <div className="h-px bg-slate-100 w-full mt-8" />
          </div>
        );
      }
    });

    if (grouped["UNLINKED"] && grouped["UNLINKED"].length > 0) {
      groups.push(
        <div key="UNLINKED" className={`${styles.fadeIn} mb-8`} style={{ animationDelay: `${cards.length * 50}ms` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">No Card Linked</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            {grouped["UNLINKED"].map((bucket: any, idx: number) => (
              <BucketCard key={bucket.id} bucket={bucket} idx={idx} cards={cards} onUpdate={() => { mutateBuckets(); mutateSummary(); }} />
            ))}
          </div>
        </div>
      );
    }
    return groups;
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Buckets</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowArchived(!showArchived)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95 ${showArchived ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}`}>
            <Archive size={18} /> <span className="hidden sm:inline">Show Archived</span>
          </button>
          <button 
            onClick={() => handleOpenAddForm(activeTab !== "ALL" ? activeTab : "")}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95"
          >
            {isAddFormOpen ? <X size={18} /> : <Plus size={18} />} {isAddFormOpen ? "Close" : "Add Bucket"}
          </button>
        </div>
      </div>
      
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hideScrollbar">
        <button 
          onClick={() => setActiveTab("ALL")}
          className={`shrink-0 snap-start px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${styles.tabSlideIn} ${activeTab === "ALL" ? 'bg-white text-orange-500 shadow-[0_2px_10px_rgba(0,0,0,0.06)]' : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
          style={{ animationDelay: '0ms' }}
        >
          All
        </button>
        {cards.map((c: any, i: number) => (
          <button 
            key={c.id}
            onClick={() => setActiveTab(c.id)}
            className={`shrink-0 snap-start px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${styles.tabSlideIn} ${activeTab === c.id ? 'bg-white text-orange-500 shadow-[0_2px_10px_rgba(0,0,0,0.06)]' : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
            style={{ animationDelay: `${(i + 1) * 50}ms` }}
          >
            {c.bank} ••••{c.lastFour}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === c.id ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-600'}`}>{c.type}</span>
          </button>
        ))}
      </div>

      <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl p-0 max-h-[90vh] overflow-y-auto hideScrollbar border-0 bg-transparent shadow-none [&>button]:hidden">
          <DialogTitle className="sr-only">Add Bucket</DialogTitle>
          <BucketForm cards={cards} initialLinkedCardId={initialCardId} onSuccess={() => { setIsAddFormOpen(false); mutateBuckets(); mutateSummary(); }} onCancel={() => setIsAddFormOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {activeCard && (
        <div className={`flex flex-col sm:flex-row items-center gap-6 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-2 ${styles.scaleIn}`}>
          <div className="w-[140px] h-[80px] shrink-0 rounded-[12px] relative overflow-hidden shadow-sm" style={{ backgroundColor: activeCard.color || '#1a56db' }}>
            <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-bl-full" />
            <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)' }}></div>
            <div className="absolute top-2 left-3 text-white font-bold text-xs tracking-wide">{activeCard.bank}</div>
            <div className="absolute top-2 right-3 text-white/90 italic font-bold text-[10px] tracking-wide">{activeCard.network}</div>
            <div className="absolute bottom-2 right-3 text-white font-mono text-sm tracking-[0.1em] drop-shadow-sm">••••{activeCard.lastFour}</div>
          </div>
          
          <div className="flex-1 flex gap-6 sm:gap-10 overflow-x-auto hideScrollbar pb-2 sm:pb-0">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Balance</span>
              <span className="text-xl font-extrabold text-slate-900 tabular-nums">{formatINR(activeCard.manualBalance || 0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Allocated</span>
              <span className="text-xl font-extrabold text-violet-600 tabular-nums">{formatINR(stats.totalAllocated)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Free</span>
              <span className="text-xl font-extrabold text-emerald-500 tabular-nums">{formatINR(stats.freeBalance)}</span>
            </div>
          </div>
        </div>
      )}
      
      {activeCard && activeBuckets.length > 0 && (
        <div className="mb-2">
          <CardAllocationBar card={activeCard} buckets={activeBuckets} />
        </div>
      )}

      <div key={activeTab} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Allocated", value: stats.totalAllocated, color: "text-violet-600", accent: "bg-violet-500", iconBg: "bg-violet-100", icon: Layers, delay: "0ms" },
          { label: "Total Target", value: stats.totalTarget, color: "text-amber-500", accent: "bg-amber-500", iconBg: "bg-amber-100", icon: Target, delay: "80ms" },
          { label: "Free Balance", value: stats.freeBalance, color: "text-emerald-500", accent: "bg-emerald-500", iconBg: "bg-emerald-100", icon: Wallet, delay: "160ms" },
          { label: "Monthly Outflow", value: stats.monthlyOutflow, color: "text-rose-500", accent: "bg-rose-500", iconBg: "bg-rose-100", icon: TrendingDown, delay: "240ms" }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:-translate-y-0.5 transition-transform relative overflow-hidden ${styles.slideUp}`} style={{ animationDelay: stat.delay }}>
              <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-md ${stat.accent}`} />
              <div className="flex flex-col justify-between pl-2">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stat.iconBg}`}>
                    <Icon size={16} className={stat.color} strokeWidth={2.5} />
                  </div>
                </div>
                <span className={`text-2xl font-bold tabular-nums tracking-tight ${stat.color}`}>
                  {formatINR(stat.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activeTab === "ALL" ? (
        <div className="mt-4">
          {renderGroupedBuckets()}
        </div>
      ) : (
        <div className="mt-4">
          {activeBuckets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-[rgba(0,0,0,0.06)] rounded-[20px] shadow-sm">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <Layers size={32} strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">No buckets linked to this card</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm text-center">Add a bucket to start tracking your allocations.</p>
              <button 
                onClick={() => handleOpenAddForm(activeTab)}
                className="bg-orange-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-[0_2px_8px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(249,115,22,0.4)] transition-all flex items-center gap-2"
              >
                <Plus size={18} strokeWidth={3} /> Add Bucket
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeBuckets.map((bucket: any, idx: number) => (
                <BucketCard key={bucket.id} bucket={bucket} idx={idx} cards={cards} onUpdate={() => { mutateBuckets(); mutateSummary(); }} />
              ))}
            </div>
          )}
          
          {unlinkedBuckets.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Unlinked</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 opacity-80">
                {unlinkedBuckets.map((bucket: any, idx: number) => (
                  <BucketCard key={bucket.id} bucket={bucket} idx={idx} cards={cards} onUpdate={() => { mutateBuckets(); mutateSummary(); }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showArchived && archivedBuckets.length > 0 && (
        <div className={`mt-8 ${styles.fadeIn}`}>
          <div className="flex items-center gap-2 mb-6 text-slate-400 font-bold">
            <Archive size={20} />
            <h2 className="text-lg">Archived Buckets</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 opacity-75">
            {archivedBuckets.map((bucket: any, idx: number) => (
              <BucketCard key={bucket.id} bucket={bucket} idx={idx} cards={cards} onUpdate={() => { mutateBuckets(); mutateSummary(); }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BucketCard({ bucket, idx, cards, onUpdate }: { bucket: any, idx: number, cards: any[], onUpdate: () => void }) {
  let BucketIcon = ICON_MAP[bucket.icon] || Wallet;
  let typeColors: any = { SAVINGS: 'bg-emerald-100 text-emerald-700', DEBT: 'bg-rose-100 text-rose-700', EMI: 'bg-blue-100 text-blue-700' };
  
  if (bucket.type === 'DEBT') {
    if (bucket.debtDirection === 'THEY_OWE') {
      typeColors.DEBT = 'bg-emerald-100 text-emerald-700';
      BucketIcon = ArrowDownLeft;
    } else {
      BucketIcon = ArrowUpRight;
    }
  }
  
  const [showMenu, setShowMenu] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  
  const pct = bucket.targetAmount > 0 ? Math.min((bucket.savedAmount / bucket.targetAmount) * 100, 100) : 0;
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    const tm = setTimeout(() => setBarWidth(pct), 100);
    return () => clearTimeout(tm);
  }, [pct]);

  const handleDelete = async () => {
    setIsDeleting(true);
    await fetch(`/api/personal/buckets/${bucket.id}`, { method: 'DELETE' });
    onUpdate();
  };

  if (isDeleting) return null;

  return (
    <div className={`bg-white border border-slate-100 rounded-[16px] p-5 shadow-sm relative ${styles.scaleIn} ${styles.cardHover}`} style={{ animationDelay: `${idx * 60}ms` }}>
      <div className="flex justify-between items-start mb-4 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: bucket.color }}>
            <BucketIcon size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{bucket.title}</h3>
            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex mt-0.5 ${typeColors[bucket.type] || 'bg-slate-100 text-slate-600'}`}>
              {bucket.type}
            </div>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400">
            <MoreHorizontal size={20} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-10 text-sm font-medium">
              <button onClick={() => { setIsEditMode(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700">Edit</button>
              <button onClick={() => { setIsDeleteConfirm(true); setShowMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-rose-600">Delete</button>
            </div>
          )}
        </div>
      </div>

      {isDeleteConfirm && (
        <div className="bg-rose-50 rounded-xl p-3 mb-4 border border-rose-100">
          <p className="text-xs text-rose-700 font-medium mb-3">Permanently deletes all payment history for this bucket.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} className="bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-rose-600">Confirm Delete</button>
            <button onClick={() => setIsDeleteConfirm(false)} className="bg-white text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      <Dialog open={isEditMode} onOpenChange={setIsEditMode}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl p-0 max-h-[90vh] overflow-y-auto hideScrollbar border-0 bg-transparent shadow-none [&>button]:hidden">
          <DialogTitle className="sr-only">Edit Bucket</DialogTitle>
          <BucketForm bucket={bucket} cards={cards} onSuccess={() => { setIsEditMode(false); onUpdate(); }} onCancel={() => setIsEditMode(false)} />
        </DialogContent>
      </Dialog>

      <div className="mb-4">
        <div className="flex justify-between text-xs font-bold mb-1.5">
          <span className="text-slate-500">
            {bucket.type === 'DEBT' ? (bucket.debtDirection === 'THEY_OWE' ? 'Received / Total Owed' : 'Paid back / Total owed') : bucket.type === 'SAVINGS' ? 'Saved / Target' : 'Paid / Total'}
          </span>
          <span className="text-slate-900">{bucket.targetAmount > 0 ? `${Math.round(pct)}%` : '—'}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, backgroundColor: bucket.color, transitionDuration: '600ms' }} />
        </div>
        <div className="flex justify-between text-sm font-extrabold mt-1">
          <span className="text-slate-900">{formatINR(bucket.savedAmount)}</span>
          <span className="text-slate-400">{bucket.targetAmount > 0 ? formatINR(bucket.targetAmount) : 'No Target'}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <CalendarClock size={16} className="text-slate-400" /> 
          <span className="text-slate-900">{formatINR(bucket.monthlyContribution)}</span> <span className="text-xs text-slate-400">/ month</span>
        </div>
        {bucket.dueDate && (
          <div className={`flex items-center gap-2 text-sm font-semibold ${new Date(bucket.dueDate) < new Date() ? 'text-rose-600' : 'text-slate-600'}`}>
            <Clock size={16} className={new Date(bucket.dueDate) < new Date() ? 'text-rose-500' : 'text-slate-400'} /> 
            Due: {new Date(bucket.dueDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {showConfetti && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-[16px]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={styles.confetti} style={{ left: `${Math.random() * 100}%`, top: `50%`, backgroundColor: ['#ef4444', '#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)], animationDelay: `${Math.random() * 0.5}s` }} />
          ))}
        </div>
      )}

      {bucket.targetAmount > 0 && bucket.savedAmount >= bucket.targetAmount ? (
        <button onClick={async () => {
          setShowConfetti(true);
          setTimeout(async () => {
            await fetch(`/api/personal/buckets/${bucket.id}/settle`, { method: 'POST' });
            onUpdate();
          }, 2000);
        }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm">
          <CheckCircle2 size={18} /> Mark as Settled
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => { setShowContribute(!showContribute); setShowHistory(false); }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${showContribute ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'}`}>
            <Plus size={16} /> {bucket.type === 'DEBT' ? (bucket.debtDirection === 'THEY_OWE' ? 'Mark Received' : 'Mark Paid') : 'Contribute'}
          </button>
          <button onClick={() => { setShowHistory(!showHistory); setShowContribute(false); }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${showHistory ? 'bg-slate-100 text-slate-900 border border-slate-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-sm'}`}>
            <History size={16} /> History
          </button>
        </div>
      )}

      <Dialog open={showContribute} onOpenChange={setShowContribute}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden">
          <DialogTitle className="sr-only">Contribute</DialogTitle>
          <ContributeForm bucket={bucket} onSuccess={() => { setShowContribute(false); onUpdate(); }} onCancel={() => setShowContribute(false)} />
        </DialogContent>
      </Dialog>

      <div className={`${styles.slideDown} ${showHistory ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
        {showHistory && <MonthGrid bucket={bucket} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}

function ContributeForm({ bucket, onSuccess, onCancel }: { bucket: any, onSuccess: () => void, onCancel?: () => void }) {
  const [form, setForm] = useState({ amount: bucket.monthlyContribution || '', month: new Date().getMonth() + 1 + "", year: new Date().getFullYear() + "", notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const months = MONTHS.map((m, i) => ({ label: m, value: i + 1 + "" }));

  const handleSubmit = async () => {
    if (!form.amount || !form.month || !form.year) return toast.error("Amount, month, year required");
    setIsSubmitting(true);
    const res = await fetch(`/api/personal/buckets/${bucket.id}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setIsSubmitting(false);
    if (res.ok) {
      toast.success("Contribution added!");
      onSuccess();
    } else {
      toast.error("Failed to contribute");
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Amount (₹)</label>
          <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg h-9 px-3 text-sm font-bold" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Month</label>
          <div className="h-9"><CustomDropdown options={months} value={form.month} onChange={v => setForm({...form, month: v as string})} /></div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Year</label>
          <input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg h-9 px-3 text-sm font-bold" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Notes</label>
        <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg h-9 px-3 text-sm font-medium" placeholder="Optional" />
      </div>
      <div className="flex gap-2 mt-1">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 bg-white text-slate-600 border border-slate-200 font-bold text-sm h-9 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
        )}
        <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm h-9 rounded-lg shadow-sm transition-colors">
          {isSubmitting ? "Saving..." : "Contribute"}
        </button>
      </div>
    </div>
  );
}

function MonthGrid({ bucket, onUpdate }: { bucket: any, onUpdate: () => void }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, mutate } = useSWR(`/api/personal/buckets/${bucket.id}/payments`, fetcher);
  const payments = data?.payments || [];
  
  const [popover, setPopover] = useState<{ month: number, rect: DOMRect, payment?: any } | null>(null);

  const getPaymentForMonth = (m: number) => payments.find((p: any) => p.month === m && p.year === year);

  const handleCellClick = (m: number, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = getPaymentForMonth(m);
    setPopover({ month: m, rect, payment: p });
  };

  const closePopover = () => setPopover(null);

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setYear(y => y-1)} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md hover:bg-slate-50"><ChevronLeft size={14} /></button>
        <span className="font-bold text-sm text-slate-700">{year}</span>
        <button onClick={() => setYear(y => y+1)} className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-md hover:bg-slate-50"><ChevronRight size={14} /></button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4 relative">
        {MONTHS.map((mName, i) => {
          const mNum = i + 1;
          const p = getPaymentForMonth(mNum);
          return (
            <div key={mNum} onClick={(e) => handleCellClick(mNum, e)} className="bg-white border border-slate-200 rounded-lg p-2 cursor-pointer hover:border-orange-400 hover:shadow-sm transition-colors flex flex-col items-center justify-center min-h-[60px] text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{mName}</span>
              {p ? (
                p.status === 'PAID' ? (
                  <div className="flex items-center gap-1 mt-1 text-emerald-600 font-extrabold text-xs">
                    <CheckCircle2 size={12} /> {formatINR(p.amount)}
                  </div>
                ) : p.status === 'NIL' ? (
                  <div className="mt-1 text-slate-400 font-bold text-xs">NIL</div>
                ) : (
                  <div className="mt-1 text-slate-300 font-bold text-xs">—</div>
                )
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-t border-slate-200 pt-3">
        <span>Total Paid: <span className="text-emerald-600">₹{payments.filter((p:any)=>p.year===year && p.status==='PAID').reduce((a:any,b:any)=>a+b.amount,0)}</span></span>
        <span>NIL: {payments.filter((p:any)=>p.year===year && p.status==='NIL').length}</span>
        <span>Pending: {payments.filter((p:any)=>p.year===year && p.status==='PENDING').length}</span>
      </div>

      {popover && (
        <CellPopover bucket={bucket} year={year} month={popover.month} payment={popover.payment} rect={popover.rect} onClose={closePopover} onUpdate={() => { mutate(); onUpdate(); }} />
      )}
    </div>
  );
}

function CellPopover({ bucket, year, month, payment, rect, onClose, onUpdate }: any) {
  const [form, setForm] = useState({ 
    amount: payment?.amount || bucket.monthlyContribution || '', 
    status: payment?.status || 'PAID', 
    notes: payment?.notes || '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleScroll = () => onClose();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [onClose]);

  const handleSave = async () => {
    setIsSubmitting(true);
    let res;
    if (payment) {
      res = await fetch(`/api/personal/buckets/${bucket.id}/payments/${payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
    } else {
      res = await fetch(`/api/personal/buckets/${bucket.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, year, month })
      });
    }
    setIsSubmitting(false);
    if (res?.ok) {
      onUpdate();
      onClose();
    } else {
      toast.error("Failed to save");
    }
  };

  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${rect.bottom + 8}px`,
    left: `${Math.min(rect.left - 60, window.innerWidth - 220)}px`,
    width: '200px',
    zIndex: 100
  };

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className={`bg-white rounded-xl shadow-2xl border border-slate-200 p-3 flex flex-col gap-2 ${styles.fadeIn}`} style={style}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-slate-700">{MONTHS[month-1]} {year}</span>
        </div>
        <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md h-8 px-2 text-xs font-bold" placeholder="Amount" />
        <div className="h-8 text-xs"><CustomDropdown options={[{label:'PAID',value:'PAID'},{label:'NIL',value:'NIL'},{label:'PENDING',value:'PENDING'}]} value={form.status} onChange={v => setForm({...form, status: v as string})} /></div>
        <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md h-8 px-2 text-xs font-medium" placeholder="Notes" />
        <div className="flex gap-2 mt-1">
          <button onClick={handleSave} disabled={isSubmitting} className="flex-1 bg-orange-500 text-white font-bold text-xs h-8 rounded-md hover:bg-orange-600">Save</button>
          <button onClick={onClose} className="flex-1 bg-white text-slate-600 border border-slate-200 font-bold text-xs h-8 rounded-md hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </>
  );
}

function CardAllocationBar({ card, buckets }: any) {
  const totalAllocated = buckets.reduce((acc:number, b:any) => acc + (b.savedAmount || 0), 0);
  const totalBalance = card.manualBalance || 0;
  const freeBalance = Math.max(totalBalance - totalAllocated, 0);

  const segments = buckets.map((b:any) => ({ id: b.id, title: b.title, amount: b.savedAmount || 0, color: b.color }));
  if (freeBalance > 0) {
    segments.push({ id: 'free', title: 'Unallocated', amount: freeBalance, color: '#94a3b8' });
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div>
      <div className="h-4 w-full flex rounded-full overflow-hidden bg-slate-100">
        {segments.map((seg: any, i: number) => {
          const pct = totalBalance > 0 ? (seg.amount / totalBalance) * 100 : 0;
          return (
            <div 
              key={seg.id} 
              className="h-full relative group transition-all" 
              style={{ 
                width: mounted ? `${pct}%` : '0%', 
                backgroundColor: seg.color, 
                transitionDuration: '700ms', 
                transitionDelay: `${i*80}ms` 
              }}
            >
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-10">
                {seg.title}: {formatINR(seg.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BucketForm({ bucket, cards, initialLinkedCardId, onSuccess, onCancel }: any) {
  const [form, setForm] = useState({
    title: bucket?.title || '',
    type: bucket?.type || 'SAVINGS',
    targetAmount: bucket?.targetAmount || '',
    savedAmount: bucket?.savedAmount || '',
    monthlyContribution: bucket?.monthlyContribution || '',
    linkedCardId: bucket?.linkedCardId || initialLinkedCardId || '',
    dueDate: bucket?.dueDate ? new Date(bucket.dueDate).toISOString().split('T')[0] : '',
    color: bucket?.color || SWATCHES[0],
    icon: bucket?.icon || 'Wallet',
    debtDirection: bucket?.debtDirection || 'I_OWE',
    deductFromBalance: bucket?.deductFromBalance || false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardOpts = [{label:'None',value:''}].concat(cards.map((c:any) => ({ label: `${c.bank} ••••${c.lastFour}`, value: c.id })));

  const handleSubmit = async () => {
    if (!form.title) return toast.error("Title is required");
    setIsSubmitting(true);
    
    const url = bucket ? `/api/personal/buckets/${bucket.id}` : '/api/personal/buckets';
    const method = bucket ? 'PATCH' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setIsSubmitting(false);
    if (res.ok) onSuccess();
    else toast.error("Failed to save bucket");
  };

  const SelectedIcon = ICON_MAP[form.icon] || Wallet;
  const pct = form.targetAmount ? Math.min(((Number(form.savedAmount) || 0) / Number(form.targetAmount)) * 100, 100) : 0;

  return (
    <div className="bg-white rounded-[24px] p-6 relative flex flex-col gap-6 shadow-2xl border border-slate-100">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-sm transition-colors" style={{ backgroundColor: form.color }}>
            <SelectedIcon size={28} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{form.title || 'Bucket Name'}</h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex mt-1 uppercase tracking-widest" style={{ backgroundColor: form.color + '20', color: form.color }}>
              {form.type}
            </span>
          </div>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
          <X size={20} />
        </button>
      </div>

      {/* Progress Box */}
      <div className="bg-[#F8F9FF] rounded-2xl p-5 flex items-center justify-between border border-[#EEF2FF]">
        <div className="flex gap-6 items-center">
          <div>
            <div className="text-[10px] font-semibold text-slate-500 mb-1">Progress</div>
            <div className="text-2xl font-bold text-indigo-600 mb-2">{Math.round(pct)}%</div>
            <div className="h-1.5 w-32 bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="w-px h-10 bg-slate-200 mx-2" />
          <div>
            <div className="text-[10px] font-semibold text-slate-500 mb-1">Saved</div>
            <div className="flex items-center gap-1 mb-1 relative">
              <span className="text-lg font-bold text-indigo-600 absolute left-0 pl-1 pointer-events-none">₹</span>
              <input 
                type="number" 
                value={form.savedAmount} 
                onChange={e => setForm({...form, savedAmount: e.target.value})}
                className="w-28 bg-transparent text-2xl font-bold text-indigo-600 leading-none focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded border border-transparent hover:border-indigo-200 transition-colors pl-4"
                placeholder="0"
              />
            </div>
            <div className="text-[10px] text-slate-400 font-medium pl-1">of {form.targetAmount ? formatINR(Number(form.targetAmount)) : '₹0'}</div>
          </div>
        </div>
        <PiggyBank size={48} className="text-indigo-200 opacity-50 drop-shadow-sm" strokeWidth={1} />
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Title</label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl h-[45px] pl-10 pr-3 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all hover:border-slate-300" placeholder="e.g. Vacation Fund" />
          </div>
        </div>
        
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Type</label>
          <div className="grid grid-cols-3 gap-3">
            {['SAVINGS', 'DEBT', 'EMI'].map(t => {
              const isSelected = form.type === t;
              const Icon = t === 'SAVINGS' ? PiggyBank : t === 'DEBT' ? CreditCard : Calendar;
              const desc = t === 'SAVINGS' ? 'Plan and grow your money' : t === 'DEBT' ? 'Track and repay your debts' : 'Manage your EMI payments';
              const title = t === 'SAVINGS' ? 'Savings' : t === 'DEBT' ? 'Debt' : 'EMI';
              return (
                <button key={t} onClick={() => setForm({...form, type: t})} className={`p-3 rounded-2xl border text-left transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon size={16} /></div>
                  <div className="font-bold text-sm text-slate-900">{title}</div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-tight font-medium">{desc}</div>
                </button>
              )
            })}
          </div>
        </div>
        {form.type === 'DEBT' && (
          <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Debt Direction</label>
              <div className="flex gap-2 p-1 bg-white rounded-lg border border-slate-200 shadow-sm w-fit">
                <button type="button" onClick={() => setForm({...form, debtDirection: 'I_OWE', deductFromBalance: false})} className={`px-4 py-2 flex items-center gap-1.5 rounded-md text-xs font-bold transition-colors ${form.debtDirection === 'I_OWE' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  <ArrowUpRight size={16} /> I Owe
                </button>
                <button type="button" onClick={() => setForm({...form, debtDirection: 'THEY_OWE', deductFromBalance: false})} className={`px-4 py-2 flex items-center gap-1.5 rounded-md text-xs font-bold transition-colors ${form.debtDirection === 'THEY_OWE' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  <ArrowDownLeft size={16} /> They Owe Me
                </button>
              </div>
            </div>
            
            {form.debtDirection === 'THEY_OWE' && (
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div>
                  <div className="text-xs font-bold text-slate-800">Deduct from KVB Balance</div>
                  <div className="text-[10px] text-slate-500">Block funds in free balance immediately</div>
                </div>
                <button type="button" onClick={() => setForm({...form, deductFromBalance: !form.deductFromBalance})} className={`w-10 h-6 rounded-full transition-colors relative ${form.deductFromBalance ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${form.deductFromBalance ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {form.type !== 'EMI' ? (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">
                {form.type === 'DEBT' ? (form.debtDirection === 'I_OWE' ? 'Total to Pay (₹)' : 'Total Owed to Me (₹)') : 'Target Amount (₹)'}
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="number" value={form.targetAmount} onChange={e => setForm({...form, targetAmount: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl h-[45px] pl-10 pr-3 text-sm font-semibold tabular-nums focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all hover:border-slate-300" placeholder="Enter amount" />
              </div>
            </div>
          ) : <div />}
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Monthly Contribution (₹)</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
              <input type="number" value={form.monthlyContribution} onChange={e => setForm({...form, monthlyContribution: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl h-[45px] pl-10 pr-3 text-sm font-semibold tabular-nums focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all hover:border-slate-300" placeholder="0" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Linked Card</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" size={16} />
              <CustomDropdown options={cardOpts} value={form.linkedCardId} onChange={v => setForm({...form, linkedCardId: v as string})} className="pl-10" />
            </div>
          </div>

          {form.type !== 'EMI' ? (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Target Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" size={16} />
                <DatePickerInput value={form.dueDate} onChange={v => setForm({...form, dueDate: v as string})} disableFutureDates={false} className="flex h-[45px] w-full items-center justify-between rounded-xl border bg-white pl-10 pr-4 py-2 text-[0.95rem] transition-all hover:border-slate-300 cursor-pointer" />
              </div>
            </div>
          ) : <div />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Choose Color</label>
            <div className="flex flex-wrap gap-3">
              {SWATCHES.map(c => (
                <button key={c} onClick={() => setForm({...form, color: c})} className={`w-9 h-9 rounded-full transition-transform flex items-center justify-center ${form.color === c ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }}>
                  {form.color === c && <CheckCircle2 size={16} className="text-white drop-shadow-sm" />}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Choose Icon</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(ICON_MAP).slice(0, 12).map(iName => {
                const IconCmp = ICON_MAP[iName];
                return (
                  <button key={iName} onClick={() => setForm({...form, icon: iName})} className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border ${form.icon === iName ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-transparent bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                    <IconCmp size={20} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button onClick={onCancel} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50">
            {isSubmitting ? "Saving..." : "Save Bucket"}
          </button>
        </div>
      </div>
    </div>
  );
}
