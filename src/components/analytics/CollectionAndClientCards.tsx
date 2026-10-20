"use client";

import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { DollarSign, Users } from "lucide-react";
import { formatThousands, type CollectionPoint, type NameValue, type OverdueOrder, type TopClient } from "./types";

interface CollectionHealthCardProps {
  chart: CollectionPoint[];
  overdue: OverdueOrder[];
  onOpenOrder: (orderId: string) => void;
}

/** Section 5: Collection Health */
export function CollectionHealthCard({ chart, overdue, onOpenOrder }: CollectionHealthCardProps) {
  return (
    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-auto lg:h-[400px]">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><DollarSign size={18} className="text-emerald-500"/> Collection Health</h3>
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        <div className="h-[200px] lg:h-[300px] flex-1 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={formatThousands} />
              <Tooltip contentStyle={{ borderRadius: '12px' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              <Area type="monotone" dataKey="collected" stroke="#10b981" fillOpacity={1} fill="url(#colorCollected)" isAnimationActive={true} />
              <Area type="monotone" dataKey="overdue" stroke="#ef4444" fillOpacity={1} fill="url(#colorOverdue)" isAnimationActive={true} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:w-72 flex flex-col">
          <h4 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-3">Overdue Orders</h4>
          <div className="flex-1 overflow-y-auto max-h-[250px] lg:max-h-[300px] flex flex-col gap-2 pr-1">
            {overdue.length === 0 ? (
              <div className="text-sm text-slate-500 italic p-4 text-center bg-slate-50 rounded-xl">No overdue orders found!</div>
            ) : (
              overdue.map((o) => (
                <button type="button" key={o.id} className="w-full text-left flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => onOpenOrder(o.id)}>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{o.clientName}</div>
                    <div className="text-[0.65rem] text-slate-500 uppercase">{o.id.slice(-6)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-red-600">₹{o.amount.toLocaleString('en-IN')}</span>
                    <div className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">
                      Collect
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ClientInsightsCardProps {
  distribution: NameValue[];
  topClients: TopClient[];
  activeClientId: string | null;
  onToggleClient: (client: TopClient) => void;
}

/** Section 6: Client Insights */
export function ClientInsightsCard({ distribution, topClients, activeClientId, onToggleClient }: ClientInsightsCardProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col h-auto lg:h-[400px]">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><Users size={18} className="text-blue-500"/> Client Insights</h3>

      <div className="h-[150px] lg:h-[180px] w-full shrink-0 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5}>
              <Cell fill="#3b82f6" />
              <Cell fill="#6366f1" />
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '12px' }} />
            <Legend iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <h4 className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-3 shrink-0">Top Clients</h4>
        <div className="overflow-y-auto flex-1 flex flex-col gap-2 pr-1">
          {topClients.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => onToggleClient(c)}
              aria-pressed={activeClientId === c.id}
              className={`w-full text-left flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors group ${
                activeClientId === c.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 hover:border-blue-200'
              }`}
            >
              <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors truncate">{c.name}</span>
              <span className="text-xs font-extrabold text-slate-500">₹{(c.spend/1000).toFixed(1)}k</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDateSimple(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Dynamic Section: Client History Panel (Appears below Client Insights) */
export function ClientHistoryPanel({ activeClient }: { activeClient: TopClient | null }) {
  return (
    <div className={`lg:col-span-3 bg-white rounded-3xl border border-blue-200 shadow-sm flex flex-col ${activeClient ? 'history-panel-enter-active' : 'history-panel-enter'}`}>
      {activeClient && (
        <div className="px-5 h-full overflow-hidden">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Users size={18} className="text-blue-500"/> Transaction History: {activeClient.name}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {activeClient.transactions.length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-center text-slate-400">No recent transactions.</td></tr>
                ) : (
                  activeClient.transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-2 text-slate-700">{formatDateSimple(tx.date)}</td>
                      <td className="py-2 text-slate-700">{tx.category}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold ${
                          tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2 text-right font-bold text-slate-800">₹{tx.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
