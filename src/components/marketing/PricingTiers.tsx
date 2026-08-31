"use client";

import { useState } from "react";

interface Tier {
  name: string;
  general: string;
  flagship: string;
  sub: string;
  features: { text: string; included: boolean }[];
  highlight?: boolean;
  tag?: string;
}

const TIERS: Tier[] = [
  { name: "Snapshot", general: "$19", flagship: "$24", sub: "Quick overview",
    features: [{ text: "25 prompts", included: true }, { text: "5 engines", included: true }, { text: "Full report", included: true }, { text: "Site AI Score", included: true }] },
  { name: "Standard", general: "$49", flagship: "$59", sub: "The full picture", highlight: true, tag: "Most popular",
    features: [{ text: "50 prompts", included: true }, { text: "All 10+ engines", included: true }, { text: "Site AI Score + full health audit", included: true }, { text: "Full report + 90-day plan", included: true }] },
  { name: "Deep", general: "$79", flagship: "$99", sub: "Go further",
    features: [{ text: "100 prompts", included: true }, { text: "All 10+ engines", included: true }, { text: "Fix tracking over time", included: true }, { text: "Everything in Standard", included: true }] },
];

export default function PricingTiers() {
  const [flagship, setFlagship] = useState(false);

  return (
    <div>
      <div className="pr-tiertoggle">
        <span className="pr-ttl">Model tier</span>
        <div className="pr-seg">
          <span className={!flagship ? "on" : ""} onClick={() => setFlagship(false)}>Base</span>
          <span className={flagship ? "on" : ""} onClick={() => setFlagship(true)}>Flagship</span>
        </div>
        <span className="pr-usdnote">
          Use the toggle to run each engine on its most capable model, available on any audit, one-off or bundle.
        </span>
      </div>

      <div className="pr-cards3">
        {TIERS.map((tier) => (
          <div key={tier.name} className={`pr-card ${tier.highlight ? "hi" : ""}`}>
            {tier.tag && <span className="tag">{tier.tag}</span>}
            <span className="pn">{tier.name}</span>
            <span className="pp">{flagship ? tier.flagship : tier.general}</span>
            <span className="psub">{tier.sub}</span>
            <ul>
              {tier.features.map((f) => (
                <li key={f.text} className={f.included ? "" : "off"}>
                  <span className="tick">{f.included ? "+" : "–"}</span>{f.text}
                </li>
              ))}
            </ul>
            <a className={`mkt-btn ${tier.highlight ? "primary" : ""}`} href="/login">Select</a>
          </div>
        ))}
      </div>
    </div>
  );
}
