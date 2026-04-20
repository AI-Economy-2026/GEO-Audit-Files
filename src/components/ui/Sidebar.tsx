"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  match?: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  { href: "/audits", label: "Audits", icon: "analytics", match: (p) => p.startsWith("/audits") },
  { href: "/clients", label: "Clients", icon: "groups", match: (p) => p.startsWith("/clients") },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 border-r border-white/5 bg-[#061423]/40 backdrop-blur-2xl flex flex-col p-4 gap-2 z-50">
      <Link href="/audits" className="flex items-center gap-3 px-2 py-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary-fixed font-bold">radar</span>
        </div>
        <div>
          <h1 className="text-primary font-black leading-tight tracking-tighter">GEO Audit</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Console V1</p>
        </div>
      </Link>

      <nav className="flex-1 flex flex-col gap-2">
        {NAV.map((item) => {
          const active = item.match ? item.match(pathname) : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl border-r-2 border-primary hover:translate-x-1 transition-all duration-200"
                  : "flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-white/5 rounded-xl hover:translate-x-1 transition-all duration-200"
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-white/5 pt-4">
        <a
          href="mailto:support@balmeragency.com.au"
          className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-white/5 rounded-xl hover:translate-x-1 transition-all duration-200"
        >
          <span className="material-symbols-outlined">help</span>
          <span className="text-sm font-medium">Help Center</span>
        </a>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-white/5 rounded-xl hover:translate-x-1 transition-all duration-200 w-full text-left"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-sm font-medium">Log Out</span>
        </button>
      </div>
    </aside>
  );
}
