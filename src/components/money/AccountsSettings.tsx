"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { readError } from "@/components/settings/users/userHelpers";
import type { MoneyAccountDTO, MoneyAccountInput } from "@/types/money";
import AccountFormDialog from "./AccountFormDialog";
import AccountTile from "./AccountTile";

const KEY = "/api/money/accounts";

/** /money/settings: add, edit and remove the bank accounts and cards the tracker follows. */
export default function AccountsSettings({ initialAccounts }: { initialAccounts: MoneyAccountDTO[] }) {
  const { data: accounts = initialAccounts, mutate } = useSWR<MoneyAccountDTO[]>(KEY, fetcher, { fallbackData: initialAccounts });
  const [editing, setEditing] = useState<MoneyAccountDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<MoneyAccountDTO | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>();

  const closeForm = () => {
    setEditing(null);
    setServerErrors(undefined);
  };

  const save = async (input: MoneyAccountInput) => {
    const current = editing === "new" ? null : editing;
    setIsSaving(true);
    setServerErrors(undefined);
    try {
      const res = await fetch(current ? `${KEY}/${current.id}` : KEY, {
        method: current ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const { message, errors } = await readError(res, "Couldn't save the account");
        setServerErrors(errors);
        toast.error(message);
        return;
      }
      await mutate();
      toast.success(current ? "Account updated" : "Account added");
      closeForm();
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${KEY}/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error((await readError(res, "Couldn't delete the account")).message);
        return;
      }
      await mutate(accounts.filter((a) => a.id !== deleting.id), { revalidate: true });
      toast.success("Account removed");
      setDeleting(null);
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const banks = accounts.filter((a) => a.type === "BANK");
  const cards = accounts.filter((a) => a.type === "CREDIT_CARD");

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 md:p-7 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Accounts and cards</h2>
          <p className="text-sm font-semibold text-slate-400">The bank accounts you import statements for, and the cards you track spends on.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="h-11 shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-sm font-bold text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)] hover:brightness-105 transition inline-flex items-center justify-center gap-2"
        >
          <i aria-hidden="true" className="ph-bold ph-plus" /> Add account
        </button>
      </div>

      {accounts.length === 0 ? (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="mt-6 w-full rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-10 text-center hover:bg-emerald-50 transition"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center text-2xl shadow-md">
            <i aria-hidden="true" className="ph-fill ph-bank" />
          </div>
          <p className="mt-3 text-base font-extrabold text-slate-800">Add your first account</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Start with HDFC savings, KVB savings, and your HDFC and Kiwi cards.</p>
        </button>
      ) : (
        <div className="mt-6 space-y-6">
          {[
            { title: "Bank accounts", list: banks },
            { title: "Credit cards", list: cards },
          ]
            .filter((group) => group.list.length > 0)
            .map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[1.5px] text-slate-400">{group.title}</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.list.map((account) => (
                    <AccountTile
                      key={account.id}
                      account={account}
                      actions={
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${account.name}`}
                            onClick={() => setEditing(account)}
                            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                          >
                            <i aria-hidden="true" className="ph-bold ph-pencil-simple" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${account.name}`}
                            onClick={() => setDeleting(account)}
                            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
                          >
                            <i aria-hidden="true" className="ph-bold ph-trash" />
                          </button>
                        </div>
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {editing && (
        <AccountFormDialog
          account={editing === "new" ? null : editing}
          isSaving={isSaving}
          serverErrors={serverErrors}
          onSubmit={save}
          onClose={closeForm}
        />
      )}

      {deleting && (
        <Dialog open onOpenChange={(open) => !open && !isSaving && setDeleting(null)}>
          <DialogContent
            showCloseButton={false}
            className="w-[calc(100vw-2rem)] max-w-[400px] sm:max-w-[400px] rounded-3xl border-0 bg-white p-7 text-center shadow-2xl gap-0"
          >
            <div className="w-16 h-16 rounded-full border-2 bg-red-50 border-red-100 flex items-center justify-center mx-auto mb-5">
              <i aria-hidden="true" className="ph-fill ph-trash text-3xl text-red-500" />
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900 mb-1">Delete {deleting.name}?</DialogTitle>
            <p className="text-sm text-slate-500 mb-6">
              {deleting.transactionCount > 0
                ? "This account has imported transactions, so it can't be deleted yet."
                : "It has no transactions yet, so nothing else is lost."}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={isSaving}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={isSaving || deleting.transactionCount > 0}
                className="flex-1 h-11 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isSaving && <i aria-hidden="true" className="ph-bold ph-circle-notch animate-spin" />}
                Delete
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
