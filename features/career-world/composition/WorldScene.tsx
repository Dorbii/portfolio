"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { WorldBackdrop } from "../layers/world-backdrop";
import { WaterSurfaceCanvas, type WaterRenderState } from "../layers/ocean";
import {
  NinjaOneInlandHabitatCanvas,
  NinjaOneInlandWaterCanvas,
} from "../layers/inland-water";
import {
  TERRITORIES,
  TerritoryLandform,
} from "../layers/terrain";
import { InfrastructureLayer } from "../layers/infrastructure";
import {
  CAPITAL_STRUCTURES,
  KAIZEN_NEIGHBORHOOD_OWNER_ID,
  PROJECT_STRUCTURES,
  SKILL_STRUCTURE_INSTANCES,
  SUPPORT_STRUCTURE_INSTANCES,
  resolveKaizenSemanticStructureAsset,
  resolveKaizenStructurePresentationAnchor,
  resolveProjectAnchor,
  resolveProjectFocusView,
  resolveSkillAnchor,
  StructuresLayer,
  type ProjectStructure,
  type SkillStructureInstance,
} from "../layers/structures";
import { ActorsEffectsLayer } from "../layers/actors-effects";
import {
  WorldInterface,
  type LandmarkLabel,
} from "../layers/interface";
import {
  DevelopmentOverlay,
  EnvironmentLayerInspector,
  PerformanceProbe,
  WaterTuningPanel,
} from "../development";
import {
  fitCameraViewToViewport,
  interpolateCameraView,
  normalizeCameraView,
  panCameraViewByPixels,
  WORLD_CAMERA_VIEW,
  zoomCameraViewAt,
  type CameraView,
} from "../shared/camera";
import { DETAIL_POLICY, resolveDetailState } from "../shared/lod";
import { WORLD_PLANE } from "../shared/world";
import { WORLD_LIGHT } from "../shared/lighting";
import { resolveTownPresentationAnchor } from "../shared/townPresentation";
import {
  DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
  isEnvironmentLayerEffectivelyVisible,
  type EnvironmentLayerId,
} from "../shared/environmentLayers";
import {
  normalizeWaterTuning,
  readWaterTuningUrlOverrides,
  type WaterTuning,
} from "../shared/waterTuning";

interface WorldSceneProps {
  readonly cityVisualIntent: boolean;
  readonly cityLayerProof: boolean;
  readonly enableDevelopmentTools: boolean;
  readonly enablePerformanceProbe: boolean;
  readonly initialView: "world" | "ninjaone-capital";
  readonly layerInspector: boolean;
}

interface DragState {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

const FOCUS_DURATION_MS = 680;
const MAX_WHEEL_ZOOM_SCALE = 1.28;
const MIN_WHEEL_ZOOM_SCALE = 1 / MAX_WHEEL_ZOOM_SCALE;
// The interactive wheel stops where the finest AUTHORED LAND resolves 1:1, so
// the free camera never magnifies pixels no source carries. That floor used to
// come from the D05 canon; with the capital's art removed it comes from the
// land itself: a site tile is 2048 art px over one cell, and a cell is
// WORLD_PLANE.width / 16 world px. Proof/test cameras still use the unclamped
// camera floor.
// The capital is a RESERVATION in world-territories now that its art is gone,
// so the capital view frames that envelope rather than a city camera constant.
const NINJAONE_CAPITAL_ENVELOPE = TERRITORIES
  .find(({ id }) => id === "ninjaone")?.development.capitalEnvelope;
const NINJAONE_CAPITAL_CAMERA: CameraView = Object.freeze({
  origin: Object.freeze([
    NINJAONE_CAPITAL_ENVELOPE?.origin[0] ?? 0,
    NINJAONE_CAPITAL_ENVELOPE?.origin[1] ?? 0,
  ] as [number, number]),
  span: Object.freeze([
    NINJAONE_CAPITAL_ENVELOPE?.span[0] ?? 1,
    NINJAONE_CAPITAL_ENVELOPE?.span[1] ?? 1,
  ] as [number, number]),
});
const LAND_SITE_TILE_PX = 2048;
const LAND_ART_PX_PER_WORLD_PX = LAND_SITE_TILE_PX / (WORLD_PLANE.width / 16);
function interactiveArtResolvingMinimumSpan(
  viewportSize: readonly [number, number] | null,
): number {
  if (!viewportSize || !(viewportSize[0] > 0)) {
    return DETAIL_POLICY.cameraMinimumSpan;
  }
  return Math.max(
    Math.min(1, viewportSize[0] / (WORLD_PLANE.width * LAND_ART_PX_PER_WORLD_PX)),
    DETAIL_POLICY.cameraMinimumSpan,
  );
}
const LIVE_PROJECT_STRUCTURES = Object.freeze(
  PROJECT_STRUCTURES.filter(({ id }) => id !== KAIZEN_NEIGHBORHOOD_OWNER_ID),
);
const LIVE_SKILL_STRUCTURE_INSTANCES = Object.freeze(
  SKILL_STRUCTURE_INSTANCES.filter(
    ({ ownerId }) => ownerId !== KAIZEN_NEIGHBORHOOD_OWNER_ID,
  ),
);
const LIVE_SUPPORT_STRUCTURE_INSTANCES = Object.freeze(
  SUPPORT_STRUCTURE_INSTANCES.filter(
    ({ ownerId }) => ownerId !== KAIZEN_NEIGHBORHOOD_OWNER_ID,
  ),
);

function wheelZoomScale(deltaY: number): number {
  return Math.min(
    MAX_WHEEL_ZOOM_SCALE,
    Math.max(
      MIN_WHEEL_ZOOM_SCALE,
      Math.exp(deltaY * 0.00135),
    ),
  );
}

function interactiveCameraMinimumSpan(
  _camera: CameraView,
  viewportSize: readonly [number, number] | null,
): number {
  return interactiveArtResolvingMinimumSpan(viewportSize);
}

function projectPresentationAnchor(project: ProjectStructure) {
  const semanticAsset = resolveKaizenSemanticStructureAsset({
    ownerId: project.id,
    role: "project",
    visualId: project.id,
  });
  return resolveTownPresentationAnchor(
    project.id,
    semanticAsset?.territoryAnchor
      ?? resolveKaizenStructurePresentationAnchor({
        anchor: resolveProjectAnchor(project),
        ownerId: project.id,
        role: "project",
        visualId: project.id,
      }),
  );
}

function skillPresentationStructure(instance: SkillStructureInstance) {
  const semanticAsset = resolveKaizenSemanticStructureAsset({
    ownerId: instance.ownerId,
    role: "skill",
    visualId: instance.archetype.id,
  });
  return Object.freeze({
    territoryAnchor: resolveTownPresentationAnchor(
      instance.ownerId,
      semanticAsset?.territoryAnchor
        ?? resolveKaizenStructurePresentationAnchor({
          anchor: resolveSkillAnchor(instance),
          ownerId: instance.ownerId,
          role: "skill",
          visualId: instance.archetype.id,
        }),
    ),
    footprintSpan: semanticAsset?.footprintSpan
      ?? instance.archetype.footprintSpan,
    groundAnchor: semanticAsset?.groundAnchor
      ?? instance.archetype.groundAnchor,
  });
}

const PROJECT_DESTINATIONS = Object.freeze(
  LIVE_PROJECT_STRUCTURES.map((project) => {
    const supportingSkills = LIVE_SKILL_STRUCTURE_INSTANCES.filter((instance) => (
      instance.ownerKind === "project"
      && instance.ownerId === project.id
    ));
    const supportingStructures = LIVE_SUPPORT_STRUCTURE_INSTANCES.filter(
      (instance) => (
        instance.ownerKind === "project"
        && instance.ownerId === project.id
      ),
    );
    const semanticProject = resolveKaizenSemanticStructureAsset({
      ownerId: project.id,
      role: "project",
      visualId: project.id,
    });
    const presentedProject = Object.freeze({
      ...project,
      territoryAnchor: projectPresentationAnchor(project),
      footprintSpan: semanticProject?.footprintSpan ?? project.footprintSpan,
      groundAnchor: semanticProject?.groundAnchor ?? project.groundAnchor,
    });
    const presentedSkills = supportingSkills.map(skillPresentationStructure);
    const presentedSupport = supportingStructures.map(({
      ownerId,
      territoryAnchor,
      archetype,
    }) => ({
      territoryAnchor: resolveTownPresentationAnchor(
        ownerId,
        territoryAnchor,
      ),
      footprintSpan: archetype.footprintSpan,
      groundAnchor: archetype.groundAnchor,
    }));
    const focusStructures = [...presentedSkills, ...presentedSupport];
    return Object.freeze({
      id: project.id,
      label: project.label,
      anchor: presentedProject.territoryAnchor,
      focusView: resolveProjectFocusView(
        presentedProject,
        focusStructures,
      ),
      supportingSkillCount: supportingSkills.length,
      visualMinimumTier: "capital" as const,
    });
  }),
);
const LANDMARK_LABELS: readonly LandmarkLabel[] = Object.freeze([
  ...CAPITAL_STRUCTURES.map((capital) => Object.freeze({
    id: capital.id,
    label: `${capital.territory.label} Capital`,
    anchor: capital.territory.development.capitalAnchor,
    role: "capital" as const,
  })),
  ...LIVE_PROJECT_STRUCTURES.map((project) => Object.freeze({
    id: project.id,
    label: project.label,
    anchor: projectPresentationAnchor(project),
    role: "project" as const,
  })),
  ...LIVE_SKILL_STRUCTURE_INSTANCES.map((instance) => Object.freeze({
    id: instance.id,
    label: instance.archetype.label,
    anchor: skillPresentationStructure(instance).territoryAnchor,
    role: "skill" as const,
  })),
]);
const INTERACTIVE_TARGET_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "[data-layer-inspector]",
  "[role='button']",
  "[data-semantic-structure][data-interactive='true']",
].join(",");

export function WorldScene({
  cityVisualIntent,
  cityLayerProof,
  enableDevelopmentTools,
  enablePerformanceProbe,
  initialView,
  layerInspector,
}: WorldSceneProps) {
  const capitalLayerInspection = initialView === "ninjaone-capital"
    || layerInspector;
  const initialCamera = initialView === "ninjaone-capital"
    ? NINJAONE_CAPITAL_CAMERA
    : WORLD_CAMERA_VIEW;
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<CameraView>(initialCamera);
  const cameraFrameRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const focusFrameRef = useRef(0);
  const [cameraPublication, setCameraPublication] = useState(() => ({
    camera: initialCamera,
    generation: 0,
  }));
  const publishedCamera = cameraPublication.camera;
  const camera = publishedCamera;
  const [activeViewId, setActiveViewId] = useState(
    initialView === "ninjaone-capital"
      ? "ninjaone-capital-city-layer"
      : "world",
  );
  const [kaizenVisualReady, setKaizenVisualReady] = useState(false);
  const [ninjaOneGeologyReady, setNinjaOneGeologyReady] = useState(false);
  const [renderState, setRenderState] =
    useState<WaterRenderState>("loading");
  const [waterTuning, setWaterTuning] = useState<WaterTuning>(() => (
    normalizeWaterTuning(readWaterTuningUrlOverrides(
      typeof window === "undefined" ? "" : window.location.search,
    ))
  ));
  const [showTopography, setShowTopography] = useState(false);
  const [showTerritoryQa, setShowTerritoryQa] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showLandmarkLabels, setShowLandmarkLabels] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [viewportSize, setViewportSize] = useState<[number, number] | null>(
    null,
  );
  const [environmentLayerVisibility, setEnvironmentLayerVisibility] = useState(
    DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
  );
  const detailState = resolveDetailState(camera);
  const oceanWaterTuning = useMemo(() => Object.freeze({
    opacity: waterTuning.oceanOpacity,
    timeScale: waterTuning.oceanTimeScale,
    weather: waterTuning.oceanWeather,
  }), [waterTuning]);
  const showNinjaOneInlandWater = (
    detailState.tier.id !== "world"
    && detailState.tier.id !== "territory"
  );
  const environmentLayerVisible = (id: EnvironmentLayerId) => (
    !capitalLayerInspection
    || isEnvironmentLayerEffectivelyVisible(environmentLayerVisibility, id)
  );
  const oceanAuthorityVisible = environmentLayerVisible("L1");
  const oceanMotionVisible = environmentLayerVisible("L1_1");
  const coastalAmbienceVisible = environmentLayerVisible("L1_2");
  const terrainAuthorityVisible = environmentLayerVisible("L2");
  const inlandWaterAuthorityVisible = environmentLayerVisible("L3");
  const inlandWaterMotionVisible = environmentLayerVisible("L3_1");
  const inlandWaterEffectsVisible = environmentLayerVisible("L3_2");
  const inlandHabitatVisible = environmentLayerVisible("L3_4");
  const handleEnvironmentLayerToggle = useCallback((id: EnvironmentLayerId) => {
    setEnvironmentLayerVisibility((current) => Object.freeze({
      ...current,
      [id]: !current[id],
    }));
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setIsPageVisible(entry.isIntersecting),
      { root: null, rootMargin: "192px 0px" },
    );
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const measure = () => {
      const bounds = viewport.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        return;
      }
      setViewportSize((current) => (
        current
          && Math.abs(current[0] - bounds.width) < 0.5
          && Math.abs(current[1] - bounds.height) < 0.5
          ? current
          : [bounds.width, bounds.height]
      ));
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const normalizeSceneCamera = useCallback((next: CameraView) => {
    const normalized = normalizeCameraView(
      next,
      DETAIL_POLICY.cameraMinimumSpan,
    );
    // Layers draw the camera region with preserveAspectRatio="none", so the
    // span has to carry the viewport's aspect or the world renders stretched.
    const fitted = viewportSize
      ? fitCameraViewToViewport(
        normalized,
        viewportSize,
        [WORLD_PLANE.width, WORLD_PLANE.height],
        DETAIL_POLICY.cameraMinimumSpan,
      )
      : normalized;
    return fitted;
  }, [viewportSize]);

  const commitCamera = useCallback((next: CameraView) => {
    const normalized = normalizeSceneCamera(next);
    if (cameraFrameRef.current) {
      cancelAnimationFrame(cameraFrameRef.current);
      cameraFrameRef.current = 0;
    }
    cameraRef.current = normalized;
    setCameraPublication((current) => ({
      camera: normalized,
      generation: current.generation + 1,
    }));
  }, [normalizeSceneCamera]);

  // A resize changes the required span aspect, so re-run the current view
  // through the funnel rather than leaving it stretched until the next input.
  useEffect(() => {
    if (!viewportSize) {
      return;
    }
    commitCamera(cameraRef.current);
  }, [commitCamera, viewportSize]);

  const queueCamera = useCallback((next: CameraView) => {
    cameraRef.current = normalizeSceneCamera(next);
    if (cameraFrameRef.current) {
      return;
    }

    cameraFrameRef.current = requestAnimationFrame(() => {
      cameraFrameRef.current = 0;
      setCameraPublication((current) => ({
        camera: cameraRef.current,
        generation: current.generation + 1,
      }));
    });
  }, [normalizeSceneCamera]);

  const cancelFocusAnimation = useCallback(() => {
    if (focusFrameRef.current) {
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = 0;
    }
  }, []);

  useEffect(() => () => {
    cancelFocusAnimation();
    if (cameraFrameRef.current) {
      cancelAnimationFrame(cameraFrameRef.current);
    }
  }, [cancelFocusAnimation]);

  const animateTo = useCallback((target: CameraView, id: string) => {
    cancelFocusAnimation();
    const start = cameraRef.current;
    const startedAt = performance.now();
    setActiveViewId(id);

    const frame = (timestamp: number) => {
      const progress = Math.min(
        1,
        Math.max(0, (timestamp - startedAt) / FOCUS_DURATION_MS),
      );
      commitCamera(interpolateCameraView(start, target, progress));
      if (progress < 1) {
        focusFrameRef.current = requestAnimationFrame(frame);
      } else {
        focusFrameRef.current = 0;
      }
    };
    focusFrameRef.current = requestAnimationFrame(frame);
  }, [cancelFocusAnimation, commitCamera]);

  const handleFocus = useCallback((id: string) => {
    const territory = TERRITORIES.find((candidate) => candidate.id === id);
    if (territory) {
      if (territory.id === "ninjaone") {
        animateTo(territory.development.capitalEnvelope, territory.id);
      } else {
        animateTo(territory.focusView, territory.id);
      }
      return;
    }

    const project = PROJECT_DESTINATIONS.find(
      (candidate) => candidate.id === id,
    );
    if (project) {
      animateTo(project.focusView, project.id);
    }
  }, [animateTo]);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const target = event.target;
    if (
      target instanceof Element
      && target.closest(INTERACTIVE_TARGET_SELECTOR)
    ) {
      return;
    }
    event.preventDefault();
    cancelFocusAnimation();
    const bounds = event.currentTarget.getBoundingClientRect();
    const anchor = [
      (event.clientX - bounds.left) / Math.max(bounds.width, 1),
      (event.clientY - bounds.top) / Math.max(bounds.height, 1),
    ] as const;
    const scale = wheelZoomScale(event.deltaY);
    const minimumSpan = interactiveCameraMinimumSpan(publishedCamera, viewportSize);
    const candidate = zoomCameraViewAt(
      publishedCamera,
      anchor,
      scale,
      minimumSpan,
    );
    queueCamera(candidate);
    setActiveViewId("custom");
  }, [
    cancelFocusAnimation,
    publishedCamera,
    queueCamera,
    viewportSize,
  ]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      const target = event.target;
      if (
        target instanceof Element
        && target.closest(INTERACTIVE_TARGET_SELECTOR)
      ) {
        return;
      }
      cancelFocusAnimation();
      cameraRef.current = normalizeSceneCamera(cameraRef.current);
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      setActiveViewId("custom");
      event.currentTarget.dataset.dragging = "true";
    },
    [cancelFocusAnimation, normalizeSceneCamera],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      const bounds = event.currentTarget.getBoundingClientRect();

      queueCamera(panCameraViewByPixels(
        cameraRef.current,
        [event.clientX - drag.x, event.clientY - drag.y],
        [bounds.width, bounds.height],
      ));
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    },
    [queueCamera],
  );

  const finishPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const pan = event.shiftKey ? 72 : 36;
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) {
        return;
      }

      const deltas: Partial<Record<string, readonly [number, number]>> = {
        ArrowLeft: [pan, 0],
        ArrowRight: [-pan, 0],
        ArrowUp: [0, pan],
        ArrowDown: [0, -pan],
      };
      if (event.key in deltas) {
        event.preventDefault();
        cancelFocusAnimation();
        commitCamera(panCameraViewByPixels(
          cameraRef.current,
          deltas[event.key]!,
          [viewport.width, viewport.height],
        ));
        setActiveViewId("custom");
      } else if (
        event.key === "+" || event.key === "=" || event.key === "-"
      ) {
        event.preventDefault();
        cancelFocusAnimation();
        commitCamera(zoomCameraViewAt(
          cameraRef.current,
          [0.5, 0.5],
          event.key === "-" ? 1.18 : 0.84,
          interactiveCameraMinimumSpan(cameraRef.current, viewportSize),
        ));
        setActiveViewId("custom");
      }
    },
    [cancelFocusAnimation, commitCamera, viewportSize],
  );

  return (
    <div
      aria-label="Interactive Career World map"
      className="career-world__viewport"
      data-camera-origin={camera.origin.join(",")}
      data-camera-span={camera.span.join(",")}
      data-camera-constraint="world-bounds"
      data-camera-minimum-span={interactiveCameraMinimumSpan(camera, viewportSize)}
      data-page-visible={isPageVisible}
      data-capital-lod={detailState.territoryToCapital.toFixed(3)}
      data-capital-layer-inspection={capitalLayerInspection}
      data-city-layer-proof={cityLayerProof}
      data-city-visual-intent={cityVisualIntent}
      data-layer-l1={oceanAuthorityVisible}
      data-layer-l1-1={oceanMotionVisible}
      data-layer-l1-2={environmentLayerVisible("L1_2")}
      data-layer-l2={terrainAuthorityVisible}
      data-layer-l3={inlandWaterAuthorityVisible}
      data-layer-l3-1={inlandWaterMotionVisible}
      data-layer-l3-2={inlandWaterEffectsVisible}
      data-close-lod={detailState.siteToClose.toFixed(3)}
      data-detail-tier={detailState.tier.id}
      data-kaizen-visual-ready={kaizenVisualReady}
      data-initial-view={initialView}
      data-site-lod={detailState.capitalToSite.toFixed(3)}
      data-territory-lod={detailState.worldToTerritory.toFixed(3)}
      onKeyDown={handleKeyDown}
      onPointerCancel={finishPointer}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onWheel={handleWheel}
      ref={viewportRef}
      role="application"
      tabIndex={0}
    >
      <WorldBackdrop light={WORLD_LIGHT} />
      {terrainAuthorityVisible ? (
        <TerritoryLandform
          camera={camera}
          detailState={detailState}
        />
      ) : null}
      {oceanAuthorityVisible ? (
        <WaterSurfaceCanvas
          active={isPageVisible && oceanMotionVisible}
          camera={camera}
          coastalAmbience={coastalAmbienceVisible}
          detailState={detailState}
          light={WORLD_LIGHT}
          onRenderStateChange={setRenderState}
          tuning={oceanWaterTuning}
        />
      ) : null}
      {showNinjaOneInlandWater && inlandWaterAuthorityVisible ? (
        <NinjaOneInlandWaterCanvas
          active={isPageVisible && inlandWaterMotionVisible}
          camera={camera}
          detailState={detailState}
          effectsEnabled={inlandWaterEffectsVisible}
          light={WORLD_LIGHT}
        />
      ) : null}
      {showNinjaOneInlandWater
        && inlandWaterAuthorityVisible
        && inlandHabitatVisible ? (
          <NinjaOneInlandHabitatCanvas
            camera={camera}
            detailState={detailState}
          />
        ) : null}
      <>
          <InfrastructureLayer
            camera={camera}
            detailState={detailState}
            light={WORLD_LIGHT}
          />
          <ActorsEffectsLayer
            camera={camera}
            detailState={detailState}
            light={WORLD_LIGHT}
          />
          <StructuresLayer
            camera={camera}
            detailState={detailState}
            light={WORLD_LIGHT}
            onKaizenVisualReadyChange={setKaizenVisualReady}
          />
      </>

      {enableDevelopmentTools
          && (showGrid || showTopography || showTerritoryQa) ? (
        <DevelopmentOverlay
          camera={camera}
          showGrid={showGrid}
          showTopography={showTopography}
          showTerritories={showTerritoryQa}
          territories={TERRITORIES}
        />
      ) : null}
        <WorldInterface
          activeViewId={activeViewId}
          camera={camera}
          detailState={detailState}
          enableDevelopmentTools={enableDevelopmentTools}
          landmarkLabels={LANDMARK_LABELS}
          onFocus={handleFocus}
          onReset={() => animateTo(WORLD_CAMERA_VIEW, "world")}
          onToggleGrid={() => setShowGrid((visible) => !visible)}
          onToggleLandmarkLabels={() => (
            setShowLandmarkLabels((visible) => !visible)
          )}
          onToggleTopography={() => setShowTopography((visible) => !visible)}
          onToggleTerritoryQa={() => setShowTerritoryQa((visible) => !visible)}
          projectDestinations={PROJECT_DESTINATIONS}
          projectVisualReadiness={{}}
          renderState={renderState}
          showGrid={showGrid}
          showLandmarkLabels={showLandmarkLabels}
          showTopography={showTopography}
          showTerritoryQa={showTerritoryQa}
          territories={TERRITORIES}
        />
      {capitalLayerInspection ? (
        <EnvironmentLayerInspector
          onToggle={handleEnvironmentLayerToggle}
          visibility={environmentLayerVisibility}
        />
      ) : null}
      <WaterTuningPanel
        enabled={enableDevelopmentTools}
        onChange={setWaterTuning}
        tuning={waterTuning}
      />
      <PerformanceProbe enabled={enableDevelopmentTools || enablePerformanceProbe} />
    </div>
  );
}
