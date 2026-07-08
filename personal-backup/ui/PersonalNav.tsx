"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, CreditCard, Timer, Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const TABS = [
  { name: "Overview", path: "/personal", icon: LayoutDashboard },
  { name: "Expenses", path: "/personal/expenses", icon: Receipt },
  { name: "Cards", path: "/personal/cards", icon: CreditCard },
  { name: "EMIs", path: "/personal/emis", icon: Timer },
  { name: "Buckets", path: "/personal/buckets", icon: Layers }
];

export default function PersonalNav() {
  const pathname = usePathname();
  const prevIndex = useRef(TABS.findIndex(t => t.path === pathname));
  const [animatingTab, setAnimatingTab] = useState<string | null>(null);
  const [translateValue, setTranslateValue] = useState<string>("");

  useEffect(() => {
    const currentIndex = TABS.findIndex(t => t.path === pathname);
    if (currentIndex !== -1 && prevIndex.current !== -1 && currentIndex !== prevIndex.current) {
      const direction = currentIndex > prevIndex.current ? '8px' : '-8px';
      
      setTranslateValue(direction);
      setAnimatingTab(pathname);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTranslateValue("0px");
          setTimeout(() => {
            setAnimatingTab(null);
          }, 200);
        });
      });
      
      prevIndex.current = currentIndex;
    } else if (currentIndex !== -1) {
      prevIndex.current = currentIndex;
    }
  }, [pathname]);

  return (
    <div className="flex gap-2 bg-black/5 p-1 rounded-xl w-max max-w-full overflow-x-auto whitespace-nowrap" style={{ scrollbarWidth: 'none' }}>
      {TABS.map((tab) => {
        const isActive = pathname === tab.path;
        const Icon = tab.icon;
        
        const isAnimating = animatingTab === tab.path;
        const style = isAnimating 
          ? { transform: `translateX(${translateValue})`, transition: translateValue === '0px' ? 'transform 200ms ease-out' : 'none' } 
          : {};

        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold relative transition-colors duration-200 ease-in-out rounded-lg whitespace-nowrap ${
              isActive 
                ? "bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] text-orange-500" 
                : "text-slate-500 hover:text-slate-700 hover:bg-black/5"
            }`}
            style={isActive ? style : {}}
          >
            <Icon size={16} strokeWidth={2.5} className={isActive ? "text-orange-500" : "text-slate-400"} />
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
