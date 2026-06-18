import React from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`min-h-screen w-full flex items-center justify-center bg-[#111827] relative ${inter.className} overflow-hidden`}>
      {/* Decorative background elements matching the screenshot */}
      <div className="absolute w-full h-full inset-0 z-0 pointer-events-none opacity-40">
        {/* Rupee Symbols */}
        <div className="absolute top-[15%] left-[10%] text-[2.5rem] text-slate-700 font-bold rotate-[-25deg] opacity-70">₹</div>
        <div className="absolute top-[35%] left-[25%] text-[4rem] text-slate-800 font-bold rotate-[15deg]">₹</div>
        <div className="absolute bottom-[25%] left-[15%] text-[3rem] text-slate-700 font-bold rotate-[-10deg] opacity-80">₹</div>
        <div className="absolute top-[20%] right-[15%] text-[3.5rem] text-slate-800 font-bold rotate-[20deg]">₹</div>
        <div className="absolute top-[45%] right-[25%] text-[2.5rem] text-slate-700 font-bold rotate-[-15deg] opacity-60">₹</div>
        <div className="absolute bottom-[20%] right-[20%] text-[4.5rem] text-slate-800 font-bold rotate-[10deg]">₹</div>
        <div className="absolute top-[5%] left-[40%] text-[2rem] text-slate-700 font-bold rotate-[5deg] opacity-50">₹</div>
        <div className="absolute bottom-[10%] left-[45%] text-[2rem] text-slate-700 font-bold rotate-[-20deg] opacity-60">₹</div>
        <div className="absolute top-[10%] right-[45%] text-[1.5rem] text-slate-700 font-bold rotate-[10deg] opacity-50">₹</div>

        {/* Dots/Stars */}
        <div className="absolute top-[12%] left-[22%] w-2 h-2 rounded-full bg-slate-600"></div>
        <div className="absolute top-[28%] left-[8%] w-1.5 h-1.5 rounded-full bg-orange-400 opacity-80"></div>
        <div className="absolute top-[45%] left-[18%] w-2.5 h-2.5 rounded-full bg-slate-700"></div>
        <div className="absolute bottom-[35%] left-[12%] w-2 h-2 rounded-full bg-slate-600"></div>
        <div className="absolute bottom-[15%] left-[28%] w-1.5 h-1.5 rounded-full bg-orange-500 opacity-70"></div>
        
        <div className="absolute top-[18%] right-[28%] w-2 h-2 rounded-full bg-slate-600"></div>
        <div className="absolute top-[32%] right-[10%] w-1.5 h-1.5 rounded-full bg-orange-400 opacity-80"></div>
        <div className="absolute top-[55%] right-[15%] w-2 h-2 rounded-full bg-slate-700"></div>
        <div className="absolute bottom-[28%] right-[12%] w-2.5 h-2.5 rounded-full bg-slate-600"></div>
        <div className="absolute bottom-[12%] right-[32%] w-1.5 h-1.5 rounded-full bg-orange-500 opacity-90"></div>

        <div className="absolute top-[8%] left-[55%] w-2 h-2 rounded-full bg-slate-600 opacity-50"></div>
        <div className="absolute bottom-[8%] right-[55%] w-2 h-2 rounded-full bg-slate-700 opacity-60"></div>
      </div>
      
      <div className="z-10 w-full max-w-[420px] relative px-4">
        {children}
      </div>
    </div>
  );
}
