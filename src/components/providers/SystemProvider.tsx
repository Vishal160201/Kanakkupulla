"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface SystemPreferences {
  currencySymbol: string;
  hotDateThreshold: number;
  calendarTiers: { max: number; bg: string; text: string }[];
  statusColors: Record<string, { bg: string; text: string }>;
}

interface SystemContextType {
  preferences: SystemPreferences | null;
  loading: boolean;
  refreshPreferences: () => void;
}

const SystemContext = createContext<SystemContextType>({
  preferences: null,
  loading: true,
  refreshPreferences: () => {},
});

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<SystemPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = async () => {
    try {
      const res = await fetch("/api/settings/system");
      if (res.ok) {
        const data = await res.json();
        if (data.UI_PREFERENCES) {
          setPreferences(data.UI_PREFERENCES);
        }
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  return (
    <SystemContext.Provider value={{ preferences, loading, refreshPreferences: fetchPreferences }}>
      {children}
    </SystemContext.Provider>
  );
}

export const useSystem = () => useContext(SystemContext);
