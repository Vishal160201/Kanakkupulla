import { formatINR, formatMoneyDate, maskLast4 } from "@/lib/money/format";
import type { MoneyAccountDTO } from "@/types/money";

/** A colourful card for one account: bank, masked number and what it's set up for. */
export default function AccountTile({ account, actions }: { account: MoneyAccountDTO; actions?: React.ReactNode }) {
  const isCard = account.type === "CREDIT_CARD";
  const details = [
    isCard && account.outstandingAsOf ? `As of ${formatMoneyDate(account.outstandingAsOf)}` : null,
    isCard && account.dueDay ? `Bill due on day ${account.dueDay}` : null,
    isCard && account.creditLimit ? `Limit ${formatINR(account.creditLimit)}` : null,
    !isCard && account.manualBalance ? `Balance ${formatINR(account.manualBalance)} typed in${account.manualBalanceAsOf ? ` on ${formatMoneyDate(account.manualBalanceAsOf)}` : ""}` : null,
    !isCard ? `Warns below ${formatINR(account.lowBalanceAlert)}` : null,
    account.transactionCount > 0 ? `${account.transactionCount} transactions` : null,
  ].filter(Boolean);

  return (
    <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${account.color}, ${account.color}cc 55%, #0f172a)` }}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-2 bottom-[-3rem] w-32 h-32 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 shrink-0 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl">
            <i aria-hidden="true" className={`ph-fill ${isCard ? "ph-credit-card" : "ph-bank"}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold">{account.name}</p>
            <p className="truncate text-xs font-semibold text-white/75">{account.institution}</p>
          </div>
        </div>
        {actions}
      </div>
      {isCard && account.outstanding && (
        <div className="relative mt-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Used</p>
          <p className="text-2xl font-extrabold leading-tight">{formatINR(account.outstanding)}</p>
        </div>
      )}
      <div className={`relative ${isCard && account.outstanding ? "mt-3" : "mt-6"} flex flex-wrap items-end justify-between gap-x-3 gap-y-2`}>
        <p className="shrink-0 whitespace-nowrap text-lg font-bold tracking-[0.2em]">{maskLast4(account.last4)}</p>
        <div className="ml-auto flex flex-wrap justify-end gap-1.5">
          {account.isPool && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-extrabold">
              <i aria-hidden="true" className="ph-fill ph-drop" /> Available money
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-extrabold">{isCard ? "Credit card" : "Bank"}</span>
        </div>
      </div>
      {details.length > 0 && <p className="relative mt-3 text-[11px] font-semibold text-white/75">{details.join(" · ")}</p>}
    </div>
  );
}
