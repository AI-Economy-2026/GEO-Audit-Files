"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import TopNav from "@/components/ui/TopNav";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";

interface PromptRow {
  prompt_id: number;
  category: string;
  prompt_text: string;
  prompt_type: "intent" | "ranking";
}

const STEP_LABELS = [
  "Contact",
  "Brand",
  "Competitors",
  "Keywords",
  "Intents",
  "Ranking",
];

export default function NewAuditPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandUrl, setBrandUrl] = useState("");

  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /**
   * Split input on commas OR newlines so users can paste lists like
   * "AI, AI Trainer, SEO" or multi-line. De-dupes, ignores empty.
   */
  function splitInput(raw: string): string[] {
    return raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function addCompetitor(e?: React.KeyboardEvent | React.MouseEvent) {
    if (e) e.preventDefault();
    const fresh = splitInput(competitorInput).filter((c) => !competitors.includes(c));
    if (fresh.length) {
      setCompetitors([...competitors, ...fresh]);
      setCompetitorInput("");
    }
  }
  function removeCompetitor(comp: string) {
    setCompetitors(competitors.filter((c) => c !== comp));
  }
  function addKeyword(e?: React.KeyboardEvent | React.MouseEvent) {
    if (e) e.preventDefault();
    const fresh = splitInput(keywordInput).filter((k) => !keywords.includes(k));
    if (fresh.length) {
      setKeywords([...keywords, ...fresh]);
      setKeywordInput("");
    }
  }
  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw));
  }
  function handlePromptEdit(id: number, newText: string) {
    setPrompts((prev) =>
      prev.map((p) => (p.prompt_id === id ? { ...p, prompt_text: newText } : p))
    );
  }
  function addNewPromptManually(type: "intent" | "ranking") {
    const nextId =
      prompts.length > 0 ? Math.max(...prompts.map((p) => p.prompt_id)) + 1 : 1;
    setPrompts([
      ...prompts,
      {
        prompt_id: nextId,
        category: keywords[0] || "General",
        prompt_text: "",
        prompt_type: type,
      },
    ]);
  }
  function removePrompt(id: number) {
    setPrompts((prev) => prev.filter((p) => p.prompt_id !== id));
  }

  async function handleGeneratePrompts() {
    setIsGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          brand_url: brandUrl,
          competitors,
          keywords,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate prompts.");

      let idCounter = 1;
      const newPrompts: PromptRow[] = [];
      const primaryCat = keywords[0] || "General";

      (data.intent_prompts || []).forEach((text: string) => {
        newPrompts.push({
          prompt_id: idCounter++,
          category: primaryCat,
          prompt_text: text,
          prompt_type: "intent",
        });
      });
      (data.ranking_prompts || []).forEach((text: string) => {
        newPrompts.push({
          prompt_id: idCounter++,
          category: primaryCat,
          prompt_text: text,
          prompt_type: "ranking",
        });
      });

      setPrompts(newPrompts);
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate prompts.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit(e: React.MouseEvent) {
    e.preventDefault();
    const validRanking = prompts.filter(
      (p) => p.prompt_type === "ranking" && p.prompt_text.trim() !== ""
    );
    if (validRanking.length === 0) {
      setError("Please provide at least one valid ranking prompt to run the audit.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/geo-audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: userName,
          user_email: userEmail,
          brand_name: brandName,
          brand_url: brandUrl,
          competitors,
          keywords,
          prompts: prompts.filter((p) => p.prompt_text.trim() !== ""),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create audit.");
      }

      router.push(`/audits/${data.audit_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const nextStep = () => {
    setError("");
    if (step === 1 && (!userName.trim() || !userEmail.trim())) {
      setError("Please fill out both Name and Email to continue.");
      return;
    }
    if (step === 2 && (!brandName.trim() || !brandUrl.trim())) {
      setError("Please fill out both Company Name and Website URL to continue.");
      return;
    }
    if (step === 3 && competitors.length === 0) {
      setError("Please add at least one competitor to continue.");
      return;
    }
    if (step === 4) {
      if (keywords.length === 0) {
        setError("Please add at least one keyword to continue.");
        return;
      }
      handleGeneratePrompts();
      return;
    }
    if (step === 5) {
      const validIntents = prompts.filter(
        (p) => p.prompt_type === "intent" && p.prompt_text.trim() !== ""
      );
      if (validIntents.length === 0) {
        setError("Please provide at least one valid search intent to continue.");
        return;
      }
    }
    setStep(step + 1);
  };
  const prevStep = () => setStep(step - 1);

  const intentPrompts = prompts.filter((p) => p.prompt_type === "intent");
  const rankingPrompts = prompts.filter((p) => p.prompt_type === "ranking");

  const inputCls =
    "w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all";

  return (
    <AppShell
      topNav={
        <TopNav
          brand="GEO Audit Pro"
          tabs={[
            { href: "/audits", label: "Audits", match: (p) => p.startsWith("/audits") },
            { href: "/clients", label: "Clients", match: (p) => p.startsWith("/clients") },
          ]}
          right={
            <Button variant="ghost" size="sm" icon="close" onClick={() => router.push("/audits")}>
              Exit Wizard
            </Button>
          }
        />
      }
    >
      <div className="max-w-4xl mx-auto">
        {/* Stepper */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">
              Step {step} of 6
            </span>
            <span className="text-xs uppercase tracking-widest text-primary font-bold">
              {STEP_LABELS[step - 1]}
            </span>
          </div>
          <div className="w-full h-1 bg-surface-container-lowest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <GlassCard
            padding="md"
            className="mb-6 border-error/30"
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-error">error</span>
              <p className="text-error text-sm">{error}</p>
            </div>
          </GlassCard>
        )}

        <GlassCard padding="xl">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-2">
                  Let&apos;s get started.
                </h2>
                <p className="text-on-surface-variant text-lg">Who is running this audit?</p>
              </div>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Jane Doe"
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-2">
                  Tell us about the company.
                </h2>
                <p className="text-on-surface-variant text-lg">What brand are we auditing?</p>
              </div>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Acme Legal"
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={brandUrl}
                    onChange={(e) => setBrandUrl(e.target.value)}
                    placeholder="e.g. acmelegal.com.au"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-2">
                  Who are your main competitors?
                </h2>
                <p className="text-on-surface-variant text-lg">
                  We&apos;ll track their visibility alongside yours. Paste multiple separated by commas.
                </p>
              </div>
              <div className="pt-4">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCompetitor(e)}
                    placeholder="e.g. Smith & Co, Jones Legal, Miller Partners"
                    className={`flex-1 ${inputCls}`}
                    autoFocus
                  />
                  <Button onClick={addCompetitor} icon="add">
                    Add
                  </Button>
                </div>
                <p className="text-xs text-on-surface-variant opacity-70 mb-4">
                  Tip: paste a comma-separated list and hit Add to bulk-insert.
                </p>
                {competitors.length > 0 && (
                  <ul className="space-y-2 mt-4">
                    {competitors.map((comp) => (
                      <li
                        key={comp}
                        className="flex justify-between items-center p-3 bg-white/5 border border-outline-variant rounded-xl hover:bg-white/10 transition-colors"
                      >
                        <span className="font-medium text-on-surface">{comp}</span>
                        <button
                          onClick={() => removeCompetitor(comp)}
                          className="text-error hover:opacity-80 text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-2">
                  What keywords do you want to be found for?
                </h2>
                <p className="text-on-surface-variant text-lg">
                  Paste multiple separated by commas — we&apos;ll split them for you. e.g. Criminal Lawyer, Melbourne Lawyer, Family Lawyer
                </p>
              </div>
              <div className="pt-4">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword(e)}
                    placeholder="e.g. AI, AI Trainer, AI Consultant, GEO, SEO"
                    className={`flex-1 ${inputCls}`}
                    autoFocus
                  />
                  <Button onClick={addKeyword} icon="add">
                    Add
                  </Button>
                </div>
                <p className="text-xs text-on-surface-variant opacity-70 mb-4">
                  Tip: paste a comma-separated list and hit Add to bulk-insert.
                </p>
                {keywords.length > 0 && (
                  <ul className="space-y-2 mt-4">
                    {keywords.map((kw) => (
                      <li
                        key={kw}
                        className="flex justify-between items-center p-3 bg-white/5 border border-outline-variant rounded-xl hover:bg-white/10 transition-colors"
                      >
                        <span className="font-medium text-on-surface">{kw}</span>
                        <button
                          onClick={() => removeKeyword(kw)}
                          className="text-error hover:opacity-80 text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-2">
                  If someone was searching for your business, what would they type?
                </h2>
                <p className="text-on-surface-variant text-lg">
                  We generated these from your keywords. Edit freely.
                </p>
              </div>
              <div className="pt-4">
                <div className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant mb-4">
                  {intentPrompts.map((p, idx) => (
                    <div
                      key={p.prompt_id}
                      className="flex gap-4 p-4 border-b border-outline-variant last:border-0 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-start justify-center pt-2 w-8 text-primary/60 font-mono font-bold text-sm select-none">
                        {idx + 1}.
                      </div>
                      <textarea
                        value={p.prompt_text}
                        onChange={(e) => handlePromptEdit(p.prompt_id, e.target.value)}
                        rows={2}
                        placeholder="Enter search intent..."
                        className="flex-1 py-1 px-2 border-0 bg-transparent focus:ring-0 resize-none text-on-surface placeholder:text-on-surface-variant/40 leading-relaxed outline-none"
                      />
                      <button
                        onClick={() => removePrompt(p.prompt_id)}
                        aria-label="Remove"
                        className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error opacity-40 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xl">close</span>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addNewPromptManually("intent")}
                  className="text-primary hover:opacity-80 text-sm font-bold mt-2 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add another query
                </button>
              </div>
            </div>
          )}

          {/* STEP 6 */}
          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-2">
                  We&apos;ll test how you rank against prompts like these.
                </h2>
                <p className="text-on-surface-variant text-lg">
                  Review and adjust the ranking queries we&apos;ll test across every AI engine.
                </p>
              </div>
              <div className="pt-4 max-h-[560px] overflow-y-auto pr-1">
                <div className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant mb-4">
                  {rankingPrompts.map((p, idx) => (
                    <div
                      key={p.prompt_id}
                      className="flex gap-4 p-4 border-b border-outline-variant last:border-0 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-start justify-center pt-2 w-8 text-primary/60 font-mono font-bold text-sm select-none">
                        {idx + 1}.
                      </div>
                      <textarea
                        value={p.prompt_text}
                        onChange={(e) => handlePromptEdit(p.prompt_id, e.target.value)}
                        rows={2}
                        placeholder="Enter ranking search..."
                        className="flex-1 py-1 px-2 border-0 bg-transparent focus:ring-0 resize-none text-on-surface placeholder:text-on-surface-variant/40 leading-relaxed outline-none"
                      />
                      <button
                        onClick={() => removePrompt(p.prompt_id)}
                        aria-label="Remove"
                        className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error opacity-40 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xl">close</span>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addNewPromptManually("ranking")}
                  className="text-primary hover:opacity-80 text-sm font-bold mt-2 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add more ranking prompts
                </button>
              </div>

              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 flex items-start gap-4">
                <span className="material-symbols-outlined text-primary">info</span>
                <p className="text-sm text-on-surface leading-relaxed">
                  <strong className="text-primary">Ready to launch.</strong> We&apos;ll fire
                  these {prompts.filter((p) => p.prompt_text).length} prompts at ChatGPT, Claude,
                  Gemini, Perplexity, Grok, and Google AI. Usually takes 2–3 minutes.
                </p>
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div className="mt-12 flex items-center justify-between pt-6 border-t border-outline-variant">
            {step > 1 ? (
              <Button
                variant="ghost"
                size="lg"
                icon="arrow_back"
                onClick={prevStep}
                disabled={isGenerating || submitting}
              >
                Go Back
              </Button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <Button
                size="lg"
                icon={isGenerating ? undefined : "arrow_forward"}
                onClick={nextStep}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating Prompts..." : "Continue"}
              </Button>
            ) : (
              <Button
                size="lg"
                icon="rocket_launch"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Launching..." : "Run Diagnostic"}
              </Button>
            )}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
