import { redirect } from 'next/navigation';

export default function TransactionsRootPage() {
  redirect('/transactions/overview');
}
