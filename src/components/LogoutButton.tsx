"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function confirmLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          background: "transparent",
          border: "1px solid transparent",
          color: "var(--text-3)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.18s var(--ease)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "var(--crit-weak)";
          el.style.borderColor = "var(--crit-line)";
          el.style.color = "var(--crit)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "transparent";
          el.style.borderColor = "transparent";
          el.style.color = "var(--text-3)";
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Log out
      </button>

      {showConfirm && typeof document !== "undefined" && createPortal(
        <div
          onClick={() => setShowConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)",
              padding: "28px 32px",
              maxWidth: 380,
              width: "100%",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
            }}
          >
            {/* Icon */}
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--crit-weak)",
              border: "1px solid var(--crit-line)",
              display: "grid",
              placeItems: "center",
              color: "var(--crit)",
              marginBottom: 16,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>

            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
              Log out?
            </div>
            <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6, marginBottom: 24 }}>
              You&rsquo;ll be signed out and redirected to the login page.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-sm"
                style={{ flex: 1 }}
                onClick={() => setShowConfirm(false)}
                disabled={loggingOut}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm"
                style={{ flex: 1, background: "var(--crit)", borderColor: "var(--crit)", color: "#fff" }}
                onClick={confirmLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Signing out..." : "Yes, log out"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
