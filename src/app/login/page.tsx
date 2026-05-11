"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/ui/AuthShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      router.push("/audits");
      router.refresh();
    }
  }

  const inputCls =
    "w-full px-4 py-3 bg-surface-container-lowest border border-white/5 rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all";

  return (
    <AuthShell>
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center shadow-[0_0_30px_rgba(68,216,241,0.3)]">
          <span className="material-symbols-outlined text-on-primary-fixed text-3xl">radar</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tighter text-on-surface">GEO Audit Pro</h1>
        <p className="text-on-surface-variant mt-2 text-sm">AI Visibility Auditing Platform</p>
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
              className={inputCls}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              required
            />
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
        Don&apos;t have an account? Ask your RankCo administrator for an invite.
      </p>
    </AuthShell>
  );
}
