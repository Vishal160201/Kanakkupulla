"use client";

import type React from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { fetcher } from "@/lib/fetcher";
import { useDismiss } from "./useDismiss";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

interface NotificationsResponse {
  notifications?: AppNotification[];
  unreadCount?: number;
  unreadReminderCount?: number;
}

const SNOOZABLE_TYPES = [
  'ORDER_STATUS_STALE', 'BOOKING_STATUS_STALE', 'PAYMENT_DUE_REMINDER',
  'ADVANCE_NOT_COLLECTED', 'GALLERY_NOT_DELIVERED', 'ALBUM_PENDING_REMINDER'
];

const isToday = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

function NotificationIcon({ type }: { type: string }) {
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${type === 'PAYMENT_DUE_REMINDER' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
      <i className={`ph-fill ${
        type?.includes('BOOKING') || type === 'HOT_DATE_ALERT' ? 'ph-calendar-check' :
        type?.includes('PAYMENT') ? 'ph-receipt' :
        type?.includes('ORDER') ? 'ph-package' :
        'ph-bell'} text-[1.1rem]`}></i>
    </div>
  );
}

interface NotificationItemProps {
  notification: AppNotification;
  onOpen: (id: string, link?: string | null) => void;
  onSnooze: (id: string, e: React.MouseEvent) => void;
}

function NotificationItem({ notification, onOpen, onSnooze }: NotificationItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(notification.id, notification.actionUrl)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(notification.id, notification.actionUrl);
        }
      }}
      className={`p-4 border-b border-gray-50 flex gap-3 cursor-pointer transition-colors group ${!notification.isRead ? 'bg-blue-50/30 hover:bg-blue-50/60' : 'bg-white hover:bg-slate-50'}`}
    >
      <NotificationIcon type={notification.type} />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <span className={`text-[0.85rem] truncate ${!notification.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{notification.title}</span>
          <span className="text-[0.65rem] text-slate-400 shrink-0 whitespace-nowrap mt-0.5">
            {new Date(notification.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>
        <p className={`text-[0.8rem] line-clamp-2 ${!notification.isRead ? 'text-slate-700' : 'text-slate-500'}`}>
          {notification.message}
        </p>
        {SNOOZABLE_TYPES.includes(notification.type) && (
          <button
            type="button"
            onClick={(e) => onSnooze(notification.id, e)}
            className="mt-2 text-[0.7rem] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded hover:bg-orange-100 transition-colors self-start"
          >
            Snooze 1 day
          </button>
        )}
      </div>
      {!notification.isRead && (
        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${notification.type?.includes('REMINDER') ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
      )}
    </div>
  );
}

const GROUP_HEADING = "bg-slate-50 px-4 py-1.5 border-b border-gray-100 text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10";

export default function NotificationsMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  useDismiss(notificationsRef, () => setIsNotificationsOpen(false));

  const { data: notificationsData, mutate: mutateNotifications } = useSWR<NotificationsResponse>(
    session ? "/api/notifications?limit=20" : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const notifications = notificationsData?.notifications || [];
  const unreadTotal = (notificationsData?.unreadCount || 0) + (notificationsData?.unreadReminderCount || 0);

  // Swipe-to-dismiss state for mobile notifications
  const [startY, setStartY] = useState<number | null>(null);
  const [deltaY, setDeltaY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      setDeltaY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (deltaY > 100) {
      setIsNotificationsOpen(false);
    }
    setStartY(null);
    setDeltaY(0);
  };

  const handleMarkAsRead = async (id: string, link?: string | null) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      mutateNotifications();
      setIsNotificationsOpen(false);
      if (link) router.push(link);
    } catch {
      // Ignore: the list refreshes on the next poll.
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
      mutateNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSnooze = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}/snooze`, { method: "PATCH" });
      mutateNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const todayNotifs = notifications.filter((n) => isToday(n.createdAt));
  const earlierNotifs = notifications.filter((n) => !isToday(n.createdAt));
  const renderNotif = (notification: AppNotification) => (
    <NotificationItem key={notification.id} notification={notification} onOpen={handleMarkAsRead} onSnooze={handleSnooze} />
  );

  return (
    <div className="relative" ref={notificationsRef}>
      <button
        type="button"
        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
        aria-label={unreadTotal > 0 ? `Notifications (${unreadTotal} unread)` : "Notifications"}
        aria-expanded={isNotificationsOpen}
        className="bg-white border border-gray-200 rounded-full w-[45px] h-[45px] flex items-center justify-center relative cursor-pointer shadow-sm hover:bg-slate-50 transition-colors"
      >
        <i className="ph-fill ph-bell text-slate-600 text-[1.4rem]"></i>
        {unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[0.65rem] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white box-content shadow-sm">
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>
        )}
      </button>

      {isNotificationsOpen && (
        <>
          <div className="fixed inset-0 z-[45] md:hidden bg-black/20 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setIsNotificationsOpen(false)}></div>
          <div
            className={`fixed md:absolute inset-x-0 bottom-0 md:bottom-auto md:top-[calc(100%+10px)] md:left-auto md:right-0 md:w-[380px] bg-white rounded-t-3xl md:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border-t md:border border-gray-100 z-50 flex flex-col max-h-[85dvh] md:max-h-[70dvh] overflow-hidden transform origin-bottom md:origin-top-right ${deltaY === 0 ? 'transition-all animate-slide-up-mobile md:animate-none' : ''}`}
            style={{ transform: deltaY > 0 ? `translateY(${deltaY}px)` : undefined }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-[40px] h-[4px] bg-[#e2e8f0] rounded-[2px] mx-auto my-[8px] md:hidden shrink-0"></div>
            <div className="flex justify-between items-center px-5 pb-5 pt-2 md:p-4 border-b border-gray-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-[1.1rem] md:text-[0.95rem]">Notifications</h3>
              </div>
            {unreadTotal > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[0.75rem] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[60dvh] overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                <i className="ph-fill ph-bell-slash text-3xl mb-2 text-slate-300"></i>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {todayNotifs.length > 0 && (
                  <>
                    <div className={GROUP_HEADING}>Today</div>
                    {todayNotifs.map(renderNotif)}
                  </>
                )}
                {earlierNotifs.length > 0 && (
                  <>
                    <div className={GROUP_HEADING}>Earlier</div>
                    {earlierNotifs.map(renderNotif)}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
