import { playfair } from '@/lib/fonts';
import { formatCurrency, invoiceData } from './invoiceData';

/** Amount due, subtotals and payment progress. */
export default function InvoiceFinancials() {
  return (
    <>
      {/* Financials & Payment Progress */}
      <div className="relative z-10 mx-12 mt-4 flex gap-4">
      
        {/* Amount Due Box */}
        <div className="w-[30%] bg-[#2c2c2c] rounded-xl flex flex-col justify-center items-center text-white py-6 shadow-md relative overflow-hidden">
           <div className="absolute top-0 right-0 w-16 h-16 bg-[#c39b6a] opacity-10 rounded-bl-full"></div>
           <p className="text-[10px] font-bold text-[#c39b6a] tracking-wider mb-2">AMOUNT DUE</p>
           <h3 className={`${playfair.className} text-3xl font-medium text-[#d8b88d]`}>{formatCurrency(invoiceData.financials.balanceDue)}</h3>
           <p className="text-[10px] text-gray-400 mt-4">Balance to be paid</p>
        </div>

        {/* Subtotals Box */}
        <div className="w-[30%] bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-between text-xs">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-800">{formatCurrency(invoiceData.financials.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#c39b6a]">
              <span>Discount</span>
              <span className="font-medium">- {formatCurrency(invoiceData.financials.discount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST (0%)</span>
              <span className="font-medium">₹0</span>
            </div>
            <div className="flex justify-between text-[#3ab776]">
              <span>Amount Paid</span>
              <span className="font-medium">- {formatCurrency(invoiceData.financials.amountPaid)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-100 font-bold bg-[#fdfaf5] -mx-4 -mb-4 px-4 py-3 rounded-b-xl text-[13px]">
            <span>Balance Due</span>
            <span className="text-[#c39b6a] text-base">{formatCurrency(invoiceData.financials.balanceDue)}</span>
          </div>
        </div>

        {/* Payment Progress */}
        <div className="w-[40%] bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
           <div className="flex justify-between items-end mb-2">
             <span className="text-[10px] font-bold tracking-wider text-gray-800">PAYMENT PROGRESS</span>
             <span className="text-xs font-bold">{invoiceData.paymentProgress.percentage}% Paid</span>
           </div>
         
           <div className="h-2 w-full bg-gray-100 rounded-full mb-3 overflow-hidden">
             <div className="h-full bg-[#c39b6a] rounded-full" style={{ width: `${invoiceData.paymentProgress.percentage}%` }}></div>
           </div>

           <div className="flex justify-between text-[9px] mb-4">
             <div>
               <p className="text-gray-500">Paid</p>
               <p className="font-bold text-xs text-gray-800">{formatCurrency(invoiceData.paymentProgress.paid)}</p>
             </div>
             <div className="text-right">
               <p className="text-gray-500">Total</p>
               <p className="font-bold text-xs text-gray-800">{formatCurrency(invoiceData.paymentProgress.total)}</p>
             </div>
           </div>

           {/* Stages Timeline */}
           <div className="relative flex justify-between mt-2 pt-2">
              <div className="absolute top-2.5 left-4 right-4 h-[1px] border-t border-dashed border-[#d8b88d] -z-10"></div>
              {invoiceData.paymentProgress.stages.map((stage, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-white border ${stage.completed ? 'border-[#c39b6a] text-white' : 'border-[#d8b88d] text-[#d8b88d]'}`}>
                     {stage.completed ? (
                       <div className="w-full h-full bg-[#c39b6a] rounded-full flex items-center justify-center">
                         <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                       </div>
                     ) : (
                       stage.step
                     )}
                  </div>
                  <p className="text-[8px] font-bold text-gray-700 mt-1">{stage.label}</p>
                  <p className="text-[7px] text-[#c39b6a] font-semibold">{stage.sublabel}</p>
                  <p className="text-[7px] text-gray-500">{stage.percentage}</p>
                </div>
              ))}
           </div>
        </div>
      </div>
    </>
  );
}
