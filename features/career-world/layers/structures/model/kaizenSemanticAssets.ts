import manifest from "../../../../../public/career-world/layers/structures/manifests/kaizen-semantic-assets-r1.json" with { type: "json" };
import type { Pair } from "../../../shared/camera";
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
  || manifest.registration !== "kaizen-city-foundation@r1"
  || manifest.ownerId !== "project-kaizen-agent"
  || manifest.plateDimensions.length !== 2
  || manifest.closePlateDimensions.length !== 2
  || !manifest.sourcePlate.startsWith(
    "/career-world/layers/structures/textures/ambient/kaizen-agent/",
  )
  || !manifest.closePlate.startsWith(
    "/career-world/layers/structures/textures/ambient/kaizen-agent/",
  )
) {
  throw new TypeError("Kaizen semantic asset manifest is invalid.");
}

const plateDimensions = pair(
  manifest.plateDimensions,
  "Kaizen semantic plate dimensions",
);
const plateAnchor = pair(
  manifest.plateAnchor,
  "Kaizen semantic plate anchor",
  { allowZero: true, normalized: true },
);
const plateSpan = pair(
  manifest.plateSpan,
  "Kaizen semantic plate span",
  { normalized: true },
);
const plateOrigin = Object.freeze([
  plateAnchor[0] - plateSpan[0] * 0.5,
  plateAnchor[1] - plateSpan[1] * manifest.plateAlignmentY,
] as Pair);

export const KAIZEN_SEMANTIC_ASSET_REGISTRATION = manifest.registration;

export const KAIZEN_SEMANTIC_STRUCTURE_ASSETS:
readonly KaizenSemanticStructureAsset[] = Object.freeze(
  manifest.assets.map((asset) => {
    if (
      (asset.role !== "project" && asset.role !== "skill")
      || asset.grounding !== "asset-owned"
      || !asset.assetPath.startsWith(
        "/career-world/layers/structures/textures/semantic/kaizen-agent/",
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
    const groundAnchor = pair(
      asset.groundAnchor,
      `${asset.id} ground anchor`,
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
          vertex[0] > sourceDimensions[0]
          || vertex[1] > sourceDimensions[1]
        ) {
          throw new RangeError(
            `${asset.id} interaction hull must stay inside its source crop.`,
          );
        }
        return vertex;
      }),
    );
    const footprintSpan = Object.freeze([
      sourceDimensions[0] / plateDimensions[0] * plateSpan[0],
      sourceDimensions[1] / plateDimensions[1] * plateSpan[1],
    ] as Pair);
    const territoryAnchor = Object.freeze([
      plateOrigin[0] + (
        cropOrigin[0] + sourceDimensions[0] * groundAnchor[0]
      ) / plateDimensions[0] * plateSpan[0],
      plateOrigin[1] + (
        cropOrigin[1] + sourceDimensions[1] * groundAnchor[1]
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
      registration: manifest.registration,
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
