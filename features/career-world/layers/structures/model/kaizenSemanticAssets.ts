import manifest from "../../../../../public/career-world/cities/kaizen-agent/manifests/hero-buildings-runtime-r1.json" with { type: "json" };
import type { Pair } from "../../../shared/camera";
import {
  KAIZEN_CITY_OWNER_ID,
  KAIZEN_CITY_PLATE_DIMENSIONS,
  KAIZEN_CITY_PLATE_ORIGIN,
  KAIZEN_CITY_PLATE_SPAN,
  KAIZEN_CITY_REGISTRATION,
} from "../../../shared/kaizenCityRegistration.ts";
import type { KaizenStructurePresentationRole } from "./kaizenPresentation";

export type KaizenSemanticAssetRole = "project" | "skill";

export interface KaizenSemanticStructureAsset {
  readonly assetPath: string;
  readonly cropOrigin: Pair;
  readonly footprintSpan: Pair;
  readonly groundAnchor: Pair;
  readonly grounding: "asset-owned";
  readonly id: string;
  readonly interactionHull: readonly Pair[];
  readonly registrationDimensions: Pair;
  readonly registrationGroundAnchor: Pair;
  readonly registration: string;
  readonly role: KaizenSemanticAssetRole;
  readonly sourceDimensions: Pair;
  readonly territoryAnchor: Pair;
}

function pair(
  values: readonly number[],
  label: string,
  {
    allowZero = false,
    normalized = false,
  } = {},
): Pair {
  if (
    values.length !== 2
    || values.some((value) => (
      !Number.isFinite(value)
      || value < 0
      || (!allowZero && value === 0)
      || (normalized && value > 1)
    ))
  ) {
    throw new TypeError(`${label} must contain two valid numbers.`);
  }
  return Object.freeze([values[0], values[1]] as Pair);
}

if (
  manifest.schemaVersion !== 1
  || manifest.id !== "career-world/kaizen-agent/hero-buildings-runtime@r1"
  || manifest.registrationRef !== KAIZEN_CITY_REGISTRATION
  || manifest.ownerId !== KAIZEN_CITY_OWNER_ID
) {
  throw new TypeError("Kaizen semantic asset manifest is invalid.");
}

const plateDimensions = KAIZEN_CITY_PLATE_DIMENSIONS;
const plateSpan = KAIZEN_CITY_PLATE_SPAN;
const plateOrigin = KAIZEN_CITY_PLATE_ORIGIN;

export const KAIZEN_SEMANTIC_ASSET_REGISTRATION = manifest.registrationRef;

export const KAIZEN_SEMANTIC_STRUCTURE_ASSETS:
readonly KaizenSemanticStructureAsset[] = Object.freeze(
  manifest.assets.map((asset) => {
    if (
      (asset.role !== "project" && asset.role !== "skill")
      || asset.grounding !== "asset-owned"
      || !asset.assetPath.startsWith(
        "/career-world/cities/kaizen-agent/layers/hero-buildings/",
      )
    ) {
      throw new TypeError(`Kaizen semantic asset ${asset.id} is invalid.`);
    }

    const cropOrigin = pair(
      asset.cropOrigin,
      `${asset.id} crop origin`,
      { allowZero: true },
    );
    const sourceDimensions = pair(
      asset.sourceDimensions,
      `${asset.id} source dimensions`,
    );
    const registrationDimensions = pair(
      asset.registrationDimensions,
      `${asset.id} registration dimensions`,
    );
    const registrationGroundAnchor = pair(
      asset.groundAnchor,
      `${asset.id} registration ground anchor`,
      { allowZero: true, normalized: true },
    );
    const groundAnchor = pair(
      asset.sourceGroundAnchor,
      `${asset.id} source ground anchor`,
      { allowZero: true, normalized: true },
    );
    if (asset.interactionHull.length < 3) {
      throw new TypeError(`${asset.id} interaction hull is invalid.`);
    }
    const interactionHull = Object.freeze(
      asset.interactionHull.map((point, index) => {
        const vertex = pair(
          point,
          `${asset.id} interaction hull vertex ${index}`,
          { allowZero: true },
        );
        if (
          vertex[0] > registrationDimensions[0]
          || vertex[1] > registrationDimensions[1]
        ) {
          throw new RangeError(
            `${asset.id} interaction hull must stay inside its source crop.`,
          );
        }
        return Object.freeze([
          vertex[0] / registrationDimensions[0] * sourceDimensions[0],
          vertex[1] / registrationDimensions[1] * sourceDimensions[1],
        ] as Pair);
      }),
    );
    const footprintSpan = Object.freeze([
      registrationDimensions[0] / plateDimensions[0] * plateSpan[0],
      registrationDimensions[1] / plateDimensions[1] * plateSpan[1],
    ] as Pair);
    const territoryAnchor = Object.freeze([
      plateOrigin[0] + (
        cropOrigin[0]
        + registrationDimensions[0] * groundAnchor[0]
      ) / plateDimensions[0] * plateSpan[0],
      plateOrigin[1] + (
        cropOrigin[1]
        + registrationDimensions[1] * groundAnchor[1]
      ) / plateDimensions[1] * plateSpan[1],
    ] as Pair);

    return Object.freeze({
      assetPath: asset.assetPath,
      cropOrigin,
      footprintSpan,
      groundAnchor,
      grounding: asset.grounding,
      id: asset.id,
      interactionHull,
      registrationDimensions,
      registrationGroundAnchor,
      registration: manifest.registrationRef,
      role: asset.role,
      sourceDimensions,
      territoryAnchor,
    });
  }),
);

export function resolveKaizenSemanticStructureAsset({
  ownerId,
  role,
  visualId,
}: {
  readonly ownerId: string;
  readonly role: KaizenStructurePresentationRole;
  readonly visualId: string;
}): KaizenSemanticStructureAsset | undefined {
  if (
    ownerId !== manifest.ownerId
    || (role !== "project" && role !== "skill")
  ) {
    return undefined;
  }

  const semanticId = role === "project" ? ownerId : visualId;
  const asset = KAIZEN_SEMANTIC_STRUCTURE_ASSETS.find(({ id }) => (
    id === semanticId
  ));
  if (!asset || asset.role !== role) {
    throw new TypeError(
      `Kaizen ${role} structure ${visualId} is missing a concept-native asset.`,
    );
  }
  return asset;
}
