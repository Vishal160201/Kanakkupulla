"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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

/** Loads UI_PREFERENCES from system settings; null when absent or the request fails. */
async function loadPreferences(): Promise<SystemPreferences | null> {
  try {
    const res = await fetch("/api/settings/system");
    if (res.ok) {
      const data: { UI_PREFERENCES?: SystemPreferences } = await res.json();
      return data.UI_PREFERENCES || null;
    }
  } catch {
    // Keep defaults (preferences stay null)
  }
  return null;
}

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<SystemPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const applyPreferences = useCallback((prefs: SystemPreferences | null) => {
    if (prefs) setPreferences(prefs);
    setLoading(false);
  }, []);

  const fetchPreferences = useCallback(() => {
    loadPreferences().then(applyPreferences);
  }, [applyPreferences]);

  useEffect(() => {
    loadPreferences().then(applyPreferences);
  }, [applyPreferences]);

  return (
    <SystemContext.Provider value={{ preferences, loading, refreshPreferences: fetchPreferences }}>
      {children}
    </SystemContext.Provider>
  );
}

export const useSystem = () => useContext(SystemContext);
