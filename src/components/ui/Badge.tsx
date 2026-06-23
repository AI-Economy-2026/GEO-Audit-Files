import { ReactNode } from "react";

type Tone = "primary" | "secondary" | "error" | "neutral" | "success";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const TONE: Record<Tone, string> = {
  primary: "bg-primary text-on-primary-fixed",
  secondary: "bg-secondary text-on-secondary",
  error: "bg-error text-on-primary-fixed",
  success: "bg-good/15 text-good",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

export default function Badge({ children, tone = "primary", className = "" }: BadgeProps) {
  return (
    <span
      className={`${TONE[tone]} px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${className}`}
    >
      {children}
    </span>
  );
}
