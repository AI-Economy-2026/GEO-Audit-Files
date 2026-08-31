import type { Metadata } from "next";
import Link from "next/link";
import "./white-label.css";

export const metadata: Metadata = {
  title: "Gatha White Label | Sell AI Visibility Audits as Your Own",
  description:
    "White label AI visibility audits for agencies and consultants. Your brand on every report, results clients understand, and the technical and content work to improve them. No subscription to run audits.",
};

export default function WhiteLabelPage() {
  return (
    <>
      <header className="mkt-hero">
        <div className="mkt-wrap">
          <span className="mkt-eyebrow">White Label</span>
          <h1 className="mkt-big">Make Gatha <span className="m">your own</span></h1>
          <p className="mkt-hero-sub">Enjoy the flexibility to run AI visibility as your own service. Your brand on every audit, delivered your way, activated through Gatha or your own channels.</p>
          <div className="mkt-herocta">
            <Link href="/pricing" className="mkt-btn primary">See white label pricing</Link>
            <Link href="/contact" className="mkt-btn">Talk to us</Link>
          </div>
        </div>
      </header>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-panel">
            <div className="mkt-center" style={{ maxWidth: 620 }}>
              <div className="mkt-kick">The opportunity</div>
              <h2 className="mkt-sh">The audit is the door</h2>
              <p className="mkt-lead">Every gap it surfaces is a reason to do more of your work. Run it, show them, help them improve, keep it moving.</p>
            </div>
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
              <div className="mkt-wlf-step end"><div className="mkt-wlf-n">&#9650;</div><div className="mkt-wlf-t">Watch</div><div className="mkt-wlf-s">Track the movements, celebrate the wins, keep up the work.</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap">
          <div className="mkt-panel wl-frow">
            <div className="mkt-fr-txt">
              <div className="mkt-fr-step">Win the work first</div>
              <h2>A prospecting tool, not a commitment</h2>
              <p>Run a branded audit to open the conversation and prove there is a problem worth fixing. It is a concrete reason to reach out and a business case to pitch, so you win the client before you commit to anything. You are never on the hook for work you have not yet won.</p>
              <div className="mkt-flist">
                <div><span className="ck">&check;</span>A branded reason to start the conversation</div>
                <div><span className="ck">&check;</span>Show the gap, then pitch the fix</div>
                <div><span className="ck">&check;</span>No delivery commitment until the client says yes</div>
              </div>
            </div>
            <div className="wl-fr-vis">
              <div className="wl-lightcard">
                <div className="wl-card-h"><span>Your pitch</span><span>Before any work</span></div>
                <div className="wl-plan">
                  <div className="pi"><span className="rk">1</span><div><div className="pt">Run the audit on their business</div></div></div>
                  <div className="pi"><span className="rk">2</span><div><div className="pt">Send it, branded as you, with the gaps</div></div></div>
                  <div className="pi"><span className="rk">3</span><div><div className="pt">Pitch the fix, and only then take on the work</div></div></div>
                </div>
                <div style={{ marginTop: 14, paddingTop: 13, borderTop: "1px solid #eef1f7", fontSize: 12.5, color: "#0a7d63", fontWeight: 600 }}>
                  Zero risk. You win the client before you deliver a thing.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-panel wl-frow flip">
            <div className="mkt-fr-txt">
              <div className="mkt-fr-step">What we surface</div>
              <h2>Where they show up, and where they don&rsquo;t</h2>
              <p>For every client, Gatha picks up the technical issues holding them back, shows where their brand is cited across the engines and where a competitor wins instead, then builds it all into an actionable plan you can deliver.</p>
              <div className="mkt-flist">
                <div><span className="ck">&check;</span>Technical issues stopping engines reading the site</div>
                <div><span className="ck">&check;</span>Where the brand is cited, and where a rival wins</div>
                <div><span className="ck">&check;</span>An actionable, ranked plan to close the gaps</div>
              </div>
            </div>
            <div className="wl-fr-vis">
              <div className="wl-lightcard">
                <div className="wl-card-h"><span>You vs the competition</span><span>this category</span></div>
                <div className="wl-vsrow"><span className="n">Competitor A</span><div className="wl-vsbar"><span style={{ width: "72%" }} /></div><span className="wl-vspc">72%</span></div>
                <div className="wl-vsrow"><span className="n">Competitor B</span><div className="wl-vsbar"><span style={{ width: "48%" }} /></div><span className="wl-vspc">48%</span></div>
                <div className="wl-vsrow you"><span className="n">Client</span><div className="wl-vsbar"><span style={{ width: "20%" }} /></div><span className="wl-vspc">20%</span></div>
                <div className="wl-vsnote">Competitor A wins 7 of the 10 prompts they are missing.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap">
          <div className="mkt-panel wl-frow flip">
            <div className="mkt-fr-txt">
              <div className="mkt-fr-step">A built-in assistant</div>
              <h2>Ask what it means, and what to do</h2>
              <p>Every report comes with a built-in assistant. Ask it to explain the feedback, what a number means and what to do about it, so you can interpret the report with confidence. Your clients get the same, the security of resolving their own questions on the spot, without waiting on you.</p>
              <div className="mkt-flist">
                <div><span className="ck">&check;</span>Explains the feedback in plain English, what it means</div>
                <div><span className="ck">&check;</span>You interpret the report with confidence</div>
                <div><span className="ck">&check;</span>Clients can ask and resolve questions themselves</div>
              </div>
            </div>
            <div className="wl-fr-vis">
              <div className="wl-lightcard">
                <div className="wl-card-h"><span>Ask</span><span>In every report</span></div>
                <div className="wl-chatrow">
                  <div className="wl-chat-q">Why is my client missing on Perplexity?</div>
                  <div className="wl-chat-a">Perplexity leans on third-party sources, and theirs are thin. Two directory listings and one comparison page would likely get them named. Want the steps?</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-panel wl-frow flip">
            <div className="mkt-fr-txt">
              <div className="mkt-fr-step">Your whole roster</div>
              <h2>Every client in one space</h2>
              <p>Run and manage all your clients from a single account. Watch tracks how each one moves over time, so you can see who is climbing, who has slipped, and exactly what to do next to help them improve.</p>
              <div className="mkt-flist">
                <div><span className="ck">&check;</span>Every client in one dashboard</div>
                <div><span className="ck">&check;</span>Track visibility over time with Watch</div>
                <div><span className="ck">&check;</span>A clear next action for each one</div>
              </div>
            </div>
            <div className="wl-fr-vis">
              <div className="wl-lightcard">
                <div className="wl-card-h"><span>Your clients</span><span>Tracking</span></div>
                <div className="wl-clientrow"><span className="name">Client A</span><span className="pct up">68% &#9650; 6</span><span className="next">Next: publish a comparison page</span></div>
                <div className="wl-clientrow"><span className="name">Client B</span><span className="pct up">41% &#9650; 3</span><span className="next">Next: fix structured data</span></div>
                <div className="wl-clientrow"><span className="name">Client C</span><span className="pct down">22% &#9660; 2</span><span className="next">Next: add clear service pages</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap">
          <div className="mkt-panel">
            <div className="mkt-center" style={{ maxWidth: 620 }}>
              <div className="mkt-kick">Make it yours</div>
              <h2 className="mkt-sh">Your brand. Your report. Your call on price</h2>
              <p className="mkt-lead">Reporting that flexes to how you work, with your brand on every audit and shared link, from day one.</p>
            </div>
            <div className="wl-grid3">
              <div className="wl-gcard"><div className="gi">&#128196;</div><h3>Your branding</h3><p>Your logo and name on every report and shared client link. It reads as your product, because it is.</p></div>
              <div className="wl-gcard peri"><div className="gi">&#128203;</div><h3>Reporting flex</h3><p>Share a live link, export a branded report, or drop the findings into your own deck. Present it the way your client expects.</p></div>
              <div className="wl-gcard"><div className="gi">&#128176;</div><h3>You set the price</h3><p>You pay for the audit. What you charge your client is entirely up to you.</p></div>
            </div>
            <div className="wl-brandbar">
              <span>Your brand appears on:</span>
              <span className="wl-brandchip">The report</span><span className="wl-brandchip">Shared links</span><span className="wl-brandchip">Exports</span><span className="wl-brandchip">The assistant</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-panel wl-frow">
            <div className="mkt-fr-txt">
              <div className="mkt-fr-step">Technical &amp; content ops</div>
              <h2>Sell more of what you&rsquo;re good at</h2>
              <p>Gatha leverages data and insights to help you build a business case for more services. We can help you activate these through white label, or you deliver them through your own channels. Either way, the audit turns the findings into work you deliver, and moves the conversation from &ldquo;here is the problem&rdquo; to &ldquo;here is what we will do about it&rdquo;.</p>
              <div className="mkt-flist">
                <div><span className="ck">&check;</span>Technical fixes: site health, structured data, crawlability</div>
                <div><span className="ck">&check;</span>Content: comparison pages, service pages, GEO content</div>
                <div><span className="ck">&check;</span>Ongoing: monitoring, reporting, retained AI search work</div>
              </div>
            </div>
            <div className="wl-fr-vis">
              <div className="wl-lightcard">
                <div className="wl-card-h"><span>What to do first</span><span>Ranked by impact</span></div>
                <div className="wl-plan">
                  <div className="pi"><span className="rk">1</span><div><div className="pt">Add clear service descriptions</div><div className="pd">Technical: two pages AI cannot parse</div></div><span className="imp">High</span></div>
                  <div className="pi"><span className="rk">2</span><div><div className="pt">Publish a comparison page</div><div className="pd">Content: wins AI citations</div></div><span className="imp">High</span></div>
                  <div className="pi"><span className="rk">3</span><div><div className="pt">Fix structured data</div><div className="pd">Technical: helps engines quote them</div></div><span className="imp">Medium</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap">
          <div className="mkt-panel wl-frow flip">
            <div className="mkt-fr-txt">
              <div className="mkt-fr-step">Connectors <span className="mkt-soon">Coming soon</span></div>
              <h2>Push the findings into how you work</h2>
              <p>Send each audit&rsquo;s gaps and 90-day plan straight into the tools your team already runs, so the work moves from report to action without the copy and paste.</p>
              <div className="mkt-flist">
                <div><span className="ck">&check;</span>Notion and Asana: turn the plan into tasks</div>
                <div><span className="ck">&check;</span>Google: ground every audit in your real search demand</div>
                <div><span className="ck">&check;</span>More connectors as we roll them out</div>
              </div>
            </div>
            <div className="wl-fr-vis">
              <div className="wl-lightcard">
                <div className="wl-card-h"><span>Connectors</span><span>Coming soon</span></div>
                <div className="wl-connrow"><span className="mk" style={{ background: "#0b1428" }}>N</span><div><div className="name">Notion</div><div className="sub">Plan and findings as a page</div></div><span className="soon">Soon</span></div>
                <div className="wl-connrow"><span className="mk" style={{ background: "#f06a6a" }}>A</span><div><div className="name">Asana</div><div className="sub">Each fix becomes a task</div></div><span className="soon">Soon</span></div>
                <div className="wl-connrow"><span className="mk" style={{ background: "#4285f4" }}>G</span><div><div className="name">Google</div><div className="sub">Grounds audits in real demand</div></div><span className="soon">Soon</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap">
          <div className="mkt-panel mkt-center" style={{ maxWidth: 660, margin: "0 auto" }}>
            <div className="mkt-kick">You need all three</div>
            <h2 className="mkt-sh">Everything your clients need, in one place</h2>
            <p className="mkt-lead">SEO, AEO and GEO together are how businesses get found now. Gatha does AEO and GEO today, with a full SEO audit coming soon, and connectors that push the work into your tools. One place for all three, so you and your clients can drop the expensive stacks and commit only to what you need.</p>
            <div className="wl-brandbar">
              <span>In one platform:</span>
              <span className="wl-brandchip">AEO</span><span className="wl-brandchip">GEO</span><span className="wl-brandchip">SEO, coming soon</span><span className="wl-brandchip">Connectors</span><span className="wl-brandchip">White label</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-sec alt">
        <div className="mkt-wrap mkt-center" style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 className="mkt-sh" style={{ fontSize: 24 }}>Simple to run as a business</h2>
          <p className="mkt-lead">Audits are pay-as-you-go, no subscription to run a check. White Label and Watch are optional monthly add-ons for when you are ready to brand and track.</p>
        </div>
      </section>

      <section className="mkt-sec">
        <div className="mkt-wrap mkt-band">
          <h2>Looking for AI services to sell?</h2>
          <p>White label Gatha as your own and you are good to go. We can help with the rest.</p>
          <div className="mkt-herocta">
            <Link href="/pricing" className="mkt-btn primary">See white label pricing</Link>
            <Link href="/contact" className="mkt-btn">Talk to us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
