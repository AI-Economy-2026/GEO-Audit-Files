"use client";

import Tooltip from "./Tooltip";

interface Props {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
}

/** Small "?" affordance next to a metric label. Hovering shows a
 *  plain-English explanation of what the metric actually means. */
export default function InfoTip({ label, side = "top" }: Props) {
  return (
    <Tooltip label={label} side={side} inline>
      <span
        aria-label={label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 14,
          height: 14,
          borderRadius: 999,
          background: "transparent",
          border: "1px solid var(--text-4)",
          color: "var(--text-4)",
          fontSize: 9,
          fontWeight: 700,
          marginLeft: 6,
          cursor: "help",
          verticalAlign: "middle",
          lineHeight: 1,
        }}
      >
        ?
      </span>
    </Tooltip>
  );
}
