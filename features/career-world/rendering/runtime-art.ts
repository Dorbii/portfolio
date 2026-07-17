const ART_ROOT = "/career-world/art";
const ART_REVISION = "transparent-r2-trimmed";

function versioned(path: string): string {
  return `${path}?v=${ART_REVISION}`;
}

const RUNTIME_ART_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
  "world/career-world@v1": `${ART_ROOT}/world/career-world.webp`,
  "project/kaizen-metrics@v1": `${ART_ROOT}/project/kaizen-metrics.webp`,
});

/** Resolve a registry asset id to its promoted, optimized runtime image. */
export function runtimeArtPath(assetId: string): string {
  const override = RUNTIME_ART_OVERRIDES[assetId];
  if (override) return versioned(override);

  const match = /^(world|city|project|skill|ambient)\/([^/]+)@v1$/.exec(
    assetId,
  );
  if (!match) throw new Error(`Unsupported Career World art asset: ${assetId}`);
  return versioned(`${ART_ROOT}/${match[1]}/${match[2]}.webp`);
}
