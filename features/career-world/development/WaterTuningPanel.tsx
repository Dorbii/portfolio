"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_WATER_TUNING,
  serializeWaterTuning,
  WATER_TUNING_DIALS,
  type WaterTuning,
  type WaterTuningKey,
} from "../shared/waterTuning";

const GROUP_TITLES = Object.freeze({
  water: "Water",
});

const DIAL_LABELS: Readonly<Record<WaterTuningKey, string>> = Object.freeze({
  oceanOpacity: "Opacity",
  oceanTimeScale: "Wave clock",
  oceanWeather: "Weather (calm to heavy)",
});

function formatValue(value: number): string {
  return value.toFixed(2);
}

export function WaterTuningPanel({
  enabled,
  onChange,
  tuning,
}: {
  readonly enabled: boolean;
  readonly onChange: (tuning: WaterTuning) => void;
  readonly tuning: WaterTuning;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.key !== "F2"
        || event.altKey
        || event.ctrlKey
        || event.metaKey
        || event.shiftKey
      ) return;
      event.preventDefault();
      setExpanded((current) => !current);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);

  const updateDial = useCallback((key: WaterTuningKey, value: number) => {
    onChange(Object.freeze({ ...tuning, [key]: value }));
  }, [onChange, tuning]);

  const copyUrl = useCallback(async () => {
    const url = new URL(window.location.href);
    for (const [key, value] of new URLSearchParams(serializeWaterTuning(tuning))) url.searchParams.set(key, value);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Clipboard unavailable");
    }
  }, [tuning]);

  if (!enabled || !expanded) return null;

  return (
    <aside
      aria-label="Water tuning panel"
      className="career-world__water-tuning-panel"
      data-development-tool="water-tuning"
      data-keybind="F2"
    >
      <header>
        <div>
          <span>Development only</span>
          <strong>Water tuning</strong>
        </div>
        <button
          aria-label="Collapse water tuning panel"
          onClick={() => setExpanded(false)}
          title="Collapse (F2)"
          type="button"
        >
          −
        </button>
      </header>
      <div className="career-world__water-presets">
        {[["Calm", 0], ["Coastal", 0.45], ["Storm", 1]].map(([name, value]) => (
          <button key={name} type="button" onClick={() => updateDial("oceanWeather", Number(value))}>{name}</button>
        ))}
      </div>
      {(["water"] as const).map((group) => (
        <section key={group}>
          <h2>{GROUP_TITLES[group]}</h2>
          {WATER_TUNING_DIALS.filter((dial) => dial.group === group).map((dial) => (
            <label key={dial.key}>
              <span>{DIAL_LABELS[dial.key]}</span>
              <output>{formatValue(tuning[dial.key])}</output>
              <input
                aria-label={`${GROUP_TITLES[group]} ${DIAL_LABELS[dial.key]}`}
                max={dial.maximum}
                min={dial.minimum}
                onChange={(event) => updateDial(dial.key, Number(event.target.value))}
                step={dial.step}
                type="range"
                value={tuning[dial.key]}
              />
              <small>{dial.minimum}–{dial.maximum}</small>
              <button
                onClick={() => updateDial(dial.key, dial.defaultValue)}
                type="button"
              >
                Reset
              </button>
            </label>
          ))}
        </section>
      ))}
      <footer>
        <button onClick={() => onChange(DEFAULT_WATER_TUNING)} type="button">
          Reset all defaults
        </button>
        <button onClick={() => void copyUrl()} type="button">Copy URL</button>
        <span aria-live="polite">{copyStatus || "F2 toggles"}</span>
      </footer>
    </aside>
  );
}
