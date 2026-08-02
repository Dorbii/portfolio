import type { ActivityPropInstance } from "../model/activityProps";

export const KAIZEN_AGENT_OWNER_ID = "project-kaizen-agent";

const CIVIC_PLANTER_ASSET =
  "/career-world/layers/environment/assets/kaizen-agent/civic-planter-r1.png";
const GARDEN_BENCH_ASSET =
  "/career-world/layers/environment/assets/kaizen-agent/garden-bench-r1.png";
const STREET_MARKET_ASSET =
  "/career-world/layers/environment/assets/kaizen-agent/street-market-r1.png";
const LONG_PLANTER_IDS = Object.freeze([
  "kaizen-agent-project-garden-tree",
  "kaizen-agent-west-court-tree",
  "kaizen-agent-east-service-tree",
  "kaizen-agent-south-court-tree",
] as const);

export function KaizenStreetTreeAsset({ instance }: {
  readonly instance: ActivityPropInstance;
}) {
  const usesLongPlanter = LONG_PLANTER_IDS.includes(
    instance.id as typeof LONG_PLANTER_IDS[number],
  );

  return (
    <image
      height={9.4}
      href={usesLongPlanter ? CIVIC_PLANTER_ASSET : GARDEN_BENCH_ASSET}
      preserveAspectRatio="xMidYMax meet"
      width={12.8}
      x={-6.4}
      y={-9.05}
    />
  );
}

export function KaizenStreetMarketAsset() {
  return (
    <image
      height={7.4}
      href={STREET_MARKET_ASSET}
      preserveAspectRatio="xMidYMax meet"
      width={10.1}
      x={-5.05}
      y={-7.08}
    />
  );
}
