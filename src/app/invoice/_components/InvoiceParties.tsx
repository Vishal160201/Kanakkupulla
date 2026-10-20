import { invoiceData } from './invoiceData';

/** Bill To / From cards and the event information bar. */
export default function InvoiceParties() {
  return (
    <>
      {/* Billing Info Cards */}
      <div className="relative z-10 px-12 mt-12 flex gap-4">
        {/* Bill To */}
        <div className="flex-1 bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex gap-4">
          <div className="w-10 h-10 rounded-full bg-[#fdfaf5] flex items-center justify-center shrink-0">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c39b6a" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#c39b6a] tracking-wider mb-1">BILL TO</p>
            <p className="font-bold text-sm mb-3">{invoiceData.billTo.name}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                {invoiceData.billTo.phone}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                {invoiceData.billTo.email}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Event Date: {invoiceData.billTo.eventDate}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Venue: {invoiceData.billTo.venue}
              </div>
            </div>
          </div>
        </div>

        {/* From */}
        <div className="flex-1 bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex gap-4">
          <div className="w-10 h-10 rounded-full bg-[#fdfaf5] flex items-center justify-center shrink-0">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c39b6a" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#c39b6a] tracking-wider mb-1">FROM</p>
            <p className="font-bold text-sm mb-3">{invoiceData.from.name}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                {invoiceData.from.address}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                GSTIN: {invoiceData.from.gstin}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                {invoiceData.from.phone}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                {invoiceData.from.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Information Bar */}
      <div className="relative z-10 mx-12 mt-4 flex items-center justify-between border-t border-b border-[#e8dfcf] py-3 text-center bg-white/50 backdrop-blur-sm rounded-lg px-8">
         <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#fbfaf6] px-2 text-[10px] font-bold text-[#c39b6a] tracking-wider">EVENT INFORMATION</div>
         <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-full bg-[#fdfaf5] flex items-center justify-center text-[#c39b6a]">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div className="text-left">
              <p className="text-[8px] font-bold text-gray-400 tracking-wider">EVENT DATE</p>
              <p className="text-[10px] font-semibold">{invoiceData.eventInformation.date}</p>
            </div>
         </div>
         <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-full bg-[#fdfaf5] flex items-center justify-center text-[#c39b6a]">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div className="text-left">
              <p className="text-[8px] font-bold text-gray-400 tracking-wider">VENUE</p>
              <p className="text-[10px] font-semibold">{invoiceData.eventInformation.venue}</p>
            </div>
         </div>
         <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-full bg-[#fdfaf5] flex items-center justify-center text-[#c39b6a]">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div className="text-left">
              <p className="text-[8px] font-bold text-gray-400 tracking-wider">PACKAGE</p>
              <p className="text-[10px] font-semibold">{invoiceData.eventInformation.package}</p>
            </div>
         </div>
         <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-full bg-[#fdfaf5] flex items-center justify-center text-[#c39b6a]">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            </div>
            <div className="text-left">
              <p className="text-[8px] font-bold text-gray-400 tracking-wider">PHOTOGRAPHER</p>
              <p className="text-[10px] font-semibold">{invoiceData.eventInformation.photographer}</p>
            </div>
         </div>
      </div>
    </>
  );
}
