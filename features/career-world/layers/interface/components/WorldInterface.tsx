import {
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import type { WaterRenderState } from "../../ocean";
import type { Territory } from "../../terrain/model/territories";
import type { CameraView, Pair } from "../../../shared/camera";
import {
  LOD_PRESENTATION_EPSILON,
  LOD_PRESENTATION_TRANSITION_MS,
  resolveProjectDestinationVisibility,
  resolveNodeVisibility,
  resolveWorldDestinationVisibility,
  type DetailTierId,
  type DetailState,
} from "../../../shared/lod";

interface ProjectDestination {
  readonly id: string;
  readonly label: string;
  readonly anchor: Pair;
  readonly supportingSkillCount: number;
  readonly visualMinimumTier: DetailTierId;
}

export interface LandmarkLabel {
  readonly id: string;
  readonly label: string;
  readonly anchor: Pair;
  readonly role: "capital" | "project" | "skill";
}

interface WorldInterfaceProps {
  readonly activeViewId: string;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly enableDevelopmentTools: boolean;
  readonly landmarkLabels: readonly LandmarkLabel[];
  readonly projectDestinations: readonly ProjectDestination[];
  readonly projectVisualReadiness: Readonly<Record<string, boolean>>;
  readonly renderState: WaterRenderState;
  readonly showGrid: boolean;
  readonly showLandmarkLabels: boolean;
  readonly showTopography: boolean;
  readonly showTerritoryQa: boolean;
  readonly territories: readonly Territory[];
  readonly onFocus: (id: string) => void;
  readonly onReset: () => void;
  readonly onToggleGrid: () => void;
  readonly onToggleLandmarkLabels: () => void;
  readonly onToggleTopography: () => void;
  readonly onToggleTerritoryQa: () => void;
}

const subscribeToHydration = () => () => {};

function markerStyle(
  anchor: Pair,
  camera: CameraView,
  visibility: number,
): CSSProperties {
  return {
    left: `${(anchor[0] - camera.origin[0]) / camera.span[0] * 100}%`,
    opacity: visibility,
    position: "absolute",
    top: `${(anchor[1] - camera.origin[1]) / camera.span[1] * 100}%`,
    transform: "translate(-50%, -50%)",
    "--career-world-lod-transition-ms":
      `${LOD_PRESENTATION_TRANSITION_MS}ms`,
  } as CSSProperties;
}

function projectGlyph(label: string): string {
  return label
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function landmarkLabelVisibility(
  label: LandmarkLabel,
  detailState: DetailState,
): number {
  switch (label.role) {
    case "capital":
      return detailState.worldToTerritory;
    case "project":
      return detailState.territoryToCapital;
    case "skill":
      return detailState.capitalToSite;
  }
}

function LandmarkLabels({
  camera,
  detailState,
  labels,
  visible,
}: {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly labels: readonly LandmarkLabel[];
  readonly visible: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className="career-world__landmark-labels"
      data-landmark-label-count={labels.length}
      data-landmark-labels-visible={visible}
    >
      {visible ? labels.map((label) => {
        const visibility = landmarkLabelVisibility(label, detailState);
        if (visibility <= LOD_PRESENTATION_EPSILON) {
          return null;
        }
        return (
          <span
            className={[
              "career-world__landmark-label",
              `career-world__landmark-label--${label.role}`,
            ].join(" ")}
            data-landmark-id={label.id}
            data-landmark-role={label.role}
            key={label.id}
            style={{
              ...markerStyle(label.anchor, camera, visibility),
              transform: "translate(-50%, 0.7rem)",
            }}
          >
            <strong>{label.label}</strong>
            <span>{label.role}</span>
          </span>
        );
      }) : null}
    </div>
  );
}

function NinjaOneWorldSeal({
  camera,
  detailState,
  enabled,
  territory,
  onFocus,
}: {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly enabled: boolean;
  readonly territory: Territory;
  readonly onFocus: (id: string) => void;
}) {
  const visibility = resolveWorldDestinationVisibility(detailState);
  const anchor = territory.development.capitalAnchor;
  const style = markerStyle(anchor, camera, visibility);
  const isVisible = visibility > LOD_PRESENTATION_EPSILON;

  return (
    <button
      aria-label="Explore NinjaOne territory"
      className="career-world__world-seal"
      data-ready={enabled}
      data-territory-id={territory.id}
      data-visible={isVisible}
      data-world-seal-visibility={visibility.toFixed(3)}
      disabled={!enabled || !isVisible}
      onClick={() => onFocus(territory.id)}
      style={style}
      tabIndex={isVisible ? 0 : -1}
      title="Explore NinjaOne territory"
      type="button"
    >
      <span aria-hidden="true" className="career-world__world-seal-ring">
        <span className="career-world__world-seal-mark">N1</span>
      </span>
      <span className="career-world__world-seal-label">NinjaOne</span>
    </button>
  );
}

function ProjectTownDestination({
  active,
  camera,
  destination,
  detailState,
  enabled,
  onFocus,
  visualReady,
}: {
  readonly active: boolean;
  readonly camera: CameraView;
  readonly destination: ProjectDestination;
  readonly detailState: DetailState;
  readonly enabled: boolean;
  readonly onFocus: (id: string) => void;
  readonly visualReady: boolean;
}) {
  const visualVisibility = resolveNodeVisibility(
    { minimumTier: destination.visualMinimumTier },
    detailState,
  );
  const visibility = Math.min(
    resolveProjectDestinationVisibility(detailState),
    visualVisibility,
  );
  const isVisible = visibility > LOD_PRESENTATION_EPSILON;
  const interactionReady = enabled && visualReady && isVisible;
  const skillSiteLabel = destination.supportingSkillCount === 1
    ? "1 skill site"
    : `${destination.supportingSkillCount} skill sites`;

  return (
    <button
      aria-label={`Open ${destination.label} project town`}
      aria-pressed={active}
      className="career-world__project-destination"
      data-active={active}
      data-project-destination-id={destination.id}
      data-project-destination-visibility={visibility.toFixed(3)}
      data-project-visual-ready={visualReady}
      data-project-visual-visibility={visualVisibility.toFixed(3)}
      data-visible={isVisible}
      disabled={!interactionReady}
      onClick={() => onFocus(destination.id)}
      style={markerStyle(destination.anchor, camera, visibility)}
      tabIndex={interactionReady ? 0 : -1}
      title={`Open ${destination.label} project town`}
      type="button"
    >
      <span
        aria-hidden="true"
        className="career-world__project-destination-sigil"
      >
        {projectGlyph(destination.label)}
      </span>
      <span className="career-world__project-destination-copy">
        <strong>{destination.label}</strong>
        <span>{skillSiteLabel}</span>
      </span>
    </button>
  );
}

export function WorldInterface({
  activeViewId,
  camera,
  detailState,
  enableDevelopmentTools,
  landmarkLabels,
  projectDestinations,
  projectVisualReadiness,
  renderState,
  showGrid,
  showLandmarkLabels,
  showTopography,
  showTerritoryQa,
  territories,
  onFocus,
  onReset,
  onToggleGrid,
  onToggleLandmarkLabels,
  onToggleTopography,
  onToggleTerritoryQa,
}: WorldInterfaceProps) {
  const isInteractive = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const ninjaOne = territories.find(({ id }) => id === "ninjaone");
  const activeProject = projectDestinations.find(
    ({ id }) => id === activeViewId,
  );
  const activeTerritory = territories.find(
    ({ id }) => id === activeViewId,
  );

  return (
    <div className="career-world__interface" data-layer="interface">
      <div className="career-world__status-panel">
        <span className="career-world__eyebrow">Career World</span>
        <strong>
          {activeViewId === "world"
            ? "Full world extent"
            : activeViewId === "custom"
              ? "Free camera"
              : activeProject
                ? `${activeProject.label} project town`
                : activeTerritory?.label}
        </strong>
        <span
          className="career-world__render-state"
          data-state={renderState}
        >
          Water {renderState}
        </span>
        <span className="career-world__lod-state">
          {detailState.tier.label}
        </span>
      </div>

      <LandmarkLabels
        camera={camera}
        detailState={detailState}
        labels={landmarkLabels}
        visible={showLandmarkLabels}
      />

      <div
        className="career-world__world-markers"
        data-project-destination-count={projectDestinations.length}
        data-world-marker-count={
          (ninjaOne ? 1 : 0) + projectDestinations.length
        }
        style={{
          inset: 0,
          pointerEvents: "none",
          position: "absolute",
        }}
      >
        {ninjaOne ? (
          <NinjaOneWorldSeal
            camera={camera}
            detailState={detailState}
            enabled={isInteractive}
            onFocus={onFocus}
            territory={ninjaOne}
          />
        ) : null}
        {projectDestinations.map((destination) => (
          <ProjectTownDestination
            active={activeViewId === destination.id}
            camera={camera}
            destination={destination}
            detailState={detailState}
            enabled={isInteractive}
            key={destination.id}
            onFocus={onFocus}
            visualReady={projectVisualReadiness[destination.id] ?? true}
          />
        ))}
      </div>

      <div
        aria-label="World view controls"
        className="career-world__controls"
        data-ready={isInteractive}
        role="group"
      >
        <button
          aria-pressed={activeViewId === "world"}
          disabled={!isInteractive}
          onClick={onReset}
          type="button"
        >
          World
        </button>
        {territories.map((territory) => (
          <button
            aria-pressed={activeViewId === territory.id}
            disabled={!isInteractive}
            key={territory.id}
            onClick={() => onFocus(territory.id)}
            type="button"
          >
            {territory.label}
          </button>
        ))}
        <button
          aria-pressed={showLandmarkLabels}
          disabled={!isInteractive}
          onClick={onToggleLandmarkLabels}
          type="button"
        >
          Labels
        </button>
        {enableDevelopmentTools ? (
          <>
            <button
              aria-pressed={showTopography}
              className="career-world__qa-toggle"
              disabled={!isInteractive}
              onClick={onToggleTopography}
              type="button"
            >
              Topography
            </button>
            <button
              aria-pressed={showTerritoryQa}
              className="career-world__qa-toggle"
              disabled={!isInteractive}
              onClick={onToggleTerritoryQa}
              type="button"
            >
              Territory QA
            </button>
            <button
              aria-pressed={showGrid}
              className="career-world__qa-toggle"
              disabled={!isInteractive}
              onClick={onToggleGrid}
              type="button"
            >
              Grid
            </button>
          </>
        ) : null}
      </div>

      <p className="career-world__camera-hint">
        Wheel to zoom · drag to pan · arrow keys to move
      </p>
    </div>
  );
}
