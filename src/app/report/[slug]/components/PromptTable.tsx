"use client";

import { useState } from "react";
import type { DerivedPromptData } from "@/lib/opportunity-engine";

interface Props {
  prompts: DerivedPromptData[];
}

type SortKey = "activation_score" | "difficulty" | "client_ratio";

export default function PromptTable({ prompts }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("activation_score");
  const [sortAsc, setSortAsc] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...prompts].sort((a, b) => {
    let diff = 0;
    if (sortKey === "activation_score") diff = a.activation_score - b.activation_score;
    if (sortKey === "client_ratio") diff = a.client_ratio - b.client_ratio;
    if (sortKey === "difficulty") diff = a.difficulty.score - b.difficulty.score;
    return sortAsc ? diff : -diff;
  });

  function SortBtn({ col }: { col: SortKey }) {
    const active = sortKey === col;
    return (
      <button
        onClick={() => toggleSort(col)}
        className="ml-1 text-gray-400 hover:text-gray-600"
      >
        {active ? (sortAsc ? "↑" : "↓") : "↕"}
      </button>
    );
  }

  function DiffBadge({ label }: { label: DerivedPromptData["difficulty"]["label"] }) {
    const styles = {
      Easier: "bg-green-50 text-green-700 border border-green-100",
      Medium: "bg-amber-50 text-amber-700 border border-amber-100",
      Hard: "bg-red-50 text-red-700 border border-red-100",
    };
    return (
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[label]}`}>
        {label}
      </span>
    );
  }

  function VisBar({ ratio }: { ratio: number }) {
    const pct = Math.round(ratio * 100);
    const color = ratio > 0.5 ? "bg-green-600" : ratio > 0 ? "bg-amber-500" : "bg-red-500";
    return (
      <div className="flex items-center gap-2">
        <div className="w-14 h-1.5 rounded bg-gray-100 overflow-hidden">
          <div className={`h-full rounded ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-500">{pct}%</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {[
              { label: "Prompt", col: null },
              { label: "Your Result", col: "client_ratio" as SortKey },
              { label: "Top Competitors", col: null },
              { label: "Difficulty", col: "difficulty" as SortKey },
              { label: "Activation", col: "activation_score" as SortKey },
              { label: "Content Type", col: null },
              { label: "Actions", col: null },
            ].map(({ label, col }) => (
              <th
                key={label}
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400"
              >
                {label}
                {col && <SortBtn col={col} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.prompt_id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-4 max-w-[260px]">
                <div className="font-medium text-gray-900 leading-snug">{p.prompt_text}</div>
                <span className="mt-1 inline-block px-1.5 py-0 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500">
                  {p.prompt_type}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="text-xs font-semibold text-gray-700 mb-1">
                  {p.client_mentions}/{p.total_engines} engines
                </div>
                <VisBar ratio={p.client_ratio} />
                <div className="text-[11px] text-gray-400 mt-1">{p.visibility_label}</div>
              </td>
              <td className="px-4 py-4">
                {p.top_competitors.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {p.top_competitors.map((c) => (
                      <span key={c} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">None detected</span>
                )}
              </td>
              <td className="px-4 py-4">
                <DiffBadge label={p.difficulty.label} />
              </td>
              <td className="px-4 py-4">
                <span
                  className={`font-mono font-bold text-base ${
                    p.activation_score >= 60
                      ? "text-green-700"
                      : p.activation_score >= 35
                        ? "text-amber-600"
                        : "text-gray-400"
                  }`}
                >
                  {p.activation_score}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className="text-xs font-semibold px-2 py-1 rounded-md bg-[#E6F1FB] text-[#004AAD] border border-[#004AAD]/10">
                  {p.content_suggestion}
                </span>
              </td>
              <td className="px-4 py-4">
                <ul className="space-y-0.5">
                  {p.actions.map((a) => (
                    <li key={a} className="text-xs text-gray-500 list-disc ml-3">
                      {a}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
