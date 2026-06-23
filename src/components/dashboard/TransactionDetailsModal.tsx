"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";

type TransactionDetailsModalProps = {
  transactionId: string;
};

type CustomField = {
  id: string;
  label: string;
  type: string;
  value: unknown;
};

type TransactionDetailResponse = {
  transaction: {
    id: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    date: string;
    category: string;
    paymentMode: string;
    description?: string | null;
    status: string;
    attachmentUrl?: string | null;
    bookingId?: string | null;
    booking?: {
      id: string;
      bookingNumber?: string | null;
      category: string;
      client: { name: string };
    } | null;
    user?: { id: string; name?: string | null; email?: string | null } | null;
    customFields: CustomField[];
  };
  impact: {
    dayIncome: number;
    dayExpenses: number;
    dayNet: number;
    categoryTotal: number;
    categoryShare: number;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Failed to load transaction");
  return body;
};

const money = (value: number) =>
  `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getCategoryIcon = (category: string) => {
  const value = category.toLowerCase();
  if (value.includes("photo")) return "ph-camera";
  if (value.includes("print") || value.includes("xerox")) return "ph-printer";
  if (value.includes("travel") || value.includes("bus")) return "ph-bus";
  if (value.includes("salary") || value.includes("wage")) return "ph-money";
  if (value.includes("tea") || value.includes("food") || value.includes("coffee")) return "ph-coffee";
  if (value.includes("chit") || value.includes("fund") || value.includes("saving")) return "ph-piggy-bank";
  if (value.includes("fuel") || value.includes("petrol")) return "ph-gas-pump";
  if (value.includes("rent") || value.includes("office")) return "ph-house";
  if (value.includes("repair") || value.includes("equipment")) return "ph-wrench";
  return "ph-receipt";
};

const formatCustomValue = (value: unknown) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const fieldIcon = (type: string, label: string) => {
  const normalized = `${type} ${label}`.toLowerCase();
  if (normalized.includes("tag")) return "ph-tag";
  if (normalized.includes("date")) return "ph-calendar-blank";
  if (normalized.includes("phone")) return "ph-phone";
  if (normalized.includes("email")) return "ph-envelope-simple";
  if (normalized.includes("user")) return "ph-user";
  if (normalized.includes("currency") || normalized.includes("amount")) return "ph-currency-inr";
  if (normalized.includes("status")) return "ph-seal-check";
  if (normalized.includes("note") || normalized.includes("description")) return "ph-note";
  return "ph-info";
};

export default function TransactionDetailsModal({
  transactionId,
}: TransactionDetailsModalProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data, error, isLoading } = useSWR<TransactionDetailResponse>(
    `/api/transactions/${transactionId}`,
    fetcher
  );

  const close = () => router.back();

  const receipt = useMemo(() => {
    const url = data?.transaction.attachmentUrl;
    if (!url) return null;
    const cleanUrl = url.split("?")[0];
    const rawName = cleanUrl.split("/").pop() || "Transaction receipt";
    return {
      url,
      name: decodeURIComponent(rawName),
      isImage: url.startsWith("data:image/") || /\.(png|jpe?g|webp|gif)$/i.test(cleanUrl),
    };
  }, [data?.transaction.attachmentUrl]);

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      await mutate(
        (key) => typeof key === "string" && key.startsWith("/api/transactions"),
        undefined,
        { revalidate: true }
      );
      toast.success("Transaction deleted");
      setShowDeleteConfirm(false);
      close();
    } catch {
      toast.error("Could not delete the transaction");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyId = async () => {
    await navigator.clipboard.writeText(transactionId);
    toast.success("Transaction ID copied");
  };

  const transaction = data?.transaction;
  const isIncome = transaction?.type === "INCOME";
  const accentIcon = isIncome
    ? "bg-emerald-50 text-emerald-600"
    : "bg-rose-50 text-rose-600";
  const accentText = isIncome ? "text-emerald-600" : "text-rose-600";
  const accentBadge = isIncome
    ? "bg-emerald-50 text-emerald-700"
    : "bg-rose-50 text-rose-700";
  const signedImpact = isIncome ? transaction?.amount || 0 : -(transaction?.amount || 0);

  return (
    <>
      <Dialog open={!showDeleteConfirm} onOpenChange={(open) => !open && close()}>
        <DialogContent
          showCloseButton={false}
          className="!fixed !left-0 !right-0 !bottom-0 !top-auto !flex !w-full !max-w-none !translate-x-0 !translate-y-0 flex-col md:!left-1/2 md:!right-auto md:!top-1/2 md:!bottom-auto md:!-translate-x-1/2 md:!-translate-y-1/2 md:!max-w-[960px] max-h-[96dvh] md:max-h-[90vh] gap-0 overflow-hidden !rounded-t-[28px] !rounded-b-none md:!rounded-[28px] border-0 bg-white p-0 shadow-2xl"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 sm:px-7">
            <div>
              <DialogTitle className="text-lg font-black text-slate-950 sm:text-xl">
                Transaction Details
              </DialogTitle>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400 sm:hidden">
                Review the complete record
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              aria-label="Close transaction details"
            >
              <i className="ph-bold ph-x text-xl" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="grid min-h-[520px] place-items-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <i className="ph ph-circle-notch animate-spin text-3xl text-orange-500" />
                  <span className="text-sm font-bold">Loading transaction…</span>
                </div>
              </div>
            ) : error || !transaction || !data ? (
              <div className="grid min-h-[420px] place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                    <i className="ph-bold ph-warning-circle text-3xl" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Transaction unavailable</h3>
                  <p className="mt-2 text-sm text-slate-500">{error?.message || "This record could not be found."}</p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-[0.9fr_1.1fr]">
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
                      <button
                        type="button"
                        onClick={() => router.push(`/bookings/details/${transaction.booking?.id}`)}
                        className="grid w-full grid-cols-[24px_110px_minmax(0,1fr)] items-start gap-2 text-left text-sm sm:grid-cols-[28px_120px_minmax(0,1fr)]"
                      >
                        <i className="ph-bold ph-calendar-check mt-0.5 text-lg text-slate-400" />
                        <span className="font-semibold text-slate-400">Booking</span>
                        <span className="text-right font-bold text-indigo-600 hover:underline">
                          {transaction.booking.bookingNumber || transaction.booking.client.name}
                        </span>
                      </button>
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
                        onClick={copyId}
                        className="flex min-w-0 items-center justify-end gap-2 font-bold text-slate-700 hover:text-indigo-600"
                      >
                        <span className="truncate">{transaction.id}</span>
                        <i className="ph-bold ph-copy shrink-0" />
                      </button>
                    </div>
                  </div>
                </section>

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
                      total={isIncome ? data.impact.dayIncome : data.impact.dayExpenses}
                      change={transaction.amount}
                      positive={isIncome}
                    />
                    <ImpactRow
                      label="Day net"
                      total={data.impact.dayNet}
                      change={signedImpact}
                      positive={signedImpact >= 0}
                    />
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-4 text-sm">
                      <span className="min-w-0 truncate font-semibold text-slate-500">
                        {transaction.category} total
                      </span>
                      <span className="font-black text-slate-800">{money(data.impact.categoryTotal)}</span>
                      <span className="w-14 text-right font-bold text-slate-400">
                        {data.impact.categoryShare.toFixed(1)}%
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
              </div>
            )}
          </div>

          {!isLoading && transaction && (
            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-white p-3 sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="order-2 col-span-2 h-11 rounded-xl bg-rose-50 px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-100 sm:order-1 sm:col-span-1"
              >
                <i className="ph-bold ph-trash mr-2" />
                Delete
              </button>
              <div className="order-1 col-span-2 grid grid-cols-2 gap-2 sm:order-2 sm:col-span-1 sm:flex">
                <button
                  type="button"
                  onClick={() => router.push(`/transactions/${transaction.id}/edit`)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <i className="ph-bold ph-pencil-simple mr-2" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="h-11 rounded-xl bg-orange-500 px-7 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[400px] rounded-3xl border-0 bg-white p-7 text-center shadow-2xl"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <i className="ph-fill ph-trash text-3xl" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900">Delete transaction?</DialogTitle>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            This permanently removes the transaction and updates your totals.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="h-11 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="h-11 rounded-xl bg-rose-500 font-bold text-white hover:bg-rose-600 disabled:opacity-60"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
  multiline = false,
}: {
  icon: string;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="grid grid-cols-[24px_110px_minmax(0,1fr)] items-start gap-2 text-sm sm:grid-cols-[28px_120px_minmax(0,1fr)]">
      <i className={`ph-bold ${icon} mt-0.5 text-lg text-slate-400`} />
      <span className="font-semibold text-slate-400">{label}</span>
      <span className={`text-right font-bold text-slate-700 ${multiline ? "break-words" : "truncate"}`}>
        {value}
      </span>
    </div>
  );
}

function ImpactRow({
  label,
  total,
  change,
  positive,
}: {
  label: string;
  total: number;
  change: number;
  positive: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-slate-100 px-4 py-4 text-sm">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="font-black text-slate-800">{money(total)}</span>
      <span className={`w-[86px] text-right font-black ${positive ? "text-emerald-500" : "text-rose-500"}`}>
        {change >= 0 ? "+" : "−"}{money(Math.abs(change))}
      </span>
    </div>
  );
}
