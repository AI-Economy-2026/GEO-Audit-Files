"use client";

import type { ExplainTargetContext } from "@/app/api/explain/route";

interface Props {
  target: ExplainTargetContext;
  onOpen: (target: ExplainTargetContext) => void;
  variant?: "icon" | "text";
}

/** Small "Explain this" affordance — pairs with ExplainDrawer at page level. */
export default function ExplainButton({ target, onOpen, variant = "icon" }: Props) {
  if (variant === "text") {
    return (
      <button
        onClick={() => onOpen(target)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--mint)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline",
          textUnderlineOffset: 3,
          fontFamily: "var(--font-body)",
        }}
      >
        Explain this
      </button>
    );
  }

  return (
    <button
      onClick={() => onOpen(target)}
      title="Explain this"
      aria-label={`Explain: ${target.label}`}
      style={{
        width: 26,
        height: 26,
        borderRadius: 999,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text-3)",
        cursor: "pointer",
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
        transition: "all .15s var(--ease)",
        padding: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--mint-weak)";
        e.currentTarget.style.borderColor = "var(--mint-line)";
        e.currentTarget.style.color = "var(--mint)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--surface-2)";
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text-3)";
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </button>
  );
}
