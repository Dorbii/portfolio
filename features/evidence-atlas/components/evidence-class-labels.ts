import type { EvidenceClass } from "../model/evidence-data";

export const evidenceClassLabels: Record<EvidenceClass, string> = {
  implementation: "Implemented workflow",
  production: "Production evidence",
  measured: "Measured outcome",
  deterministic: "Deterministic evidence",
  "bounded-live": "Bounded live evidence",
};
