import type { TransactionDetail } from "@/types/transactions";
import { DetailRow, LinkRow, fieldIcon, formatCustomValue, getCategoryIcon, money } from "./detailParts";
import { sourceIcon, sourceLabel } from "../sourceLock";

interface TransactionSummarySectionProps {
  transaction: TransactionDetail;
  isIncome: boolean;
  onNavigateToBooking: (bookingId?: string) => void;
  onNavigateToOrder: (orderId?: string) => void;
  onCopyId: () => void;
}

/** Left column of the details modal: amount header and record fields. */
export default function TransactionSummarySection({ transaction, isIncome, onNavigateToBooking, onNavigateToOrder, onCopyId }: TransactionSummarySectionProps) {
  const accentIcon = isIncome
    ? "bg-emerald-50 text-emerald-600"
    : "bg-rose-50 text-rose-600";
  const accentText = isIncome ? "text-emerald-600" : "text-rose-600";
  const accentBadge = isIncome
    ? "bg-emerald-50 text-emerald-700"
    : "bg-rose-50 text-rose-700";

  return (
    <section className="border-b border-slate-100 p-5 sm:p-7 md:border-b-0 md:border-r">
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${accentIcon}`}>
          <i className={`ph-bold ${getCategoryIcon(transaction.category)} text-2xl`} />
        </div>
        <div className="min-w-0">
          <span className={`text-[11px] font-black tracking-wider ${accentText}`}>
            {transaction.type}
          </span>
          <h2 className="mt-1 truncate text-xl font-black text-slate-950">{transaction.category}</h2>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {money(transaction.amount)}
          </p>
          <span className={`mt-3 inline-flex rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${accentBadge}`}>
            {transaction.status}
          </span>
        </div>
      </div>

      <div className="my-6 h-px bg-slate-100" />

      <div className="space-y-4">
        <DetailRow
          icon="ph-calendar-blank"
          label="Date"
          value={new Date(transaction.date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <DetailRow icon="ph-wallet" label="Payment Method" value={transaction.paymentMode} />
        <DetailRow icon="ph-tag" label="Category" value={transaction.category} />
        {transaction.description && (
          <DetailRow icon="ph-note" label="Notes" value={transaction.description} multiline />
        )}
        {transaction.booking && (
          <LinkRow
            icon="ph-calendar-check"
            label="Booking"
            value={transaction.booking.bookingNumber || transaction.booking.client.name}
            onClick={() => onNavigateToBooking(transaction.booking?.id)}
          />
        )}
        {transaction.productOrder && (
          <LinkRow
            icon="ph-package"
            label="Gift Order"
            value={transaction.productOrder.orderNumber || transaction.productOrder.id}
            onClick={() => onNavigateToOrder(transaction.productOrder?.id)}
          />
        )}
        {transaction.source && (
          <DetailRow
            icon={sourceIcon(transaction.source)}
            label="Fertilizer Inventory"
            value={sourceLabel(transaction.source)}
          />
        )}
        {transaction.customFields.map((field) => (
          <DetailRow
            key={field.id}
            icon={fieldIcon(field.type, field.label)}
            label={field.label}
            value={formatCustomValue(field.value)}
            multiline
          />
        ))}
        <div className="grid grid-cols-[24px_110px_minmax(0,1fr)] items-center gap-2 text-sm sm:grid-cols-[28px_120px_minmax(0,1fr)]">
          <i className="ph-bold ph-identification-card text-lg text-slate-400" />
          <span className="font-semibold text-slate-400">Transaction ID</span>
          <button
            type="button"
            onClick={onCopyId}
            className="flex min-w-0 items-center justify-end gap-2 font-bold text-slate-700 hover:text-indigo-600"
          >
            <span className="truncate">{transaction.transactionId}</span>
            <i className="ph-bold ph-copy shrink-0" />
          </button>
        </div>
      </div>
    </section>
  );
}
