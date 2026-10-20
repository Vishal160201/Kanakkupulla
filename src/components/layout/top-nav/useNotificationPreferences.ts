"use client";

import { useState } from "react";
import { toast } from "sonner";

/** Email / push alert toggles in the profile menu (optimistic; persisted via PATCH). */
export function useNotificationPreferences() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);

  const updatePreferences = async (email: boolean, push: boolean) => {
    setEmailNotifs(email);
    setPushNotifs(push);
    await fetch("/api/users/me/preferences", {
      method: "PATCH",
      body: JSON.stringify({ emailNotifications: email, pushNotifications: push }),
      headers: { "Content-Type": "application/json" }
    });
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.warning("Push notifications are not supported in this browser (or require HTTPS/localhost). Preference saved but push is disabled.");
      updatePreferences(emailNotifs, true);
      return;
    }

    updatePreferences(emailNotifs, true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        });
        await fetch('/api/notifications/push', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        toast.error("Push notification permission was denied in browser settings.");
      }
    } catch {
      toast.error("Failed to subscribe to push notifications. Ensure you are on HTTPS or localhost.");
    }
  };

  const toggleEmail = () => updatePreferences(!emailNotifs, pushNotifs);
  const togglePush = () => {
    if (!pushNotifs) subscribeToPush();
    else updatePreferences(emailNotifs, false);
  };

  return { emailNotifs, pushNotifs, toggleEmail, togglePush };
}

export type NotificationPreferences = ReturnType<typeof useNotificationPreferences>;
