import React, { Suspense } from "react";
import TransactionsClient from "./TransactionsClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading transactions...</div>}>
      <TransactionsClient />
    </Suspense>
  );
}
