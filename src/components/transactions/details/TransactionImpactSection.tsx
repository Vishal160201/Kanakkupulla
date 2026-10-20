import type { TransactionDetail, TransactionImpact } from "@/types/transactions";
import { ImpactRow, money } from "./detailParts";

export interface ReceiptInfo {
  url: string;
  name: string;
  isImage: boolean;
}

interface TransactionImpactSectionProps {
  transaction: TransactionDetail;
  impact: TransactionImpact;
  receipt: ReceiptInfo | null;
  isIncome: boolean;
}

/** Right column of the details modal: day impact, attachment, record info. */
export default function TransactionImpactSection({ transaction, impact, receipt, isIncome }: TransactionImpactSectionProps) {
  const signedImpact = isIncome ? transaction.amount || 0 : -(transaction.amount || 0);

  return (
    <section className="space-y-5 bg-slate-50/40 p-5 sm:p-7">
      <div>
        <h3 className="text-base font-black text-slate-900">Impact on selected day</h3>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          Totals for {new Date(transaction.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ImpactRow
          label={isIncome ? "Day income" : "Day expenses"}
          total={isIncome ? impact.dayIncome : impact.dayExpenses}
          change={transaction.amount}
          positive={isIncome}
        />
        <ImpactRow
          label="Day net"
          total={impact.dayNet}
          change={signedImpact}
          positive={signedImpact >= 0}
        />
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-4 text-sm">
          <span className="min-w-0 truncate font-semibold text-slate-500">
            {transaction.category} total
          </span>
          <span className="font-black text-slate-800">{money(impact.categoryTotal)}</span>
          <span className="w-14 text-right font-bold text-slate-400">
            {impact.categoryShare.toFixed(1)}%
          </span>
        </div>
      </div>

      {receipt && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-slate-900">Receipt / Attachment</h3>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
              {receipt.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={receipt.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <i className="ph-bold ph-file text-2xl" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{receipt.name}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">Saved with this transaction</p>
            </div>
            <a
              href={receipt.url}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
              aria-label="Open attachment"
            >
              <i className="ph-bold ph-arrow-square-out text-lg" />
            </a>
            <a
              href={receipt.url}
              download={receipt.name}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
              aria-label="Download attachment"
            >
              <i className="ph-bold ph-download-simple text-lg" />
            </a>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <i className="ph-bold ph-clock-counter-clockwise text-xl" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900">Record information</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
              {transaction.user?.name || transaction.user?.email || "Legacy transaction"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
