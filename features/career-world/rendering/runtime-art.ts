import type { EmployerId } from "../model/world-registry";

const ART_ROOT = "/career-world/art";
const ART_REVISION = "placement-first-world-v3";
const WORLD_ASSET_ID = "world/career-world@v1";

function versioned(path: string): string {
  return `${path}?v=${ART_REVISION}`;
}

/** Resolve a registry asset id to its promoted, optimized runtime image. */
export function runtimeArtPath(
  assetId: string,
  employerId?: EmployerId | null,
): string {
  if (assetId === WORLD_ASSET_ID) {
    return versioned(`${ART_ROOT}/world/career-world.webp`);
  }

  const match = /^(city|project|skill|ambient)\/([^/]+)@v1$/.exec(assetId);
  if (!match) {
    throw new Error(`Unsupported Career World art asset: ${assetId}`);
  }

  const [, category, slug] = match;
  if (category === "ambient") {
    return versioned(`${ART_ROOT}/ambient/${slug}.webp`);
  }

  if (!employerId) {
    throw new Error(
      `Career World ${category} asset requires an employerId for palette routing: ${assetId}`,
    );
  }

  return versioned(
    `${ART_ROOT}/palette/${employerId}/${category}/${slug}.webp`,
  );
}
