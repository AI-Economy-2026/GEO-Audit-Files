import type { Metadata } from "next";
import Link from "next/link";
import "./how.css";

export const metadata: Metadata = {
  title: "Gatha | How It Works",
  description: "How Gatha works: enter a website, Gatha reads the keywords you rank for, runs the prompts buyers ask across every AI engine, and hands you what it found plus a ranked plan to fix it. No subscription.",
};

export default function HowPage() {
  return (
    <>
      <header className="mkt-hero">
        <div className="mkt-wrap">
          <span className="mkt-eyebrow">How it works</span>
          <h1 className="mkt-big">Find out where you show up in minutes</h1>
          <p className="mkt-hero-sub">Gatha reads how AI search sees your business, shows you what it found, and hands you the fix. No subscription.</p>
          <div className="mkt-herocta">
            <Link href="/pricing" className="mkt-btn primary">See pricing</Link>
            <Link href="/login" className="mkt-btn">Start Now</Link>
          </div>
        </div>
      </header>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-panel mkt-frow">
            <div className="mkt-fr-txt">
              <div className="mkt-fr-step">Add a business</div>
              <h2>Enter a website. Gatha does the rest</h2>
              <p>Gatha reads the keywords you already rank for and turns them into the prompts buyers are really searching AI. No long setup, no guessing which questions matter.</p>
              <div className="mkt-flist">
                <div><span className="ck">&check;</span>Prompts built from real search demand</div>
                <div><span className="ck">&check;</span>Pick your market and language</div>
                <div><span className="ck">&check;</span>Ready in minutes</div>
              </div>
            </div>
            <div className="how-card">
              <div className="how-card-h"><span>Prompts to check</span><span>50 built</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div style={{ fontSize: 13.5, background: "#f7f9fc", border: "1px solid #eef1f7", borderRadius: 10, padding: "11px 13px" }}>Who are the best providers in my area?</div>
                <div style={{ fontSize: 13.5, background: "#f7f9fc", border: "1px solid #eef1f7", borderRadius: 10, padding: "11px 13px" }}>Compare the top options in this category</div>
                <div style={{ fontSize: 13.5, background: "#f7f9fc", border: "1px solid #eef1f7", borderRadius: 10, padding: "11px 13px" }}>Who should I use, and why?</div>
              </div>
              <div style={{ marginTop: 13, fontSize: 12, color: "#8a97ad" }}>Built from the keywords you already rank for</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap">
          <div className="mkt-panel">
            <div className="mkt-frow">
              <div className="mkt-fr-txt">
                <div className="mkt-fr-step">We ask the engines</div>
                <h2>Every engine, every prompt, checked</h2>
                <p>Gatha runs your prompts across the chat engines that recommend businesses and the answer engines that put one answer at the top, and records where you win, where you are only mentioned, and who wins when you are missing.</p>
                <div className="mkt-flist">
                  <div><span className="ck">&check;</span>ChatGPT, Claude, Gemini, Perplexity, Grok, Meta AI, DeepSeek</div>
                  <div><span className="ck">&check;</span>Google AI Overviews, AI Mode and Copilot</div>
                  <div><span className="ck">&check;</span>The real answer each engine gave</div>
                </div>
              </div>
              <div className="how-card">
                <div className="how-card-h"><span>How you show up, by engine</span><span>10+ engines</span></div>
                {[
                  { name: "Perplexity", pct: 50, status: "Holding", tone: "g" },
                  { name: "ChatGPT", pct: 30, status: "Under-cited", tone: "a" },
                  { name: "Gemini", pct: 25, status: "Under-cited", tone: "a" },
                  { name: "Claude", pct: 28, status: "Holding", tone: "g" },
                ].map((row) => (
                  <div className="how-erow" key={row.name}>
                    <span className="en">{row.name}</span>
                    <div className="how-bar"><span style={{ width: `${row.pct}%` }} /></div>
                    <span className="how-pc">{row.pct}%</span>
                    <span className={`how-pill ${row.tone}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mkt-frow" style={{ marginTop: 56 }}>
              <div className="how-card how-ans">
                <div className="ah"><span className="mk" style={{ background: "#10a37f" }}>C</span>ChatGPT &middot; chat engine</div>
                <div className="q">Who are the best providers in my area?</div>
                <div className="a">Established providers include <span className="named">Your Brand</span>, along with a few others. <span className="named">Your Brand</span> is known for the work buyers search for.</div>
                <div className="foot"><span className="src">yourbrand.com</span><span className="src">Industry directory</span></div>
              </div>
              <div className="mkt-fr-txt">
                <h2 style={{ fontSize: 23 }}>See the actual answer</h2>
                <p>For every prompt, Gatha captures what the engine really said, who it named, and the sources it pulled, so you can see exactly why you win or lose.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-panel">
            <div className="mkt-center" style={{ maxWidth: 620 }}>
              <div className="mkt-kick">Step 3</div>
              <h2 className="mkt-sh">What we found, and what to do</h2>
              <p className="mkt-lead">Every audit ends with a clear read of where you stand and a ranked plan. This is the part other tools leave out.</p>
            </div>

            <div className="mkt-frow" style={{ marginTop: 44 }}>
              <div className="mkt-fr-txt">
                <h2 style={{ fontSize: 23 }}>Can AI even read your site?</h2>
                <p>AI Site Health gives you a score and the exact issues stopping engines from reading your pages, with the fix for each.</p>
              </div>
              <div className="how-card">
                <div className="how-card-h"><span>AI Site Health</span><span>Can AI read you?</span></div>
                <div className="how-dial">
                  <svg width="96" height="96" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#eef1f7" strokeWidth="9" />
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#0a7d63" strokeWidth="9" strokeLinecap="round" strokeDasharray="251" strokeDashoffset="70" transform="rotate(-90 48 48)" />
                  </svg>
                  <div>
                    <div className="n">72</div>
                    <div className="l">Site AI Score</div>
                    <div className="s">&#9650; 6 since last audit</div>
                  </div>
                </div>
                <div style={{ marginTop: 16, fontSize: 13, color: "#51617e", lineHeight: 1.55 }}>Three fixes are stopping engines from reading two key pages. Each is a single-page change.</div>
              </div>
            </div>

            <div className="mkt-frow" style={{ marginTop: 40 }}>
              <div className="how-card">
                <div className="how-card-h"><span>You vs the competition</span><span>this category</span></div>
                <div className="how-vs">
                  <div className="how-vsrow"><span className="how-vsn">Competitor A</span><div className="how-vsbar"><span style={{ width: "72%" }} /></div><span className="how-vspc">72%</span></div>
                  <div className="how-vsrow"><span className="how-vsn">Competitor B</span><div className="how-vsbar"><span style={{ width: "48%" }} /></div><span className="how-vspc">48%</span></div>
                  <div className="how-vsrow you"><span className="how-vsn">You</span><div className="how-vsbar"><span style={{ width: "20%" }} /></div><span className="how-vspc">20%</span></div>
                </div>
                <div className="how-vsnote">Competitor A wins 7 of the 10 prompts you are missing.</div>
              </div>
              <div className="mkt-fr-txt">
                <h2 style={{ fontSize: 23 }}>See who wins when you don&rsquo;t</h2>
                <p>Gatha shows you the competitors AI names instead of you, on the exact prompts where you are missing. This is the gap, made obvious.</p>
              </div>
            </div>

            <div className="mkt-frow" style={{ marginTop: 40 }}>
              <div className="mkt-fr-txt">
                <h2 style={{ fontSize: 23 }}>A ranked plan, not just a score</h2>
                <p>What to fix first, why it matters, and the likely impact. Act on it yourself, or hand it to a client.</p>
              </div>
              <div className="how-card">
                <div className="how-card-h"><span>What to do first</span><span>Ranked by impact</span></div>
                <div className="how-plan">
                  <div className="pi"><span className="rk">1</span><div><div className="pt">Add clear service descriptions</div><div className="pd">Two pages AI cannot parse today</div></div><span className="imp">High</span></div>
                  <div className="pi"><span className="rk">2</span><div><div className="pt">Publish a comparison page</div><div className="pd">Comparison content wins AI citations</div></div><span className="imp">High</span></div>
                  <div className="pi"><span className="rk">3</span><div><div className="pt">Fix structured data</div><div className="pd">Helps engines quote you accurately</div></div><span className="imp">Medium</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt" id="tracking">
        <div className="mkt-wrap">
          <div className="mkt-panel mkt-frow">
            <div className="mkt-fr-txt">
              <div className="mkt-fr-step">Tracking with Watch</div>
              <h2>See it move over time</h2>
              <p>Add Watch and Gatha re-checks your tracked prompts on a schedule, so you can prove the number moved after you act on the plan. It tracks the full picture, not just one metric.</p>
              <div className="mkt-flist">
                <div><span className="ck">&check;</span>Visibility score trend, your headline number over time</div>
                <div><span className="ck">&check;</span>Average position, citation rate and sentiment, each trended</div>
                <div><span className="ck">&check;</span>Share of voice against your named competitors</div>
                <div><span className="ck">&check;</span>Per-engine breakdown, climbing on one, slipping on another</div>
                <div><span className="ck">&check;</span>Prompt-level wins and losses behind the headline</div>
              </div>
            </div>
            <div className="how-card">
              <div className="how-card-h"><span>Visibility over time</span><span>Last 6 months</span></div>
              <svg viewBox="0 0 320 120" style={{ width: "100%", height: "auto", display: "block" }}>
                <polyline points="10,95 62,88 114,80 166,62 218,48 270,32 310,24" fill="none" stroke="#0a7d63" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="310" cy="24" r="4" fill="#0a7d63" />
              </svg>
              <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
                <div style={{ flex: 1, textAlign: "center", border: "1px solid #eef1f7", borderRadius: 12, padding: 11 }}><div style={{ fontSize: 22, fontWeight: 700 }}>22%</div><div style={{ fontSize: 11, color: "#51617e", marginTop: 2 }}>Visibility now</div></div>
                <div style={{ flex: 1, textAlign: "center", border: "1px solid #eef1f7", borderRadius: 12, padding: 11 }}><div style={{ fontSize: 22, fontWeight: 700, color: "#0a7d63" }}>&#9650; 12</div><div style={{ fontSize: 11, color: "#51617e", marginTop: 2 }}>Up from 10%</div></div>
                <div style={{ flex: 1, textAlign: "center", border: "1px solid #eef1f7", borderRadius: 12, padding: 11 }}><div style={{ fontSize: 22, fontWeight: 700 }}>38%</div><div style={{ fontSize: 11, color: "#51617e", marginTop: 2 }}>Share of voice</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-panel mkt-frow">
            <div className="mkt-fr-txt">
              <div className="mkt-fr-step">Ask Sarah</div>
              <h2>Don&rsquo;t get it? Just ask</h2>
              <p>Every report comes with Ask Sarah, a built-in assistant that explains what any number means, in plain English. No more staring at a dashboard wondering what to do. It does the interpretation for you.</p>
              <div className="mkt-flist">
                <div><span className="ck">&check;</span>Explains your findings in plain language</div>
                <div><span className="ck">&check;</span>Tells you what to fix first, and why</div>
                <div><span className="ck">&check;</span>Right there in the report, whenever you need it</div>
              </div>
            </div>
            <div className="how-card" style={{ maxWidth: 420 }}>
              <div className="how-card-h"><span>Ask Sarah</span><span>In your report</span></div>
              <div className="how-chat">
                <div className="you">Why am I missing on Perplexity?</div>
                <div className="sarah">Perplexity leans on third-party sources, and yours are thin. Two directory listings and one comparison page would likely get you named. Want the steps?</div>
              </div>
              <div className="how-chat-input">Ask about your report...</div>
            </div>
          </div>
        </div>
      </section>

      <div className="mkt-wrap">
        <div className="mkt-engbar">
          <span className="mkt-engbar-lab">Checked across</span>
          <span>ChatGPT &middot; Claude &middot; Gemini &middot; Perplexity &middot; Grok &middot; Meta AI &middot; DeepSeek &middot; Google AI Overviews &middot; Google AI Mode &middot; Copilot</span>
        </div>
      </div>

      <section className="mkt-sec alt">
        <div className="mkt-wrap mkt-band">
          <h2>See how you show up in AI search</h2>
          <p>All you need is a domain and a handful of competitors. We do the rest.</p>
          <div className="mkt-herocta">
            <Link href="/pricing" className="mkt-btn primary">See pricing</Link>
          </div>
        </div>
      </section>
    </>
  );
}
