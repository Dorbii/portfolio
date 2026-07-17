"use client";

import { useEffect, useRef } from "react";
import { getProjectEvidence } from "../model/evidence-adapter";
import type { CareerProjectId } from "../model/world-registry";

type ProjectDrawerProps = {
  projectId: CareerProjectId;
  onClose: () => void;
};

export function ProjectDrawer({ projectId, onClose }: ProjectDrawerProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const evidence = getProjectEvidence(projectId);
  if (!evidence) throw new Error(`Project evidence is unavailable: ${projectId}`);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <aside
      ref={dialogRef}
      className="career-world-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="career-world-project-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }
        if (event.key !== "Tab") return;
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href], summary, [tabindex]:not([tabindex='-1'])",
          ) ?? [],
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === titleRef.current) {
          event.preventDefault();
          last.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="career-world-drawer-toolbar">
        <span>Factual project evidence</span>
        <button type="button" onClick={onClose} aria-label={`Close ${evidence.trace.title} summary`}>Close</button>
      </div>
      <p className="career-world-proof-label">{evidence.trace.proofLabel}</p>
      <h2 id="career-world-project-title" ref={titleRef} tabIndex={-1}>{evidence.trace.title}</h2>
      <p>{evidence.trace.statement}</p>
      <p>{evidence.trace.summary}</p>

      {evidence.records.length > 0 && (
        <section aria-labelledby="career-world-evidence-steps">
          <h3 id="career-world-evidence-steps">Evidence records</h3>
          <ol>
            {evidence.records.map((record) => (
              <li key={record.id}>
                <strong>{record.title}</strong>
                <p>{record.source}</p>
                <p>{record.detail}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="career-world-outcomes">
        <h3 id="career-world-outcomes">Outcomes</h3>
        <ul>{evidence.project.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul>
      </section>

      <section aria-labelledby="career-world-registry-links">
        <h3 id="career-world-registry-links">Career World links</h3>
        <p>Illustrative registry placeholders are navigation aids, not factual project fields.</p>
        <ul className="career-world-skill-links">
          {evidence.skillAssets.map((asset) => <li key={asset.id}>{asset.label}</li>)}
        </ul>
      </section>

      <details>
        <summary>Evidence boundary</summary>
        <ul>{evidence.trace.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
      </details>
    </aside>
  );
}
