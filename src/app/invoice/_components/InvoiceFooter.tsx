import Image from 'next/image';
import { invoiceData } from './invoiceData';

/** Contact footer and the studio stamp. */
export default function InvoiceFooter() {
  return (
    <>
      {/* Footer */}
      <div className="absolute bottom-5 left-12 right-12 z-20">
         <div className="bg-[#2c2c2c] rounded-xl flex items-center justify-between px-6 py-3 text-white">
            <div className="flex gap-4">
               <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d8b88d" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  <span className="text-[9px] font-light tracking-wide">{invoiceData.socials.instagram}</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d8b88d" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                  <span className="text-[9px] font-light tracking-wide">{invoiceData.socials.website}</span>
               </div>
            </div>
            <div className="flex gap-4 pr-10">
               <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d8b88d" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  <span className="text-[9px] font-light tracking-wide">{invoiceData.socials.phone}</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d8b88d" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  <span className="text-[9px] font-light tracking-wide">{invoiceData.socials.email}</span>
               </div>
            </div>
         </div>
      </div>

      {/* Moondot Stamp overlapping the footer */}
      <div className="absolute bottom-2 right-10 z-30 w-24 h-24">
         <Image src="/booking-invoice-assets/mdStamp.png" alt="MD Stamp" fill className="object-contain" />
      </div>
    </>
  );
}
