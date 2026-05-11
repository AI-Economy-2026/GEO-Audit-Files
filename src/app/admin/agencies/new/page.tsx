"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

export default function NewAgencyPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [credits, setCredits] = useState<number>(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLink, setActionLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setActionLink(null);

    try {
      const res = await fetch("/api/admin/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          agency_name: agencyName.trim(),
          contact_name: contactName.trim() || null,
          credits,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite agency.");
      // If Supabase didn't ship the email itself, we can hand over the
      // action_link for the admin to forward manually.
      if (data.action_link) {
        setActionLink(data.action_link);
      } else {
        router.push("/admin/agencies");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to invite agency.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminShell title="Agencies → New">
      <div className="page-head">
        <div>
          <h1>Invite an agency</h1>
          <p>
            They&rsquo;ll get a magic-link email to set their password, then land on /clients with their
            starting credit balance.
          </p>
        </div>
      </div>

      {actionLink ? (
        <div className="card pad-lg" style={{ marginBottom: 18 }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 600,
              margin: "0 0 10px",
              color: "var(--text)",
            }}
          >
            ✓ Agency invited
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 14 }}>
            Supabase didn&rsquo;t deliver the email (SMTP not configured). Send this magic-link to the
            agency manually:
          </p>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              padding: 12,
              borderRadius: "var(--r-md)",
              background: "var(--inset)",
              border: "1px solid var(--border-soft)",
              wordBreak: "break-all",
              color: "var(--mint)",
              marginBottom: 14,
            }}
          >
            {actionLink}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-sm"
              onClick={() => navigator.clipboard.writeText(actionLink)}
            >
              Copy link
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => router.push("/admin/agencies")}
            >
              Done — view agencies
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card pad-lg" style={{ maxWidth: 560 }}>
          <Field
            label="Agency name"
            hint="What the agency will see in the sidebar / topbar."
            required
          >
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="e.g. Balmer Agency"
              required
            />
          </Field>

          <Field
            label="Contact email"
            hint="Where the invite email is sent. Must be unique."
            required
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@agency.com"
              required
            />
          </Field>

          <Field label="Primary contact name (optional)" hint="Just for your records.">
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Sarah Balmer"
            />
          </Field>

          <Field
            label="Initial credits"
            hint="Each completed audit costs 1 credit. Add more later from the agency detail page."
            required
          >
            <input
              type="number"
              min={0}
              value={credits}
              onChange={(e) => setCredits(Math.max(0, parseInt(e.target.value || "0", 10)))}
              required
            />
          </Field>

          {error && (
            <div
              style={{
                padding: 12,
                borderRadius: "var(--r-md)",
                background: "var(--crit-weak)",
                border: "1px solid var(--crit-line)",
                color: "var(--text-2)",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => router.push("/admin/agencies")}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-sm btn-primary"
              disabled={submitting || !email || !agencyName}
            >
              {submitting ? "Inviting..." : "Invite agency"}
            </button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          marginBottom: 6,
        }}
      >
        {label}
        {required && <span style={{ color: "var(--crit)", marginLeft: 4 }}>*</span>}
      </label>
      <div
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          padding: "10px 14px",
        }}
      >
        <style jsx>{`
          div :global(input) {
            width: 100%;
            background: transparent;
            border: 0;
            color: var(--text);
            font-family: var(--font-body);
            font-size: 14px;
            outline: none;
          }
          div :global(input::placeholder) {
            color: var(--text-4);
          }
        `}</style>
        {children}
      </div>
      {hint && <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 6 }}>{hint}</div>}
    </div>
  );
}
