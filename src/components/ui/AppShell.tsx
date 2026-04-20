import { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
  /** Optional top-nav render slot so pages can define their own tabs. */
  topNav?: ReactNode;
}

export default function AppShell({ children, topNav }: AppShellProps) {
  return (
    <div className="bg-ambient min-h-screen">
      <Sidebar />
      {topNav}
      <main className={`ml-64 p-8 ${topNav ? "pt-24" : "pt-8"} min-h-screen`}>
        {children}
      </main>
    </div>
  );
}
