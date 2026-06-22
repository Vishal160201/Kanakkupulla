const fs = require('fs');

const path = './src/app/(main)/transactions/overview/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStart = '{/* 3 New UI Cards (Row 2) */}';
const targetEndStr = '<div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl mb-8 transition-transform duration-300 hover:-translate-y-1 group">';

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEndStr);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find targets");
  process.exit(1);
}

const replacement = `{/* 3 New UI Cards (Row 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-start">
        
        {/* Left Side (Income & Expenses) */}
        <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
          {/* Card 1: Income Sources */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full animate-slide-up" style={{ animationDelay: "300ms" }}>
            <div className="p-5 pb-2">
              <h3 className="text-[#0B1E40] font-black text-[1.05rem]">Income Sources (Today)</h3>
            </div>
            <div className="flex-1 p-5 flex flex-col md:flex-row items-center gap-6">
              {todayIncome === 0 ? (
                 <div className="w-full text-center text-slate-400 py-10 text-sm">No income recorded today</div>
              ) : (
              <>
              <div className="relative w-32 h-32 shrink-0">
                 <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                   {todayIncomeSegments.map((seg, i) => (
                     <circle
                       key={i}
                       cx="50"
                       cy="50"
                       r="40"
                       fill="none"
                       stroke={seg.color.stroke}
                       strokeWidth="16"
                       strokeDasharray="251.2"
                       strokeDashoffset={seg.dashoffset}
                       transform={\`rotate(\${seg.rotation + 90} 50 50)\`}
                       className="transition-all duration-1000 ease-out"
                     />
                   ))}
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                   <span className="text-[0.6rem] font-bold text-slate-400">Total Income</span>
                   <span className="text-[#0B1E40] font-black text-[1.1rem]">₹{todayIncome.toLocaleString('en-IN')}</span>
                 </div>
              </div>
              <div className="flex-1 flex flex-col gap-2.5 w-full">
                 {todayIncomeSegments.map((seg, i) => (
                   <div key={i} className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color.stroke }}></div>
                       <span className="text-[0.75rem] font-bold text-[#0B1E40]">{seg.category}</span>
                     </div>
                     <div className="flex items-center gap-3">
                       <span className="text-[0.8rem] font-bold text-[#0B1E40]">₹{seg.amount.toLocaleString('en-IN')}</span>
                       <span className="text-[0.7rem] text-slate-400 font-bold w-6 text-right">{Math.round(seg.pct * 100)}%</span>
                     </div>
                   </div>
                 ))}
              </div>
              </>
              )}
            </div>
            <div className="border-t border-slate-100 p-3 flex justify-end mt-auto">
               <Link href="/transactions/allTransactions?view=day&type=INCOME" className="text-blue-600 font-bold text-[0.8rem] hover:text-blue-700 flex items-center gap-1 px-2">
                  View all income <i className="ph-bold ph-arrow-right"></i>
               </Link>
            </div>
          </div>

          {/* Card 2: Expense Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full animate-slide-up" style={{ animationDelay: "400ms" }}>
            <div className="p-5 pb-2 flex justify-between items-start">
              <h3 className="text-[#0B1E40] font-black text-[1.05rem]">Expense Breakdown (Today)</h3>
            </div>
            <div className="flex-1 p-5 pt-2 flex flex-col gap-4">
               {todayExpense === 0 ? (
                 <div className="w-full text-center text-slate-400 py-10 text-sm">No expenses recorded today</div>
               ) : (
                 sortedTodayExpenses.slice(0, 4).map((seg, i) => {
                   const iconStr = CATEGORY_ICONS[seg.category] || "ph-dots-three-circle";
                   return (
                   <div key={i} className="flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover:border-slate-200 transition-colors">
                         <i className={\`ph-bold \${iconStr} text-xl\`}></i>
                       </div>
                       <span className="text-[0.8rem] font-bold text-[#0B1E40]">{seg.category}</span>
                     </div>
                     <div className="flex items-center gap-4">
                       <span className="text-[0.8rem] font-bold text-[#0B1E40]">₹{seg.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                       <span className="text-[0.7rem] text-slate-400 font-bold w-8 text-right">{(seg.pct * 100).toFixed(1)}%</span>
                     </div>
                   </div>
                 )})
               )}
            </div>
            <div className="border-t border-slate-100 p-3 flex justify-start mt-auto">
               <Link href="/transactions/allTransactions?view=day&type=EXPENSE" className="text-orange-500 font-bold text-[0.8rem] hover:text-orange-600 flex items-center gap-1 px-2">
                  View all expenses <i className="ph-bold ph-arrow-right"></i>
               </Link>
            </div>
          </div>
        </div>

        {/* Right Side (Quick Add) */}
        <div className="lg:col-span-3 h-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full animate-slide-up" style={{ animationDelay: "350ms" }}>
            <div className="p-5 pb-2">
              <h3 className="text-[#0B1E40] font-black text-[1.05rem]">Quick Add</h3>
            </div>
            <div className="flex-1 p-5 pt-3 overflow-hidden">
              <div className="flex flex-col gap-3">
                 {quickAddIcons.map((qa, i) => (
                   <Link key={i} href={\`/transactions/new?category=\${encodeURIComponent(qa.label)}&type=\${qa.type}\`} className="flex items-center gap-4 outline-none group w-full bg-slate-50/50 p-2 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                      <div className={\`w-12 h-12 rounded-xl \${qa.bg} \${qa.color} flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-sm\`}>
                         <i className={\`ph-bold \${qa.icon} text-xl\`}></i>
                      </div>
                      <span className="text-[0.75rem] font-bold text-[#0B1E40] leading-tight">
                         {qa.label}
                      </span>
                   </Link>
                 ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      `;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync(path, newContent, 'utf8');
console.log("Successfully rebuilt Row 2 layout.");
