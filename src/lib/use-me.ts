"use client";

import { useEffect, useState } from "react";

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

interface UseMeResult {
  me: Me | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Fetches the current user's profile from /api/me. Components use it to
 *  show credit balance, disable buttons when credits=0, etc. */
export function useMe(): UseMeResult {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
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

  return { me, loading, error, refresh: load };
}
