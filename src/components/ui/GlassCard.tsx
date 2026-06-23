import { ReactNode, HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "sm" | "md" | "lg" | "xl" | "none";
  rounded?: "xl" | "2xl" | "3xl";
}

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-10",
};

const ROUNDED = {
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-[22px]",
};

export default function GlassCard({
  children,
  padding = "lg",
  rounded = "3xl",
  className = "",
  ...rest
}: GlassCardProps) {
  return (
    <div
      className={`glass-card ${PADDING[padding]} ${ROUNDED[rounded]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
