"use client";

import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import { useAuditData, tone } from "@/components/audit/useAuditData";

const WEEKS = [
  {
    num: "WEEK 01",
    title: "Quick fixes",
    items: [
      "Deploy JSON-LD schema for entities",
      "Tidy service page structure",
      "Publish llms.txt",
    ],
  },
  {
    num: "WEEK 02",
    title: "Priority page",
    items: [
      "Ship buyer-intent landing page",
      "Add FAQ schema and proof blocks",
      "Internal linking from services",
    ],
  },
  {
    num: "WEEK 03",
    title: "Comparisons & proof",
    items: [
      "Publish two “vs” pages",
      "Earned mentions and citations",
      "Normalise entity references",
    ],
  },
  {
    num: "WEEK 04",
    title: "Refine & re-audit",
    items: [
      "Refine pages from feedback",
      "Re-run the Rank audit",
      "Measure movement in Tracker",
    ],
  },
];

export default function ActivatePage() {
  const { id } = useParams<{ id: string }>();
  const { audit, loading } = useAuditData(id);

  const visRate = audit?.visibility_rate ?? 0;
  const activationScore = Math.min(100, Math.round(40 + (100 - visRate) * 0.4));

  if (loading || !audit) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>
        {loading ? "Loading..." : "Audit not found."}
      </div>
    );
  }

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Prioritise &amp; Activate</h1>
          <p>The audit findings as ordered work. Pick your three, run the 30-day plan.</p>
        </div>
        <div className="actions">
          <button className="btn btn-sm">Export PDF</button>
          <button className="btn btn-primary btn-sm">Start with quick fixes</button>
        </div>
      </div>

      {/* HERO */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-label">Activation score</div>
          <div className="hero-headline">
            {activationScore}<span className="slash">/ 100</span>
          </div>
          <div className="hero-summary">
            Average across your top priority prompts. Strong case for starting this month, with three quick fixes in week one to build momentum.
          </div>
          <div className="hero-benchmarks">
            <div className="hero-bm-item">
              <div className="hero-bm-label">Category avg</div>
              <div className="hero-bm-value">
                <span className="num">58</span>
                <span className={`delta ${activationScore > 58 ? "up" : "down"}`}>
                  {activationScore > 58 ? "▲" : "▼"} {Math.abs(activationScore - 58)}
                </span>
              </div>
            </div>
            <div className="hero-bm-item">
              <div className="hero-bm-label">High-op prompts</div>
              <div className="hero-bm-value"><span className="num">4</span></div>
            </div>
            <div className="hero-bm-item">
              <div className="hero-bm-label">Total effort</div>
              <div className="hero-bm-value"><span className="num">38 hrs</span></div>
            </div>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-insight">
            <div className="hero-insight-icon good">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="hero-insight-text">
              <div className="title">Week 1: quick fixes</div>
              <div className="body">Three technical wins that get you in the right shape before the bigger moves.</div>
            </div>
          </div>
          <div className="hero-insight">
            <div className="hero-insight-icon good">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="hero-insight-text">
              <div className="title">Weeks 2-4: the bigger moves</div>
              <div className="body">Landing page, comparison pages, authority work, then re-audit to prove movement.</div>
            </div>
          </div>
        </div>
      </div>

      {/* PLAN */}
      <div className="card pad-lg section">
        <div className="section-head" style={{ marginBottom: 20 }}>
          <div>
            <h2>30-day plan of attack</h2>
            <div className="sub">A restrained weekly cadence. Quick fixes first, then the big pieces.</div>
          </div>
        </div>
        <div className="plan">
          {WEEKS.map((w) => (
            <div key={w.num} className="week">
              <div className="week-num">{w.num}</div>
              <div className="week-title">{w.title}</div>
              <ul className="week-items">
                {w.items.map((item, i) => (
                  <li key={i}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="cta-banner">
        <div className="cta-banner-text">
          <h3>Want a hand getting started?</h3>
          <p>We can tackle week one&rsquo;s quick fixes for you, so you&rsquo;re in the right shape to take the bigger pieces on yourself.</p>
        </div>
        <button className="btn btn-primary">Get the quick fixes done →</button>
      </div>
    </AuditShell>
  );
}
