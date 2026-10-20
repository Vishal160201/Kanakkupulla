"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
          <i className="ph-bold ph-warning-circle text-2xl"></i>
        </div>
        <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
        <p className="mt-1 text-sm text-slate-500">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs font-mono text-slate-400">Ref: {error.digest}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
