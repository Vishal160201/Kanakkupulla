"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import "./globals.css";

// Replaces the root layout when active, so it must render its own <html>/<body>
// and import global styles itself.
export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-50 text-slate-900 antialiased p-6">
        <title>Something went wrong - Kanakkupulla</title>
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
          <p className="mt-1 text-sm text-slate-500">
            The app hit an unexpected error. Please try again.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs font-mono text-slate-400">Ref: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-6 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
