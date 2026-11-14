import { notFound } from "next/navigation";
import { getMoneyUser } from "@/lib/money/auth";
import { listAccounts } from "@/lib/money/queries";
import AccountsSettings from "@/components/money/AccountsSettings";
import SmsSettings from "@/components/money/SmsSettings";
import { BackupSettings, CategoriesSettings, PreferencesSettings, RulesSettings } from "@/components/money/MoreSettings";

export default async function MoneySettingsPage() {
  const user = await getMoneyUser();
  if (!user) notFound();
  return (
    <div className="space-y-6">
      <AccountsSettings initialAccounts={await listAccounts(user.id)} />
      <SmsSettings />
      <PreferencesSettings />
      <CategoriesSettings />
      <RulesSettings />
      <BackupSettings />
    </div>
  );
}
