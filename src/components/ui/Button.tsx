import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "white" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: string;
}

const VARIANT = {
  primary:
    "bg-primary text-on-primary-fixed shadow-[0_0_20px_rgba(94,234,212,0.25)] hover:shadow-[0_0_30px_rgba(94,234,212,0.45)] hover:opacity-95",
  secondary:
    "bg-surface-container-high text-on-surface hover:bg-surface-bright border border-outline-variant",
  ghost:
    "bg-transparent text-primary border border-primary/30 hover:bg-primary/10",
  white: "bg-white text-on-primary-fixed hover:bg-surface-container-high",
  danger:
    "bg-error-container text-on-error-container hover:opacity-90",
};

const SIZE = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-sm",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${VARIANT[variant]} ${SIZE[size]} rounded-xl font-bold transition-[background,box-shadow,border-color] duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 justify-center ${className}`}
      {...rest}
    >
      {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
      {children}
    </button>
  );
}
