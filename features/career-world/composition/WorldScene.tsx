"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { WorldBackdrop } from "../layers/world-backdrop";
import { WaterSurfaceCanvas, type WaterRenderState } from "../layers/ocean";
import {
  constrainNinjaOneCapitalCityProofCamera,
  NINJAONE_CAPITAL_CITY_CONCEPT_CAMERA,
  NINJAONE_CAPITAL_CITY_LAYER_CAMERA,
  NINJAONE_CAPITAL_CITY_LAYER_WORLD_ORIGIN,
  NINJAONE_CAPITAL_CITY_LAYER_WORLD_SPAN,
  NINJAONE_CAPITAL_CITY_PROOF_CAMERAS,
  NINJAONE_CAPITAL_CITY_PROOF_TIERS,
  NinjaOneCapitalCityLayer,
  ninjaOneCapitalCityFocusedDistrict,
  ninjaOneCapitalCityProofDistrict,
  ninjaOneCapitalCityRepresentationMode,
  resolveNinjaOneCapitalDetailState,
  type NinjaOneCapitalCityProofViewId,
} from "../layers/city";
import {
  NinjaOneInlandHabitatCanvas,
  NinjaOneInlandWaterCanvas,
} from "../layers/inland-water";
import {
  NINJAONE_ENVIRONMENT_CAMERA,
  NINJAONE_ENVIRONMENT_PROOF_ID,
  NINJAONE_ENVIRONMENT_WORLD_ORIGIN,
  NINJAONE_ENVIRONMENT_WORLD_SPAN,
  FoliageLayer,
  NinjaOneEnvironmentProof,
  TERRITORIES,
  TerrainDetailLayer,
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
} from "../development";
import {
  interpolateCameraView,
  normalizeCameraView,
  panCameraViewByPixels,
  WORLD_CAMERA_VIEW,
  zoomCameraViewAt,
  type CameraView,
} from "../shared/camera";
import { DETAIL_POLICY } from "../shared/lod";
import { WORLD_LIGHT } from "../shared/lighting";
import { resolveTownPresentationAnchor } from "../shared/townPresentation";
import {
  DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
  isEnvironmentLayerEffectivelyVisible,
  type EnvironmentLayerId,
} from "../shared/environmentLayers";

interface WorldSceneProps {
  readonly cityVisualIntent: boolean;
  readonly cityLayerProof: boolean;
  readonly cityProofView: NinjaOneCapitalCityProofViewId | null;
  readonly enableDevelopmentTools: boolean;
  readonly enablePerformanceProbe: boolean;
  readonly environmentProof: boolean;
  readonly initialView: "world" | "ninjaone-capital";
}

interface DragState {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

const FOCUS_DURATION_MS = 680;
const MAX_WHEEL_ZOOM_SCALE = 1.28;
const MIN_WHEEL_ZOOM_SCALE = 1 / MAX_WHEEL_ZOOM_SCALE;
// The authored capital circulation source is 1448x1086. Zooming beyond this
// bound enlarges the road/terrace pixels past an honest presentation scale and
// makes sharp independent buildings appear pasted onto a blurred substrate.
const NINJAONE_CAPITAL_INTERACTIVE_MINIMUM_SPAN = 0.075;
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

function interactiveCameraMinimumSpan(camera: CameraView): number {
  const center = camera.origin.map(
    (value, index) => value + camera.span[index] * 0.5,
  );
  const capitalMaximum = NINJAONE_CAPITAL_CITY_LAYER_WORLD_ORIGIN.map(
    (value, index) => value + NINJAONE_CAPITAL_CITY_LAYER_WORLD_SPAN[index],
  );
  const centeredOnCapital = center.every((value, index) => (
    value >= NINJAONE_CAPITAL_CITY_LAYER_WORLD_ORIGIN[index]
    && value <= capitalMaximum[index]
  ));
  return centeredOnCapital
    ? NINJAONE_CAPITAL_INTERACTIVE_MINIMUM_SPAN
    : DETAIL_POLICY.cameraMinimumSpan;
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
  cityProofView,
  enableDevelopmentTools,
  enablePerformanceProbe,
  environmentProof,
  initialView,
}: WorldSceneProps) {
  const capitalLayerInspection = initialView === "ninjaone-capital";
  const showNinjaOneCapital = !environmentProof;
  const initialCamera = cityProofView
    ? NINJAONE_CAPITAL_CITY_PROOF_CAMERAS[cityProofView]
    : cityVisualIntent
      ? NINJAONE_CAPITAL_CITY_CONCEPT_CAMERA
    : environmentProof
    ? NINJAONE_ENVIRONMENT_CAMERA
    : initialView === "ninjaone-capital"
      ? NINJAONE_CAPITAL_CITY_LAYER_CAMERA
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
  const camera = cityProofView
    ? constrainNinjaOneCapitalCityProofCamera(cityProofView, publishedCamera)
    : publishedCamera;
  const [activeViewId, setActiveViewId] = useState(
    environmentProof
      ? "ninjaone-environment-proof"
      : initialView === "ninjaone-capital"
        ? "ninjaone-capital-city-layer"
        : "world",
  );
  const [kaizenVisualReady, setKaizenVisualReady] = useState(false);
  const [ninjaOneGeologyReady, setNinjaOneGeologyReady] = useState(false);
  const [renderState, setRenderState] =
    useState<WaterRenderState>("loading");
  const [showTopography, setShowTopography] = useState(false);
  const [showTerritoryQa, setShowTerritoryQa] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showLandmarkLabels, setShowLandmarkLabels] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [environmentLayerVisibility, setEnvironmentLayerVisibility] = useState(
    DEFAULT_ENVIRONMENT_LAYER_VISIBILITY,
  );
  const detailState = resolveNinjaOneCapitalDetailState(
    camera,
    cityProofView ? NINJAONE_CAPITAL_CITY_PROOF_TIERS[cityProofView] : null,
  );
  const forcedCityDistrict = cityProofView
    ? ninjaOneCapitalCityProofDistrict(cityProofView)
    : null;
  const focusedCityDistrict = ninjaOneCapitalCityFocusedDistrict(
    detailState.tier.id,
    null,
    forcedCityDistrict,
  );
  const cityRepresentationMode = ninjaOneCapitalCityRepresentationMode(
    detailState.tier.id,
    focusedCityDistrict,
  );
  const focusIsDetailedNinjaOneCapital = (
    showNinjaOneCapital
    && detailState.tier.id !== "world"
    && detailState.tier.id !== "territory"
  );
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
  const terrainDetailVisible = environmentLayerVisible("L2_1");
  const terrainFoliageVisible = environmentLayerVisible("L2_2");
  const inlandWaterAuthorityVisible = environmentLayerVisible("L3");
  const inlandWaterMotionVisible = environmentLayerVisible("L3_1");
  const inlandWaterEffectsVisible = environmentLayerVisible("L3_2");
  const inlandHabitatVisible = environmentLayerVisible("L3_4");
  const cityAuthorityVisible = environmentLayerVisible("L4");
  const ninjaOneEnvironmentOwnsCamera = (
    ninjaOneGeologyReady
    && detailState.tier.id !== "world"
    && detailState.tier.id !== "territory"
    && camera.origin[0] >= NINJAONE_ENVIRONMENT_WORLD_ORIGIN[0]
    && camera.origin[1] >= NINJAONE_ENVIRONMENT_WORLD_ORIGIN[1]
    && camera.origin[0] + camera.span[0]
      <= NINJAONE_ENVIRONMENT_WORLD_ORIGIN[0] + NINJAONE_ENVIRONMENT_WORLD_SPAN[0]
    && camera.origin[1] + camera.span[1]
      <= NINJAONE_ENVIRONMENT_WORLD_ORIGIN[1] + NINJAONE_ENVIRONMENT_WORLD_SPAN[1]
  );

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

  const normalizeSceneCamera = useCallback((next: CameraView) => {
    const normalized = normalizeCameraView(
      next,
      DETAIL_POLICY.cameraMinimumSpan,
    );
    return cityProofView
      ? constrainNinjaOneCapitalCityProofCamera(cityProofView, normalized)
      : normalized;
  }, [cityProofView]);

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
    if (cityProofView) return;
    cancelFocusAnimation();
    const bounds = event.currentTarget.getBoundingClientRect();
    const anchor = [
      (event.clientX - bounds.left) / Math.max(bounds.width, 1),
      (event.clientY - bounds.top) / Math.max(bounds.height, 1),
    ] as const;
    const scale = wheelZoomScale(event.deltaY);
    const minimumSpan = interactiveCameraMinimumSpan(publishedCamera);
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
    cityProofView,
    publishedCamera,
    queueCamera,
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
      if (cityProofView && ninjaOneCapitalCityProofDistrict(cityProofView) === null) {
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
    [cancelFocusAnimation, cityProofView, normalizeSceneCamera],
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
        !cityProofView
        && (event.key === "+" || event.key === "=" || event.key === "-")
      ) {
        event.preventDefault();
        cancelFocusAnimation();
        commitCamera(zoomCameraViewAt(
          cameraRef.current,
          [0.5, 0.5],
          event.key === "-" ? 1.18 : 0.84,
          interactiveCameraMinimumSpan(cameraRef.current),
        ));
        setActiveViewId("custom");
      }
    },
    [cancelFocusAnimation, cityProofView, commitCamera],
  );

  return (
    <div
      aria-label="Interactive Career World map"
      className="career-world__viewport"
      data-camera-origin={camera.origin.join(",")}
      data-camera-span={camera.span.join(",")}
      data-camera-constraint={cityProofView && ninjaOneCapitalCityProofDistrict(cityProofView)
        ? "ninjaone-environment-bounds"
        : cityProofView
          ? "fixed-proof-camera"
          : "world-bounds"}
      data-camera-minimum-span={interactiveCameraMinimumSpan(camera)}
      data-page-visible={isPageVisible}
      data-capital-lod={detailState.territoryToCapital.toFixed(3)}
      data-capital-layer-inspection={capitalLayerInspection}
      data-city-layer-proof={cityLayerProof}
      data-city-proof-view={cityProofView ?? "interactive"}
      data-city-proof-tier-locked={cityProofView !== null}
      data-city-representation-mode={cityRepresentationMode}
      data-city-visual-intent={cityVisualIntent}
      data-focused-city-district={focusedCityDistrict ?? "none"}
      data-layer-l1={oceanAuthorityVisible}
      data-layer-l1-1={oceanMotionVisible}
      data-layer-l1-2={environmentLayerVisible("L1_2")}
      data-layer-l2={terrainAuthorityVisible}
      data-layer-l2-1={terrainDetailVisible}
      data-layer-l2-2={terrainFoliageVisible}
      data-layer-l2-3={environmentLayerVisible("L2_3")}
      data-layer-l3={inlandWaterAuthorityVisible}
      data-layer-l3-1={inlandWaterMotionVisible}
      data-layer-l3-2={inlandWaterEffectsVisible}
      data-layer-l4={cityAuthorityVisible}
      data-layer-l4-0={environmentLayerVisible("L4_0")}
      data-layer-l4-1={environmentLayerVisible("L4_1")}
      data-layer-l4-2={environmentLayerVisible("L4_2")}
      data-layer-l4-3={environmentLayerVisible("L4_3")}
      data-layer-l4-4={environmentLayerVisible("L4_4")}
      data-layer-l4-5={environmentLayerVisible("L4_5")}
      data-layer-l4-6={environmentLayerVisible("L4_6")}
      data-layer-l4-7={environmentLayerVisible("L4_7")}
      data-ninjaone-geology-ready={ninjaOneGeologyReady}
      data-close-lod={detailState.siteToClose.toFixed(3)}
      data-detail-tier={detailState.tier.id}
      data-environment-proof={environmentProof
        ? NINJAONE_ENVIRONMENT_PROOF_ID
        : undefined}
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
      {oceanAuthorityVisible ? (
        <WaterSurfaceCanvas
          active={isPageVisible && oceanMotionVisible}
          camera={camera}
          coastalAmbience={coastalAmbienceVisible}
          detailState={detailState}
          light={WORLD_LIGHT}
          onRenderStateChange={setRenderState}
        />
      ) : null}
      {terrainAuthorityVisible ? (
        <TerritoryLandform
          camera={camera}
          detailState={detailState}
          suppressDetailedStreaming={ninjaOneEnvironmentOwnsCamera}
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
          {terrainAuthorityVisible ? (
            <NinjaOneEnvironmentProof
              active={isPageVisible}
              camera={camera}
              detailState={detailState}
              onGeologyReadyChange={setNinjaOneGeologyReady}
              proofMode={environmentProof}
              showFoliage={terrainFoliageVisible}
              showSupplementalDetail={terrainDetailVisible}
            />
          ) : null}
          {!environmentProof && !focusIsDetailedNinjaOneCapital ? (
            <>
              <InfrastructureLayer
                camera={camera}
                detailState={detailState}
                light={WORLD_LIGHT}
              />
              {terrainDetailVisible ? (
                <TerrainDetailLayer
                  camera={camera}
                  detailState={detailState}
                  light={WORLD_LIGHT}
                />
              ) : null}
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
              {terrainFoliageVisible ? (
                <FoliageLayer
                  camera={camera}
                  detailState={detailState}
                />
              ) : null}
            </>
          ) : null}
      </>
      {showNinjaOneCapital && cityAuthorityVisible ? (
        <NinjaOneCapitalCityLayer
          camera={camera}
          detailState={detailState}
          focusDistrict={focusedCityDistrict}
          light={WORLD_LIGHT}
          visibility={environmentLayerVisibility}
        />
      ) : null}
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
      {!environmentProof ? (
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
      ) : null}
      {capitalLayerInspection ? (
        <EnvironmentLayerInspector
          onToggle={handleEnvironmentLayerToggle}
          visibility={environmentLayerVisibility}
        />
      ) : null}
      <PerformanceProbe enabled={enableDevelopmentTools || enablePerformanceProbe} />
    </div>
  );
}
