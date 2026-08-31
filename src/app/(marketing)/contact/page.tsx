import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/marketing/ContactForm";
import "./contact.css";

export const metadata: Metadata = {
  title: "Gatha | Contact",
  description: "Questions about an AI visibility audit, white label, or working together. Send a note and we will come back to you.",
};

const UPSELLS = [
  { title: "A plan that wins", body: "Ranked, actionable moves with the likely impact, so you know exactly what to do to get named.", linkLabel: "See how it works", href: "/how" },
  { title: "Get ahead of rivals", body: "See where a competitor wins the answer, then the actions to close the gap and take the lead.", linkLabel: "See pricing", href: "/pricing" },
  { title: "Run it as your own", body: "Deliver the plan as your own service, your brand on every audit, and win more of the work.", linkLabel: "White label", href: "/white-label" },
];

export default function ContactPage() {
  return (
    <>
      <section className="mkt-sec" style={{ paddingBottom: 8 }}>
        <div className="mkt-wrap mkt-center" style={{ maxWidth: 620 }}>
          <div className="mkt-kick">Contact</div>
          <h1 className="mkt-sh">Let&rsquo;s talk</h1>
          <p className="mkt-lead">Send us a message and we will get back to you.</p>
        </div>
      </section>

      <section className="mkt-sec" style={{ paddingTop: 8 }}>
        <div className="mkt-wrap">
          <div className="mkt-panel" style={{ maxWidth: 680, margin: "0 auto" }}>
            <ContactForm />
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap">
          <div className="mkt-panel">
            <div className="mkt-center" style={{ maxWidth: 600 }}>
              <div className="mkt-kick">While you are here</div>
              <h2 className="mkt-sh">Get ahead in AI search</h2>
              <p className="mkt-lead">Not just a score. An actionable AI plan with the exact moves to make, so you win the answers your buyers are asking.</p>
            </div>
            <div className="mkt-legs">
              {UPSELLS.map(({ title, body, linkLabel, href }) => (
                <div className="mkt-leg" key={title}>
                  <h3>{title}</h3>
                  <p>{body} <Link href={href} style={{ color: "var(--mint)" }}>{linkLabel}</Link></p>
                </div>
              ))}
            </div>
            <div className="mkt-herocta">
              <Link href="/pricing" className="mkt-btn primary">See pricing</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
