"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Calendar, ArrowRight, Clock, MapPin, User } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json()).catch(() => ({ show: false }));

export default function GlobalBannerProvider({ children }: { children: React.ReactNode }) {
  const [isDismissed, setIsDismissed] = useState(true);
  const [todayKey, setTodayKey] = useState("");
  const [isWithinTimeWindow, setIsWithinTimeWindow] = useState(false);

  // Calculate tomorrow's date for the CTA link
  const tomorrowISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA');
  }, []);

  const { data, isLoading } = useSWR('/api/banner', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 10000, // Poll every 10 seconds to detect setting changes automatically
    suspense: false
  });

  useEffect(() => {
    if (!data?.settings) return;

    const checkTime = () => {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMin = now.getMinutes().toString().padStart(2, '0');
      const timeStr = `${currentHour}:${currentMin}`;

      let slot = 0;
      // Sort times to ensure we check correctly even if time1 > time2 in settings
      const times = [data.settings.bannerTime1, data.settings.bannerTime2].sort();
      const t1 = times[0];
      const t2 = times[1];

      if (timeStr >= t2) {
        slot = 2;
      } else if (timeStr >= t1) {
        slot = 1;
      }

      if (slot > 0) {
        const activeTime = slot === 2 ? t2 : t1;
        const key = `bannerDismissed:${new Date().toLocaleDateString('en-CA')}_slot${slot}_time${activeTime}`;
        
        setTodayKey((prev) => (prev !== key ? key : prev));
        setIsWithinTimeWindow(true);

        const dismissed = sessionStorage.getItem(key);
        
        if (!dismissed) {
          setIsDismissed((prev) => (prev !== false ? false : prev));
        } else {
          setIsDismissed((prev) => (prev !== true ? true : prev));
        }
      } else {
        setIsWithinTimeWindow(false);
      }
    };

    checkTime();
    const intervalId = setInterval(checkTime, 10000); // Check every 10 seconds

    return () => clearInterval(intervalId);
  }, [data]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (todayKey) {
      sessionStorage.setItem(todayKey, "true");
    }
  };

  const showBanner = !isLoading && data?.show && !isDismissed;

  return (
    <>
      {children}
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ease-out ${showBanner ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleDismiss}
        />
        <div
          className={`relative w-full max-w-[960px] min-h-[480px] bg-transparent rounded-[24px] shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-400 ease-out ${showBanner ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 -translate-y-2 opacity-0'}`}
        >
          <Image
            src="/banner-bg.png"
            alt="Background"
            fill
            className="absolute inset-0 z-0 object-cover scale-[1.05]"
          />

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-40 w-8 h-8 flex items-center justify-center rounded-full bg-slate-900/50 hover:bg-slate-900 text-white transition-colors border border-white/10"
          >
            <X size={18} strokeWidth={2.5} />
          </button>

          {/* Left Panel */}
          <div className="p-8 md:p-10 w-full md:w-[45%] relative z-20 flex flex-col justify-center shrink-0">
            <div className="flex items-center gap-2 bg-purple-500/20 w-fit px-3 py-1.5 rounded-full border border-purple-500/30 mb-6">
              <Calendar size={14} className="text-purple-300" />
              <span className="text-xs font-bold text-purple-200">Next 2 Days</span>
            </div>

            <h2 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-2 tracking-tight">
              Shoot <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                polama?
              </span>
            </h2>

            <p className="text-slate-300 text-lg mb-8 max-w-sm">
              Here's your shoot plan for the <span className="text-pink-400 font-semibold">next 2 days</span>.
            </p>

            <Link
              href={`/bookings/upcoming?date=${tomorrowISO}`}
              onClick={handleDismiss}
              className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3.5 rounded-full font-bold text-[15px] transition-all hover:-translate-y-0.5 w-fit"
            >
              View Schedule
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Right Panel */}
          <div className="w-full md:w-[55%] relative z-20 flex flex-col justify-end p-6 md:p-8 pt-0 md:pt-8 min-h-[300px] md:min-h-0">
            {/* Photographer Image Container */}
            <div className="absolute inset-0 z-10 hidden md:block pointer-events-none overflow-visible">
              <Image
                src="/banner-photographer.png"
                alt="Photographer"
                fill
                style={{ objectFit: 'contain', objectPosition: 'bottom center' }}
                className="drop-shadow-[0_0_40px_rgba(139,92,246,0.6)] scale-[1.35] origin-bottom -translate-y-20"
              />
            </div>

            {/* Booking Cards */}
            <div className={`relative z-30 w-full grid ${data?.day1?.length > 0 && data?.day2?.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
            {data?.day1?.length > 0 && (
              <div className="flex-1 w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg hover:bg-white/[0.15] transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center shadow-sm">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">Tomorrow</div>
                    <div className="text-purple-300 text-[10px] font-semibold uppercase tracking-wider">Day 1</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.day1.slice(0, 2).map((b: any) => (
                    <Link 
                      href={`/bookings/details/${b.id}`} 
                      onClick={handleDismiss}
                      key={b.id} 
                      className="group/item block p-2 -mx-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-white font-semibold text-sm truncate">{b.category} Shoot</div>
                        {b.client?.name && (
                          <div className="text-purple-300/80 text-[11px] flex items-center gap-1 shrink-0">
                            <User size={10} />
                            <span className="truncate max-w-[80px]">{b.client.name.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="text-slate-400 text-xs flex items-center gap-1 shrink-0">
                          <Clock size={10} className="text-slate-500" />
                          {b.time}
                        </div>
                        {b.location && (
                          <div className="text-slate-400 text-xs flex items-center gap-1 truncate">
                            <MapPin size={10} className="text-slate-500 shrink-0" />
                            <span className="truncate max-w-[140px]">{b.location}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  {data.day1.length > 2 && <div className="text-xs text-purple-300 font-medium">+{data.day1.length - 2} more</div>}
                </div>
              </div>
            )}

            {data?.day2?.length > 0 && (
              <div className="flex-1 w-full bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg hover:bg-white/[0.15] transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shadow-sm">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">Day after tomorrow</div>
                    <div className="text-pink-300 text-[10px] font-semibold uppercase tracking-wider">Day 2</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.day2.slice(0, 2).map((b: any) => (
                    <Link 
                      href={`/bookings/details/${b.id}`}
                      onClick={handleDismiss}
                      key={b.id} 
                      className="group/item block p-2 -mx-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-white font-semibold text-sm truncate">{b.category} Shoot</div>
                        {b.client?.name && (
                          <div className="text-pink-300/80 text-[11px] flex items-center gap-1 shrink-0">
                            <User size={10} />
                            <span className="truncate max-w-[80px]">{b.client.name.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="text-slate-400 text-xs flex items-center gap-1 shrink-0">
                          <Clock size={10} className="text-slate-500" />
                          {b.time}
                        </div>
                        {b.location && (
                          <div className="text-slate-400 text-xs flex items-center gap-1 truncate">
                            <MapPin size={10} className="text-slate-500 shrink-0" />
                            <span className="truncate max-w-[140px]">{b.location}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  {data.day2.length > 2 && <div className="text-xs text-pink-300 font-medium">+{data.day2.length - 2} more</div>}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
