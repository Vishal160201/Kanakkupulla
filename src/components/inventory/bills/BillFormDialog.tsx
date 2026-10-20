"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CustomDropdown, { type DropdownOption } from "@/components/ui/CustomDropdown";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { Tooltip } from "@/components/ui/Tooltip";
import type { BillKind, CreditCustomer, InventoryBill, InventoryBillInput, InventoryProduct } from "@/types/inventory";
import { FieldError, InventoryDialog, MoneyInput, RequiredMark, inputClass, inputErrorClass, labelClass, primaryButtonClass, secondaryButtonClass } from "../InventoryUI";
import {
  PAYMENT_MODE_OPTIONS,
  errorDetails,
  errorMessage,
  formatINR,
  formatQty,
  packLabel,
  parseDecimal,
  quantityUnit,
  roundMoney,
  sanitizeDecimal,
  sendJson,
  todayISO,
  useRevalidateInventory,
} from "../inventoryUtils";
import { useCreditCustomers, useInventoryProducts } from "../useInventoryData";
import { validateParty } from "../farmers/FarmerFormDialog";
import { parseLineErrors } from "./lineErrors";
import { cn } from "@/lib/utils";

interface LineDraft {
  key: number;
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface LineErrors {
  product?: string;
  quantity?: string;
  unitPrice?: string;
}

interface BillFormDialogProps {
  shopId: string;
  kind: BillKind;
  /** Preselects a customer (sales). */
  defaultCustomerId?: string;
  onClose: () => void;
  onCreated?: (bill: InventoryBill) => void;
}

const NEW_CUSTOMER = "__new__";

/** New Sale / New Purchase bill. Mount only while open. */
export default function BillFormDialog({ shopId, kind, defaultCustomerId, onClose, onCreated }: BillFormDialogProps) {
  const isSale = kind === "SALE";
  const router = useRouter();
  const revalidate = useRevalidateInventory();
  const { data: productData, isLoading: productsLoading } = useInventoryProducts(shopId);
  const { data: customerData, mutate: mutateCustomers } = useCreditCustomers(isSale ? shopId : null);

  const nextKey = useRef(1);
  const newLine = (): LineDraft => ({ key: nextKey.current++, productId: "", quantity: "", unitPrice: "" });

  const [date, setDate] = useState(todayISO());
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [supplierName, setSupplierName] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [{ key: 0, productId: "", quantity: "", unitPrice: "" }]);
  const [paid, setPaid] = useState("");
  const [paidTouched, setPaidTouched] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<Record<number, LineErrors>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inline "Add new farmer" mini-form.
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", place: "" });
  const [newCustomerErrors, setNewCustomerErrors] = useState<Record<string, string>>({});
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [createdCustomers, setCreatedCustomers] = useState<CreditCustomer[]>([]);

  const products = useMemo(() => (productData?.products ?? []).filter((p) => !p.isArchived), [productData]);
  const productById = useMemo(() => new Map<string, InventoryProduct>(products.map((p) => [p.id, p])), [products]);
  const customers = useMemo(() => {
    const list = [...(customerData?.customers ?? [])];
    for (const c of createdCustomers) if (!list.some((x) => x.id === c.id)) list.push(c);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [customerData, createdCustomers]);
  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  // ----- Derived amounts -----------------------------------------------------
  const lineAmount = (line: LineDraft) => {
    const q = parseDecimal(line.quantity);
    const p = parseDecimal(line.unitPrice);
    return Number.isFinite(q) && Number.isFinite(p) ? roundMoney(q * p) : 0;
  };
  const total = roundMoney(lines.reduce((sum, l) => sum + lineAmount(l), 0));
  const paidValue = isSale ? (paidTouched ? parseDecimal(paid) : total) : total;
  const credit = isSale && Number.isFinite(paidValue) ? roundMoney(Math.max(0, total - paidValue)) : 0;

  // Quantity of each product across all lines (a product may only be on one line, but be safe).
  const qtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of lines) {
      const q = parseDecimal(l.quantity);
      if (l.productId && Number.isFinite(q)) map.set(l.productId, (map.get(l.productId) ?? 0) + q);
    }
    return map;
  }, [lines]);

  /** Live per-line checks (stock is checked as you type; the rest after the first submit). */
  const computeLineErrors = (forSubmit: boolean): Record<number, LineErrors> => {
    const out: Record<number, LineErrors> = {};
    for (const line of lines) {
      const errs: LineErrors = {};
      const isBlank = !line.productId && !line.quantity && !line.unitPrice;
      const product = productById.get(line.productId);
      const q = parseDecimal(line.quantity);
      const p = parseDecimal(line.unitPrice);
      if (forSubmit && !isBlank) {
        if (!line.productId) errs.product = "Choose a product.";
        if (!line.quantity) errs.quantity = "Enter quantity.";
        else if (!Number.isFinite(q) || q <= 0) errs.quantity = "Must be more than 0.";
        if (!line.unitPrice) errs.unitPrice = "Enter rate.";
        else if (!Number.isFinite(p) || p < 0) errs.unitPrice = "Invalid rate.";
      }
      if (isSale && product && Number.isFinite(q) && q > 0 && (qtyByProduct.get(product.id) ?? 0) > product.stock) {
        errs.quantity = product.stock <= 0 ? "Out of stock." : `Only ${formatQty(product.stock)} ${quantityUnit(product, product.stock)} in stock.`;
      }
      if (Object.keys(errs).length > 0) out[line.key] = errs;
    }
    return out;
  };
  const liveLineErrors = computeLineErrors(submitted);
  const shownLineErrors = (key: number): LineErrors => ({ ...lineErrors[key], ...liveLineErrors[key] });

  // ----- Line editing ---------------------------------------------------------
  const updateLine = (key: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    // Server errors for a line no longer apply once it changes.
    setLineErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const selectProduct = (key: number, productId: string) => {
    const product = productById.get(productId);
    updateLine(key, { productId, unitPrice: product ? String(product.price) : "" });
  };
  const removeLine = (key: number) => setLines((prev) => (prev.length <= 1 ? [newLine()] : prev.filter((l) => l.key !== key)));

  const productOptionsFor = (line: LineDraft): DropdownOption[] => {
    const usedElsewhere = new Set(lines.filter((l) => l.key !== line.key && l.productId).map((l) => l.productId));
    return products
      .filter((p) => !usedElsewhere.has(p.id))
      .map((p) => ({
        label: `${p.name} · ${packLabel(p)}`,
        value: p.id,
        hint: p.stock <= 0 ? "Out of stock" : `${formatQty(p.stock)} ${quantityUnit(p, p.stock)}`,
      }));
  };

  // ----- Customer -------------------------------------------------------------
  const customerOptions: DropdownOption[] = [
    { label: "Walk-in (no farmer)", value: "", icon: "user" },
    ...customers.map((c) => ({ label: c.place ? `${c.name} · ${c.place}` : c.name, value: c.id, hint: c.balance > 0 ? `Due ${formatINR(c.balance)}` : undefined })),
    { label: "Add new farmer", value: NEW_CUSTOMER, icon: "user-plus" },
  ];

  const onCustomerChange = (value: string) => {
    if (value === NEW_CUSTOMER) {
      setAddingCustomer(true);
      return;
    }
    setCustomerId(value);
    setErrors((prev) => ({ ...prev, customer: "" }));
  };

  const saveNewCustomer = async () => {
    const errs = validateParty(newCustomer.name, newCustomer.phone);
    setNewCustomerErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSavingCustomer(true);
    try {
      const res = await sendJson<{ customer: CreditCustomer }>("/api/inventory/customers", "POST", {
        shopId,
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim() || undefined,
        place: newCustomer.place.trim() || undefined,
      });
      if (res?.customer) {
        setCreatedCustomers((prev) => [...prev, { ...res.customer, balance: res.customer.balance ?? 0 }]);
        setCustomerId(res.customer.id);
      }
      toast.success(`${newCustomer.name.trim()} added`);
      setAddingCustomer(false);
      setNewCustomer({ name: "", phone: "", place: "" });
      setErrors((prev) => ({ ...prev, customer: "" }));
      void mutateCustomers();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingCustomer(false);
    }
  };

  // ----- Submit ---------------------------------------------------------------
  const submit = async () => {
    setSubmitted(true);
    const errs: Record<string, string> = {};
    const filled = lines.filter((l) => l.productId || l.quantity || l.unitPrice);
    const perLine = computeLineErrors(true);
    if (filled.length === 0) errs.lines = "Add at least one product.";
    if (!date) errs.date = "Choose a date.";
    if (isSale) {
      if (!Number.isFinite(paidValue) || paidValue < 0) errs.paid = "Enter a valid amount.";
      else if (paidValue > total) errs.paid = `Can't be more than the total (${formatINR(total)}).`;
      else if (paidValue < total && !customerId) errs.customer = "Choose a farmer — the unpaid amount goes on their credit.";
    }
    if (!paymentMode) errs.paymentMode = "Choose a payment mode.";
    setErrors(errs);
    setLineErrors({});
    if (Object.keys(errs).length > 0 || Object.keys(perLine).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const body: InventoryBillInput = {
      shopId,
      kind,
      date,
      paymentMode,
      notes: notes.trim() || undefined,
      lines: filled.map((l) => ({ productId: l.productId, quantity: parseDecimal(l.quantity), unitPrice: parseDecimal(l.unitPrice) })),
    };
    if (isSale) {
      if (customerId) body.customerId = customerId;
      body.paidAmount = roundMoney(paidValue);
    } else if (supplierName.trim()) {
      body.supplierName = supplierName.trim();
    }

    setSaving(true);
    try {
      const res = await sendJson<{ bill: InventoryBill }>("/api/inventory/bills", "POST", body);
      const bill = res?.bill;
      toast.success(`${isSale ? "Sale" : "Purchase"}${bill?.billNumber ? ` ${bill.billNumber}` : ""} saved`, {
        description:
          isSale && credit > 0 && selectedCustomer
            ? `${formatINR(credit)} added to ${selectedCustomer.name}'s credit.`
            : "Stock and Daily Kanakku updated.",
      });
      revalidate();
      if (bill) onCreated?.(bill);
      onClose();
    } catch (err) {
      const serverLineErrors = parseLineErrors(errorDetails(err), filled.map((l) => ({ key: l.key, productId: l.productId })));
      if (Object.keys(serverLineErrors).length > 0) {
        setLineErrors(Object.fromEntries(Object.entries(serverLineErrors).map(([k, message]) => [k, { quantity: message }])));
      }
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const noProducts = !productsLoading && products.length === 0;
  const allOutOfStock = isSale && products.length > 0 && products.every((p) => p.stock <= 0);

  return (
    <InventoryDialog
      open
      onClose={onClose}
      busy={saving}
      size="xl"
      eyebrow={isSale ? "New sale" : "New purchase"}
      title={isSale ? "Sell fertilizer" : "Record stock purchase"}
      subtitle={isSale ? "Stock goes down; the paid amount is posted to Daily Kanakku." : "Stock goes up; the total is posted to Daily Kanakku as an expense."}
      footer={
        <>
          <div className="mr-auto flex flex-col justify-center">
            <span className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">Total</span>
            <span className="text-xl font-black text-slate-900 leading-tight">{formatINR(total)}</span>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>Cancel</button>
          <button type="submit" form="bill-form" disabled={saving || noProducts} className={primaryButtonClass}>
            {saving ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
            {isSale ? "Save sale" : "Save purchase"}
          </button>
        </>
      }
    >
      <form
        id="bill-form"
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {/* Date + party */}
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
          <div>
            <span className={labelClass}>Date <RequiredMark /></span>
            <DatePickerInput value={date} onChange={setDate} hasError={!!errors.date} disableFutureDates />
            <FieldError message={errors.date} />
          </div>
          {isSale ? (
            <div>
              <div className="flex items-center justify-between">
                <span className={labelClass}>Farmer {credit > 0 && <RequiredMark />}</span>
                {!addingCustomer && (
                  <button type="button" onClick={() => setAddingCustomer(true)} className="mb-2 text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
                    <i className="ph-bold ph-user-plus" /> New farmer
                  </button>
                )}
              </div>
              <CustomDropdown options={customerOptions} value={customerId} onChange={onCustomerChange} error={!!errors.customer} placeholder="Walk-in (no farmer)" />
              <FieldError message={errors.customer} />
            </div>
          ) : (
            <div>
              <label htmlFor="bill-supplier" className={labelClass}>Supplier</label>
              <input id="bill-supplier" value={supplierName} maxLength={120} onChange={(e) => setSupplierName(e.target.value)} placeholder="Supplier / company name" className={inputClass} />
            </div>
          )}
        </div>

        {isSale && addingCustomer && (
          <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 space-y-3 animate-slide-down">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <i className="ph-bold ph-user-plus text-orange-500" /> New farmer
              </span>
              <button type="button" aria-label="Cancel new farmer" onClick={() => { setAddingCustomer(false); setNewCustomerErrors({}); }} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-700">
                <i className="ph-bold ph-x text-xs" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  aria-label="Farmer name"
                  autoFocus
                  value={newCustomer.name}
                  maxLength={100}
                  onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void saveNewCustomer(); } }}
                  placeholder="Name *"
                  className={cn(inputClass, newCustomerErrors.name && inputErrorClass)}
                />
                <FieldError message={newCustomerErrors.name} />
              </div>
              <div>
                <input
                  aria-label="Farmer phone"
                  type="tel"
                  inputMode="tel"
                  value={newCustomer.phone}
                  maxLength={20}
                  onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void saveNewCustomer(); } }}
                  placeholder="Phone"
                  className={cn(inputClass, newCustomerErrors.phone && inputErrorClass)}
                />
                <FieldError message={newCustomerErrors.phone} />
              </div>
              <input
                aria-label="Farmer village or place"
                value={newCustomer.place}
                maxLength={100}
                onChange={(e) => setNewCustomer((c) => ({ ...c, place: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void saveNewCustomer(); } }}
                placeholder="Village / place"
                className={inputClass}
              />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => void saveNewCustomer()} disabled={savingCustomer} className={cn(primaryButtonClass, "h-10")}>
                {savingCustomer ? <i className="ph ph-circle-notch animate-spin" /> : <i className="ph-bold ph-check" />}
                Add customer
              </button>
            </div>
          </div>
        )}

        {/* Lines */}
        <div>
          <span className={labelClass}>Items <RequiredMark /></span>
          {noProducts ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 flex flex-col items-center gap-3 text-center">
              <i className="ph-bold ph-package text-2xl text-slate-300" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-500">
                No products yet. Add your products (name, pack, price) in Fertilizer Inventory first.
              </p>
              <button type="button" onClick={() => { onClose(); router.push("/inventory?tab=products"); }} className={cn(secondaryButtonClass, "h-10")}>
                <i className="ph-bold ph-plus" /> Add products
              </button>
            </div>
          ) : (
            <>
              {allOutOfStock && (
                <div className="mb-3 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <i className="ph-bold ph-warning text-lg mt-0.5" aria-hidden="true" />
                  <span>Every product is out of stock. Record a <span className="font-extrabold">New Purchase</span> first to add stock.</span>
                </div>
              )}
              <div className="hidden md:grid grid-cols-[1fr_120px_130px_120px_36px] gap-2 px-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-[1.2px] text-slate-400">
                <span>Product</span>
                <span>Quantity</span>
                <span>Rate</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              <ul className="space-y-2">
                {lines.map((line, idx) => {
                  const product = productById.get(line.productId);
                  const le = shownLineErrors(line.key);
                  return (
                    <li key={line.key} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5 md:p-1.5 md:bg-transparent md:border-0">
                      <div className="grid grid-cols-[1fr_36px] md:grid-cols-[1fr_120px_130px_120px_36px] gap-2 items-start">
                        <div className="min-w-0">
                          <CustomDropdown
                            options={productOptionsFor(line)}
                            value={line.productId}
                            onChange={(v) => selectProduct(line.key, v)}
                            error={!!le.product}
                            placeholder={productsLoading ? "Loading products…" : `Item ${idx + 1}: choose product`}
                          />
                          <FieldError message={le.product} />
                        </div>
                        <div className="md:order-last pt-1.5 md:pt-0">
                          <Tooltip content="Remove item">
                            <button
                              type="button"
                              aria-label={`Remove item ${idx + 1}`}
                              onClick={() => removeLine(line.key)}
                              className="h-9 w-9 md:h-[45px] flex items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            >
                              <i className="ph-bold ph-trash" />
                            </button>
                          </Tooltip>
                        </div>
                        <div className="col-span-2 md:col-span-3 grid grid-cols-3 md:grid-cols-[120px_130px_120px] gap-2 md:contents">
                          <div className="min-w-0">
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                autoComplete="off"
                                aria-label={`Quantity for item ${idx + 1}`}
                                aria-invalid={!!le.quantity || undefined}
                                value={line.quantity}
                                onChange={(e) => updateLine(line.key, { quantity: sanitizeDecimal(e.target.value) })}
                                placeholder="Qty"
                                className={cn(inputClass, "h-[45px] pr-11", le.quantity && inputErrorClass)}
                              />
                              {product && (
                                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 max-w-[40px] truncate">{quantityUnit(product, 2)}</span>
                              )}
                            </div>
                            <FieldError message={le.quantity} />
                          </div>
                          <div className="min-w-0">
                            <MoneyInput
                              ariaLabel={`Rate for item ${idx + 1}`}
                              value={line.unitPrice}
                              onChange={(v) => updateLine(line.key, { unitPrice: sanitizeDecimal(v, 2) })}
                              hasError={!!le.unitPrice}
                              placeholder="Rate"
                              className="[&_input]:h-[45px]"
                            />
                            <FieldError message={le.unitPrice} />
                          </div>
                          <div className="h-[45px] flex items-center justify-end px-1 text-sm font-extrabold text-slate-900 truncate">
                            {formatINR(lineAmount(line))}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, newLine()])}
                disabled={lines.length >= products.length}
                className="mt-2 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-dashed border-slate-300 text-sm font-bold text-slate-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50/50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <i className="ph-bold ph-plus" /> Add item
              </button>
              <FieldError message={errors.lines} />
            </>
          )}
        </div>

        {/* Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isSale && (
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="bill-paid" className={labelClass}>Paid now <RequiredMark /></label>
                <div className="mb-2 flex gap-2 text-[11px] font-bold">
                  <button type="button" onClick={() => { setPaidTouched(false); setPaid(""); }} className="text-slate-500 hover:text-orange-600">Full</button>
                  <button type="button" onClick={() => { setPaidTouched(true); setPaid("0"); }} className="text-slate-500 hover:text-orange-600">Full credit</button>
                </div>
              </div>
              <MoneyInput
                id="bill-paid"
                value={paidTouched ? paid : total ? String(total) : ""}
                onChange={(v) => { setPaidTouched(true); setPaid(sanitizeDecimal(v, 2)); setErrors((prev) => ({ ...prev, paid: "" })); }}
                hasError={!!errors.paid}
                placeholder="0"
              />
              <FieldError message={errors.paid} />
            </div>
          )}
          <div>
            <span className={labelClass}>Payment mode <RequiredMark /></span>
            <CustomDropdown options={PAYMENT_MODE_OPTIONS} value={paymentMode} onChange={setPaymentMode} error={!!errors.paymentMode} placeholder="Payment mode" />
            <FieldError message={errors.paymentMode} />
          </div>
        </div>

        {isSale && credit > 0 && (
          <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", selectedCustomer ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-700")}>
            <i className="ph-bold ph-hand-coins text-lg mt-0.5" aria-hidden="true" />
            <div>
              {selectedCustomer ? (
                <>
                  Credit: <span className="font-extrabold">{formatINR(credit)}</span> will be added to <span className="font-extrabold">{selectedCustomer.name}</span>&apos;s balance
                  {selectedCustomer.balance > 0 && <> (now {formatINR(selectedCustomer.balance)}, after {formatINR(selectedCustomer.balance + credit)})</>}.
                </>
              ) : (
                <>
                  <span className="font-extrabold">{formatINR(credit)}</span> is unpaid. Choose a farmer to give credit, or set Paid now to the full amount.
                </>
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="bill-notes" className={labelClass}>Notes</label>
          <textarea
            id="bill-notes"
            value={notes}
            maxLength={500}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isSale ? "Optional, e.g. vehicle number, crop" : "Optional, e.g. invoice number"}
            className={cn(inputClass, "h-20 py-2.5 resize-none")}
          />
        </div>
      </form>
    </InventoryDialog>
  );
}
