import type { CameraView } from "../../../shared/camera";
import type { DetailTierId } from "../../../shared/lod";
import type { WorldLight } from "../../../shared/lighting";
import type { NinjaOneCapitalCityDistrictId } from "../model/ninjaOneCapitalCityRepresentations";
import {
  ninjaOneCapitalCityAssetVariant,
  ninjaOneCapitalVisibleCityLayerNodes,
  ninjaOneCapitalVisibleRegisteredDetailNodes,
  NINJAONE_CAPITAL_D06_STATION_PROOF,
  type CityLayerId,
  type NinjaOneCapitalCityNode,
} from "../model/ninjaOneCapitalCityLayer";

function CityNodeShadow({
  light,
  node,
}: {
  readonly light: WorldLight;
  readonly node: NinjaOneCapitalCityNode;
}) {
  const width = node.displayWidth * node.footprintFraction[0];
  const depth = node.displayWidth * node.footprintFraction[1];
  const castLength = node.displayWidth * 0.11;
  return (
    <>
      <ellipse
        className="ninjaone-capital-city__contact-shadow"
        cx={node.anchor[0]}
        cy={node.anchor[1]}
        rx={width * 0.43}
        ry={Math.max(2, depth * 0.34)}
      />
      <path
        className="ninjaone-capital-city__cast-shadow"
        d={`M ${node.anchor[0] - width * 0.38} ${node.anchor[1]}
          L ${node.anchor[0] + width * 0.38} ${node.anchor[1]}
          L ${node.anchor[0] - light.direction[0] * castLength + width * 0.22}
            ${node.anchor[1] - light.direction[1] * castLength}
          L ${node.anchor[0] - light.direction[0] * castLength - width * 0.22}
            ${node.anchor[1] - light.direction[1] * castLength} Z`}
      />
    </>
  );
}

export function NinjaOneCapitalAssetNodes({
  camera,
  deliveryMode = "district-proof",
  focusedDistrict,
  layerIds,
  light,
  maskOnly = false,
  tier,
}: {
  readonly camera: CameraView;
  readonly deliveryMode?: "district-proof" | "registered-progressive-detail";
  readonly focusedDistrict: NinjaOneCapitalCityDistrictId | null;
  readonly layerIds: readonly CityLayerId[];
  readonly light: WorldLight;
  readonly maskOnly?: boolean;
  readonly tier: DetailTierId;
}) {
  const nodes = [...(deliveryMode === "registered-progressive-detail"
    ? ninjaOneCapitalVisibleRegisteredDetailNodes(camera, tier, layerIds)
    : layerIds.flatMap((layerId) => (
      ninjaOneCapitalVisibleCityLayerNodes(camera, tier, layerId, focusedDistrict)
    )))].sort((leftNode, rightNode) => (
    leftNode.anchor[1] + leftNode.zBias - rightNode.anchor[1] - rightNode.zBias
  ));
  if (nodes.length === 0) return null;
  if (maskOnly) {
    return (
      <g
        className="ninjaone-capital-city__detail-cutout-mask"
        data-city-detail-mask-node-count={nodes.length}
      >
        {nodes.map((node) => {
          const source = ninjaOneCapitalCityAssetVariant(node, tier);
          const height = node.displayWidth
            * node.asset.source.dimensions[1]
            / node.asset.source.dimensions[0];
          return (
            <image
              height={height}
              href={source.path}
              key={node.id}
              preserveAspectRatio="xMidYMid meet"
              width={node.displayWidth}
              x={node.anchor[0] - node.displayWidth * 0.5}
              y={node.anchor[1] - height}
            />
          );
        })}
      </g>
    );
  }
  return (
    <g
      data-city-depth-order="global-isometric-baseline"
      data-city-detail-delivery={deliveryMode}
      data-city-node-count={nodes.length}
      data-city-node-delivery="individual-camera-culled-assets"
    >
      {nodes.map((node) => {
        const source = ninjaOneCapitalCityAssetVariant(node, tier);
        const height = node.displayWidth
          * node.asset.source.dimensions[1]
          / node.asset.source.dimensions[0];
        const ownsLargeFootprint = node.layerId === "L4_2" || node.layerId === "L4_3";
        const isD06ProofNode = NINJAONE_CAPITAL_D06_STATION_PROOF.nodeIds.includes(node.id);
        const isD06IntrinsicAlphaNode = node.id
          === NINJAONE_CAPITAL_D06_STATION_PROOF.trackTopology.capitalStationNodeId
          || node.id === NINJAONE_CAPITAL_D06_STATION_PROOF.trackTopology.siteStationNodeId
          || NINJAONE_CAPITAL_D06_STATION_PROOF.trackTopology.closeOverlayNodeIds
            .includes(node.id);
        const usesD06ProofMask = isD06ProofNode
          && !isD06IntrinsicAlphaNode;
        return (
          <g
            className={node.motion
              ? "ninjaone-capital-city__node ninjaone-capital-city__node--rail-motion"
              : "ninjaone-capital-city__node"}
            data-city-asset-family={node.asset.family}
            data-city-asset-id={node.assetId}
            data-city-asset-source-tier={tier}
            data-city-child-layer={node.layerId}
            data-city-district={node.districtId}
            data-city-node-id={node.id}
            data-city-node-minimum-tier={node.minimumTier}
            data-city-node-registration-binding={node.registrationBinding.kind}
            data-city-node-representation-class={node.representationClass}
            data-city-node-visible-tiers={node.visibleTiers?.join(",")}
            data-city-proof-district={isD06ProofNode ? "D06" : undefined}
            key={node.id}
            mask={usesD06ProofMask ? "url(#ninjaone-capital-d06-station-mask)" : undefined}
          >
            <title>{node.label}</title>
            {ownsLargeFootprint ? <CityNodeShadow light={light} node={node} /> : null}
            <image
              height={height}
              href={source.path}
              preserveAspectRatio="xMidYMid meet"
              width={node.displayWidth}
              x={node.anchor[0] - node.displayWidth * 0.5}
              y={node.anchor[1] - height}
            />
          </g>
        );
      })}
    </g>
  );
}
