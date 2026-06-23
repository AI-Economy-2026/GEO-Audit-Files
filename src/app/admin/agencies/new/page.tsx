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
  const [result, setResult] = useState<{ email: string; password: string; login_url: string; email_sent: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

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
      setResult({ ...data.credentials, email_sent: data.email_sent });
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

      {result ? (
        <div className="card pad-lg" style={{ maxWidth: 560 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--mint-weak)", border: "1px solid var(--mint-line)", display: "grid", placeItems: "center", color: "var(--mint)", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, margin: 0, color: "var(--text)" }}>
              Agency created
            </h3>
          </div>

          {result.email_sent ? (
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 18 }}>
              A welcome email with login credentials has been sent to <strong>{result.email}</strong>. Credentials are also shown below for your records.
            </p>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 18 }}>
              Email could not be sent (SMTP not configured). Share these credentials with the agency manually.
            </p>
          )}

          <div style={{ background: "var(--inset)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-md)", padding: "16px 20px", marginBottom: 18 }}>
            {[
              { label: "Login URL", value: result.login_url },
              { label: "Email", value: result.email },
              { label: "Temporary password", value: result.password },
            ].map(({ label, value }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-4)", marginBottom: 3 }}>{label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--mint)", wordBreak: "break-all" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-sm"
              onClick={() => navigator.clipboard.writeText(
                `Login: ${result.login_url}\nEmail: ${result.email}\nPassword: ${result.password}`
              )}
            >
              Copy credentials
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => router.push("/admin/agencies")}>
              View all agencies
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card pad-lg" style={{ width: "100%" }}>
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
