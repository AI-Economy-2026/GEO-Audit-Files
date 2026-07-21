"use client";

import { ReactNode, useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

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

interface Coords {
  top: number;
  left: number;
  transform: string;
}

/** Theme-matching tooltip portalled into <body> so it can never be clipped
 *  by an ancestor with `overflow: hidden` (e.g. the .kpi card). Anchored
 *  on the trigger via getBoundingClientRect, repositioned each time it
 *  opens. Long labels wrap up to max-width 280px. */
export default function Tooltip({
  label,
  side = "top",
  delay = 250,
  children,
  inline = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function computeCoords(): Coords | null {
    const trig = triggerRef.current;
    if (!trig) return null;
    const r = trig.getBoundingClientRect();
    switch (side) {
      case "bottom":
        return {
          top: r.bottom + 8,
          left: r.left + r.width / 2,
          transform: "translate(-50%, 0)",
        };
      case "left":
        return {
          top: r.top + r.height / 2,
          left: r.left - 8,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          top: r.top + r.height / 2,
          left: r.right + 8,
          transform: "translate(0, -50%)",
        };
      case "top":
      default:
        return {
          top: r.top - 8,
          left: r.left + r.width / 2,
          transform: "translate(-50%, -100%)",
        };
    }
  }

  function show() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const c = computeCoords();
      if (c) setCoords(c);
      setOpen(true);
    }, delay);
  }

  function hide() {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  }

  /** Tap / click / keyboard toggle: opens immediately (no hover delay) so the
   *  popup is reachable on touch devices and by keyboard, not hover-only. */
  function toggle(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (open) {
      hide();
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    const c = computeCoords();
    if (c) setCoords(c);
    setOpen(true);
  }

  // Close on scroll / resize / Escape / outside-tap so a stale position never lingers
  useLayoutEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const outside = (e: PointerEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    document.addEventListener("keydown", esc);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
      document.removeEventListener("keydown", esc);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-expanded={open}
        style={{
          position: "relative",
          display: inline ? "inline-flex" : "inline-block",
          alignItems: "center",
        }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggle(e);
        }}
      >
        {children}
      </span>
      {mounted && open && coords &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform: coords.transform,
              zIndex: 1000,
              padding: "8px 12px",
              background: "var(--surface-3)",
              border: "1px solid var(--border-hi)",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text)",
              fontFamily: "var(--font-body)",
              lineHeight: 1.5,
              whiteSpace: "normal",
              wordBreak: "normal",
              width: "max-content",
              maxWidth: 280,
              pointerEvents: "none",
              boxShadow: "0 8px 24px rgba(0,0,0,.55)",
              animation: "tt-fade .15s var(--ease)",
            }}
          >
            {label}
          </div>,
          document.body
        )}
    </>
  );
}
