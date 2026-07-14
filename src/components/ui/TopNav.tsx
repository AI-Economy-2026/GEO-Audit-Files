"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface Tab {
  href: string;
  label: string;
  match?: (pathname: string) => boolean;
}

interface TopNavProps {
  brand?: string;
  tabs?: Tab[];
  right?: ReactNode;
}

export default function TopNav({
  brand = "Gatha",
  tabs = [],
  right,
}: TopNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-64 right-0 z-40 bg-surface/60 backdrop-blur-xl flex items-center justify-between px-8 py-4 shadow-[0_20px_50px_rgba(94,234,212,0.05)]">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold tracking-tighter text-primary">{brand}</span>
        {tabs.length > 0 && (
          <div className="flex gap-6">
            {tabs.map((tab) => {
              const active = tab.match ? tab.match(pathname) : pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={
                    active
                      ? "text-primary border-b-2 border-primary pb-1 tracking-tight"
                      : "text-on-surface-variant hover:text-on-surface transition-colors tracking-tight"
                  }
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">{right}</div>
    </nav>
  );
}
