import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-wrap">
        <div className="mkt-foot">
          <div style={{ maxWidth: 280 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gatha-wordmark-mint.svg" alt="Gatha" style={{ height: 24, width: "auto" }} />
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 14, lineHeight: 1.6 }}>
              Know how AI search sees your business, and exactly what to do about it.
            </p>
          </div>
          <div className="mkt-cols">
            <div className="mkt-fcol">
              <h4>Product</h4>
              <Link href="/how">How it works</Link>
              <Link href="/pricing">Pricing</Link>
            </div>
            <div className="mkt-fcol">
              <h4>White Label</h4>
              <Link href="/white-label">Overview</Link>
              <Link href="/pricing">Get started</Link>
            </div>
            <div className="mkt-fcol">
              <h4>Company</h4>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/login">Log in</Link>
            </div>
          </div>
        </div>
        <div className="mkt-fbot">
          <span>&copy; 2026 Gatha. All rights reserved.</span>
          <span>Prices in USD. AUD shown at checkout, plus GST where it applies.</span>
        </div>
      </div>
    </footer>
  );
}
