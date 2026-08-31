import type { Metadata } from "next";
import Link from "next/link";
import EngineDemo from "@/components/marketing/EngineDemo";
import PromptCounter from "@/components/marketing/PromptCounter";

export const metadata: Metadata = {
  title: "Gatha | Get Found in AI Search",
  description:
    "Know how AI search sees your business, and exactly what to do about it. AI visibility audits across ChatGPT, Claude, Gemini, Perplexity and more.",
};

const ENGINE_STRIP = ["ChatGPT", "Claude", "Gemini", "Perplexity", "Grok", "Meta AI", "DeepSeek", "Google AI Overviews", "Google AI Mode", "Copilot"];

const FAQS = [
  { q: "What is an AI visibility audit?", a: "An AI visibility audit checks how often AI engines like ChatGPT, Claude, Gemini, Perplexity and Google AI Overviews name and recommend your business when buyers ask. Gatha shows where you appear, where a rival wins instead, the sources each engine trusts, and a ranked plan to close the gaps." },
  { q: "How do I check if my business shows up in ChatGPT?", a: "You can ask ChatGPT questions your buyers would ask and see whether it names you. Gatha does this at scale, running the real questions from your market across every major engine, then reporting where you are named, mentioned, or missing, with the answer AI actually gave." },
  { q: "What is the difference between SEO, AEO and GEO?", a: "SEO is showing up on Google's list of links. AEO (Answer Engine Optimization) is being the single answer at the top, like a Google AI Overview. GEO (Generative Engine Optimization) is being named and recommended inside a chat answer from ChatGPT, Gemini or Perplexity. Gatha covers both AEO and GEO." },
  { q: "Which AI engines does Gatha check?", a: "Gatha checks the chat engines (ChatGPT, Claude, Gemini, Perplexity, Grok, Meta AI, DeepSeek) and the answer engines (Google AI Overviews, Google AI Mode, Microsoft Copilot), so you see both where AI recommends you and where you are the answer." },
  { q: "Is there a subscription?", a: "No. Gatha is one-off. Pay per audit, one at a time or in bundles. Credits last, and there is no monthly contract locking you in." },
  { q: "Can I white label the report for clients?", a: "Yes. Put your brand on every report and shared link and deliver it as your own service. The audit gives you the business case to sell more of what you already do, technical fixes, GEO services, content and consultancy, or to add an AI search offer." },
  { q: "How is Gatha different from other AI visibility tools?", a: "Most tools give you a score and leave the work to you. Gatha gives you the number and the fix: a ranked 90-day plan, whether AI can even read your site, and why rivals win. No subscription, and you can deliver it under your own brand." },
];

export default function HomePage() {
  return (
    <>
      <header className="mkt-hero">
        <div className="mkt-wrap">
          <span className="mkt-eyebrow">AI visibility for the businesses buyers ask about</span>
          <h1 className="mkt-big">Get found in <span className="m">AI search</span></h1>
          <p className="mkt-hero-sub">Know how AI search sees your business, and exactly what to do about it.</p>
          <div className="mkt-herocta">
            <Link href="/pricing" className="mkt-btn primary">See pricing</Link>
            <Link href="/login" className="mkt-btn">Start Now</Link>
          </div>
        </div>
      </header>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-center" style={{ maxWidth: 640 }}>
            <div className="mkt-kick">The difference</div>
            <h2 className="mkt-sh">Most tools tell you the problem. Gatha shows you the fix</h2>
            <p className="mkt-lead">Trackers give you a score and leave the work to you. Gatha hands you a report you can act on, or send straight to a client.</p>
          </div>
          <div className="mkt-split">
            <div className="mkt-wcard them">
              <div className="mkt-wtag">The usual AI visibility tool</div>
              <h3>A dashboard to watch</h3>
              <div className="mkt-wli"><span className="i">&times;</span>A score that goes up and down, with no reason why</div>
              <div className="mkt-wli"><span className="i">&times;</span>Tells you that you are missing, not how to fix it</div>
              <div className="mkt-wli"><span className="i">&times;</span>A monthly subscription before you have seen a thing</div>
              <div className="mkt-wli"><span className="i">&times;</span>Built for you to read, not to hand to a client</div>
            </div>
            <div className="mkt-wcard us">
              <div className="mkt-wtag">Gatha</div>
              <h3>A report you can act on</h3>
              <div className="mkt-wli"><span className="i">&check;</span>Every question where AI misses you, and who it names instead</div>
              <div className="mkt-wli"><span className="i">&check;</span>A ranked 90-day plan, with the fix and the likely impact</div>
              <div className="mkt-wli"><span className="i">&check;</span>One-off pricing, no subscription</div>
              <div className="mkt-wli"><span className="i">&check;</span>White label it and deliver it as your own</div>
            </div>
          </div>
        </div>
      </section>

      <div className="mkt-wrap">
        <div className="mkt-engbar">
          <span className="mkt-engbar-lab">Checked across</span>
          {ENGINE_STRIP.map((name, i) => (
            <span key={name}>{i > 0 && <span className="dot">&middot;</span>}{name}</span>
          ))}
        </div>
      </div>

      <section className="mkt-sec" id="definitions">
        <div className="mkt-wrap">
          <div className="mkt-panel">
            <div className="mkt-center" style={{ maxWidth: 660 }}>
              <div className="mkt-kick">In plain english</div>
              <h2 className="mkt-sh">The way we search has changed</h2>
              <p className="mkt-lead">Search used to mean Google. Now buyers ask AI. Here is what that means, and the part Gatha does.</p>
            </div>
            <div className="mkt-tnn">
              <div>
                <div className="mkt-tnn-lab">The way it was</div>
                <div className="mkt-def2">
                  <div className="mkt-deftag">SEO <span className="mkt-soon">Coming soon</span></div>
                  <div className="mkt-defname">Search Engine Optimization</div>
                  <p className="mkt-defp"><b>Showing up on Google.</b> Getting into the list of links when someone searches. The game everyone already knows.</p>
                </div>
              </div>
              <div className="mkt-tnn-arrow">&rarr;</div>
              <div>
                <div className="mkt-tnn-lab on">The way it is now &middot; <b>Gatha does both</b></div>
                <div className="mkt-tnn-pair">
                  <div className="mkt-def2 hot">
                    <div className="mkt-deftag on">AEO</div>
                    <div className="mkt-defname">Answer Engine Optimization</div>
                    <p className="mkt-defp"><b>Being the answer.</b> Winning the one direct answer at the top, like a Google AI Overview.</p>
                  </div>
                  <div className="mkt-def2 hot">
                    <div className="mkt-deftag on">GEO</div>
                    <div className="mkt-defname">Generative Engine Optimization</div>
                    <p className="mkt-defp"><b>Getting named by AI.</b> Being the business ChatGPT, Gemini or Perplexity names and recommends.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-center" style={{ maxWidth: 640 }}>
            <div className="mkt-kick">The shift is happening now</div>
            <h2 className="mkt-sh">While you read this, buyers are asking AI</h2>
            <p className="mkt-lead">This is the biggest shift in search in a generation, and it is just getting started. The businesses that move early are the ones AI is learning to name.</p>
          </div>
          <div className="mkt-shift-grid">
            <div>
              <div className="mkt-sm-lab">AI prompts asked today</div>
              <PromptCounter />
              <div className="mkt-sm-sub">and counting. ChatGPT alone handles about 2.5 billion a day.</div>
            </div>
            <div className="mkt-shift-side">
              <div><div className="mkt-ss-n">1&nbsp;billion</div><div className="mkt-ss-l">weekly ChatGPT users, up from 400 million a year ago</div></div>
              <div><div className="mkt-ss-n">37%</div><div className="mkt-ss-l">of people now start a search with AI, not a search engine</div></div>
              <div><div className="mkt-ss-n" style={{ color: "var(--crit)" }}>&#9660; 25%</div><div className="mkt-ss-l">forecast drop in traditional search volume by 2026</div></div>
            </div>
          </div>
          <div className="mkt-shift-src">Sources: OpenAI, 2026 &middot; Pew Research, 2026 &middot; Gartner. Counter is an illustration based on ~2.5 billion prompts a day.</div>
          <div className="mkt-herocta">
            <Link href="/pricing" className="mkt-btn primary">See where you stand</Link>
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-panel">
            <div className="mkt-center" style={{ maxWidth: 640 }}>
              <div className="mkt-kick">AI Visibility Audit</div>
              <h2 className="mkt-sh">How do you show up in AI search?</h2>
              <p className="mkt-lead">Check your visibility across the major LLMs and AI Overviews, against your competitors, for the searches that matter to you. Tap any engine to see what buyers are shown.</p>
            </div>
            <EngineDemo />
            <div className="mkt-herocta">
              <Link href="/pricing" className="mkt-btn primary">See pricing</Link>
              <Link href="/how" className="mkt-btn">See how it works</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt" id="how">
        <div className="mkt-wrap">
          <div className="mkt-panel">
            <div className="mkt-kick">How Gatha works</div>
            <h2 className="mkt-sh">Gatha turns your website into a plan in minutes</h2>
            <div className="mkt-flow">
              <div className="mkt-flowstep"><div className="mkt-fn">1</div><h3>Add a business</h3><p>Enter a website. Gatha reads the keywords you already rank for and turns them into the prompts buyers are really searching AI.</p></div>
              <div className="mkt-flowstep"><div className="mkt-fn">2</div><h3>We ask the engines</h3><p>Gatha runs those questions across the AI engines and records where you win, where you are missing, and who wins instead.</p></div>
              <div className="mkt-flowstep"><div className="mkt-fn">3</div><h3>You get the fix</h3><p>A clear report: your visibility, the gaps, the competitor picture, and a ranked 90-day plan.</p></div>
            </div>
            <div className="mkt-herocta">
              <Link href="/pricing" className="mkt-btn primary">See pricing</Link>
              <Link href="/how" className="mkt-btn">See it in detail</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-kick">What you get</div>
          <h2 className="mkt-sh">Three ways Gatha reads your visibility</h2>
          <div className="mkt-legs">
            <div className="mkt-leg"><div className="ic">&#x1F50D;</div><h3>AI Visibility</h3><p>How often AI names you when buyers ask, split by engine and by question, against the competitors winning those answers.</p></div>
            <div className="mkt-leg"><div className="ic">&#x1F5A5;</div><h3>AI Site Health</h3><p>Whether AI engines can actually read your site, with a Site AI Score and the exact issues holding you back, plus the fix.</p></div>
            <div className="mkt-leg"><div className="ic">&#x1F4C8;</div><h3>Movement over time</h3><p>Add Watch to track your visibility month on month, so you can prove the number moved after you act on the plan.</p></div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt" id="whitelabel">
        <div className="mkt-wrap">
          <div className="mkt-panel">
            <div className="mkt-kick">White Label</div>
            <h2 className="mkt-sh">Run it as your own service</h2>
            <p className="mkt-lead">Run Gatha for your clients, see how they show up in AI search, and help them improve with more of what you already do.</p>
            <div className="mkt-wlflow">
              <div className="mkt-wlf-step"><div className="mkt-wlf-n">1</div><div className="mkt-wlf-t">Run it for your client</div><div className="mkt-wlf-s">Your brand on the report</div></div>
              <div className="mkt-wlf-conn" />
              <div className="mkt-wlf-step"><div className="mkt-wlf-n">2</div><div className="mkt-wlf-t">See how they show up</div><div className="mkt-wlf-s">Where AI names them, where it names rivals</div></div>
              <div className="mkt-wlf-conn" />
              <div className="mkt-wlf-step wide">
                <div className="mkt-wlf-n">3</div><div className="mkt-wlf-t">Help them improve</div>
                <div className="mkt-wlf-s">Every gap is a way to do more of your work, to sell more of what you&rsquo;re good at</div>
                <div className="mkt-wlf-chips"><span>Technical fixes</span><span>GEO services</span><span>Content</span><span>Consultancy</span><span>AI search</span></div>
              </div>
              <div className="mkt-wlf-conn" />
              <div className="mkt-wlf-step end"><div className="mkt-wlf-n">&#9650;</div><div className="mkt-wlf-t">Watch</div><div className="mkt-wlf-s">Track, manage and monitor the movements, celebrate the wins, keep up the work.</div></div>
            </div>
            <div className="mkt-wl-model">You pay for the audit. <b>You set what you charge.</b> Your brand on every report and shared link, from day one.</div>
            <div className="mkt-herocta">
              <Link href="/pricing" className="mkt-btn primary">See white label pricing</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec" id="compare">
        <div className="mkt-wrap">
          <div className="mkt-panel">
            <div className="mkt-center" style={{ maxWidth: 640 }}>
              <div className="mkt-kick">What makes Gatha different</div>
              <h2 className="mkt-sh">The others track, or take over. Gatha hands you the fix</h2>
              <p className="mkt-lead">Same problem, seen side by side. Here is where most tools leave you, and what Gatha does instead.</p>
            </div>
            <div className="mkt-cmp">
              <div className="mkt-cmp-head"><div /><div>The others</div><div>Gatha</div></div>
              {[
                ["Pricing", "Monthly subscription, locked in", "One-off. No lock-in"],
                ["What you get", "A score to watch", "The number and the ranked fix"],
                ["Site health", "Skipped", "Checks if AI can even read your site"],
                ["Coverage", "Often chat engines only", "Both AEO and GEO, across the engines"],
                ["Engine choice", "A fixed set you cannot change", "Pick your engines per audit, swap any time"],
                ["Ownership", "Their platform, their brand", "White label. Sell it as your own"],
                ["The work", "Left to you, or kept by them", "A 90-day plan to act on or resell"],
              ].map(([dim, them, us]) => (
                <div className="mkt-cmp-row" key={dim}>
                  <div className="mkt-cmp-dim">{dim}</div>
                  <div className="mkt-cmp-them">{them}</div>
                  <div className="mkt-cmp-us"><span className="ck">&check;</span>{us}</div>
                </div>
              ))}
            </div>
            <div className="mkt-herocta">
              <Link href="/pricing" className="mkt-btn primary">See pricing</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-kick" style={{ textAlign: "center" }}>Pricing</div>
          <h2 className="mkt-sh" style={{ textAlign: "center" }}>Just pay for what you need. Nothing else</h2>
          <p className="mkt-lead" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>No expensive contract, no lock-in, and nothing limiting your ability to win new business.</p>
          <div className="mkt-paygrid">
            <div className="mkt-paycard"><div className="pi">$</div><h3>No subscription</h3><p>Pay per audit, or in bundles. No monthly bill before you have seen a thing.</p></div>
            <div className="mkt-paycard"><div className="pi">+</div><h3>Buy more, get more</h3><p>The bigger the bundle, the better the rate. Credits last, and work across any business you run.</p></div>
            <div className="mkt-paycard"><div className="pi">&#9711;</div><h3>Add countries</h3><p>Check more than one market when you need to. One credit per market, added as you grow.</p></div>
            <div className="mkt-paycard"><div className="pi">&infin;</div><h3>No project limits</h3><p>Run a check for business development whenever you want. Nothing blocks you from chasing the next win.</p></div>
          </div>
          <div className="mkt-herocta">
            <Link href="/pricing" className="mkt-btn primary">See pricing</Link>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap">
          <div className="mkt-panel mkt-frow">
            <div className="mkt-fr-txt">
              <div className="mkt-fr-step">Your call</div>
              <h2>Run only the engines that matter</h2>
              <p>Most tools lock you to a fixed set. Gatha lets you choose which of the engines to run on every audit, so you focus on the ones your buyers actually use. Engine choice is free, and you swap them any time as new engines launch.</p>
              <div className="mkt-flist">
                <div><span className="ck">&check;</span>Pick your engines per audit, at no extra cost</div>
                <div><span className="ck">&check;</span>Swap them any time as new engines launch</div>
                <div><span className="ck">&check;</span>Focus your spend on the engines that matter</div>
              </div>
            </div>
            <div />
          </div>
        </div>
      </section>

      <section className="mkt-sec" id="tracking">
        <div className="mkt-wrap">
          <div className="mkt-panel mkt-watch-grid">
            <div>
              <div className="mkt-kick">Watch</div>
              <h2 className="mkt-sh" style={{ maxWidth: 380 }}>Track it. Prove it moved</h2>
              <p className="mkt-lead">Run the plan, then add Watch to track your visibility over time. It re-checks your tracked prompts on a schedule and reports the movement, so you can tie the number climbing to what you shipped.</p>
              <div className="mkt-flist" style={{ marginTop: 18 }}>
                <div><span className="ck">&check;</span>Visibility score trend, plus average position, citation rate and sentiment</div>
                <div><span className="ck">&check;</span>Share of voice against your competitors, and movement per engine</div>
                <div><span className="ck">&check;</span>Prompt-level wins and losses behind the headline number</div>
              </div>
              <div className="mkt-herocta" style={{ justifyContent: "flex-start" }}>
                <Link href="/pricing" className="mkt-btn primary">See pricing</Link>
                <Link href="/how#tracking" className="mkt-btn">See how tracking works</Link>
              </div>
            </div>
            <div className="mkt-watch-viz">
              <div className="mkt-wv-head"><span>AI Visibility, yourbrand.com</span><span className="mkt-wv-now">&#9650; up from 12% to 22%</span></div>
              <svg viewBox="0 0 320 120" width="100%" height="120" preserveAspectRatio="none" style={{ marginTop: 6 }}>
                <polyline points="8,96 90,80 172,52 254,36 312,28" fill="none" stroke="#7cf0e0" strokeWidth="2.5" />
                {[[8, 96], [90, 80], [172, 52], [254, 36], [312, 28]].map(([x, y]) => (
                  <circle key={x} cx={x} cy={y} r="3.5" fill="#7cf0e0" />
                ))}
              </svg>
              <div className="mkt-watch-stats">
                <div className="mkt-ws"><div className="v">12%</div><div className="k">Baseline</div></div>
                <div className="mkt-ws"><div className="v" style={{ color: "var(--mint)" }}>22%</div><div className="k">Now</div></div>
                <div className="mkt-ws"><div className="v">8<span style={{ fontSize: 14, color: "var(--text-3)" }}>/10</span></div><div className="k">Engines citing</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt" id="about">
        <div className="mkt-wrap">
          <div className="mkt-panel mkt-about-grid">
            <div className="mkt-about-photo">
              <div className="mkt-about-ph"><span>SB</span></div>
              <div className="mkt-about-cap">Sarah Balmer<small>Founder, Melbourne</small></div>
              <div className="mkt-roles"><span>Search &amp; Digital</span><span>AI Strategist</span><span>Speaker</span><span>Consultant</span><span>Platform creator</span></div>
              <a className="mkt-li-link" href="https://www.linkedin.com/in/sarahbalmer/" target="_blank" rel="noopener">Connect on LinkedIn</a>
            </div>
            <div className="mkt-about-body">
              <div className="mkt-kick">The story</div>
              <h2>Search changed. So I built what I wished I had</h2>
              <p className="mkt-about-p">As an agency owner, in-house marketer, AI consultant and platform creator, I have seen this from every side. There is nothing worse than a dashboard that does nothing for the business case. It doesn&rsquo;t tell you what to fix, or how to read it.</p>
              <p className="mkt-about-p">Making it make sense has always been a time-consuming burden we have all had to wear. More than 20 years in digital and search, and the reports never changed. Now search has, and the same problem is back.</p>
              <p className="mkt-about-p" style={{ fontSize: 16, color: "var(--text)", fontWeight: 500, borderLeft: "3px solid var(--mint)", paddingLeft: 16, marginTop: 22 }}>
                So I built the thing I wanted. It does the interpretation for you, tells you what to fix, and there is no expensive subscription.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec" id="faq">
        <div className="mkt-wrap">
          <div className="mkt-center" style={{ maxWidth: 640 }}>
            <div className="mkt-kick">FAQs</div>
            <h2 className="mkt-sh">AI visibility, answered</h2>
            <p className="mkt-lead">The questions people ask most about AI search and how Gatha works.</p>
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

      <section className="mkt-sec alt" id="contact">
        <div className="mkt-wrap">
          <div className="mkt-panel mkt-contact-grid">
            <div>
              <div className="mkt-kick">Contact</div>
              <h2 className="mkt-sh" style={{ maxWidth: 360 }}>Have a question? Let&rsquo;s talk</h2>
              <p className="mkt-lead">Questions about a check, white label, or working together. Send a note and we will come back to you.</p>
              <p style={{ marginTop: 18, color: "var(--text-2)", fontSize: 14 }}>Melbourne, Australia</p>
            </div>
            <div className="mkt-contact-form">
              <div className="mkt-cf-row">
                <input type="text" placeholder="Your name" aria-label="Your name" />
                <input type="email" placeholder="Email" aria-label="Email" />
              </div>
              <input type="text" placeholder="Company or website" aria-label="Company or website" />
              <textarea rows={4} placeholder="How can we help?" aria-label="Message" />
              <button type="button" className="mkt-btn primary" style={{ width: "100%" }}>Send message</button>
              <p className="mkt-cf-note">We reply within one business day.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap mkt-band">
          <h2>Find out what AI says about you</h2>
          <p>All you need is a domain and a handful of competitors. We do the rest.</p>
          <div className="mkt-herocta">
            <Link href="/pricing" className="mkt-btn primary">See pricing</Link>
            <Link href="/login" className="mkt-btn">Start Now</Link>
          </div>
        </div>
      </section>
    </>
  );
}
