import Image from 'next/image';
import { playfair } from '@/lib/fonts';
import { invoiceData } from './invoiceData';

/** Background florals, logo / title / meta header and the arch photo. */
export default function InvoiceHeader() {
  return (
    <>
      {/* Background Images */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <Image 
          src="/booking-invoice-assets/floralPartialPaid.png" 
          alt="Floral Top Right"
          width={600} 
          height={600} 
          className="absolute -top-[100px] -right-[150px] opacity-40 rotate-[130deg] scale-150"
        />
        <Image 
          src="/booking-invoice-assets/floralPartialPaid.png" 
          alt="Floral Bottom Left"
          width={500} 
          height={500} 
          className="absolute -bottom-[50px] -left-[100px] opacity-60"
        />
      </div>

      {/* Top Header Section */}
      <div className="relative z-10 flex px-12 pt-12 items-start justify-between">
        {/* Logo & Slogan */}
        <div className="flex flex-col ml-[130px] pt-4">
          <div className="flex items-center gap-2 flex-col justify-center">
             <div className="w-8 h-8 rounded-full border border-[#c39b6a] relative mb-2">
               <div className="absolute top-1 right-1 w-2 h-2 bg-[#c39b6a] rounded-full"></div>
               <div className="absolute bottom-1 left-2 w-3 h-3 border border-[#c39b6a] rounded-full"></div>
             </div>
             <h1 className={`${playfair.className} text-3xl font-medium tracking-[0.2em] text-[#2c2c2c]`}>
               MOONDOT
             </h1>
             <p className="text-[10px] tracking-[0.3em] font-medium text-gray-500 mt-1">STUDIO</p>
             <p className="text-[7px] tracking-[0.2em] text-gray-400 mt-2">CAPTURING YOUR MEMORIES</p>
          </div>
        </div>

        {/* Invoice Title & Message */}
        <div className="flex flex-col items-center flex-1 pt-8">
          <h2 className={`${playfair.className} text-[2.5rem] tracking-[0.15em] text-[#2c2c2c]`}>
            INVOICE
          </h2>
          <div className="flex items-center gap-3 mt-4">
            <div className="h-[1px] w-8 bg-[#d8b88d]"></div>
            <div className="w-2 h-2 rotate-45 bg-[#d8b88d]"></div>
            <div className="h-[1px] w-8 bg-[#d8b88d]"></div>
          </div>
          <p className="text-xs italic text-gray-500 mt-3 font-medium">Thank you for trusting us with your special moments.</p>
        </div>

        {/* Invoice Meta */}
        <div className="flex flex-col items-end pt-4 w-[160px]">
          <h3 className="text-lg font-bold text-[#c39b6a] mb-2">{invoiceData.invoiceNumber}</h3>
          <div className="border border-[#c39b6a] rounded-full px-4 py-1 flex items-center gap-2 bg-[#fdfaf5]">
            <div className="w-2 h-2 rounded-full bg-[#c39b6a]"></div>
            <span className="text-[#c39b6a] text-[10px] font-bold tracking-wider">{invoiceData.status}</span>
          </div>
          <div className="mt-4 text-right">
            <p className="text-[10px] text-gray-500 mb-0.5">Invoice Date</p>
            <p className="text-xs font-bold">{invoiceData.invoiceDate}</p>
          </div>
          <div className="mt-3 text-right">
            <p className="text-[10px] text-gray-500 mb-0.5">Due Date</p>
            <p className="text-xs font-bold">{invoiceData.dueDate}</p>
          </div>
        </div>
      </div>

      {/* Top Left Arch Image */}
      <div className="absolute top-0 left-0 w-[160px] h-[220px] rounded-br-[100px] overflow-hidden border-r-[4px] border-b-[4px] border-[#c39b6a] z-20 shadow-lg bg-white">
        <Image src="/booking-invoice-assets/couple.png" alt="Couple" fill className="object-cover" />
      </div>
    </>
  );
}
