"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

interface ClientInfo {
  name: string;
  url: string;
}

export default function IntakePage() {
  const { token } = useParams<{ token: string }>();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [pageState, setPageState] = useState<
    "loading" | "form" | "submitting" | "success" | "error" | "already_done"
  >("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [reportSlug, setReportSlug] = useState("");

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  useEffect(() => {
    async function loadClient() {
      try {
        const res = await fetch(`/api/intake/${token}`);
        const data = await res.json();
        if (res.status === 409) {
          setPageState("already_done");
          return;
        }
        if (!res.ok) {
          setErrorMsg(data.error || "Invalid link.");
          setPageState("error");
          return;
        }
        setClient(data.client);
        setWebsiteUrl(data.client.url || "");
        setPageState("form");
      } catch {
        setErrorMsg("Could not load form. Please try again.");
        setPageState("error");
      }
    }
    loadClient();
  }, [token]);

  function addKeyword() {
    const item = keywordInput.trim();
    if (item && !keywords.includes(item)) {
      setKeywords([...keywords, item]);
      setKeywordInput("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (keywords.length === 0) {
      setErrorMsg("Please add at least one query.");
      return;
    }
    setPageState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/intake/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: websiteUrl,
          competitors: competitors.filter((c) => c.trim()),
          keywords,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to submit.");
        setPageState("form");
        return;
      }
      setReportSlug(data.report_slug);
      setPageState("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setPageState("form");
    }
  }

  const inputCls =
    "w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all";

  const header = (
    <header className="border-b border-outline-variant bg-surface-bright/95 backdrop-blur-sm py-6">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary">radar</span>
          </div>
          <span className="text-xl font-black tracking-tighter text-primary">
            Gatha
          </span>
        </div>
        <p className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold mt-2">
          AI Visibility Intake
        </p>
      </div>
    </header>
  );

  if (pageState === "loading") {
    return (
      <div className="theme-light bg-ambient min-h-screen">
        {header}
        <div className="text-center py-20 text-on-surface-variant">Loading...</div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="theme-light bg-ambient min-h-screen">
        {header}
        <div className="max-w-lg mx-auto px-4 py-16">
          <GlassCard padding="lg" className="text-center border-error/30">
            <span className="material-symbols-outlined text-error text-4xl mb-3">error</span>
            <h2 className="text-xl font-bold text-on-surface mb-2">Link Not Found</h2>
            <p className="text-on-surface-variant">{errorMsg}</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (pageState === "already_done") {
    return (
      <div className="theme-light bg-ambient min-h-screen">
        {header}
        <div className="max-w-lg mx-auto px-4 py-16">
          <GlassCard padding="lg" className="text-center">
            <span className="material-symbols-outlined text-primary text-4xl mb-3">
              check_circle
            </span>
            <h2 className="text-xl font-bold text-on-surface mb-2">Already Submitted</h2>
            <p className="text-on-surface-variant">
              This intake form has already been completed. Your audit is in progress.
            </p>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (pageState === "success") {
    const reportUrl = `${window.location.origin}/report/${reportSlug}`;
    return (
      <div className="theme-light bg-ambient min-h-screen">
        {header}
        <div className="max-w-lg mx-auto px-4 py-16">
          <GlassCard padding="xl" className="text-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(29,158,117,0.35)]">
              <span className="material-symbols-outlined text-on-primary-fixed text-3xl">
                rocket_launch
              </span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tighter text-on-surface mb-2">
              Audit Started
            </h2>
            <p className="text-on-surface-variant mb-6 leading-relaxed">
              We&apos;re analysing{" "}
              <strong className="text-on-surface">{client?.name}</strong>&apos;s visibility across
              8 AI search engines. This typically takes 3–5 minutes.
            </p>
            <a href={reportUrl}>
              <Button icon="arrow_forward" size="lg" className="w-full">
                View Your Report
              </Button>
            </a>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-light bg-ambient min-h-screen">
      {header}

      <main className="max-w-2xl mx-auto px-4 py-10 relative z-10">
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-3">
            {client?.name}
          </h2>
          <p className="text-on-surface-variant max-w-lg mx-auto">
            Tell us what you want to be found for and we&apos;ll check your visibility across every
            major AI search engine.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Website */}
          <GlassCard padding="lg">
            <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">public</span>
              Your Website
            </h3>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                URL <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="yourcompany.com"
                className={inputCls}
                required
              />
            </div>
          </GlassCard>

          {/* Keywords */}
          <GlassCard padding="lg" className="border-primary/30">
            <h3 className="text-lg font-bold text-on-surface mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                target
              </span>
              What do you want to be found for?
            </h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Type the exact questions or phrases you want AI engines like ChatGPT, Claude, and
              Gemini to recommend you for.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="e.g. best digital marketing agency in Sydney"
                className={`flex-1 ${inputCls}`}
              />
              <Button type="button" onClick={addKeyword} icon="add">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => setKeywords(keywords.filter((k) => k !== item))}
                    className="hover:opacity-70"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </span>
              ))}
            </div>
            {websiteUrl && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/extract-keywords?url=${encodeURIComponent(websiteUrl)}`
                    );
                    const data = await res.json();
                    if (data.keywords?.length) {
                      setKeywords((prev) => [...new Set([...prev, ...data.keywords])]);
                    }
                  } catch {
                    /* ignore */
                  }
                }}
                className="text-sm text-primary hover:opacity-80 font-bold mt-4 inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Auto-suggest queries from your website
              </button>
            )}
          </GlassCard>

          {/* Competitors */}
          <GlassCard padding="lg">
            <h3 className="text-lg font-bold text-on-surface mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">groups</span>
              Competitors
            </h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Who are your main competitors? We&apos;ll compare your AI visibility against theirs.
            </p>
            <div className="space-y-2">
              {competitors.map((comp, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={comp}
                    onChange={(e) => {
                      const updated = [...competitors];
                      updated[idx] = e.target.value;
                      setCompetitors(updated);
                    }}
                    placeholder={`Competitor ${idx + 1}`}
                    className={`flex-1 ${inputCls}`}
                  />
                  {competitors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setCompetitors(competitors.filter((_, i) => i !== idx))}
                      className="px-3 text-error hover:opacity-80 text-xs font-bold uppercase tracking-wider"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCompetitors([...competitors, ""])}
              className="text-sm text-primary hover:opacity-80 font-bold mt-4 inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add competitor
            </button>
          </GlassCard>

          {errorMsg && (
            <div className="flex items-start gap-3 p-3 bg-error/10 border border-error/30 rounded-xl">
              <span className="material-symbols-outlined text-error">error</span>
              <p className="text-error text-sm">{errorMsg}</p>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            icon="rocket_launch"
            disabled={
              pageState === "submitting" || !websiteUrl || keywords.length === 0
            }
            className="w-full"
          >
            {pageState === "submitting"
              ? "Starting Audit..."
              : "Start My AI Visibility Audit"}
          </Button>

          <p className="text-xs text-on-surface-variant text-center opacity-70">
            Your audit will analyse visibility across ChatGPT, Claude, Gemini, Perplexity, Grok,
            Google AI, and Bing Copilot.
          </p>
        </form>
      </main>

      <footer className="border-t border-outline-variant py-6 mt-12">
        <div className="max-w-2xl mx-auto px-4 text-center text-sm text-on-surface-variant">
          <p>
            Powered by{" "}
            <a
              href="https://aieconomy.ai"
              className="text-primary hover:opacity-80 font-bold"
            >
              AI Economy
            </a>{" "}
            &middot; Balmer Agency
          </p>
        </div>
      </footer>
    </div>
  );
}
