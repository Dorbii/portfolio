import type { CameraView } from "../shared/camera";
import type { DetailState } from "../shared/lod";
import type { WorldLight } from "../shared/lighting";
import {
  ninjaOneCapitalAnimatedCityNodeId,
  ninjaOneCapitalVisibleCityNodes,
  type NinjaOneCapitalCityNode,
} from "./model/ninjaOneCapitalCityNodes";

interface NinjaOneCapitalSkillNodesProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly light: WorldLight;
}

function CityNodeShadow({
  light,
  node,
}: {
  readonly light: WorldLight;
  readonly node: NinjaOneCapitalCityNode;
}) {
  const footprintWidth = node.displayWidth * node.footprintFraction[0];
  const footprintDepth = node.displayWidth * node.footprintFraction[1];
  const castLength = node.displayWidth * 0.13;
  const endX = node.anchor[0] - light.direction[0] * castLength;
  const endY = node.anchor[1] - light.direction[1] * castLength;
  const halfWidth = footprintWidth * 0.43;
  return (
    <g data-capital-city-node-shadow={node.skillId}>
      <path
        d={`M ${node.anchor[0] - halfWidth} ${node.anchor[1]}
          L ${node.anchor[0] + halfWidth} ${node.anchor[1]}
          L ${endX + halfWidth * 0.54} ${endY}
          L ${endX - halfWidth * 0.54} ${endY} Z`}
        fill="rgba(10, 14, 13, 0.19)"
        filter="url(#ninjaone-capital-shadow-soften)"
      />
      <ellipse
        cx={node.anchor[0]}
        cy={node.anchor[1]}
        fill="rgba(8, 12, 11, 0.28)"
        filter="url(#ninjaone-capital-contact-soften)"
        rx={footprintWidth * 0.45}
        ry={Math.max(4, footprintDepth * 0.38)}
      />
    </g>
  );
}

function BlockedGoPad({
  node,
}: {
  readonly node: NinjaOneCapitalCityNode;
}) {
  return (
    <g
      data-capital-city-node-alpha-blocked="true"
      data-capital-city-node-skill={node.skillId}
      transform={`translate(${node.anchor[0]} ${node.anchor[1]})`}
    >
      <title>Go building alpha extraction is pending</title>
    </g>
  );
}

function CityNodeAsset({
  animated,
  node,
}: {
  readonly animated: boolean;
  readonly node: NinjaOneCapitalCityNode;
}) {
  if (!node.assetNodeReady) {
    return <BlockedGoPad node={node} />;
  }
  const sources = animated
    ? node.renderLayers
    : [{
        dimensions: node.sourceDimensions,
        id: "poster",
        path: node.posterPath,
      }];
  const width = node.displayWidth;
  const height = width * node.sourceDimensions[1] / node.sourceDimensions[0];
  const x = node.anchor[0] - width * node.groundAnchor[0];
  const y = node.anchor[1] - height * node.groundAnchor[1];
  return (
    <g
      data-capital-city-node-animated={animated ? "true" : "false"}
      data-capital-city-node-asset={sources[0].path}
      data-capital-city-node-layer-count={sources.length}
      data-capital-city-node-production-state={node.productionState}
      data-capital-city-node-skill={node.skillId}
      data-capital-city-node-slot={node.slotId}
    >
      <title>{node.label}</title>
      {sources.map((source) => (
        <image
          data-capital-city-node-render-layer={source.id}
          height={height}
          href={source.path}
          key={source.id}
          preserveAspectRatio="xMidYMid meet"
          width={width}
          x={x}
          y={y}
        />
      ))}
    </g>
  );
}

export function NinjaOneCapitalSkillNodes({
  camera,
  detailState,
  light,
}: NinjaOneCapitalSkillNodesProps) {
  const visibleNodes = ninjaOneCapitalVisibleCityNodes(camera, detailState.tier.id);
  if (visibleNodes.length === 0) {
    return null;
  }
  const animatedSkillId = ninjaOneCapitalAnimatedCityNodeId(
    camera,
    detailState.tier.id,
  );
  const orderedNodes = [...visibleNodes].sort(
    (left, right) => left.anchor[1] + left.zBias - right.anchor[1] - right.zBias,
  );

  return (
    <g
      data-capital-city-node-animation-policy="single-nearest-detail-node"
      data-capital-city-node-count={orderedNodes.length}
      data-capital-city-node-focused-animation={animatedSkillId ?? "none"}
      data-capital-city-node-layer="skill-building-nodes"
      data-capital-city-node-terrain-binding="production-component-transition"
    >
      <g
        data-capital-city-node-layer="building-ground-shadows"
        data-capital-layer="building-ground-shadows"
      >
        {orderedNodes.filter(({ assetNodeReady }) => assetNodeReady).map((node) => (
          <CityNodeShadow key={node.slotId} light={light} node={node} />
        ))}
      </g>
      <g
        data-capital-city-node-layer="building-assets"
        data-capital-layer="skill-building-nodes"
      >
        {orderedNodes.map((node) => (
          <CityNodeAsset
            animated={node.skillId === animatedSkillId}
            key={node.slotId}
            node={node}
          />
        ))}
      </g>
    </g>
  );
}
