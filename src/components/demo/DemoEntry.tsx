"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";

/** Demo site: no sign-in form. Visitors go straight in as the demo owner. */
export default function DemoEntry() {
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const enter = async () => {
    setFailed(false);
    const res = await signIn("demo", { redirect: false });
    if (res?.ok && !res.error) window.location.replace("/dashboard/overview");
    else setFailed(true);
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void enter();
  }, []);

  return (
    <div className="bg-white w-full rounded-[2rem] shadow-2xl border border-slate-100 p-8 pt-6 pb-10 text-center">
      <div className="flex justify-center mb-4">
        <Image src="/assets/logo.png" alt="Kanakkupulla" width={360} height={100} loading="eager" className="w-[300px] object-contain drop-shadow-sm" />
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
        <i aria-hidden="true" className="ph-bold ph-presentation-chart" /> Demo
      </span>
      <h1 className="mt-4 text-xl font-extrabold text-slate-900">{failed ? "Couldn't open the demo" : "Opening the demo…"}</h1>
      <p className="mt-2 text-sm font-medium text-slate-500">
        {failed ? "The demo is being refreshed. Try again in a minute." : "Sample studio, fertilizer and cable shops with made-up data. Try anything: it resets every night."}
      </p>
      {failed ? (
        <button type="button" onClick={() => void enter()} className="mt-6 h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg">
          Try again
        </button>
      ) : (
        <div className="mt-6 flex justify-center" aria-hidden="true">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        </div>
      )}
    </div>
  );
}
