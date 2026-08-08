import manifest from "../../../../../public/career-world/cities/kaizen-agent/manifests/environment-runtime-r1.json" with { type: "json" };
import type { Pair } from "../../../shared/camera";
import { KAIZEN_CITY_REGISTRATION } from "../../../shared/kaizenCityRegistration.ts";

export type KaizenStaticEnvironmentTier = "capital" | "site" | "close";

export interface KaizenStaticEnvironmentSource {
  readonly dimensions: Pair;
  readonly path: string;
}

if (
  manifest.schemaVersion !== 1
  || manifest.id !== "career-world/kaizen-agent/environment-runtime@r1"
  || manifest.registrationRef !== KAIZEN_CITY_REGISTRATION
) {
  throw new TypeError("Kaizen static environment manifest is invalid.");
}

export const KAIZEN_STATIC_ENVIRONMENT_SOURCES = Object.freeze(
  Object.fromEntries(
    Object.entries(manifest.staticFiller).map(([tier, source]) => [
      tier,
      Object.freeze({
        dimensions: Object.freeze([
          source.dimensions[0],
          source.dimensions[1],
        ] as Pair),
        path: source.path,
      }),
    ]),
  ) as Readonly<Record<
    KaizenStaticEnvironmentTier,
    KaizenStaticEnvironmentSource
  >>,
);
