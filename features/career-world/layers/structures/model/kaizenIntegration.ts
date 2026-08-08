import manifest from "../../../../../public/career-world/cities/kaizen-agent/manifests/integration-runtime-r1.json" with { type: "json" };
import type { Pair } from "../../../shared/camera";
import { KAIZEN_CITY_REGISTRATION } from "../../../shared/kaizenCityRegistration.ts";

export type KaizenIntegrationTier = "capital" | "site" | "close";

export interface KaizenIntegrationSource {
  readonly dimensions: Pair;
  readonly path: string;
  readonly placementCount: number;
}

if (
  manifest.schemaVersion !== 1
  || manifest.id !== "career-world/kaizen-agent/integration-runtime@r1"
  || manifest.registrationRef !== KAIZEN_CITY_REGISTRATION
  || manifest.coordinateSpace !== "registered-plate-pixels"
  || manifest.contract !== "anchor-derived-additive-seam-plates"
) {
  throw new TypeError("Kaizen integration runtime manifest is invalid.");
}

function sources(
  entries: typeof manifest.foreground,
): Readonly<Record<KaizenIntegrationTier, KaizenIntegrationSource>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(entries).map(([tier, source]) => [
        tier,
        Object.freeze({
          dimensions: Object.freeze([
            source.dimensions[0],
            source.dimensions[1],
          ] as Pair),
          path: source.path,
          placementCount: source.placementCount,
        }),
      ]),
    ) as Readonly<Record<KaizenIntegrationTier, KaizenIntegrationSource>>,
  );
}

export const KAIZEN_FOREGROUND_INTEGRATION_SOURCES = sources(
  manifest.foreground,
);
export const KAIZEN_INTEGRATION_CONTRACT = manifest.contract;
