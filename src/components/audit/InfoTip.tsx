"use client";

import { ReactNode } from "react";
import Tooltip from "./Tooltip";

interface Props {
  /** The plain-English explanation shown on hover. */
  label: string;
  /** Optional anchor side. Defaults to "top". */
  side?: "top" | "bottom" | "left" | "right";
  /** The label text (or any node) that becomes the hover target. */
  children: ReactNode;
}

/** Makes a label hoverable: wraps its children in a Tooltip and renders a
 *  small inline info icon at the end as the visual affordance. The whole
 *  children area becomes the hover target, not just the icon. */
export default function InfoTip({ label, side = "top", children }: Props) {
  return (
    <Tooltip label={label} side={side} inline>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          cursor: "pointer",
        }}
      >
        {children}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ opacity: 0.55, flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </span>
    </Tooltip>
  );
}
