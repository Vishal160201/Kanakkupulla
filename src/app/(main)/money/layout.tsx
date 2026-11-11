import { notFound } from "next/navigation";
import { getMoneyUser } from "@/lib/money/auth";
import { isMoneyEncryptionConfigured } from "@/lib/money/crypto";
import { ensureMoneySetup } from "@/lib/money/server/setup";
import MoneyTabs from "@/components/money/MoneyTabs";
import QuickAdd from "@/components/money/QuickAdd";

export const dynamic = "force-dynamic";

/** Personal money tracker: private to one account (the proxy and every /api/money route check it too). */
export default async function MoneyLayout({ children }: { children: React.ReactNode }) {
  const user = await getMoneyUser();
  if (!user) notFound();
  const keyReady = isMoneyEncryptionConfigured();
  if (keyReady) await ensureMoneySetup(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <MoneyTabs />
        <p className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <i aria-hidden="true" className="ph-fill ph-lock-simple text-emerald-500" /> Only you can see this. Bank text is stored encrypted.
        </p>
      </div>
      {keyReady ? (
        <div>
          {children}
          <QuickAdd />
        </div>
      ) : (
        <section className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-rose-700">
          <p className="text-base font-extrabold flex items-center gap-2">
            <i aria-hidden="true" className="ph-fill ph-lock-key" /> The encryption key isn&apos;t set up
          </p>
          <p className="mt-1 text-sm font-semibold">
            Bank text is stored encrypted. Add MONEY_ENCRYPTION_KEY (32 random bytes, base64) to the environment, the same value locally and on Vercel, then reload.
          </p>
        </section>
      )}
    </div>
  );
}
