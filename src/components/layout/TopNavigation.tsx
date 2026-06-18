"use client";

import { usePathname } from "next/navigation";

export default function TopNavigation() {
  const pathname = usePathname();
  
  // Simple logic to set page title
  let title = "Studio Management";
  if (pathname.includes("bookings")) title = "Bookings Management";
  else if (pathname.includes("galleries")) title = "Galleries Management";
  else if (pathname.includes("analytics")) title = "Analytics";
  else if (pathname.includes("transactions")) title = "Ledger & Analytics";
  
  return (
    <header className={`flex ${title ? 'justify-between' : 'justify-end'} items-center px-10 py-5 bg-slate-50 z-[5]`}>
      {title && <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{title}</h1>}
      
      <div className="flex items-center gap-5">
        <div className="bg-white border border-gray-200 rounded-full px-4 py-2 flex items-center gap-2.5 w-[300px] shadow-sm transition-all focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent">
          <input type="text" placeholder="Search dashboard insights..." className="border-none outline-none bg-transparent w-full font-sans text-[0.9rem] text-slate-900 placeholder:text-slate-400" />
          <i className="ph-fill ph-magnifying-glass text-slate-400 text-[1.2rem]"></i>
        </div>
        
        <button className="bg-white border border-gray-200 rounded-full w-[45px] h-[45px] flex items-center justify-center relative cursor-pointer shadow-sm hover:bg-slate-50 transition-colors">
          <i className="ph-fill ph-bell text-slate-600 text-[1.4rem]"></i>
          <span className="absolute top-[10px] right-[12px] w-2 h-2 bg-red-500 rounded-full border-2 border-white box-content"></span>
        </button>
        
        <div className="flex items-center gap-[15px] bg-white px-[15px] py-2 rounded-full border border-gray-200 cursor-pointer shadow-sm hover:bg-slate-50 transition-colors">
          <div className="flex flex-col items-end">
            <span className="font-bold text-[0.95rem] text-slate-900 leading-tight">Rajesh Kumar</span>
            <span className="text-[0.75rem] text-slate-500 font-semibold uppercase tracking-[0.5px]">Studio Owner</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold text-base">RK</div>
        </div>
      </div>
    </header>
  );
}
