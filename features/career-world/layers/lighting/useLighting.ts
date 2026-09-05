"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorldLight } from "../../shared/lighting";
import { resolveSceneLighting } from "./model";

export function useLighting(base: WorldLight, weather: number, active: boolean) {
  const [hour, setHour] = useState(13);
  const [cycling, setCycling] = useState(false);
  useEffect(() => {
    if (!cycling || !active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(), elapsed = Math.min(1, (now - last) / 1000);
      last = now;
      setHour((h) => (h + elapsed * 24 / 240) % 24);
    }, 250);
    return () => clearInterval(timer);
  }, [cycling, active]);
  const light = useMemo(() => resolveSceneLighting(hour, weather, base), [hour, weather, base]);
  return { light, hour, setHour, cycling, setCycling };
}
