import Link from "next/link";

export default function MarketingNav() {
  return (
    <div className="mkt-nav">
      <div className="mkt-wrap mkt-navin">
        <Link href="/" aria-label="Gatha">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gatha-wordmark-mint.svg" alt="Gatha" style={{ height: 22, width: "auto", display: "block" }} />
        </Link>
        <div className="mkt-navlinks">
          <Link href="/how">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/white-label">White Label</Link>
          <Link href="/about">About</Link>
        </div>
        <div className="mkt-navr">
          <Link className="li" href="/login">Log in</Link>
          <Link className="mkt-btn primary sm" href="/login">Start Now</Link>
        </div>
      </div>
    </div>
  );
}
