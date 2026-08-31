"use client";

import { useState } from "react";

const ENQUIRY_OPTIONS = ["General", "Custom Packs", "White Label", "Other"];

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  if (status === "sent") {
    return (
      <div className="mkt-contact-form" style={{ textAlign: "center" }}>
        <p className="mkt-lead">Thanks, we&rsquo;ve got your message and will reply within one business day.</p>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        company: form.get("company"),
        topic: form.get("topic"),
        message: form.get("message"),
      }),
    });

    setStatus(res.ok ? "sent" : "error");
  }

  return (
    <form className="mkt-contact-form" onSubmit={handleSubmit}>
      <div className="mkt-cf-row">
        <input type="text" name="name" placeholder="Name" aria-label="Name" required />
        <input type="text" name="company" placeholder="Company" aria-label="Company" />
      </div>
      <div className="mkt-cf-row">
        <input type="email" name="email" placeholder="Email" aria-label="Email" required />
        <input type="tel" name="phone" placeholder="Phone (optional)" aria-label="Phone" />
      </div>
      <div className="ctc-select">
        <select name="topic" aria-label="Enquiring about" defaultValue="">
          <option value="" disabled>Enquiring about</option>
          {ENQUIRY_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      <textarea rows={4} name="message" placeholder="How can we help?" aria-label="Message" required />
      <label className="ctc-opt">
        <input type="checkbox" aria-label="Keep me updated" />
        <span>Keep me updated with the occasional note on AI search. No spam, unsubscribe any time.</span>
      </label>
      <button type="submit" className="mkt-btn primary" style={{ width: "100%" }} disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
      {status === "error" && (
        <p className="mkt-cf-note" style={{ color: "var(--crit)" }}>Something went wrong. Please try again.</p>
      )}
      <p className="mkt-cf-note">We reply within one business day.</p>
      <div className="ctc-li">
        <a href="https://www.linkedin.com/in/sarahbalmer/" target="_blank" rel="noopener">Connect on LinkedIn</a>
      </div>
    </form>
  );
}
