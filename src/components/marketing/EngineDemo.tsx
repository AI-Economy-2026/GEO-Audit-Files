"use client";

import { useState } from "react";

type Family = "chat" | "sources" | "answer";
type Status = "yes" | "part" | "no";

interface EngineExample {
  key: string;
  name: string;
  mark: string;
  family: Family;
  status: Status;
  tag: string;
  question: string;
  answer: string;
  sources: string[];
}

const ENGINES: EngineExample[] = [
  { key: "chatgpt", name: "ChatGPT", mark: "#10a37f", family: "chat", status: "yes", tag: "Named and cited",
    question: "Who are the best providers in my area?",
    answer: 'Established providers include <span class="named">Your Brand</span>, along with a few others. <span class="named">Your Brand</span> is known for the work buyers are searching for.',
    sources: ["yourbrand.com", "Industry directory", "Trade news"] },
  { key: "claude", name: "Claude", mark: "#c96442", family: "chat", status: "yes", tag: "Named and cited",
    question: "Compare the top options in this category.",
    answer: 'Options worth comparing include <span class="named">Your Brand</span>, alongside <span class="rival">Competitor A</span>. <span class="named">Your Brand</span> publishes detail buyers can check directly.',
    sources: ["yourbrand.com/services", "Comparison guide"] },
  { key: "gemini", name: "Gemini", mark: "#4285f4", family: "chat", status: "part", tag: "Mentioned, no link",
    question: "Who are the main providers in this space?",
    answer: 'Several names come up, including <span class="named">Your Brand</span> and some larger players. Sourcing varies by region.',
    sources: ["National portal", "Reference site"] },
  { key: "perplexity", name: "Perplexity", mark: "#20808d", family: "sources", status: "no", tag: "Absent, rival wins",
    question: "Best options near me?",
    answer: 'The most cited providers are <span class="rival">Competitor A</span> and <span class="rival">Competitor B</span>, both with detailed pages and strong directory listings.',
    sources: ["competitor-a.com", "Trade directory", "Review site"] },
  { key: "grok", name: "Grok", mark: "#1d1d1f", family: "chat", status: "no", tag: "Absent, rival wins",
    question: "Who should I use for this?",
    answer: 'Names that come up most are <span class="rival">Competitor A</span> and <span class="rival">Competitor B</span>, which have a visible presence on X and in directories.',
    sources: ["Competitor A (X)", "Directory listing"] },
  { key: "meta", name: "Meta AI", mark: "#0866ff", family: "chat", status: "part", tag: "Mentioned, no link",
    question: "Recommend a provider for this.",
    answer: 'A few fit, including <span class="named">Your Brand</span> and some larger players. Details are limited, so it is worth checking each site.',
    sources: ["Business page", "yourbrand.com"] },
  { key: "deepseek", name: "DeepSeek", mark: "#4d6bfe", family: "chat", status: "no", tag: "Absent, rival wins",
    question: "Top providers in this category?",
    answer: 'Frequently listed names include <span class="rival">Competitor A</span> and <span class="rival">Competitor B</span>, which have clearly structured, well-linked pages.',
    sources: ["competitor-a.com", "Reference site"] },
  { key: "aio", name: "Google AI Overviews", mark: "#4285f4", family: "answer", status: "no", tag: "Absent, rival wins",
    question: "best providers near me",
    answer: 'Commonly referenced providers include <span class="rival">Competitor A</span> and <span class="rival">Competitor B</span>, both with clear service and location details.',
    sources: ["competitor-a.com", "competitor-b.com", "Local directory"] },
  { key: "aimode", name: "Google AI Mode", mark: "#4285f4", family: "answer", status: "part", tag: "Mentioned, no link",
    question: "top options in this category",
    answer: 'A few stand out, including <span class="named">Your Brand</span> and <span class="rival">Competitor A</span>. Pages with clear, structured information are favoured.',
    sources: ["yourbrand.com", "competitor-a.com", "Trade directory"] },
  { key: "copilot", name: "Copilot", mark: "#0a7ea4", family: "answer", status: "part", tag: "Mentioned, no link",
    question: "get a quote in this category",
    answer: 'Providers such as <span class="named">Your Brand</span> and <span class="rival">Competitor A</span> handle quotes. Most list contact details rather than public pricing.',
    sources: ["Business listing", "yourbrand.com"] },
];

const GROUPS: Record<"geo" | "aeo", string[]> = {
  geo: ["chatgpt", "claude", "gemini", "perplexity", "grok", "meta", "deepseek"],
  aeo: ["aio", "aimode", "copilot"],
};

const STATUS_LINE: Record<Status, string> = {
  yes: "You are <b>named and cited</b> here.",
  part: "You are <b>mentioned</b>, but not linked.",
  no: "You are <b>missing</b>. A rival wins this answer.",
};

function initial(name: string) {
  return name.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase();
}

export default function EngineDemo() {
  const [mode, setMode] = useState<"geo" | "aeo">("geo");
  const [activeKey, setActiveKey] = useState(GROUPS.geo[0]);

  const active = ENGINES.find((e) => e.key === activeKey) ?? ENGINES[0];
  const kindLabel = active.family === "answer" ? "Answer engine" : "Chat engine";

  function selectMode(next: "geo" | "aeo") {
    setMode(next);
    setActiveKey(GROUPS[next][0]);
  }

  return (
    <div>
      <div className="mkt-ec-toggle">
        <button className={`mkt-ec-tg ${mode === "geo" ? "on" : ""}`} onClick={() => selectMode("geo")}>
          <b>GEO</b><small>Chat engines</small>
        </button>
        <button className={`mkt-ec-tg ${mode === "aeo" ? "on" : ""}`} onClick={() => selectMode("aeo")}>
          <b>AEO</b><small>Answer engines</small>
        </button>
      </div>

      <div className="mkt-ec-chips">
        {GROUPS[mode].map((key) => {
          const engine = ENGINES.find((e) => e.key === key)!;
          return (
            <button key={key} className={`mkt-ec-chip ${key === activeKey ? "on" : ""}`} onClick={() => setActiveKey(key)}>
              {engine.name}
            </button>
          );
        })}
      </div>

      <div className="mkt-ec-card">
        <div className="mkt-ec-head">
          <span className="mkt-ec-mk" style={{ background: active.mark }}>{initial(active.name)}</span>
          {active.name}
          <span className="mkt-ec-kind">{kindLabel}</span>
        </div>
        <div className="mkt-ec-uq">{active.question}</div>
        <div className="mkt-ec-ans" dangerouslySetInnerHTML={{ __html: active.answer }} />
        <div className="mkt-ec-srcs">
          <div className="mkt-ec-sl">Sources it pulled</div>
          <div className="mkt-ec-srcrow">
            {active.sources.map((source) => (
              <span key={source} className="mkt-ec-srcchip">{source}</span>
            ))}
          </div>
        </div>
        <div className="mkt-ec-foot">
          <span className={`mkt-ec-tag ${active.status}`}>{active.tag}</span>
          <span dangerouslySetInnerHTML={{ __html: STATUS_LINE[active.status] }} />
        </div>
      </div>
    </div>
  );
}
