import Image from 'next/image';
import { greatVibes } from '@/lib/fonts';
import { invoiceData } from './invoiceData';

/** Payment methods and terms & conditions. */
export default function InvoicePaymentAndTerms() {
  return (
    <>
      {/* Bottom Section */}
      <div className="relative z-10 mx-12 mt-4 flex gap-4 h-[135px]">
      
        {/* Payment Methods */}
        <div className="w-[60%]">
           <p className="text-[9px] font-bold text-[#c39b6a] tracking-wider mb-2 ml-1">PAYMENT METHODS</p>
           <div className="flex gap-2 h-[105px]">
            
              {/* UPI QR */}
              <div className="bg-white rounded-lg p-2 border border-gray-100 flex flex-col items-center justify-between w-1/3 shadow-sm">
                 <div className="flex items-center gap-1 w-full justify-center">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c39b6a" strokeWidth="2"><path d="M3 3h6v6H3zM15 3h6v6h-6zM15 15h6v6h-6zM3 15h6v6H3z"/></svg>
                   <div>
                     <p className="text-[8px] font-bold leading-tight">UPI / QR CODE</p>
                     <p className="text-[6px] text-gray-400">Scan to pay securely</p>
                   </div>
                 </div>
                 <div className="w-16 h-16 bg-gray-100 rounded-md">
                   <Image src="/booking-invoice-assets/google.png" alt="QR" width={64} height={64} className="mix-blend-multiply opacity-50" />
                 </div>
                 <p className="text-[7px] font-medium text-gray-600">UPI ID: <span className="text-black">{invoiceData.paymentMethods.upi}</span></p>
              </div>

              {/* Bank Transfer */}
              <div className="bg-white rounded-lg p-2 border border-gray-100 flex flex-col justify-between w-1/3 shadow-sm px-3">
                 <div className="flex items-center gap-2">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c39b6a" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                   <div>
                     <p className="text-[8px] font-bold leading-tight">BANK TRANSFER</p>
                     <p className="text-[6px] text-gray-400">Transfer to our bank account</p>
                   </div>
                 </div>
                 <div className="space-y-1 mt-1">
                    <div>
                      <p className="text-[6px] text-gray-400 mb-0.5">Account Name</p>
                      <p className="text-[8px] font-bold">{invoiceData.paymentMethods.bankTransfer.accountName}</p>
                    </div>
                    <div>
                      <p className="text-[6px] text-gray-400 mb-0.5">Account Number</p>
                      <p className="text-[8px] font-bold">{invoiceData.paymentMethods.bankTransfer.accountNumber}</p>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-[6px] text-gray-400 mb-0.5">IFSC Code</p>
                        <p className="text-[8px] font-bold">{invoiceData.paymentMethods.bankTransfer.ifsc}</p>
                      </div>
                      <div>
                        <p className="text-[6px] text-gray-400 mb-0.5">Bank</p>
                        <p className="text-[8px] font-bold truncate max-w-[40px]">{invoiceData.paymentMethods.bankTransfer.bank}</p>
                      </div>
                    </div>
                 </div>
              </div>

              {/* WhatsApp Link */}
              <div className="bg-white rounded-lg p-2 border border-gray-100 flex flex-col justify-between w-1/3 shadow-sm px-3 relative overflow-hidden">
                 <div className="flex items-center gap-1">
                   <div className="w-5 h-5 shrink-0">
                     <Image src="/booking-invoice-assets/WhatsApp.svg" alt="WA" width={20} height={20} />
                   </div>
                   <div>
                     <p className="text-[7px] font-bold leading-tight uppercase">WhatsApp Payment Link</p>
                     <p className="text-[6px] text-gray-400">Quick & easy payment</p>
                   </div>
                 </div>
               
                 <div className="bg-[#c39b6a] rounded-full py-1.5 px-3 flex items-center justify-center gap-1 text-white shadow-sm">
                    <Image src="/booking-invoice-assets/WhatsApp.svg" alt="WA" width={10} height={10} className="brightness-0 invert" />
                    <span className="text-[8px] font-medium">Pay via WhatsApp</span>
                 </div>
               
                 <p className="text-[9px] font-bold text-center text-gray-700">{invoiceData.paymentMethods.whatsappPhone}</p>
              </div>

           </div>
        </div>

        {/* Terms & Conditions */}
        <div className="w-[40%]">
           <p className="text-[9px] font-bold text-[#c39b6a] tracking-wider mb-2 ml-1">TERMS & CONDITIONS</p>
           <ul className="text-[8px] text-gray-600 space-y-1.5 pl-3 list-disc">
             {invoiceData.terms.map((term, i) => (
               <li key={i}>{term}</li>
             ))}
           </ul>
         
           <div className="mt-2 text-center relative flex justify-center items-center flex-col">
              <div className="flex items-center gap-2">
                 <span className={`${greatVibes.className} text-[22px] text-[#c39b6a] leading-none`}>Thank You!</span>
                 <Image src="/booking-invoice-assets/heart.png" alt="heart" width={16} height={16} className="mt-1" />
              </div>
              <p className="text-[8px] text-gray-500 mt-1">We truly appreciate your trust in us.</p>
           </div>
        </div>

      </div>
    </>
  );
}
