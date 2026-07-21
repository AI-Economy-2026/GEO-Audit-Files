"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/ui/AuthShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        // Only surface transport-level failures (network, rate limit) and
        // never reveal whether the account exists.
        setError(error.message);
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
      setLoading(false);
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
        <p className="text-on-surface-variant mt-2 text-sm">Reset your password</p>
      </div>

      <GlassCard padding="lg">
        {submitted ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-3 bg-primary/10 border border-primary/30 rounded-xl">
              <span className="material-symbols-outlined text-primary">mark_email_read</span>
              <p className="text-on-surface text-sm">
                If an account exists for {email}, a password reset link has been sent.
              </p>
            </div>
            <p className="text-sm text-on-surface-variant">
              Check your inbox and follow the link to choose a new password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-on-surface-variant">
              Enter your email address and we&apos;ll send you a link to reset your
              password.
            </p>

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

            {error && (
              <div className="flex items-start gap-3 p-3 bg-error/10 border border-error/30 rounded-xl">
                <span className="material-symbols-outlined text-error">error</span>
                <p className="text-error text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}
      </GlassCard>

      <p className="text-center text-sm text-on-surface-variant mt-6">
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
