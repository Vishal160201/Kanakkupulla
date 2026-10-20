"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import PersonalRecycleBin from "./recycle-bin/PersonalRecycleBin";
import StudioRecycleBin from "./recycle-bin/StudioRecycleBin";
import { useStudioRecycleBin } from "./recycle-bin/useStudioRecycleBin";

const PERSONAL_TRACKER_EMAIL = process.env.NEXT_PUBLIC_PERSONAL_TRACKER_EMAIL;

export default function RecycleBin() {
  const { data: session } = useSession();
  const isPersonalEnabled = !!PERSONAL_TRACKER_EMAIL && session?.user?.email === PERSONAL_TRACKER_EMAIL;
  const [activeTab, setActiveTab] = useState<"studio" | "personal">("studio");

  // Lives here (not in StudioRecycleBin) so paging/selection survive tab switches.
  const studioBin = useStudioRecycleBin();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-[fadeIn_0.3s_ease-out]">
      {isPersonalEnabled && (
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          {(["studio", "personal"] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-bold relative transition-all duration-200 ease-in-out ${
                activeTab === tab ? "text-orange-600 scale-[1.02]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-t-sm animate-[fadeIn_0.2s_ease-out]" />
              )}
            </button>
          ))}
        </div>
      )}

      {activeTab === "personal" ? <PersonalRecycleBin /> : <StudioRecycleBin bin={studioBin} />}
    </div>
  );
}
