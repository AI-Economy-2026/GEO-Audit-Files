import type { Metadata } from "next";
import Link from "next/link";
import "./about.css";

export const metadata: Metadata = {
  title: "About Gatha | Built by a Search and AI Practitioner",
  description:
    "Gatha was built by Sarah Balmer, a Melbourne founder with more than 20 years in digital and search. The AI visibility report she always wanted: it does the interpretation for you, and there is no expensive subscription.",
};

const VALUES = [
  { title: "Make it make sense", body: "A score is not an answer. Every report does the interpretation for you and tells you what to do next, in plain English." },
  { title: "No expensive lock-in", body: "Audits are pay-as-you-go. No subscription just to see where you stand." },
  { title: "Built by a practitioner", body: "Made by someone who has lived the reporting problem from the agency, in-house and consulting side, not a dashboard for its own sake." },
];

export default function AboutPage() {
  return (
    <>
      <header className="about-page-hero mkt-wrap">
        <span className="mkt-eyebrow">About</span>
        <h1>Search changed. So I built <span className="m">what I wished I had</span></h1>
      </header>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-panel mkt-about-grid">
            <div className="mkt-about-photo">
              <div className="mkt-about-ph"><span>SB</span></div>
            </div>
            <div className="mkt-about-body">
              <div className="mkt-kick">The story</div>
              <p className="mkt-about-p">As an agency owner, in-house marketer, AI consultant and platform creator, I have seen this from every side. A dashboard that does nothing for the business case helps no one. It doesn&rsquo;t tell you what to fix, or how to read it.</p>
              <p className="mkt-about-p">Making it make sense has always been a time-consuming burden we have all had to wear. More than 20 years in digital and search, and the reports never changed. Now search has, and the same problem is back.</p>
              <p className="mkt-about-p" style={{ fontSize: 16, color: "var(--text)", fontWeight: 500, borderLeft: "3px solid var(--mint)", paddingLeft: 16, marginTop: 22 }}>
                So I built the thing I wanted. It reads the report for you and tells you exactly what to fix. And there is nothing worse than paying for what you don&rsquo;t need, so with Gatha you never do.
              </p>
              <div className="mkt-roles">
                <span>Search &amp; Digital</span><span>AI Strategist</span><span>Speaker</span><span>Consultant</span><span>Platform creator</span>
              </div>
              <a className="mkt-li-link" href="https://www.linkedin.com/in/sarahbalmer/" target="_blank" rel="noopener">Connect on LinkedIn</a>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap">
          <div className="mkt-panel">
            <div className="mkt-center" style={{ maxWidth: 620 }}>
              <div className="mkt-kick">What drives Gatha</div>
              <h2 className="mkt-sh">Cut through the noise. Turn it into opportunity</h2>
            </div>
            <div className="value-grid">
              {VALUES.map((v) => (
                <div className="value-card" key={v.title}>
                  <h3>{v.title}</h3>
                  <p>{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-panel" style={{ textAlign: "center" }}>
            <div className="mkt-center" style={{ maxWidth: 640 }}>
              <div className="mkt-kick">Beyond Gatha</div>
              <h2 className="mkt-sh" style={{ fontSize: 26 }}>One of several products built to do the same thing</h2>
              <p className="mkt-lead">Gatha sits alongside other tools built on the same idea: take something complex and make it genuinely useful for the business.</p>
            </div>
            <div className="prod-row">
              <span className="prod-chip"><b>Gatha</b> &middot; AI visibility</span>
              <span className="prod-chip">Host of the <b>AI That Works</b> podcast</span>
              <span className="prod-chip">Speaker on AI and search</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap mkt-band">
          <h2>Get found in AI search</h2>
          <p>Get the report I always wanted.</p>
          <div className="mkt-herocta">
            <Link href="/pricing" className="mkt-btn primary">See pricing</Link>
            <Link href="/how" className="mkt-btn">See how it works</Link>
          </div>
        </div>
      </section>
    </>
  );
}
