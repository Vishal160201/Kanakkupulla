'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { inter } from '@/lib/fonts';
import InvoiceHeader from './_components/InvoiceHeader';
import InvoiceParties from './_components/InvoiceParties';
import InvoiceItemsTable from './_components/InvoiceItemsTable';
import InvoiceFinancials from './_components/InvoiceFinancials';
import InvoicePaymentAndTerms from './_components/InvoicePaymentAndTerms';
import InvoiceFooter from './_components/InvoiceFooter';

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true once running on the client. */
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

export default function InvoicePage() {
  const mounted = useIsClient();

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { size: A4; margin: 0; }
        body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
        .no-print { display: none !important; }
        .print-shadow-none { box-shadow: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-10 font-sans">

      <div className="absolute top-4 right-4 no-print z-50">
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-[#c39b6a] text-white px-6 py-2 rounded-md shadow-md hover:bg-[#b08959] transition font-medium flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
          Print PDF
        </button>
      </div>

      <div
        className={`relative w-[210mm] h-[297mm] bg-[#fbfaf6] print-shadow-none shadow-2xl overflow-hidden ${inter.className}`}
        style={{ color: '#2c2c2c' }}
      >
        <InvoiceHeader />
        <InvoiceParties />
        <InvoiceItemsTable />
        <InvoiceFinancials />
        <InvoicePaymentAndTerms />
        <InvoiceFooter />
      </div>
    </div>
  );
}
