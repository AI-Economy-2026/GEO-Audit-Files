"use client";

import { useEffect, useRef, useState } from "react";

const PROMPTS_PER_SECOND = 2_500_000_000 / 86_400;

function promptsSoFarToday() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const secondsElapsed = (now.getTime() - midnight.getTime()) / 1000;
  return Math.floor(secondsElapsed * PROMPTS_PER_SECOND);
}

/** Illustrative "AI prompts asked today" ticker, seeded from local
 *  midnight so the number looks live and consistent on reload. */
export default function PromptCounter() {
  // Starts at 0 so server-rendered and first-client-render HTML match
  // (the real, time-dependent value is wall-clock-based and would
  // otherwise cause a hydration mismatch). The real count kicks in on
  // mount, client-only.
  const [count, setCount] = useState(0);
  const startRef = useRef<number | null>(null);
  const baseRef = useRef(0);

  useEffect(() => {
    baseRef.current = promptsSoFarToday();
    setCount(baseRef.current);

    let frame: number;
    function tick(t: number) {
      if (startRef.current === null) startRef.current = t;
      const elapsedSeconds = (t - startRef.current) / 1000;
      setCount(Math.floor(baseRef.current + elapsedSeconds * PROMPTS_PER_SECOND));
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <div className="mkt-sm-num">{count.toLocaleString("en-US")}</div>;
}
