import type { CSSProperties, ReactNode } from "react";
import {
  cameraViewBox,
  type CameraView,
  type Pair,
} from "../../../shared/camera";
import type { WorldLight } from "../../../shared/lighting";
import {
  LOD_PRESENTATION_EPSILON,
  LOD_PRESENTATION_TRANSITION_MS,
  resolveAtomicTierVisibility,
  resolveNodeVisibility,
  type DetailState,
} from "../../../shared/lod";
import { WORLD_PLANE } from "../../../shared/world";
import {
  AMBIENT_NODE_POLICY,
  AMBIENT_STRUCTURE_INSTANCES,
  AMBIENT_STRUCTURE_VISUAL_FAMILY,
  resolveAmbientAnchor,
  type AmbientStructureInstance,
} from "../model/ambient";
import { KaizenNeighborhoodFabric } from "./KaizenNeighborhoodFabric";
import {
  CAPITAL_NODE_POLICY,
  CAPITAL_STRUCTURES,
  type CapitalStructure,
} from "../model/capitals";
import {
  PROJECT_NODE_POLICY,
  PROJECT_STRUCTURE_VISUAL_FAMILY,
  PROJECT_STRUCTURES,
  resolveProjectAnchor,
  type ProjectStructure,
} from "../model/projects";
import {
  SKILL_NODE_POLICY,
  SKILL_STRUCTURE_VISUAL_FAMILY,
  SKILL_STRUCTURE_INSTANCES,
  resolveSkillAnchor,
  type SkillStructureInstance,
} from "../model/skills";
import {
  SUPPORT_NODE_POLICY,
  SUPPORT_STRUCTURE_VISUAL_FAMILY,
  SUPPORT_STRUCTURE_INSTANCES,
  resolveSupportAnchor,
  type SupportStructureInstance,
} from "../model/support";
import {
  TOWN_FABRIC_INSTANCES,
  TOWN_FABRIC_NODE_POLICY,
  type TownFabricInstance,
} from "../model/townFabric";
import { resolveKaizenStructurePresentationScale } from "../model/kaizenPresentation";

const ASSET_SIZE = 1254;
const INDIVIDUAL_STRUCTURE_TOWN_OWNER_IDS = new Set([
  "project-kaizen-agent",
]);
const TOWN_FABRIC_OWNER_IDS = new Set(
  TOWN_FABRIC_INSTANCES.map(({ ownerId }) => ownerId),
);
const RENDERED_TOWN_FABRIC_INSTANCES = Object.freeze(
  TOWN_FABRIC_INSTANCES.filter(
    ({ ownerId }) => !INDIVIDUAL_STRUCTURE_TOWN_OWNER_IDS.has(ownerId),
  ),
);
const RENDERED_AMBIENT_STRUCTURE_INSTANCES = Object.freeze(
  AMBIENT_STRUCTURE_INSTANCES.filter(
    ({ ownerId }) => !TOWN_FABRIC_OWNER_IDS.has(ownerId),
  ),
);

interface StructuresLayerProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly light: WorldLight;
}

interface MountedStructureNode {
  readonly anchor: Pair;
  readonly id: string;
  readonly node: ReactNode;
}

function compareStructureDepth(
  left: MountedStructureNode,
  right: MountedStructureNode,
): number {
  return (
    left.anchor[1] - right.anchor[1]
    || left.anchor[0] - right.anchor[0]
    || left.id.localeCompare(right.id)
  );
}

function structurePresentationVisibility(
  ownerId: string,
  defaultVisibility: number,
  individualTownVisibility: number,
): number {
  return INDIVIDUAL_STRUCTURE_TOWN_OWNER_IDS.has(ownerId)
    ? individualTownVisibility
    : defaultVisibility;
}

function shouldRenderStructureOwner(
  ownerId: string,
  shouldRenderDefaultAssets: boolean,
  shouldRenderIndividualTownAssets: boolean,
): boolean {
  return shouldRenderDefaultAssets || (
    shouldRenderIndividualTownAssets
    && INDIVIDUAL_STRUCTURE_TOWN_OWNER_IDS.has(ownerId)
  );
}

function structureTransform(
  anchor: Pair,
  footprintSpan: Pair,
  sourceDimensions: Pair,
  presentationScale = 1,
): string {
  const scaleX = (
    footprintSpan[0] * WORLD_PLANE.width / sourceDimensions[0]
  ) * presentationScale;
  const scaleY = (
    footprintSpan[1] * WORLD_PLANE.height / sourceDimensions[1]
  ) * presentationScale;
  return (
    `translate(${anchor[0] * WORLD_PLANE.width} `
    + `${anchor[1] * WORLD_PLANE.height}) scale(${scaleX} ${scaleY})`
  );
}

function StructureAsset({
  assetPath,
  groundAnchor,
  sourceDimensions,
}: {
  readonly assetPath: string;
  readonly groundAnchor: Pair;
  readonly sourceDimensions: Pair;
}) {
  return (
    <>
      <ellipse
        className="structure-sprite__grounding"
        cx={0}
        cy={sourceDimensions[1] * -0.008}
        rx={sourceDimensions[0] * 0.2}
        ry={sourceDimensions[1] * 0.012}
      />
      <image
        className="structure-sprite__asset"
        height={sourceDimensions[1]}
        href={assetPath}
        preserveAspectRatio="xMidYMid meet"
        width={sourceDimensions[0]}
        x={-groundAnchor[0] * sourceDimensions[0]}
        y={-groundAnchor[1] * sourceDimensions[1]}
      />
    </>
  );
}

function TownFabricNode({
  instance,
}: {
  readonly instance: TownFabricInstance;
}) {
  const { origin, span } = instance.worldBounds;

  return (
    <image
      className="town-fabric__asset"
      data-block-count={instance.blockIds.length}
      data-owner-id={instance.ownerId}
      data-owner-kind={instance.ownerKind}
      data-town-fabric-id={instance.id}
      height={span[1] * WORLD_PLANE.height}
      href={instance.assetPath}
      preserveAspectRatio="xMidYMid meet"
      width={span[0] * WORLD_PLANE.width}
      x={origin[0] * WORLD_PLANE.width}
      y={origin[1] * WORLD_PLANE.height}
    />
  );
}

function CapitalNode({ capital }: { readonly capital: CapitalStructure }) {
  const [anchorX, anchorY] = capital.territory.development.capitalAnchor;
  const sourceDimensions = [ASSET_SIZE, ASSET_SIZE] as const;

  return (
    <g
      className="capital-structure"
      data-archetype={capital.archetype}
      data-capital-id={capital.id}
      data-territory-id={capital.territory.id}
      transform={structureTransform(
        [anchorX, anchorY],
        capital.footprintSpan,
        sourceDimensions,
      )}
    >
      <StructureAsset
        assetPath={capital.assetPath}
        groundAnchor={capital.groundAnchor}
        sourceDimensions={sourceDimensions}
      />
    </g>
  );
}

function ProjectNode({ project }: { readonly project: ProjectStructure }) {
  const presentationScale = resolveKaizenStructurePresentationScale({
    ownerId: project.id,
    role: "project",
    visualId: project.id,
  });

  return (
    <g
      className="project-structure"
      data-archetype={project.archetype}
      data-evidence-id={project.evidenceId}
      data-project-id={project.id}
      data-structure-role="project-landmark"
      data-presentation-scale={presentationScale}
      data-terrain-contact-id={project.terrainContact.id}
      data-territory-id={project.territory.id}
      data-visual-family={PROJECT_STRUCTURE_VISUAL_FAMILY}
      transform={structureTransform(
        resolveProjectAnchor(project),
        project.footprintSpan,
        project.sourceDimensions,
        presentationScale,
      )}
    >
      <StructureAsset
        assetPath={project.assetPath}
        groundAnchor={project.groundAnchor}
        sourceDimensions={project.sourceDimensions}
      />
    </g>
  );
}

function SkillNode({
  instance,
}: {
  readonly instance: SkillStructureInstance;
}) {
  const presentationScale = resolveKaizenStructurePresentationScale({
    ownerId: instance.ownerId,
    role: "skill",
    visualId: instance.archetype.id,
  });

  return (
    <g
      className="skill-structure"
      data-building-type={instance.archetype.buildingType}
      data-owner-id={instance.ownerId}
      data-owner-kind={instance.ownerKind}
      data-presentation-scale={presentationScale}
      data-skill-archetype-id={instance.archetype.id}
      data-skill-instance-id={instance.id}
      data-structure-role="skill-building"
      data-territory-variant={instance.territoryVariant}
      data-visual-family={SKILL_STRUCTURE_VISUAL_FAMILY}
      transform={structureTransform(
        resolveSkillAnchor(instance),
        instance.archetype.footprintSpan,
        instance.archetype.sourceDimensions,
        presentationScale,
      )}
    >
      <StructureAsset
        assetPath={instance.archetype.assetPath}
        groundAnchor={instance.archetype.groundAnchor}
        sourceDimensions={instance.archetype.sourceDimensions}
      />
    </g>
  );
}

function SupportNode({
  instance,
}: {
  readonly instance: SupportStructureInstance;
}) {
  const presentationScale = resolveKaizenStructurePresentationScale({
    ownerId: instance.ownerId,
    role: "support",
    visualId: instance.archetype.id,
  });

  return (
    <g
      className="support-structure"
      data-owner-id={instance.ownerId}
      data-owner-kind={instance.ownerKind}
      data-presentation-scale={presentationScale}
      data-support-instance-id={instance.id}
      data-support-role={instance.archetype.role}
      data-structure-role="support-building"
      data-visual-family={SUPPORT_STRUCTURE_VISUAL_FAMILY}
      transform={structureTransform(
        resolveSupportAnchor(instance),
        instance.archetype.footprintSpan,
        instance.archetype.sourceDimensions,
        presentationScale,
      )}
    >
      <StructureAsset
        assetPath={instance.archetype.assetPath}
        groundAnchor={instance.archetype.groundAnchor}
        sourceDimensions={instance.archetype.sourceDimensions}
      />
    </g>
  );
}

function AmbientNode({
  instance,
}: {
  readonly instance: AmbientStructureInstance;
}) {
  const presentationScale = resolveKaizenStructurePresentationScale({
    ownerId: instance.ownerId,
    role: "ambient",
    visualId: instance.archetype.id,
  });

  return (
    <g
      className="ambient-structure"
      data-ambient-archetype-id={instance.archetype.id}
      data-ambient-instance-id={instance.id}
      data-block-id={instance.blockId}
      data-owner-id={instance.ownerId}
      data-owner-kind={instance.ownerKind}
      data-presentation-scale={presentationScale}
      data-structure-role="ambient-building"
      data-visual-family={AMBIENT_STRUCTURE_VISUAL_FAMILY}
      transform={structureTransform(
        resolveAmbientAnchor(instance),
        instance.archetype.footprintSpan,
        instance.archetype.sourceDimensions,
        presentationScale,
      )}
    >
      <StructureAsset
        assetPath={instance.archetype.assetPath}
        groundAnchor={instance.archetype.groundAnchor}
        sourceDimensions={instance.archetype.sourceDimensions}
      />
    </g>
  );
}

export function StructuresLayer({
  camera,
  detailState,
  light,
}: StructuresLayerProps) {
  const visibility = resolveNodeVisibility(CAPITAL_NODE_POLICY, detailState);
  const projectVisibility = resolveNodeVisibility(
    PROJECT_NODE_POLICY,
    detailState,
  );
  const skillVisibility = resolveNodeVisibility(
    SKILL_NODE_POLICY,
    detailState,
  );
  const supportVisibility = resolveNodeVisibility(
    SUPPORT_NODE_POLICY,
    detailState,
  );
  const ambientVisibility = resolveNodeVisibility(
    AMBIENT_NODE_POLICY,
    detailState,
  );
  const townOverviewVisibility = resolveNodeVisibility(
    TOWN_FABRIC_NODE_POLICY,
    detailState,
  );
  const townDetailVisibility = resolveAtomicTierVisibility(
    SKILL_NODE_POLICY,
    detailState,
  );
  const townFabricVisibility = townOverviewVisibility;
  const projectPresentationVisibility = Math.min(
    projectVisibility,
    townDetailVisibility,
  );
  const skillPresentationVisibility = Math.min(
    skillVisibility,
    townDetailVisibility,
  );
  const supportPresentationVisibility = Math.min(
    supportVisibility,
    townDetailVisibility,
  );
  const ambientPresentationVisibility = Math.min(
    ambientVisibility,
    townDetailVisibility,
  );
  const neighborhoodCloseVisibility = Math.min(
    townOverviewVisibility,
    detailState.siteToClose,
  );
  const shouldRenderCapitalAssets = (
    detailState.shouldLoadCapitalAssets
    || visibility > LOD_PRESENTATION_EPSILON
  );
  const shouldRenderProjectAssets = (
    detailState.shouldLoadCapitalAssets
    || projectVisibility > LOD_PRESENTATION_EPSILON
  );
  const shouldRenderSkillAssets = (
    detailState.shouldLoadSiteAssets
    || skillVisibility > LOD_PRESENTATION_EPSILON
  );
  const shouldRenderSupportAssets = (
    detailState.shouldLoadSiteAssets
    || supportVisibility > LOD_PRESENTATION_EPSILON
  );
  const shouldRenderAmbientAssets = (
    detailState.shouldLoadSiteAssets
    || ambientVisibility > LOD_PRESENTATION_EPSILON
  );
  const shouldRenderTownFabric = (
    detailState.shouldLoadCapitalAssets
    || townFabricVisibility > LOD_PRESENTATION_EPSILON
  );
  const shouldRenderIndividualTownAssets = (
    detailState.shouldLoadCapitalAssets
    || townOverviewVisibility > LOD_PRESENTATION_EPSILON
  );
  const shouldRenderCloseNeighborhood = (
    detailState.shouldLoadCloseAssets
    || neighborhoodCloseVisibility > LOD_PRESENTATION_EPSILON
  );
  const mountedStructures: MountedStructureNode[] = [
    ...(shouldRenderCapitalAssets
      ? CAPITAL_STRUCTURES.map((capital) => ({
        anchor: capital.territory.development.capitalAnchor,
        id: capital.id,
        node: (
          <g
            className="capital-structures"
            key={capital.id}
                style={{
                  opacity: TOWN_FABRIC_OWNER_IDS.has(capital.id)
                    ? Math.min(visibility, townDetailVisibility)
                    : visibility,
                  transitionDuration: TOWN_FABRIC_OWNER_IDS.has(capital.id)
                    ? "0ms"
                    : undefined,
                }}
          >
            <CapitalNode capital={capital} />
          </g>
        ),
      }))
      : []),
    ...(shouldRenderProjectAssets
      || shouldRenderIndividualTownAssets
      ? PROJECT_STRUCTURES.filter((project) => (
        shouldRenderStructureOwner(
          project.id,
          shouldRenderProjectAssets,
          shouldRenderIndividualTownAssets,
        )
      )).map((project) => ({
        anchor: resolveProjectAnchor(project),
        id: project.id,
        node: (
          <g
            className="project-structures"
            key={project.id}
            style={{
              opacity: structurePresentationVisibility(
                project.id,
                projectPresentationVisibility,
                townOverviewVisibility,
              ),
              transitionDuration: "0ms",
            }}
          >
            <ProjectNode project={project} />
          </g>
        ),
      }))
      : []),
    ...(shouldRenderSkillAssets
      || shouldRenderIndividualTownAssets
      ? SKILL_STRUCTURE_INSTANCES.filter((instance) => (
        shouldRenderStructureOwner(
          instance.ownerId,
          shouldRenderSkillAssets,
          shouldRenderIndividualTownAssets,
        )
      )).map((instance) => ({
        anchor: resolveSkillAnchor(instance),
        id: instance.id,
        node: (
          <g
            className="skill-structures"
            key={instance.id}
            style={{
              opacity: structurePresentationVisibility(
                instance.ownerId,
                skillPresentationVisibility,
                townOverviewVisibility,
              ),
              transitionDuration: "0ms",
            }}
          >
            <SkillNode instance={instance} />
          </g>
        ),
      }))
      : []),
    ...(shouldRenderSupportAssets
      || shouldRenderIndividualTownAssets
      ? SUPPORT_STRUCTURE_INSTANCES.filter((instance) => (
        shouldRenderStructureOwner(
          instance.ownerId,
          shouldRenderSupportAssets,
          shouldRenderIndividualTownAssets,
        )
      )).map((instance) => ({
        anchor: resolveSupportAnchor(instance),
        id: instance.id,
        node: (
          <g
            className="support-structures"
            key={instance.id}
            style={{
              opacity: structurePresentationVisibility(
                instance.ownerId,
                supportPresentationVisibility,
                townOverviewVisibility,
              ),
              transitionDuration: "0ms",
            }}
          >
            <SupportNode instance={instance} />
          </g>
        ),
      }))
      : []),
    ...(shouldRenderAmbientAssets
      || shouldRenderIndividualTownAssets
      ? RENDERED_AMBIENT_STRUCTURE_INSTANCES.filter((instance) => (
        shouldRenderStructureOwner(
          instance.ownerId,
          shouldRenderAmbientAssets,
          shouldRenderIndividualTownAssets,
        )
      )).map((instance) => ({
        anchor: resolveAmbientAnchor(instance),
        id: instance.id,
        node: (
          <g
            className="ambient-structures"
            key={instance.id}
            style={{
              opacity: structurePresentationVisibility(
                instance.ownerId,
                ambientPresentationVisibility,
                townOverviewVisibility,
              ),
              transitionDuration: "0ms",
            }}
          >
            <AmbientNode instance={instance} />
          </g>
        ),
      }))
      : []),
  ].sort(compareStructureDepth);
  const style = {
    "--career-world-lod-transition-ms":
      `${LOD_PRESENTATION_TRANSITION_MS}ms`,
  } as CSSProperties;

  return (
    <svg
      aria-hidden="true"
      className="career-world__layer career-world__structures-layer"
      data-ambient-candidate-count={AMBIENT_STRUCTURE_INSTANCES.length}
      data-ambient-structure-count={
        RENDERED_AMBIENT_STRUCTURE_INSTANCES.length
      }
      data-ambient-visibility={ambientPresentationVisibility.toFixed(3)}
      data-capital-count={CAPITAL_STRUCTURES.length}
      data-layer="structures"
      data-light-source={light.id}
      data-lod-tier={detailState.tier.id}
      data-project-count={PROJECT_STRUCTURES.length}
      data-project-visibility={projectPresentationVisibility.toFixed(3)}
      data-skill-archetype-count={
        new Set(
          SKILL_STRUCTURE_INSTANCES.map(({ archetype }) => archetype.id),
        ).size
      }
      data-skill-instance-count={SKILL_STRUCTURE_INSTANCES.length}
      data-skill-visibility={skillPresentationVisibility.toFixed(3)}
      data-structure-visibility={visibility.toFixed(3)}
      data-support-structure-count={SUPPORT_STRUCTURE_INSTANCES.length}
      data-support-visibility={supportPresentationVisibility.toFixed(3)}
      data-town-detail-visibility={townDetailVisibility.toFixed(3)}
      data-town-neighborhood-close-visibility={
        neighborhoodCloseVisibility.toFixed(3)
      }
      data-individual-structure-town-count={
        INDIVIDUAL_STRUCTURE_TOWN_OWNER_IDS.size
      }
      data-town-fabric-count={RENDERED_TOWN_FABRIC_INSTANCES.length}
      data-town-fabric-visibility={townFabricVisibility.toFixed(3)}
      data-town-overview-visibility={townOverviewVisibility.toFixed(3)}
      preserveAspectRatio="none"
      style={style}
      viewBox={cameraViewBox(
        camera,
        [WORLD_PLANE.width, WORLD_PLANE.height],
      )}
    >
      {shouldRenderTownFabric ? (
        <g
          className="town-fabrics"
          style={{
            opacity: townFabricVisibility,
            transitionDuration: "0ms",
          }}
        >
          {RENDERED_TOWN_FABRIC_INSTANCES.map((instance) => (
            <TownFabricNode
              instance={instance}
              key={instance.id}
            />
          ))}
        </g>
      ) : null}
      {shouldRenderIndividualTownAssets ? (
        <KaizenNeighborhoodFabric
          closeVisibility={neighborhoodCloseVisibility}
          shouldRenderClose={shouldRenderCloseNeighborhood}
          siteVisibility={townOverviewVisibility}
        />
      ) : null}
      {mountedStructures.map(({ node }) => node)}
    </svg>
  );
}
