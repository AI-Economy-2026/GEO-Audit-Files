"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/ui/AuthShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Route by role — admins land on the admin panel, agencies on audits.
      let dest = "/audits";
      try {
        const me = await fetch("/api/me").then((r) => r.json());
        if (me?.role === "admin") dest = "/admin";
      } catch {
        // fall back to /audits; middleware corrects if needed
      }
      router.push(dest);
      router.refresh();
    }
  }

  const inputCls =
    "w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all";

  return (
    <AuthShell>
      <div className="text-center mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gatha-wordmark-mint.svg"
          alt="Gatha"
          className="mx-auto mb-3"
          style={{ height: 34, width: "auto" }}
        />
        <p className="text-on-surface-variant mt-2 text-sm">Be Seen in AI Search</p>
      </div>

      <GlassCard padding="lg">
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@agency.com"
              className={inputCls}
              required
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={`${inputCls} pr-12`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-variant hover:text-on-surface cursor-pointer rounded-r-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-3 bg-error/10 border border-error/30 rounded-xl">
              <span className="material-symbols-outlined text-error">error</span>
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </GlassCard>

      <p className="text-center text-sm text-on-surface-variant mt-6">
        Don&apos;t have an account? Ask your Gatha administrator for an invite.
      </p>
    </AuthShell>
  );
}
