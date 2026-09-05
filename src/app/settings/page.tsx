"use client";

import { useEffect, useState } from "react";
import WorkspaceShell from "@/components/audit/WorkspaceShell";
import { useMe } from "@/lib/me-context";

interface SettingsProfile {
  email: string;
  agencyName: string | null;
  contactName: string | null;
  notificationsEnabled: boolean;
}

type SaveMessage = { type: "success" | "error"; text: string } | null;

const inputCls =
  "w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all";
const labelCls = "block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2";

/* Account Settings: profile fields, a read-only payment-method note (no
 *  Stripe Customer Portal integration yet), and an email notifications
 *  toggle. useMe() seeds the profile fields immediately from the shared
 *  context; a dedicated /api/me fetch then fills in notificationsEnabled
 *  (not part of the shared Me shape) and becomes the source of truth for
 *  this page's own display after each save. */
export default function SettingsPage() {
  const { me, refresh } = useMe();
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [agencyName, setAgencyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<SaveMessage>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationsMessage, setNotificationsMessage] = useState<SaveMessage>(null);

  useEffect(() => {
    if (!profile && me) {
      setAgencyName(me.agencyName ?? "");
      setContactName(me.contactName ?? "");
    }
  }, [me, profile]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((res) => res.json())
      .then((data: SettingsProfile) => {
        if (cancelled) return;
        setProfile(data);
        setAgencyName(data.agencyName ?? "");
        setContactName(data.contactName ?? "");
        setNotificationsEnabled(Boolean(data.notificationsEnabled));
      })
      .catch(() => {
        /* fields keep whatever useMe() already provided */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyName, contactName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileMessage({ type: "error", text: data.error || "Failed to save changes." });
        return;
      }
      setProfile(data);
      setAgencyName(data.agencyName ?? "");
      setContactName(data.contactName ?? "");
      setProfileMessage({ type: "success", text: "Profile updated." });
      refresh();
    } catch {
      setProfileMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleNotificationsToggle() {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    setSavingNotifications(true);
    setNotificationsMessage(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationsEnabled: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotificationsEnabled(!next);
        setNotificationsMessage({ type: "error", text: data.error || "Failed to update preference." });
        return;
      }
      setProfile(data);
      setNotificationsMessage({ type: "success", text: "Preference saved." });
    } catch {
      setNotificationsEnabled(!next);
      setNotificationsMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSavingNotifications(false);
    }
  }

  return (
    <WorkspaceShell title="Settings">
      <div className="page-head">
        <div>
          <h1>Account</h1>
          <p>Manage your profile, payment method and notification preferences.</p>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <h2>Profile</h2>
            <div className="sub">Your agency name and contact details.</div>
          </div>
        </div>
        <form
          onSubmit={handleProfileSave}
          className="card pad-lg"
          style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}
        >
          <div>
            <label className={labelCls}>Agency name</label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="e.g. Balmer Agency"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Contact name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Sarah Balmer"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="text"
              value={profile?.email ?? me?.email ?? ""}
              disabled
              className={inputCls}
              style={{ opacity: 0.6, cursor: "not-allowed" }}
            />
          </div>

          {profileMessage && (
            <div
              style={{
                fontSize: 13,
                color: profileMessage.type === "success" ? "var(--good)" : "var(--crit)",
              }}
            >
              {profileMessage.text}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingProfile}
            style={{ alignSelf: "flex-start" }}
          >
            {savingProfile ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <h2>Payment method</h2>
            <div className="sub">How billing works today.</div>
          </div>
        </div>
        <div className="card pad-lg" style={{ maxWidth: 520 }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-2)", lineHeight: 1.6 }}>
            Payment method is managed through Stripe at checkout time. There is no card stored
            here — when you buy audit credits or a white-label subscription, Stripe collects and
            saves your payment details securely on its own checkout page.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <h2>Notifications</h2>
            <div className="sub">Control which emails we send you.</div>
          </div>
        </div>
        <div className="card pad-lg" style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>Email notifications</div>
              <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 2 }}>
                Audit completions, credit top-ups and account alerts.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              aria-label="Toggle email notifications"
              onClick={handleNotificationsToggle}
              disabled={savingNotifications}
              style={{
                width: 44,
                height: 24,
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: notificationsEnabled ? "var(--mint)" : "var(--surface-2)",
                position: "relative",
                flexShrink: 0,
                padding: 0,
                transition: "background 0.18s var(--ease)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: notificationsEnabled ? 22 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: notificationsEnabled ? "#052822" : "var(--text-3)",
                  transition: "left 0.18s var(--ease)",
                }}
              />
            </button>
          </div>
          {notificationsMessage && (
            <div
              style={{
                fontSize: 13,
                color: notificationsMessage.type === "success" ? "var(--good)" : "var(--crit)",
              }}
            >
              {notificationsMessage.text}
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
