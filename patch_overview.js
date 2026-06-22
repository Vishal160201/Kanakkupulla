const fs = require('fs');
const path = './src/app/(main)/transactions/overview/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const newColors = `  "Booking Advance":     { bg: "bg-blue-500",    stroke: "#3b82f6" },
  "Passport Photo":      { bg: "bg-pink-500",    stroke: "#ec4899" },
  "Frame Sales":         { bg: "bg-orange-500",  stroke: "#f97316" },
  "Editing Charges":     { bg: "bg-amber-700",   stroke: "#b45309" },
  "Album Payment":       { bg: "bg-violet-500",  stroke: "#8b5cf6" },
  "Tea & Snacks":        { bg: "bg-sky-500",     stroke: "#0ea5e9" },
  "Fuel":                { bg: "bg-red-500",     stroke: "#ef4444" },
  "Bus Fare":            { bg: "bg-indigo-500",  stroke: "#6366f1" },
  "System Repair":       { bg: "bg-purple-500",  stroke: "#a855f7" },
  "Printing":            { bg: "bg-emerald-500", stroke: "#10b981" },
  "Courier":             { bg: "bg-orange-500",  stroke: "#f97316" },
  "Other Expense":       { bg: "bg-slate-400",   stroke: "#94a3b8" }
};`;
content = content.replace('  "Misc":                { bg: "bg-slate-300",   stroke: "#cbd5e1" }\n};', `  "Misc":                { bg: "bg-slate-300",   stroke: "#cbd5e1" },\n${newColors}`);

const newIcons = `  "Booking Advance": "ph-calendar-check",
  "Passport Photo": "ph-user",
  "Frame Sales": "ph-frame-corners",
  "Editing Charges": "ph-pencil-circle",
  "Album Payment": "ph-book-open",
  "Tea & Snacks": "ph-coffee",
  "Fuel": "ph-gas-pump",
  "Bus Fare": "ph-bus",
  "System Repair": "ph-wrench",
  "Printing": "ph-printer",
  "Courier": "ph-package",
  "Other Expense": "ph-dots-three-circle"
};`;
content = content.replace('  "Misc": "ph-dots-three-circle",\n};', `  "Misc": "ph-dots-three-circle",\n${newIcons}`);

const calcLogic = `  // --- Dynamic Weekly Flow Logic ---
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const actualFlow = new Array(7).fill(0);
  
  transactions.filter((t: any) => t.type === 'INCOME').forEach((t: any) => {
    const d = new Date(t.date);
    let day = d.getDay() - 1; // 0=Mon, -1=Sun
    if (day === -1) day = 6; 
    actualFlow[day] += t.amount;
  });

  const maxFlow = Math.max(...actualFlow, 1000); 

  // --- Today Breakdown Logic ---
  const todayIncomeByCategory = todayTransactions.filter((t:any) => t.type === 'INCOME').reduce((acc: any, t: any) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const todayExpensesByCategory = todayTransactions.filter((t:any) => t.type === 'EXPENSE').reduce((acc: any, t: any) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const sortedTodayIncome = Object.entries(todayIncomeByCategory).map(([cat, amt]) => ({ category: cat, amount: amt as number, pct: todayIncome > 0 ? (amt as number) / todayIncome : 0 })).sort((a, b) => b.amount - a.amount);
  const sortedTodayExpenses = Object.entries(todayExpensesByCategory).map(([cat, amt]) => ({ category: cat, amount: amt as number, pct: todayExpense > 0 ? (amt as number) / todayExpense : 0 })).sort((a, b) => b.amount - a.amount);

  let curIncPct = 0;
  const todayIncomeSegments = sortedTodayIncome.map((data: any) => {
    const dasharray = 251.2; // 2 * pi * r (r=40)
    const dashoffset = dasharray - (data.pct * dasharray);
    const rotation = curIncPct * 360 - 90; // Start from top
    curIncPct += data.pct;
    return { ...data, dashoffset, rotation, color: categoryColors[data.category] || defaultColor };
  });

  const quickAddIcons = [
    { label: "Booking Advance", icon: "ph-calendar-check", color: "text-emerald-600", bg: "bg-emerald-50", type: "INCOME" },
    { label: "Passport Photo", icon: "ph-user", color: "text-purple-600", bg: "bg-purple-50", type: "INCOME" },
    { label: "Tea & Snacks", icon: "ph-coffee", color: "text-orange-500", bg: "bg-orange-50", type: "EXPENSE" },
    { label: "Fuel", icon: "ph-gas-pump", color: "text-red-500", bg: "bg-red-50", type: "EXPENSE" },
    { label: "Bus Fare", icon: "ph-bus", color: "text-blue-600", bg: "bg-blue-50", type: "EXPENSE" },
    { label: "Printing", icon: "ph-printer", color: "text-teal-600", bg: "bg-teal-50", type: "EXPENSE" },
    { label: "Other Expense", icon: "ph-dots-three-circle", color: "text-slate-600", bg: "bg-slate-50", type: "EXPENSE" },
  ];
`;
content = content.replace(`  // --- Dynamic Weekly Flow Logic ---
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const actualFlow = new Array(7).fill(0);
  
  transactions.filter((t: any) => t.type === 'INCOME').forEach((t: any) => {
    const d = new Date(t.date);
    let day = d.getDay() - 1; // 0=Mon, -1=Sun
    if (day === -1) day = 6; 
    actualFlow[day] += t.amount;
  });

  const maxFlow = Math.max(...actualFlow, 1000); `, calcLogic);

const uiCards = `      </div>

      {/* 3 New UI Cards (Row 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-start">
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
          <div className="border-t border-slate-100 p-3 flex justify-end">
             <Link href="/transactions/allTransactions?view=day&type=INCOME" className="text-blue-600 font-bold text-[0.8rem] hover:text-blue-700 flex items-center gap-1 px-2">
                View all income <i className="ph-bold ph-arrow-right"></i>
             </Link>
          </div>
        </div>

        {/* Card 2: Quick Add Transaction */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full animate-slide-up" style={{ animationDelay: "350ms" }}>
          <div className="p-5 pb-2">
            <h3 className="text-[#0B1E40] font-black text-[1.05rem]">Quick Add Transaction</h3>
          </div>
          <div className="flex-1 p-5 overflow-hidden">
            <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar snap-x">
               {quickAddIcons.map((qa, i) => (
                 <Link key={i} href={\`/transactions/new?category=\${encodeURIComponent(qa.label)}&type=\${qa.type}\`} className="flex flex-col items-center gap-2 snap-start shrink-0 w-[85px] outline-none group">
                    <div className={\`w-16 h-16 rounded-2xl \${qa.bg} \${qa.color} flex items-center justify-center group-hover:scale-105 transition-transform cursor-pointer\`}>
                       <i className={\`ph-bold \${qa.icon} text-2xl\`}></i>
                    </div>
                    <span className="text-[0.65rem] font-bold text-[#0B1E40] text-center leading-tight">
                       {qa.label.replace(' & ', ' &\\n')}
                    </span>
                 </Link>
               ))}
            </div>
          </div>
        </div>

        {/* Card 3: Expense Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full animate-slide-up" style={{ animationDelay: "400ms" }}>
          <div className="p-5 pb-2 flex justify-between items-start">
            <h3 className="text-[#0B1E40] font-black text-[1.05rem]">Expense Breakdown (Today)</h3>
            <div className="text-right">
               <span className="block text-[0.65rem] font-bold text-slate-400">Total Expense</span>
               <span className="block text-[#0B1E40] font-black text-[1.05rem]">₹{todayExpense.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
          <div className="flex-1 p-5 pt-2 flex flex-col gap-3">
             {todayExpense === 0 ? (
               <div className="w-full text-center text-slate-400 py-10 text-sm">No expenses recorded today</div>
             ) : (
               sortedTodayExpenses.slice(0, 6).map((seg, i) => {
                 const iconStr = CATEGORY_ICONS[seg.category] || "ph-dots-three-circle";
                 const colorObj = categoryColors[seg.category] || defaultColor;
                 return (
                 <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                   <div className="flex items-center gap-3">
                     <div className={\`w-7 h-7 rounded-full flex items-center justify-center text-white \${colorObj.bg}\`}>
                       <i className={\`ph-bold \${iconStr} text-xs\`}></i>
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
          <div className="border-t border-slate-100 p-3 flex justify-start">
             <Link href="/transactions/allTransactions?view=day&type=EXPENSE" className="text-orange-500 font-bold text-[0.8rem] hover:text-orange-600 flex items-center gap-1 px-2">
                View all expenses <i className="ph-bold ph-arrow-right"></i>
             </Link>
          </div>
        </div>
      </div>

      <div className="relative`;

content = content.replace('      </div>\n      <div className="relative', uiCards);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched overview page correctly!');
