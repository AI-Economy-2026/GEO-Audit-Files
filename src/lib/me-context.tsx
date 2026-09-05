"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface Me {
  userId: string;
  email: string;
  role: "admin" | "agency";
  agencyName: string | null;
  contactName: string | null;
  creditsRemaining: number;
  creditsUsed: number;
  status: "active" | "suspended";
}

interface MeContextValue {
  me: Me | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const MeContext = createContext<MeContextValue | null>(null);

/** Fetches the current user's profile from /api/me exactly once for the
 *  whole app (mounted at the root layout, so it survives client-side
 *  navigation between pages instead of refetching on every route). */
export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load profile");
      setMe(data as Me);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <MeContext.Provider value={{ me, loading, error, refresh: load }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe(): MeContextValue {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used within MeProvider");
  return ctx;
}
