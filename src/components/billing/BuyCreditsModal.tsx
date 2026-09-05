"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Tab = "bundle" | "oneoff";
type ProductType = "tier" | "bundle" | "white_label";

interface Product {
  id: string;
  name: string;
  meta: string;
  price: number;
  priceLabel: string;
  badge?: string;
}

const TIERS: Product[] = [
  { id: "snapshot", name: "Snapshot", meta: "25 prompts · 5 engines", price: 19, priceLabel: "one audit" },
  { id: "standard", name: "Standard", meta: "50 prompts · 10+ engines", price: 49, priceLabel: "one audit", badge: "Most popular" },
  { id: "deep", name: "Deep", meta: "100 prompts · 10+ engines", price: 79, priceLabel: "one audit" },
];

const BUNDLES: Product[] = [
  { id: "starter", name: "Starter", meta: "3 audit credits", price: 99, priceLabel: "$33 each" },
  { id: "growth", name: "Growth", meta: "10 audit credits", price: 279, priceLabel: "$28 each", badge: "Best value" },
  { id: "legendary", name: "Legendary", meta: "25 credits + white label", price: 599, priceLabel: "$24 each" },
];

interface BuyCreditsModalProps {
  open: boolean;
  onClose: () => void;
  /** Current credit balance, shown in the header if provided. */
  balance?: number | null;
}

/** In-app "Buy credits" purchase modal. Replaces the old mailto-only
 *  top-up flow: lets the agency pick a one-off audit tier or a bundle
 *  pack, then hands off to Stripe Checkout via POST /api/checkout. */
export default function BuyCreditsModal({ open, onClose, balance }: BuyCreditsModalProps) {
  const [tab, setTab] = useState<Tab>("bundle");
  const [selectedTier, setSelectedTier] = useState("standard");
  const [selectedBundle, setSelectedBundle] = useState("growth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onClose]);

  // Reset transient state whenever the modal is (re)opened.
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const list = tab === "bundle" ? BUNDLES : TIERS;
  const selectedId = tab === "bundle" ? selectedBundle : selectedTier;
  const selectedProduct = list.find((p) => p.id === selectedId) ?? list[0];
  const productType: ProductType = tab === "bundle" ? "bundle" : "tier";

  function selectProduct(id: string) {
    if (tab === "bundle") setSelectedBundle(id);
    else setSelectedTier(id);
  }

  async function handlePay() {
    if (!selectedProduct) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_type: productType, product_id: selectedProduct.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Could not start checkout. Please try again.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return createPortal(
    <div
      onClick={() => !loading && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,8,16,0.66)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-credits-title"
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 560, maxWidth: "100%", overflow: "hidden", padding: 0 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2
            id="buy-credits-title"
            style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--text)" }}
          >
            Top up credits
          </h2>
          {balance != null && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-3)" }}>
              Balance: {balance} credit{balance === 1 ? "" : "s"}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            style={{
              marginLeft: balance != null ? 0 : "auto",
              background: "none",
              border: 0,
              fontSize: 20,
              lineHeight: 1,
              color: "var(--text-3)",
              cursor: loading ? "not-allowed" : "pointer",
              padding: 0,
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: "20px 24px 8px" }}>
          <p style={{ fontSize: 12.5, color: "var(--text-3)", margin: "0 0 16px" }}>
            {tab === "bundle"
              ? "Buy a bundle and pay less per audit. Credits last 12 months."
              : "Buy a single audit tier. Use it right away."}
          </p>

          <div
            style={{
              display: "inline-flex",
              background: "rgba(11,20,40,.5)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 3,
              marginBottom: 14,
            }}
          >
            <button
              type="button"
              onClick={() => setTab("oneoff")}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 16px",
                borderRadius: 8,
                border: 0,
                cursor: "pointer",
                background: tab === "oneoff" ? "var(--mint)" : "transparent",
                color: tab === "oneoff" ? "#062019" : "var(--text-3)",
              }}
            >
              One-off
            </button>
            <button
              type="button"
              onClick={() => setTab("bundle")}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 16px",
                borderRadius: 8,
                border: 0,
                cursor: "pointer",
                background: tab === "bundle" ? "var(--mint)" : "transparent",
                color: tab === "bundle" ? "#062019" : "var(--text-3)",
              }}
            >
              Bundle &middot; save
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((p) => {
              const sel = p.id === selectedId;
              return (
                <div
                  key={p.id}
                  role="radio"
                  aria-checked={sel}
                  tabIndex={0}
                  onClick={() => selectProduct(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectProduct(p.id);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    border: `1px solid ${sel ? "var(--mint)" : "var(--border)"}`,
                    boxShadow: sel ? "0 0 0 1px var(--mint) inset" : undefined,
                    borderRadius: 13,
                    padding: "15px 16px",
                    cursor: "pointer",
                    background: "rgba(11,20,40,.4)",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: `2px solid ${sel ? "var(--mint)" : "var(--text-3)"}`,
                      background: sel ? "radial-gradient(circle, var(--mint) 42%, transparent 46%)" : "transparent",
                      flex: "none",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
                      {p.name}
                      {p.badge && <span className="chip chip-mint" style={{ fontSize: 9.5, padding: "2px 7px" }}>{p.badge}</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{p.meta}</div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <b style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>${p.price}</b>
                    <small style={{ display: "block", fontSize: 11, color: "var(--peri-text)" }}>{p.priceLabel}</small>
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                fontSize: 12.5,
                color: "var(--crit)",
                background: "var(--crit-weak)",
                border: "1px solid var(--crit-line)",
                borderRadius: 10,
                padding: "10px 13px",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 24px 22px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 20,
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>Total</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
              ${selectedProduct?.price ?? 0} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-3)" }}>USD</span>
            </div>
          </div>
          <button type="button" className="btn btn-primary" disabled={loading || !selectedProduct} onClick={handlePay}>
            {loading ? "Redirecting…" : "Pay and add credits"}
          </button>
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)", padding: "0 24px 18px" }}>
          Need a bespoke volume?{" "}
          <a
            href={`mailto:hello@gatha.ai?subject=${encodeURIComponent("Bespoke volume enquiry")}`}
            style={{ color: "var(--peri-text)" }}
          >
            Ask Sarah
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
