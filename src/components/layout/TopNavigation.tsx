"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useMobileNav } from "../providers/MobileNavProvider";
import GlobalSearch from "./top-nav/GlobalSearch";
import NotificationsMenu from "./top-nav/NotificationsMenu";
import ProfileMenu, { type NavUser } from "./top-nav/ProfileMenu";
import StudioShopPicker from "./top-nav/StudioShopPicker";
import StudioBrand from "./top-nav/StudioBrand";
import { useNotificationPreferences } from "./top-nav/useNotificationPreferences";

const AVATAR_BUTTON = "w-[45px] h-[45px] rounded-full flex items-center justify-center font-extrabold text-base cursor-pointer shadow-sm transition-colors";

function getTitle(pathname: string) {
  if (pathname.includes("bookings")) return "Bookings Management";
  if (pathname.includes("galleries")) return "Galleries Management";
  if (pathname.includes("analytics")) return "Analytics";
  if (pathname.includes("transactions")) return "Ledger & Analytics";
  if (pathname.includes("settings")) return "Settings";
  if (pathname.includes("gifts")) return "Gifts & Frames";
  return "Moondot studio";
}

export default function TopNavigation() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { toggleSidebar } = useMobileNav();
  const { data: session } = useSession();
  const preferences = useNotificationPreferences();

  // Keep-alive ping (result unused by the header itself).
  useSWR("/api/ping", fetcher, { refreshInterval: 60000 });

  const userName = session?.user?.name || "Studio User";
  const userRole = session?.user?.role || "STAFF";
  const user: NavUser = {
    name: userName,
    email: session?.user?.email || "user@example.com",
    role: userRole,
    initials: userName.substring(0, 2).toUpperCase(),
    isStudioOwner: userRole === "ADMIN",
  };

  const title = getTitle(pathname);
  const isPersonal = pathname.startsWith("/personal");

  if (isPersonal) {
    return (
      <header className="relative flex justify-between items-center px-4 md:px-10 py-4 md:py-5 bg-slate-900 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-white shadow-sm hover:bg-slate-700 transition-colors"
          >
            <i className="ph-bold ph-list text-[1.4rem]"></i>
          </button>
          <h1 className="text-xl font-semibold text-white tracking-tight">Personal Finance</h1>
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          <ProfileMenu
            user={user}
            preferences={preferences}
            buttonClassName={`${AVATAR_BUTTON} bg-white text-slate-900 hover:bg-slate-100`}
          />
        </div>
      </header>
    );
  }

  return (
    <header className={`relative flex ${title ? 'justify-between' : 'justify-end'} items-center px-4 md:px-10 py-4 md:py-5 bg-slate-50 z-50`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <i className="ph-bold ph-list text-[1.4rem]"></i>
        </button>

        {pathname.includes("settings") && (
          <button
            onClick={() => {
              const search = new URLSearchParams(window.location.search);
              search.set("menu", "open");
              router.push(`${pathname}?${search.toString()}`);
            }}
            type="button"
            aria-label="Open settings menu"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-orange-50 border border-orange-200 text-orange-600 shadow-sm hover:bg-orange-100 transition-colors"
          >
            <i className="ph-bold ph-faders text-[1.4rem]"></i>
          </button>
        )}

        {title && title === "Moondot studio" ? (
          <StudioBrand />
        ) : (
          title && <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 tracking-tight hidden sm:block">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <GlobalSearch />
        <NotificationsMenu />
        <StudioShopPicker />
        <ProfileMenu
          user={user}
          preferences={preferences}
          buttonClassName={`${AVATAR_BUTTON} bg-slate-900 text-white hover:bg-slate-800`}
        />
      </div>
    </header>
  );
}
