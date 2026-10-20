import { STUDIO_DETAILS } from "@/lib/constants";
import { greatVibes } from "@/lib/fonts";
import type { GiftOrder, GiftOrderCustomData } from "@/types/gifts";

export const GIFT_INVOICE_TEMPLATE_ID = "gift-invoice-template";

const dateFormat: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };

/**
 * Off-screen invoice layout that generateInvoice() rasterises to PDF via html2canvas
 * (see exportPdf.ts). Rendered with fixed pixel sizes so the capture is stable.
 */
export default function GiftInvoiceTemplate({ order, customData }: { order: GiftOrder; customData: GiftOrderCustomData }) {
  return (
    <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '800px', backgroundColor: '#ffffff', zIndex: -10 }}>
       <div id={GIFT_INVOICE_TEMPLATE_ID} className="w-[800px] bg-white pt-6 px-12 pb-12 text-[#1F2937]" style={{ fontFamily: 'sans-serif' }}>
          <div className="flex justify-between items-start">
             <div className="flex items-center">
                <span className="text-[#1F2937] leading-none" style={{ fontFamily: `${greatVibes.style.fontFamily}, cursive`, fontSize: '4.5rem', fontWeight: 400 }}>Moondot</span>
                <span className="ml-3 text-[0.8rem] text-[#B66D42] tracking-[0.35em] font-medium uppercase mt-4" style={{ fontFamily: 'Inter, sans-serif' }}>STUDIO</span>
             </div>
             <div className="border-l-[3px] border-gray-300 pl-5 pt-1">
                <h1 className="text-[2.2rem] font-black text-[#1F2937] tracking-[0.1em] uppercase leading-none">Invoice</h1>
                <p className="text-[#B66D42] font-bold mt-3 text-sm">Order {order?.orderNumber?.startsWith('#') ? '' : '#'}{order?.orderNumber || order?.id?.substring(0, 8)}</p>
             </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-12 border-t border-gray-200 pt-6">
            <div className="flex flex-col border-r border-gray-200">
              <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Invoice No.</span>
              <span className="font-bold text-[#1F2937] text-[0.95rem]">{order?.orderNumber || order?.id?.substring(0, 8)}-INV</span>
            </div>
            <div className="flex flex-col border-r border-gray-200 pl-4">
              <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Invoice Date</span>
              <span className="font-bold text-[#1F2937] text-[0.95rem]">{new Date().toLocaleDateString('en-GB', dateFormat)}</span>
            </div>
            <div className="flex flex-col border-r border-gray-200 pl-4">
              <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Due Date</span>
              <span className="font-bold text-[#1F2937] text-[0.95rem]">{order?.dueDate ? new Date(order.dueDate).toLocaleDateString('en-GB', dateFormat) : 'N/A'}</span>
            </div>
            <div className="flex flex-col pl-4">
              <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-2">Status</span>
              <span className="font-bold text-[#1F2937] text-[0.95rem] uppercase">{Number(customData?.dueAmount || 0) > 0 ? 'DRAFT' : 'PAID'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 mt-8 bg-[#F8F9FA] border-y border-gray-200">
            <div className="p-5 pr-6 flex flex-col gap-2">
              <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-1">Billed To</span>
              <span className="text-[0.9rem] text-[#1F2937]">{order?.clientName || 'Client Name'}</span>
              <span className="text-[0.9rem] text-[#1F2937]">Phone: {order?.clientPhone || 'N/A'}</span>
              <span className="text-[0.9rem] text-[#1F2937]">Item: {order?.product?.name || 'Product'}</span>
            </div>
            <div className="p-5 pl-6 flex flex-col gap-2 border-l border-gray-200">
              <span className="text-[0.65rem] font-bold text-gray-500 tracking-widest uppercase mb-1">From</span>
              <span className="text-[0.9rem] text-[#1F2937]">{STUDIO_DETAILS.name}</span>
              <span className="text-[0.9rem] text-[#1F2937]">Photography & Videography</span>
              <span className="text-[0.9rem] text-[#1F2937]">{STUDIO_DETAILS.address}</span>
              <span className="text-[0.9rem] text-[#1F2937]">Email: {STUDIO_DETAILS.email}</span>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-[0.7rem] font-black text-[#1F2937] tracking-[0.15em] uppercase mb-3">Order Details</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1F2937] text-white">
                  <th className="py-2.5 px-4 text-[0.7rem] font-bold tracking-wider w-[5%]">#</th>
                  <th className="py-2.5 px-4 text-[0.7rem] font-bold tracking-wider w-[55%]">DESCRIPTION</th>
                  <th className="py-2.5 px-4 text-[0.7rem] font-bold tracking-wider w-[10%]">QTY</th>
                  <th className="py-2.5 px-4 text-[0.7rem] font-bold tracking-wider w-[15%]">RATE (₹)</th>
                  <th className="py-2.5 px-4 text-[0.7rem] font-bold tracking-wider w-[15%]">AMOUNT (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">1</td>
                  <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{order?.product?.name || 'Item'}</td>
                  <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{order?.quantity || 1}</td>
                  <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{(Number(customData?.amount || 0) / Number(order?.quantity || 1)).toFixed(2)}</td>
                  <td className="py-3 px-4 text-[0.85rem] text-[#1F2937]">{Number(customData?.amount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-[320px] flex flex-col">
              <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.85rem] text-gray-500">
                <span>Subtotal</span>
                <span>₹{Number(customData?.amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.95rem] font-bold">
                <span className="text-[#1F2937]">Total Amount</span>
                <span className="text-[#B66D42]">₹{Number(customData?.amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.85rem] text-gray-500">
                <span>Paid</span>
                <span>₹{Number(customData?.advanceAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-gray-200 text-[0.95rem] font-bold">
                <span className="text-[#1F2937]">Balance Due</span>
                <span className="text-[#B66D42]">₹{Number(customData?.dueAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-end pt-3 text-[0.65rem] font-bold text-[#B66D42] tracking-wider uppercase">
                PAYMENT PROGRESS: <span className="ml-2">{Math.round(((Number(customData?.advanceAmount || 0)) / (Number(customData?.amount || 1) || 1)) * 100)}% Paid</span>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-200">
            <h4 className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-widest mb-2">Terms & Conditions</h4>
            <p className="text-[0.65rem] text-gray-500 leading-relaxed">
              1. Please note that all invoices are due by the designated due date.<br/>
              2. For any inquiries concerning this invoice, please contact {STUDIO_DETAILS.email}.<br/>
              3. Thank you for choosing Moondot Studio for your special moments.
            </p>
          </div>
       </div>
    </div>
  );
}
