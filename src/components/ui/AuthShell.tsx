import { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
}

/** Shell for public auth pages — ambient background + centered glass card. */
export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="bg-ambient min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md relative z-10">{children}</div>
    </div>
  );
}
