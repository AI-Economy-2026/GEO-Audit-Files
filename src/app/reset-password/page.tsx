"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/ui/AuthShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionState, setSessionState] = useState<
    "checking" | "ready" | "missing"
  >("checking");
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // The recovery link signs the user in via URL params; the session may
    // land synchronously or arrive via an auth event just after mount.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setSessionState("ready");
      else if (event === "INITIAL_SESSION") setSessionState("missing");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionState((prev) =>
        prev === "ready" ? prev : session ? "ready" : "missing"
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  }

  const inputCls =
    "w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all";

  const eyeBtnCls =
    "absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-variant hover:text-on-surface cursor-pointer rounded-r-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors";

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
        <p className="text-on-surface-variant mt-2 text-sm">Choose a new password</p>
      </div>

      <GlassCard padding="lg">
        {sessionState === "checking" ? (
          <p className="text-center text-sm text-on-surface-variant py-4">
            Verifying reset link...
          </p>
        ) : sessionState === "missing" ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-3 bg-error/10 border border-error/30 rounded-xl">
              <span className="material-symbols-outlined text-error">link_off</span>
              <p className="text-error text-sm">
                This reset link is invalid or has expired. Request a new one.
              </p>
            </div>
            <p className="text-center text-sm">
              <Link href="/forgot-password" className="text-primary hover:underline">
                Request a new reset link
              </Link>
            </p>
          </div>
        ) : done ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-3 bg-primary/10 border border-primary/30 rounded-xl">
              <span className="material-symbols-outlined text-primary">check_circle</span>
              <p className="text-on-surface text-sm">Password updated</p>
            </div>
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => {
                router.push("/audits");
                router.refresh();
              }}
            >
              Continue
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={`${inputCls} pr-12`}
                  minLength={8}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className={eyeBtnCls}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your new password"
                  className={`${inputCls} pr-12`}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  aria-pressed={showConfirm}
                  className={eyeBtnCls}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showConfirm ? "visibility_off" : "visibility"}
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
              {loading ? "Updating..." : "Update password"}
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
