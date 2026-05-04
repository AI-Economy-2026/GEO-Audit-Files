"use client";

import { ReactNode, useState, useRef, useEffect } from "react";

interface Props {
  label: string;
  /** Side of the trigger to anchor the tooltip on. Default "top". */
  side?: "top" | "bottom" | "left" | "right";
  /** Optional delay before showing on hover (ms). Default 250. */
  delay?: number;
  children: ReactNode;
  /** When the trigger is inline text/icon, set inline-block on the wrapper. */
  inline?: boolean;
}

/** Lightweight CSS+state tooltip. Matches navy/mint theme. No deps. */
export default function Tooltip({
  label,
  side = "top",
  delay = 250,
  children,
  inline = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  }
  function hide() {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const positionStyles: Record<typeof side, React.CSSProperties> = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  };

  return (
    <span
      style={{
        position: "relative",
        display: inline ? "inline-flex" : "inline-block",
        alignItems: "center",
      }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            zIndex: 200,
            ...positionStyles[side],
            padding: "6px 10px",
            background: "var(--surface-3)",
            border: "1px solid var(--border-hi)",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text)",
            fontFamily: "var(--font-body)",
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 4px 14px rgba(0,0,0,.4)",
            animation: "tt-fade .15s var(--ease)",
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
