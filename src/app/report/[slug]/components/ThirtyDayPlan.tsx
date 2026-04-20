"use client";

import { generateThirtyDayPlan } from "@/lib/opportunity-engine";
import type { DerivedPromptData } from "@/lib/opportunity-engine";

interface Props {
  prompts: DerivedPromptData[];
}

export default function ThirtyDayPlan({ prompts }: Props) {
  const plan = generateThirtyDayPlan(prompts);

  return (
    <div className="glass-card rounded-xl border border-white/5 shadow-sm p-6 h-full">
      <h4 className="text-base font-bold text-on-surface mb-1">30-Day Plan of Attack</h4>
      <p className="text-sm text-on-surface-variant mb-5">
        Auto-generated from your top 3 prompts by activation score.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {plan.map((week) => (
          <div key={week.week} className="bg-white/5 rounded-xl border border-white/5 p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
              Week {week.week}
            </div>
            <div className="text-[13px] font-bold text-on-surface mb-3 leading-snug">{week.title}</div>
            <ul className="space-y-1">
              {week.tasks.map((task) => (
                <li key={task} className="text-[12px] text-on-surface-variant leading-relaxed flex gap-1.5">
                  <span className="shrink-0 text-primary mt-0.5">›</span>
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
