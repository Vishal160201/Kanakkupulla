import { redirect } from 'next/navigation';

export default function TransactionsRootPage() {
  redirect('/dashboard/transactions/overview');
}
