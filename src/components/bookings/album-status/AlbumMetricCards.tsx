"use client";

import React from "react";
import { FolderClock, PenTool, Printer, Package, AlertTriangle } from "lucide-react";
import { clickableProps } from "../clickableProps";

const ICON_MAP: Record<string, React.ReactNode> = {
  FolderClock: <FolderClock size={18} />,
  PenTool:     <PenTool size={18} />,
  Printer:     <Printer size={18} />,
  Package:     <Package size={18} />,
  AlertTriangle: <AlertTriangle size={18} />,
};

export const STATUS_CARDS = [
  {
    status: 'Pending',
    label: 'Pending album works',
    sublabel: 'Awaiting design start',
    icon: 'FolderClock',
    iconBg: 'rgba(251,146,60,0.12)',
    iconColor: '#f97316',
    accentColor: '#f97316',
  },
  {
    status: 'Overdue',
    label: 'Overdue Albums',
    sublabel: 'Past delivery date',
    icon: 'AlertTriangle',
    iconBg: 'rgba(239,68,68,0.12)',
    iconColor: '#ef4444',
    accentColor: '#ef4444',
  },
  {
    status: 'Designing',
    label: 'Designing',
    sublabel: 'Album in design process',
    icon: 'PenTool',
    iconBg: 'rgba(168,85,247,0.12)',
    iconColor: '#a855f7',
    accentColor: '#a855f7',
  },
  {
    status: 'Sent for printing',
    label: 'Sent for printing',
    sublabel: 'In printing & production',
    icon: 'Printer',
    iconBg: 'rgba(59,130,246,0.12)',
    iconColor: '#3b82f6',
    accentColor: '#3b82f6',
  },
  {
    status: 'Ready for delivery',
    label: 'Ready for delivery',
    sublabel: 'Albums ready to ship',
    icon: 'Package',
    iconBg: 'rgba(34,197,94,0.12)',
    iconColor: '#22c55e',
    accentColor: '#22c55e',
  },
];

interface AlbumMetricCardsProps {
  counts: Record<string, number>;
  activeTab: string;
  onSelect: (status: string) => void;
  rowClassName: string;
  cardAnimClassName: string;
}

/** Clickable count cards that also select the matching tab. */
export default function AlbumMetricCards({ counts, activeTab, onSelect, rowClassName, cardAnimClassName }: AlbumMetricCardsProps) {
  return (
    <div className={rowClassName}>
      {STATUS_CARDS.map((card, index) => (
        <div
          key={card.status}
          {...clickableProps(() => onSelect(card.status))}
          aria-pressed={activeTab === card.status}
          className={`bg-white rounded-2xl p-5 border border-gray-100 flex flex-col justify-between h-[120px] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer ${cardAnimClassName}`}
          style={{ animationDelay: `${index * 80}ms`, ...(activeTab === card.status ? { borderColor: card.accentColor, boxShadow: `0 4px 12px ${card.iconBg}` } : {}) }}
        >
          <div className="flex justify-between items-start">
            <div
              className="w-[32px] h-[32px] rounded-lg flex items-center justify-center transition-colors"
              style={{ background: card.iconBg, color: card.iconColor }}
            >
              {ICON_MAP[card.icon]}
            </div>
          </div>
          <div>
            <div className="text-slate-500 font-bold text-[0.75rem] mb-0.5">{card.label}</div>
            <div className="text-[1.5rem] font-extrabold text-slate-900 leading-none tracking-tight">
              {counts[card.status] ?? 0}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
