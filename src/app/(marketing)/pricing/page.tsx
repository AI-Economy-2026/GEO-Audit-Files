import type { Metadata } from "next";
import Link from "next/link";
import "./pricing.css";
import PricingTiers from "@/components/marketing/PricingTiers";

export const metadata: Metadata = {
  title: "Gatha | Pricing",
  description: "Pay as you go. A credit-based system, no audit subscriptions. Buy audits one at a time or in packs, and add monitoring if you need it.",
};

const ENGINE_CHIPS = ["GPT", "Claude", "Gemini", "Prplx", "Grok", "DeepS", "Meta", "AIM", "AIO", "Copilot"];

const BUNDLES = [
  { name: "Starter", price: "$99", sub: "3 audit credits", per: "$33 per audit" },
  { name: "Growth", price: "$279", sub: "10 audit credits", per: "$28 per audit", highlight: true, tag: "Best value" },
  { name: "Legendary", price: "$599", sub: "25 audit credits", per: "$24 per audit + white label" },
];

const WATCH_PLANS = [
  { name: "Watch 4", cadence: "Quarterly", reruns: "4", price: "$19" },
  { name: "Watch 6", cadence: "Bi-monthly", reruns: "6", price: "$29", recommended: true },
  { name: "Watch 12", cadence: "Monthly", reruns: "12", price: "$49" },
];

const CITATIONS = [
  { engine: "ChatGPT", pct: 90, delta: "+6", color: "#0a7d63" },
  { engine: "Claude", pct: 74, delta: "+4", color: "#0a7d63" },
  { engine: "Gemini", pct: 58, delta: "+9", color: "#0a7d63" },
  { engine: "Perplexity", pct: 46, delta: "-2", color: "#c2493a" },
  { engine: "Grok", pct: 32, delta: "+3", color: "#0a7d63" },
];

const ADDONS = [
  { name: "Extra engines", badge: "Per engine", price: "$9", unit: "/ engine", sub: "Choose and swap any time.", body: "Pick which engines each audit runs, and add more for wider coverage. New engines are added as they launch, so your audits keep pace.", cta: "Add engines", href: "/login" },
  { name: "White label", badge: "Add-on", price: "$99", unit: "/ month", sub: "Billed monthly. Cancel anytime.", body: "Your logo, your colours, your name on every new report and shared link. Clients see your brand, not us.", cta: "Contact us", href: "mailto:hello@gatha.ai?subject=White%20label", highlight: true },
  { name: "Full SEO audit", badge: "Coming soon", price: null, unit: "", sub: "One report for SEO, AEO and GEO.", body: "Rankings, backlinks and technical SEO in the same report as your AEO and GEO. One place for all three.", cta: "Coming soon", href: null },
  { name: "Multi-country", badge: "Per market", price: "1 credit", unit: "/ market", sub: "No subscription.", body: "Checking more than one market? Run the audit per country, one credit each. A three-market check is three audits.", cta: "Add audit", href: "/login" },
];

const COMPARE_ROWS = [
  ["Getting started", "Pay per audit, no sign-up fee", "Paid monthly subscription"],
  ["Commitment", "None, pay as you go", "Ongoing subscription"],
  ["AI engines", "10+ available, up to all 10 per audit", "Fewer, often charged per engine"],
  ["Engine choice", "Pick which engines per audit, swap any time", "A fixed set you cannot change"],
  ["Site AI Score", "Included, technical AI-readiness audit", "Visibility only"],
  ["Full SEO audit", "Coming soon, SEO, AEO and GEO in one report", "A separate, pricey tool"],
  ["What you get", "A deliverable: report, plan and fixes", "A dashboard to interpret"],
  ["Credits", "Last 12 months", "Usually reset monthly"],
  ["Multi-country", "Yes", "Rarely"],
  ["White label", "$99/mo add-on", "Higher tiers only"],
];

const FAQS = [
  { q: "What is an audit credit, and does it expire?", a: "One credit runs one audit on one brand. Credits from a bundle last 12 months from purchase, they do not reset monthly." },
  { q: "What happens if an audit fails?", a: "You get the credit back, not a refund of the payment. The run simply did not complete, so the credit returns to your balance to use again." },
  { q: "Can I run audits on my clients, not just my own brand?", a: "Yes. Every audit and every credit works across your own brand or a client's. Resellers run their whole roster from one account." },
  { q: "What is the difference between Base and Flagship?", a: "Base runs each engine on its standard model. Flagship runs each engine on its most capable model for a sharper read, available on any audit, one-off or bundle, via the toggle." },
  { q: "How much do add-ons cost?", a: "Add an extra engine for $9 each. Flagship models add a small uplift per audit: $5 on Snapshot, $10 on Standard and $20 on Deep. White label is $99 a month. Multi-country is simply an extra audit per market, one credit each." },
  { q: "How does Watch billing work?", a: "Add a Watch plan to your account and allocate it to the audits you want to monitor. Each cycle re-checks the tracked prompts and reports the movement. A Watch plan needs a completed audit first." },
  { q: "What does white label cover?", a: "Your colour, logo and name on the dashboard, the report PDF and the digital version you share with clients. It applies to every new report from the moment you turn it on." },
  { q: "Is my data used to train AI models?", a: "No. Your audits and the brands you check are yours. We run the prompts to see how the engines answer, we do not hand your data over for training." },
];

export default function PricingPage() {
  return (
    <>
      <header className="mkt-hero">
        <div className="mkt-wrap">
          <span className="mkt-eyebrow">Pricing</span>
          <h1 className="mkt-big">Pay as you go</h1>
          <p className="mkt-hero-sub">Stop paying for what you don&rsquo;t need. A credit-based system, no audit subscriptions. Buy audits one at a time or in packs, and add monitoring if you need it.</p>
        </div>
      </header>

      <div className="mkt-wrap">
        <div className="pr-roster">
          <div className="rl">Choose from <b>10+ AI engines</b>. Run the ones that matter, swap them any time.</div>
          <div className="pr-chips">
            {ENGINE_CHIPS.map((chip) => <span key={chip} className="pr-chip">{chip}</span>)}
          </div>
          <div className="pr-rnote">7 LLMs and 3 answer surfaces. Pick your engines per audit, add more as new ones launch.</div>
        </div>
      </div>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-center" style={{ maxWidth: 560 }}>
            <h2 className="mkt-sh">See how you show up in AI search</h2>
            <p className="mkt-lead">Select an audit that suits you. One-off pricing, no subscriptions.</p>
          </div>
          <PricingTiers />
          <div className="mkt-microcopy" style={{ textAlign: "center", marginTop: 16 }}>All prices in USD.</div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap">
          <div className="mkt-center" style={{ maxWidth: 560 }}>
            <h2 className="mkt-sh">Save with bundles</h2>
            <p className="mkt-lead">Need to do more than one audit? Buy more. Credits last 12 months.</p>
          </div>
          <div className="pr-cards3">
            {BUNDLES.map((b) => (
              <div key={b.name} className={`pr-card ${b.highlight ? "hi" : ""}`}>
                {b.tag && <span className="tag">{b.tag}</span>}
                <span className="pn">{b.name}</span>
                <span className="pp">{b.price} <small>USD</small></span>
                <span className="psub">{b.sub}</span>
                <span className="pr-peraudit">{b.per}</span>
                <a className={`mkt-btn ${b.highlight ? "primary" : ""}`} href="/login">Select</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-sec" id="tracking">
        <div className="mkt-wrap">
          <div className="mkt-center" style={{ maxWidth: 620 }}>
            <h2 className="mkt-sh">Watch what happens</h2>
            <p className="mkt-lead">Re-check your tracked prompts on a schedule and track the full picture: visibility score, average position, citation rate, sentiment, share of voice against competitors, and per-engine movement.</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="pr-tbl">
              <thead>
                <tr><th>Plan</th><th>Suggested cadence</th><th>Re-runs a year</th><th>What it tracks</th><th>Price</th><th /></tr>
              </thead>
              <tbody>
                {WATCH_PLANS.map((w) => (
                  <tr key={w.name} className={w.recommended ? "rec" : ""}>
                    <td className="n">{w.name}</td>
                    <td>{w.cadence}</td>
                    <td>{w.reruns}</td>
                    <td>Visibility, movement, per-engine</td>
                    <td className="price">{w.price}<small>/mo</small></td>
                    <td style={{ textAlign: "right" }}><Link href="/login" style={{ color: "var(--mint)", fontWeight: 600, fontSize: 12.5 }}>Select</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pr-track">
            <div>
              <div className="mkt-kick">What tracking looks like</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, marginBottom: 12 }}>See it move over time</h3>
              <p style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 8 }}>Each Watch tracks one audit. Every plan tracks the same things, only how often changes.</p>
              <div className="mkt-flist">
                <div><span className="ck">&check;</span>Visibility score trend, plus average position, citation rate and sentiment</div>
                <div><span className="ck">&check;</span>Share of voice against your competitors, and movement per engine</div>
                <div><span className="ck">&check;</span>Prompt-level wins and losses behind the headline number</div>
              </div>
            </div>
            <div className="pr-citecard">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#51617e" }}>Citations by engine</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#0a7d63" }}>Cited in 7 of 10</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {CITATIONS.map((c) => (
                  <div className="pr-citerow" key={c.engine}>
                    <span className="lab">{c.engine}</span>
                    <span className="track"><span className="fill" style={{ width: `${c.pct}%`, background: c.color }} /></span>
                    <span className="val">{c.pct}% <span style={{ color: c.color, fontWeight: 600 }}>{c.delta.startsWith("+") ? "▲" : "▼"}{c.delta.replace(/[+-]/, "")}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt" id="addons">
        <div className="mkt-wrap">
          <div className="mkt-center" style={{ maxWidth: 560 }}>
            <h2 className="mkt-sh">Add what you want</h2>
            <p className="mkt-lead">Extras when they help. Skip them when they don&rsquo;t.</p>
          </div>
          <div className="pr-addons">
            {ADDONS.map((a) => (
              <div key={a.name} className={`pr-wl ${a.highlight ? "hi" : ""}`}>
                <div className="wn">{a.name} <span className="chip chip-mint" style={{ fontSize: 9 }}>{a.badge}</span></div>
                {a.price && <div className="wp">{a.price}<small>{a.unit}</small></div>}
                <div className="wsub">{a.sub}</div>
                <p>{a.body}</p>
                {a.href ? (
                  <a className="mkt-btn" href={a.href}>{a.cta}</a>
                ) : (
                  <span className="mkt-btn" style={{ opacity: .6 }}>{a.cta}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="pr-ent">
            <div>
              <div className="mkt-eyebrow" style={{ marginBottom: 8 }}>Enterprise</div>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>Need something custom?</h2>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, maxWidth: 460, margin: "0 auto" }}>For high volume, custom coverage or tailored terms, we will build a plan around how you work.</p>
            </div>
            <a className="mkt-btn primary" href="mailto:hello@gatha.ai?subject=Bespoke%20pricing">Contact us</a>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap">
          <div className="mkt-center" style={{ maxWidth: 620 }}>
            <h2 className="mkt-sh">How we compare</h2>
            <p className="mkt-lead">The difference is the model, not just the price. You do not subscribe to start, and you choose which engines to run.</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="pr-tbl">
              <thead><tr><th /><th>Gatha</th><th>Typical AI visibility tool</th></tr></thead>
              <tbody>
                {COMPARE_ROWS.map(([dim, us, them]) => (
                  <tr key={dim}>
                    <td className="n">{dim}</td>
                    <td className="yes">{us}</td>
                    <td className={them.startsWith("Rarely") || them.includes("Higher tiers") || them === "Visibility only" || them.includes("A fixed set") || them.includes("dashboard") || them.includes("pricey") ? "no" : ""}>{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mkt-microcopy" style={{ textAlign: "center", marginTop: 14 }}>Based on how AI visibility tools are typically priced and packaged, August 2026. Subject to change.</div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap mkt-band">
          <h2>See how AI sees you</h2>
          <p>Buy audits as you need them. Need a hand activating your plan? We can do some, or all of it. Just ask.</p>
          <div className="mkt-herocta">
            <Link href="/login" className="mkt-btn primary">Start Now</Link>
            <a href="mailto:hello@gatha.ai?subject=Gatha%20enquiry" className="mkt-btn">Contact us</a>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt" id="faq">
        <div className="mkt-wrap">
          <div className="mkt-center" style={{ maxWidth: 560 }}>
            <h2 className="mkt-sh">FAQs</h2>
          </div>
          <div>
            {FAQS.map(({ q, a }) => (
              <details className="mkt-faq-item" key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <div className="mkt-wrap">
        <p className="mkt-microcopy" style={{ textAlign: "center", padding: "20px 0 40px" }}>
          All prices in USD. AUD shown at checkout, plus GST where it applies. Audit credits last 12 months from purchase. A failed run refunds the credit, not the payment. Watch and white label are billed monthly and cancel anytime.
        </p>
      </div>
    </>
  );
}
