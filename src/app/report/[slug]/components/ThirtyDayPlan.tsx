"use client";

import { generateThirtyDayPlan } from "@/lib/opportunity-engine";
import type { DerivedPromptData } from "@/lib/opportunity-engine";

interface Props {
  prompts: DerivedPromptData[];
}

export default function ThirtyDayPlan({ prompts }: Props) {
  const plan = generateThirtyDayPlan(prompts);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
      <h4 className="text-base font-bold text-gray-900 mb-1">30-Day Plan of Attack</h4>
      <p className="text-sm text-gray-500 mb-5">
        Auto-generated from your top 3 prompts by activation score.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {plan.map((week) => (
          <div key={week.week} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-teal-700 mb-2">
              Week {week.week}
            </div>
            <div className="text-[13px] font-bold text-gray-900 mb-3 leading-snug">{week.title}</div>
            <ul className="space-y-1">
              {week.tasks.map((task) => (
                <li key={task} className="text-[12px] text-gray-500 leading-relaxed flex gap-1.5">
                  <span className="shrink-0 text-teal-500 mt-0.5">›</span>
                  {task}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
