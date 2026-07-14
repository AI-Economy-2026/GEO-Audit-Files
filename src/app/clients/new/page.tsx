"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import TopNav from "@/components/ui/TopNav";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    intake_token: string;
    report_slug: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create client.");
        setSubmitting(false);
        return;
      }

      setResult(data.client);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  function copyLink() {
    if (!result) return;
    const link = `${window.location.origin}/intake/${result.intake_token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const intakeLink = result
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/intake/${result.intake_token}`
    : "";

  const inputCls =
    "w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all";

  return (
    <AppShell
      topNav={
        <TopNav
          brand="Gatha"
          tabs={[
            { href: "/audits", label: "Audits", match: (p) => p.startsWith("/audits") },
            { href: "/clients", label: "Clients", match: (p) => p.startsWith("/clients") },
          ]}
          right={
            <Button variant="ghost" size="sm" icon="arrow_back" onClick={() => router.push("/clients")}>
              Back
            </Button>
          }
        />
      }
    >
      <div className="max-w-xl mx-auto">
        <div className="mb-10">
          <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-2">
            Add a new client
          </h2>
          <p className="text-on-surface-variant text-lg">
            Generate an intake link and send it to your client to kick off their audit.
          </p>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit}>
            <GlassCard padding="lg" className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className={inputCls}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                  Website URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. acmecorp.com"
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

              <Button
                type="submit"
                size="lg"
                icon="link"
                disabled={submitting || !name || !url}
                className="w-full"
              >
                {submitting ? "Creating..." : "Generate Intake Link"}
              </Button>
            </GlassCard>
          </form>
        ) : (
          <div className="space-y-6">
            <GlassCard padding="lg" className="border-primary/30">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary">check_circle</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-1">
                    Client Added Successfully
                  </h3>
                  <p className="text-on-surface-variant text-sm">
                    Share this link with <strong className="text-on-surface">{name}</strong> to
                    start their audit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-surface-container-lowest rounded-xl border border-outline-variant p-3">
                <code className="flex-1 text-sm text-on-surface break-all font-mono">
                  {intakeLink}
                </code>
                <Button onClick={copyLink} size="sm" icon={copied ? "check" : "content_copy"}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </GlassCard>

            <div className="flex gap-4">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => {
                  setResult(null);
                  setName("");
                  setUrl("");
                }}
              >
                Add Another
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={() => router.push("/clients")}
              >
                View All Clients
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
