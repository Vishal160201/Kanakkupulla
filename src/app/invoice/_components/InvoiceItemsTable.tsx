import { formatCurrency, invoiceData } from './invoiceData';

/** Line items table. */
export default function InvoiceItemsTable() {
  return (
    <>
      {/* Invoice Table */}
      <div className="relative z-10 mx-12 mt-5 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#2c2c2c] text-white text-[9px] uppercase tracking-wider">
              <th className="py-3 px-6 font-medium rounded-tl-xl w-[55%]">Description</th>
              <th className="py-3 px-4 font-medium text-center">Qty</th>
              <th className="py-3 px-4 font-medium text-right">Unit Price</th>
              <th className="py-3 px-6 font-medium text-right rounded-tr-xl">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-50 last:border-b-0">
                <td className="py-3 px-6">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded bg-[#fdfaf5] flex items-center justify-center shrink-0">
                       {item.icon === 'camera' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c39b6a" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>}
                       {item.icon === 'book' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c39b6a" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>}
                       {item.icon === 'drone' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c39b6a" strokeWidth="2"><path d="M12 2v20M2 12h20M12 12l8.5 8.5M12 12L3.5 3.5M12 12l8.5-8.5M12 12L3.5 20.5"/></svg>}
                       {item.icon === 'light' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c39b6a" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>}
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-gray-800">{item.description}</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">{item.subDescription}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-center text-xs font-medium text-gray-700">{item.qty}</td>
                <td className="py-3 px-4 text-right text-xs font-medium text-gray-700">{formatCurrency(item.unitPrice)}</td>
                <td className="py-3 px-6 text-right text-xs font-medium text-gray-800">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
