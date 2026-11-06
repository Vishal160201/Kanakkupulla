"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { InvoiceSettingKey } from "@/lib/invoiceSettings";
import { cn } from "@/lib/utils";

type Values = Partial<Record<InvoiceSettingKey, string>>;

interface Field {
  key: InvoiceSettingKey;
  label: string;
  hint?: string;
  multiline?: boolean;
  wide?: boolean;
  /** Placeholder when there's no built-in default */
  example?: string;
}

const GROUPS: { title: string; icon: string; description: string; fields: Field[] }[] = [
  {
    title: "Studio",
    icon: "ph-storefront",
    description: "The From card and the header",
    fields: [
      { key: "studio_name", label: "Studio name" },
      { key: "studio_tagline", label: "Tagline", hint: "Under the logo" },
      { key: "studio_phone", label: "Phone" },
      { key: "studio_email", label: "Email" },
      { key: "studio_address", label: "Address", multiline: true, wide: true },
      { key: "studio_gstin", label: "GSTIN", hint: "Leave blank if you aren't GST registered; the line is left out", example: "33ABCDE1234F1Z5" },
    ],
  },
  {
    title: "Payments",
    icon: "ph-currency-inr",
    description: "How clients pay the balance",
    fields: [
      { key: "studio_upi_id", label: "UPI ID", hint: "The QR on the invoice fills in the balance for the client" },
      { key: "studio_bank_account_name", label: "Account name", hint: "Defaults to the studio name", example: "Moondot Studio" },
      { key: "studio_bank_account_number", label: "Account number", hint: "The bank block shows once the number and IFSC are filled", example: "50200012345678" },
      { key: "studio_bank_ifsc", label: "IFSC code", example: "HDFC0001234" },
      { key: "studio_bank_name", label: "Bank and branch", example: "HDFC Bank, Tenkasi" },
    ],
  },
  {
    title: "Links",
    icon: "ph-link",
    description: "The contact bar and the thank-you card on paid invoices",
    fields: [
      { key: "studio_instagram", label: "Instagram" },
      { key: "studio_website", label: "Website" },
      { key: "studio_review_url", label: "Google review link", hint: "Adds a “Leave a review” link to paid invoices", example: "https://g.page/r/…/review", wide: true },
    ],
  },
  {
    title: "Terms & conditions",
    icon: "ph-list-checks",
    description: "One term per line",
    fields: [{ key: "studio_terms", label: "Terms", multiline: true, wide: true }],
  },
];

const inputClass =
  "w-full text-sm font-semibold text-slate-800 bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 placeholder:font-medium placeholder:text-slate-400";

export default function InvoiceDetailsSettings() {
  const [values, setValues] = useState<Values>({});
  const [defaults, setDefaults] = useState<Values>({});
  const [saved, setSaved] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/invoice")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { values: Values; defaults: Values };
        setValues(data.values);
        setSaved(data.values);
        setDefaults(data.defaults);
      })
      .catch(() => toast.error("Couldn't load the invoice details"))
      .finally(() => setLoading(false));
  }, []);

  const dirty = GROUPS.some((g) => g.fields.some((f) => (values[f.key] ?? "") !== (saved[f.key] ?? "")));

  const set = (key: InvoiceSettingKey, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = Object.fromEntries(GROUPS.flatMap((g) => g.fields.map((f) => [f.key, values[f.key] ?? ""])));
      const res = await fetch("/api/settings/invoice", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { values?: Values; error?: string; errors?: Record<string, string> };
      if (!res.ok) {
        setErrors(data.errors ?? {});
        throw new Error(data.error || "Couldn't save the invoice details");
      }
      setValues(data.values ?? {});
      setSaved(data.values ?? {});
      toast.success("Invoice details saved", { description: "New and re-opened invoices use them straight away." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the invoice details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading invoice details...</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col lg:h-[calc(100vh-140px)]">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Invoice Details</h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">What every booking invoice shows about your studio. Blank fields use the default shown in grey.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href="/api/settings/invoice/preview"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (dirty) {
                e.preventDefault();
                toast.info("Save your changes first", { description: "The preview shows the saved details." });
              }
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-[0.85rem] text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <i className="ph-bold ph-file-pdf" aria-hidden="true" /> Preview invoice
          </a>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-[0.85rem] hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <i className={cn("ph-bold", saving ? "ph-spinner animate-spin" : "ph-check")} aria-hidden="true" />
            {saving ? "Saving…" : "Save details"}
          </button>
        </div>
      </div>

      <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
        {GROUPS.map((group) => (
          <section key={group.title} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <i className={`ph-bold ${group.icon} text-lg`} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-[0.95rem] font-extrabold text-slate-900">{group.title}</h3>
                <p className="text-xs font-semibold text-slate-500">{group.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {group.fields.map((f) => {
                const id = `invoice-${f.key}`;
                const placeholder = defaults[f.key] ?? f.example ?? "";
                return (
                  <div key={f.key} className={f.wide || f.multiline ? "sm:col-span-2" : undefined}>
                    <label htmlFor={id} className="block text-xs font-bold text-slate-600 mb-1.5">
                      {f.label}
                    </label>
                    {f.multiline ? (
                      <textarea
                        id={id}
                        rows={f.key === "studio_terms" ? 6 : 2}
                        value={values[f.key] ?? ""}
                        placeholder={placeholder}
                        onChange={(e) => set(f.key, e.target.value)}
                        className={cn(inputClass, "resize-y leading-relaxed", errors[f.key] && "border-red-400")}
                      />
                    ) : (
                      <input
                        id={id}
                        type="text"
                        value={values[f.key] ?? ""}
                        placeholder={placeholder}
                        onChange={(e) => set(f.key, e.target.value)}
                        className={cn(inputClass, errors[f.key] && "border-red-400")}
                      />
                    )}
                    {errors[f.key] ? (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors[f.key]}</p>
                    ) : (
                      f.hint && <p className="text-xs font-medium text-slate-400 mt-1">{f.hint}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
