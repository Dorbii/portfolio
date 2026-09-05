"use client";

import { useEffect, useState } from "react";

export function LightingControls({ enabled, hour, onHour, cycling, onCycling }: {
  readonly enabled: boolean;
  readonly hour: number;
  readonly onHour: (hour: number) => void;
  readonly cycling: boolean;
  readonly onCycling: (cycling: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const toggle = (event: KeyboardEvent) => { if (event.key === "F3") { event.preventDefault(); setExpanded((value) => !value); } };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, [enabled]);
  if (!enabled || !expanded) return null;
  return <aside className="career-world__lighting-controls" aria-label="Shared lighting controls">
    <strong>Shared lighting · land + water</strong>
    <label>Time of day <output>{hour.toFixed(1)}h</output>
      <input aria-label="Time of day" type="range" min="0" max="23.99" step="0.1" value={hour} onChange={(e) => onHour(Number(e.target.value))} />
    </label>
    <div>{[["Dawn", 6.5], ["Day", 13], ["Dusk", 18], ["Night", 22]].map(([name, value]) =>
      <button key={name} type="button" onClick={() => onHour(Number(value))}>{name}</button>)}</div>
    <label><input type="checkbox" checked={cycling} onChange={(e) => onCycling(e.target.checked)} />Cycle daylight</label>
    <small>Cloud shadows follow the shared light. Object shadows will consume the shared foliage and detail mapping.</small>
  </aside>;
}
