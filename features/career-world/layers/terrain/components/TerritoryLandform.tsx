import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CameraView, Pair } from "../../../shared/camera";
import {
  advanceLodPresentationFade,
  DETAIL_POLICY,
  EMPTY_LOD_COHORT_TRANSITION,
  isCurrentLodCohort,
  isLodCohortReady,
  LOD_PRESENTATION_EPSILON,
  LOD_PRESENTATION_TRANSITION_MS,
  removeLodCohortKey,
  resolveLodCohortKeyOpacity,
  resolveLodCohortTransition,
  resolveRegisteredRasterVisibility,
  resolveLodCrossfadeTargets,
  resolveRetainedLodPresentationKeys,
  resolveLodSourceOpacity,
  shouldRetainLodSource,
  type DetailState,
  type LodPresentationFade,
} from "../../../shared/lod";
import {
  LAND_ASSETS,
  LAND_PLATE_DECODED_BYTES,
} from "../model/assets";
import { NINJAONE_INLAND_TERRAIN_ERASE_MASK } from "../../inland-water";
import {
  TERRAIN_SITE_TILES,
} from "../model/siteTiles";
import {
  TERRAIN_STREAM_POLICY,
  TERRAIN_STREAM_TILES,
  type TerrainStreamSourceTier,
} from "../model/streamTiles";
import {
  planTerrainResidencyWithTierFallback,
  prefetchSourcesToPreempt,
  terrainTileIntersectsCamera,
  type TerrainResidencyTile,
} from "../model/residency";

interface TerritoryLandformProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly suppressDetailedStreaming?: boolean;
}

interface StreamSourceRequest {
  readonly key: string;
  readonly path: string;
  readonly tier: TerrainStreamSourceTier;
  readonly tileId: string;
}

interface StreamSourceFailure {
  readonly attempts: number;
  readonly retryAt: number;
}

interface RegisteredTerrainRaster {
  readonly worldBounds: {
    readonly origin: Pair;
    readonly span: Pair;
  };
}

const TERRAIN_SITE_RESIDENCY_TILES: readonly TerrainResidencyTile[] =
  Object.freeze(TERRAIN_SITE_TILES.map((tile) => Object.freeze({
    id: tile.id,
    sources: Object.freeze({
      site: Object.freeze({
        decodedBytes: tile.dimensions[0] * tile.dimensions[1] * 4,
        dimensions: tile.dimensions,
        path: tile.path,
      }),
    }),
    worldBounds: tile.worldBounds,
  })));

const CAMERA_SETTLE_DURATION_MS = 180;

function streamImageKey(
  tileId: string,
  tier: TerrainStreamSourceTier,
): string {
  return `${tier}:${tileId}`;
}

function cameraIdentity(camera: CameraView): string {
  return `${camera.origin.join(",")}|${camera.span.join(",")}`;
}

function releaseImage(image: HTMLImageElement | undefined): void {
  if (!image) {
    return;
  }
  image.onload = null;
  image.onerror = null;
  image.src = "";
}

function canvasViewportPixels(
  canvas: HTMLCanvasElement | null,
): Pair {
  const bounds = canvas?.getBoundingClientRect();
  return Object.freeze([
    Math.max(1, bounds?.width ?? 1),
    Math.max(1, bounds?.height ?? 1),
  ]);
}

function expectedCanvasDecodedBytes(
  canvas: HTMLCanvasElement | null,
  renderScale: number,
): number {
  const viewport = canvasViewportPixels(canvas);
  const pixelRatio = Math.min(
    (window.devicePixelRatio || 1) * renderScale,
    DETAIL_POLICY.renderScale.maximumDevicePixelRatio,
  );
  return (
    Math.max(1, Math.round(viewport[0] * pixelRatio))
    * Math.max(1, Math.round(viewport[1] * pixelRatio))
    * 4
  );
}

export function TerritoryLandform({
  camera,
  detailState,
  suppressDetailedStreaming = false,
}: TerritoryLandformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldPlateRef = useRef<HTMLImageElement | null>(null);
  const worldPlateDecodedRef = useRef(false);
  const detailPlateRef = useRef<HTMLImageElement | null>(null);
  const detailPlateDecodedRef = useRef(false);
  const detailPlateDecodedAtRef = useRef<number | null>(null);
  const inlandTerrainEraseMaskRef = useRef<HTMLImageElement | null>(null);
  const inlandTerrainEraseMaskDecodedRef = useRef(false);
  const streamTileRefs = useRef(new Map<string, HTMLImageElement>());
  const activeStreamKeysRef = useRef(new Set<string>());
  const decodedStreamKeysRef = useRef(new Set<string>());
  const capitalCohortRef = useRef(EMPTY_LOD_COHORT_TRANSITION);
  const siteCohortRef = useRef(EMPTY_LOD_COHORT_TRANSITION);
  const streamFailuresRef = useRef(
    new Map<string, StreamSourceFailure>(),
  );
  const streamRequestQueueRef = useRef<readonly StreamSourceRequest[]>([]);
  const retainedStreamKeysRef = useRef(new Set<string>());
  const visibleStreamKeysRef = useRef(new Set<string>());
  const streamEstimatedDecodedBytesRef = useRef(0);
  const streamResidentTileCountRef = useRef(0);
  const streamVisibleOverBudgetRef = useRef(false);
  const streamRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const streamRequestTimeoutsRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  const renderFrameRef = useRef(0);
  const renderRef = useRef<() => void>(() => undefined);
  const pumpStreamQueueRef = useRef<() => void>(() => undefined);
  const capitalPresentationRef = useRef<LodPresentationFade>({
    value: 0,
    target: 0,
    lastUpdatedAt: 0,
  });
  const sitePresentationRef = useRef<LodPresentationFade>({
    value: 0,
    target: 0,
    lastUpdatedAt: 0,
  });
  const [presentationRevision, setPresentationRevision] = useState(0);
  const [viewportRevision, setViewportRevision] = useState(0);
  const [detailPlateRetired, setDetailPlateRetired] = useState(false);
  const nextCameraIdentity = cameraIdentity(camera);
  const [settledCameraIdentity, setSettledCameraIdentity] = useState(
    nextCameraIdentity,
  );
  const cameraSettled = settledCameraIdentity === nextCameraIdentity;
  const detailOpacity = detailState.worldToTerritory;

  useEffect(() => {
    const settleTimer = window.setTimeout(
      () => setSettledCameraIdentity(nextCameraIdentity),
      CAMERA_SETTLE_DURATION_MS,
    );
    return () => window.clearTimeout(settleTimer);
  }, [nextCameraIdentity]);

  const queueRender = useCallback(() => {
    if (renderFrameRef.current) {
      return;
    }
    renderFrameRef.current = requestAnimationFrame(() => {
      renderFrameRef.current = 0;
      renderRef.current();
    });
  }, []);

  const cancelStreamSource = useCallback((key: string) => {
    const timeout = streamRequestTimeoutsRef.current.get(key);
    if (timeout) {
      clearTimeout(timeout);
      streamRequestTimeoutsRef.current.delete(key);
    }
    releaseImage(streamTileRefs.current.get(key));
    streamTileRefs.current.delete(key);
    activeStreamKeysRef.current.delete(key);
    decodedStreamKeysRef.current.delete(key);
    capitalCohortRef.current = removeLodCohortKey(
      capitalCohortRef.current,
      key,
    );
    siteCohortRef.current = removeLodCohortKey(
      siteCohortRef.current,
      key,
    );
  }, []);

  const publishStreamMetrics = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const fixedDecodedBytes =
      (worldPlateDecodedRef.current
        ? LAND_PLATE_DECODED_BYTES.world
        : 0)
      + (detailPlateDecodedRef.current
        ? LAND_PLATE_DECODED_BYTES.territory
        : 0)
      + (inlandTerrainEraseMaskDecodedRef.current
        ? NINJAONE_INLAND_TERRAIN_ERASE_MASK.decodedBytes
        : 0);
    const canvasDecodedBytes = expectedCanvasDecodedBytes(
      canvas,
      detailState.renderScale,
    );
    canvas.dataset.streamActiveSourceCount = String(
      activeStreamKeysRef.current.size,
    );
    canvas.dataset.streamEstimatedDecodedBytes = String(
      streamEstimatedDecodedBytesRef.current,
    );
    canvas.dataset.streamPendingSourceCount = String(
      streamRequestQueueRef.current.filter((request) =>
        !decodedStreamKeysRef.current.has(request.key)
        && !activeStreamKeysRef.current.has(request.key)
      ).length,
    );
    canvas.dataset.streamResidentSourceCount = String(
      decodedStreamKeysRef.current.size,
    );
    canvas.dataset.streamResidentTileCount = String(
      streamResidentTileCountRef.current,
    );
    canvas.dataset.streamVisibleOverBudget = String(
      streamVisibleOverBudgetRef.current,
    );
    canvas.dataset.localResidentTileCount = String(
      TERRAIN_SITE_TILES.reduce((count, tile) => (
        decodedStreamKeysRef.current.has(streamImageKey(tile.id, "site"))
          ? count + 1
          : count
      ), 0),
    );
    canvas.dataset.landEstimatedDecodedBytes = String(
      fixedDecodedBytes
      + canvasDecodedBytes
      + streamEstimatedDecodedBytesRef.current,
    );
    canvas.dataset.landMaximumDecodedBytes = String(
      TERRAIN_STREAM_POLICY.maximumLandLayerDecodedBytes,
    );
  }, [detailState.renderScale]);

  const pumpStreamQueue = useCallback(() => {
    if (streamRetryTimerRef.current) {
      clearTimeout(streamRetryTimerRef.current);
      streamRetryTimerRef.current = null;
    }

    const now = Date.now();
    const queue = streamRequestQueueRef.current;
    const eligibleVisibleRequestCount = queue.filter((candidate) => {
      if (
        !visibleStreamKeysRef.current.has(candidate.key)
        || !retainedStreamKeysRef.current.has(candidate.key)
        || streamTileRefs.current.has(candidate.key)
      ) {
        return false;
      }
      const failure = streamFailuresRef.current.get(candidate.key);
      return !failure || failure.retryAt <= now;
    }).length;
    const maximumConcurrentLoads =
      TERRAIN_STREAM_POLICY.maximumConcurrentLoads;
    const prefetchKeysToCancel = prefetchSourcesToPreempt({
      activeSourceKeys: activeStreamKeysRef.current,
      eligibleVisibleRequestCount,
      maximumConcurrentLoads,
      visibleSourceKeys: visibleStreamKeysRef.current,
    });
    for (const key of prefetchKeysToCancel) {
      cancelStreamSource(key);
    }

    while (
      activeStreamKeysRef.current.size
      < maximumConcurrentLoads
    ) {
      const request = queue.find((candidate) => {
        if (
          !retainedStreamKeysRef.current.has(candidate.key)
          || streamTileRefs.current.has(candidate.key)
        ) {
          return false;
        }
        const failure = streamFailuresRef.current.get(candidate.key);
        return !failure || failure.retryAt <= now;
      });
      if (!request) {
        break;
      }

      const image = new Image();
      image.decoding = "async";
      activeStreamKeysRef.current.add(request.key);
      streamTileRefs.current.set(request.key, image);
      const clearRequestTimeout = () => {
        const timeout = streamRequestTimeoutsRef.current.get(request.key);
        if (timeout) {
          clearTimeout(timeout);
          streamRequestTimeoutsRef.current.delete(request.key);
        }
      };
      const failRequest = () => {
        if (streamTileRefs.current.get(request.key) !== image) {
          return;
        }
        clearRequestTimeout();
        activeStreamKeysRef.current.delete(request.key);
        decodedStreamKeysRef.current.delete(request.key);
        releaseImage(image);
        streamTileRefs.current.delete(request.key);
        const attempts =
          (streamFailuresRef.current.get(request.key)?.attempts ?? 0) + 1;
        const retryDelay = Math.min(
          TERRAIN_STREAM_POLICY.retryMaximumDelayMs,
          TERRAIN_STREAM_POLICY.retryBaseDelayMs
            * 2 ** Math.min(attempts - 1, 8),
        );
        streamFailuresRef.current.set(request.key, {
          attempts,
          retryAt: Date.now() + retryDelay,
        });
        publishStreamMetrics();
        queueRender();
        pumpStreamQueueRef.current();
      };
      image.onload = () => {
        void image.decode().then(() => {
          if (
            streamTileRefs.current.get(request.key) !== image
            || !retainedStreamKeysRef.current.has(request.key)
          ) {
            return;
          }
          clearRequestTimeout();
          activeStreamKeysRef.current.delete(request.key);
          decodedStreamKeysRef.current.add(request.key);
          streamFailuresRef.current.delete(request.key);
          publishStreamMetrics();
          queueRender();
          pumpStreamQueueRef.current();
        }, failRequest);
      };
      image.onerror = failRequest;
      streamRequestTimeoutsRef.current.set(
        request.key,
        setTimeout(
          failRequest,
          TERRAIN_STREAM_POLICY.requestTimeoutMs,
        ),
      );
      image.src = request.path;
    }

    const nextRetryAt = queue.reduce((earliest, request) => {
      if (
        !retainedStreamKeysRef.current.has(request.key)
        || streamTileRefs.current.has(request.key)
      ) {
        return earliest;
      }
      const retryAt = streamFailuresRef.current.get(request.key)?.retryAt;
      return retryAt && retryAt > now
        ? Math.min(earliest, retryAt)
        : earliest;
    }, Number.POSITIVE_INFINITY);
    if (Number.isFinite(nextRetryAt)) {
      streamRetryTimerRef.current = setTimeout(
        () => pumpStreamQueueRef.current(),
        Math.max(0, nextRetryAt - Date.now()),
      );
    }
    publishStreamMetrics();
  }, [cancelStreamSource, publishStreamMetrics, queueRender]);

  useEffect(() => {
    pumpStreamQueueRef.current = pumpStreamQueue;
  }, [pumpStreamQueue]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const worldPlate = worldPlateRef.current;
    if (!canvas || !worldPlate || !worldPlateDecodedRef.current) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    const settledPixelRatio = Math.min(
      (window.devicePixelRatio || 1) * detailState.renderScale,
      DETAIL_POLICY.renderScale.maximumDevicePixelRatio,
    );
    // Keep the backing store stable while the camera moves. Downshifting it
    // during input made the entire authority visibly soften for 180 ms and
    // forced a second full-canvas allocation when the camera settled. The
    // existing stream-tier suppression still bounds moving-camera work.
    const pixelRatio = settledPixelRatio;
    const width = Math.max(1, Math.round(bounds.width * pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return;
    }

    context.resetTransform();
    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const drawPlate = (plate: HTMLImageElement, opacity: number) => {
      context.globalAlpha = opacity;
      context.drawImage(
        plate,
        camera.origin[0] * plate.naturalWidth,
        camera.origin[1] * plate.naturalHeight,
        camera.span[0] * plate.naturalWidth,
        camera.span[1] * plate.naturalHeight,
        0,
        0,
        width,
        height,
      );
    };
    const drawRegisteredTile = (
      tile: RegisteredTerrainRaster,
      image: HTMLImageElement,
      opacity: number,
    ) => {
      const left = Math.round(
        (
          tile.worldBounds.origin[0] - camera.origin[0]
        ) / camera.span[0] * width,
      );
      const top = Math.round(
        (
          tile.worldBounds.origin[1] - camera.origin[1]
        ) / camera.span[1] * height,
      );
      const right = Math.round(
        (
          tile.worldBounds.origin[0]
          + tile.worldBounds.span[0]
          - camera.origin[0]
        ) / camera.span[0] * width,
      );
      const bottom = Math.round(
        (
          tile.worldBounds.origin[1]
          + tile.worldBounds.span[1]
          - camera.origin[1]
        ) / camera.span[1] * height,
      );
      context.globalAlpha = opacity;
      context.drawImage(
        image,
        left,
        top,
        right - left,
        bottom - top,
      );
    };

    const now = performance.now();
    let needsPresentationFrame = false;
    const detailPlate = detailPlateRef.current;
    const detailReady = (
      detailState.shouldLoadTerritoryAssets
      && detailPlate
      && detailPlateDecodedRef.current
    );
    const detailSourceOpacity = detailReady
      && detailPlateDecodedAtRef.current !== null
      ? resolveLodSourceOpacity(detailPlateDecodedAtRef.current, now)
      : 0;
    const detailPresentationOpacity =
      detailOpacity * detailSourceOpacity;
    if (
      detailReady
      && detailOpacity > LOD_PRESENTATION_EPSILON
      && detailSourceOpacity < 1 - LOD_PRESENTATION_EPSILON
    ) {
      needsPresentationFrame = true;
    }
    if (!detailReady || detailPresentationOpacity < 0.999) {
      drawPlate(worldPlate, 1);
    }
    if (
      detailReady
      && detailPresentationOpacity > LOD_PRESENTATION_EPSILON
    ) {
      drawPlate(detailPlate, detailPresentationOpacity);
    }
    const visibleStreamTiles = suppressDetailedStreaming
      ? []
      : TERRAIN_STREAM_TILES.filter((tile) =>
        terrainTileIntersectsCamera(tile, camera)
      );
    const visibleSiteTiles = suppressDetailedStreaming
      ? []
      : TERRAIN_SITE_TILES.filter((tile) =>
        terrainTileIntersectsCamera(tile, camera)
      );
    const streamVisibility = visibleStreamTiles.length > 0
      ? resolveRegisteredRasterVisibility(
        visibleStreamTiles[0],
        detailState,
      )
      : 0;
    const siteVisibility = visibleSiteTiles.length > 0
      ? resolveRegisteredRasterVisibility(
        visibleSiteTiles[0],
        detailState,
      )
      : detailState.capitalToSite;
    const visibleCapitalKeys = visibleStreamTiles.map((tile) =>
      streamImageKey(tile.id, "capital")
    );
    const visibleSiteKeys = [
      ...visibleStreamTiles.map((tile) =>
        streamImageKey(tile.id, "site")
      ),
      ...visibleSiteTiles.map((tile) =>
        streamImageKey(tile.id, "site")
      ),
    ];
    const capitalCohortReady = isLodCohortReady(
      visibleCapitalKeys,
      decodedStreamKeysRef.current,
    );
    const siteCohortReady = isLodCohortReady(
      visibleSiteKeys,
      decodedStreamKeysRef.current,
    );
    capitalCohortRef.current = resolveLodCohortTransition(
      visibleCapitalKeys,
      decodedStreamKeysRef.current,
      capitalCohortRef.current,
      now,
    );
    siteCohortRef.current = resolveLodCohortTransition(
      visibleSiteKeys,
      decodedStreamKeysRef.current,
      siteCohortRef.current,
      now,
    );
    const currentCapitalCohortReady = isCurrentLodCohort(
      visibleCapitalKeys,
      capitalCohortRef.current,
    );
    const hasCapitalCohort =
      capitalCohortRef.current.incoming.keys.length > 0;
    const hasSiteCohort =
      siteCohortRef.current.incoming.keys.length > 0;
    const currentCapitalOpacity = capitalPresentationRef.current.value;
    const currentSiteOpacity = sitePresentationRef.current.value;
    const baseReplacementReady = (
      worldPlateDecodedRef.current
      && (
        !detailState.shouldLoadTerritoryAssets
        || Boolean(detailReady)
      )
    );
    const crossfadeTargets = resolveLodCrossfadeTargets({
      currentLowerOpacity: currentCapitalOpacity,
      currentUpperOpacity: currentSiteOpacity,
      lowerReady: (
        capitalCohortReady
        || hasCapitalCohort
        || (
          !detailState.shouldLoadCapitalAssets
          && baseReplacementReady
        )
      ),
      lowerVisibility: streamVisibility,
      upperReady: siteCohortReady || hasSiteCohort,
      upperVisibility: siteVisibility,
    });
    let capitalTarget = crossfadeTargets.lower;
    let siteTarget = crossfadeTargets.upper;
    const recoveringTerritory = (
      !detailState.shouldLoadCapitalAssets
      && !baseReplacementReady
      && (
        detailPlateRetired
        || currentCapitalOpacity > LOD_PRESENTATION_EPSILON
        || currentSiteOpacity > LOD_PRESENTATION_EPSILON
      )
    );
    if (recoveringTerritory && capitalCohortReady) {
      capitalTarget = 1;
      siteTarget = 0;
    }
    const capitalWasResident =
      capitalPresentationRef.current.value > LOD_PRESENTATION_EPSILON;
    const siteWasResident =
      sitePresentationRef.current.value > LOD_PRESENTATION_EPSILON;
    capitalPresentationRef.current = advanceLodPresentationFade(
      capitalPresentationRef.current,
      capitalTarget,
      now,
    );
    sitePresentationRef.current = advanceLodPresentationFade(
      sitePresentationRef.current,
      siteTarget,
      now,
    );
    const capitalOpacity = capitalPresentationRef.current.value;
    const siteOpacity = sitePresentationRef.current.value;
    const capitalCohortSourceOpacity = currentCapitalCohortReady
      && visibleCapitalKeys.length > 0
      ? Math.min(
        ...visibleCapitalKeys.map((key) =>
          resolveLodCohortKeyOpacity(
            capitalCohortRef.current,
            key,
            now,
          )
        ),
      )
      : 0;
    const capitalIsResident =
      capitalOpacity > LOD_PRESENTATION_EPSILON;
    const siteIsResident =
      siteOpacity > LOD_PRESENTATION_EPSILON;
    if (
      capitalWasResident !== capitalIsResident
      || siteWasResident !== siteIsResident
    ) {
      setPresentationRevision((revision) => revision + 1);
    }
    if (
      !detailPlateRetired
      && detailState.shouldLoadSiteAssets
      && capitalOpacity >= 1 - LOD_PRESENTATION_EPSILON
      && capitalCohortSourceOpacity >= 1 - LOD_PRESENTATION_EPSILON
    ) {
      setDetailPlateRetired(true);
    }
    needsPresentationFrame = needsPresentationFrame || (
      Math.abs(capitalOpacity - capitalTarget)
        > LOD_PRESENTATION_EPSILON
      || Math.abs(siteOpacity - siteTarget)
        > LOD_PRESENTATION_EPSILON
    );
    const drawStreamTier = (
      tier: TerrainStreamSourceTier,
      tierOpacity: number,
    ) => {
      if (tierOpacity <= LOD_PRESENTATION_EPSILON) {
        return;
      }
      const cohort = tier === "capital"
        ? capitalCohortRef.current
        : siteCohortRef.current;
      if (
        cohort.incoming.keys.length > 0
        && resolveLodSourceOpacity(cohort.promotedAt, now)
          < 1 - LOD_PRESENTATION_EPSILON
      ) {
        needsPresentationFrame = true;
      }
      for (const tile of visibleStreamTiles) {
        const key = streamImageKey(tile.id, tier);
        const image = streamTileRefs.current.get(key);
        if (
          !image
          || !decodedStreamKeysRef.current.has(key)
        ) {
          continue;
        }
        const sourceOpacity = resolveLodCohortKeyOpacity(
          cohort,
          key,
          now,
        );
        if (sourceOpacity <= LOD_PRESENTATION_EPSILON) {
          continue;
        }
        drawRegisteredTile(tile, image, tierOpacity * sourceOpacity);
      }
    };
    const movingCapitalOpacity = cameraSettled
      ? capitalOpacity
      : Math.max(capitalOpacity, Math.min(1, siteOpacity));
    drawStreamTier("capital", movingCapitalOpacity);
    if (cameraSettled) {
      drawStreamTier("site", siteOpacity);
    }
    canvas.dataset.streamResolutionTier = siteOpacity > 0.5
      ? "site"
      : "capital";
    canvas.dataset.streamCapitalTransition = capitalOpacity.toFixed(3);
    canvas.dataset.streamSiteTransition = siteOpacity.toFixed(3);
    canvas.dataset.streamCapitalCohortReady = String(capitalCohortReady);
    canvas.dataset.streamSiteCohortReady = String(siteCohortReady);
    canvas.dataset.cameraSettled = String(cameraSettled);
    canvas.dataset.activeDevicePixelRatio = pixelRatio.toFixed(3);
    canvas.dataset.streamResidentPixelCount = String(
      [...decodedStreamKeysRef.current].reduce((total, key) => {
        const image = streamTileRefs.current.get(key);
        return total + (
          image ? image.naturalWidth * image.naturalHeight : 0
        );
      }, 0),
    );
    publishStreamMetrics();

    for (const tile of cameraSettled ? visibleSiteTiles : []) {
      if (siteOpacity <= LOD_PRESENTATION_EPSILON) {
        continue;
      }

      const key = streamImageKey(tile.id, "site");
      const image = streamTileRefs.current.get(key);
      if (
        !image
        || !decodedStreamKeysRef.current.has(key)
      ) {
        continue;
      }
      const sourceOpacity = resolveLodCohortKeyOpacity(
        siteCohortRef.current,
        key,
        now,
      );
      if (sourceOpacity <= LOD_PRESENTATION_EPSILON) {
        continue;
      }
      drawRegisteredTile(tile, image, siteOpacity * sourceOpacity);
    }
    const inlandTerrainEraseMask = inlandTerrainEraseMaskRef.current;
    if (
      inlandTerrainEraseMask
      && inlandTerrainEraseMaskDecodedRef.current
    ) {
      context.save();
      context.globalCompositeOperation = "destination-out";
      drawRegisteredTile(
        NINJAONE_INLAND_TERRAIN_ERASE_MASK,
        inlandTerrainEraseMask,
        1,
      );
      context.restore();
    }
    context.globalAlpha = 1;
    if (needsPresentationFrame) {
      queueRender();
    }
  }, [
    camera,
    cameraSettled,
    detailOpacity,
    detailPlateRetired,
    detailState,
    publishStreamMetrics,
    queueRender,
    suppressDetailedStreaming,
  ]);

  useEffect(() => {
    const streamTileImages = streamTileRefs.current;
    const activeStreamKeys = activeStreamKeysRef.current;
    const decodedStreamKeys = decodedStreamKeysRef.current;
    const streamFailures = streamFailuresRef.current;
    const streamRequestTimeouts = streamRequestTimeoutsRef.current;
    let cancelled = false;
    let worldPlate: HTMLImageElement | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let requestTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const clearWorldRequestTimer = () => {
      if (requestTimer) {
        clearTimeout(requestTimer);
        requestTimer = null;
      }
    };
    const loadWorldPlate = () => {
      if (cancelled) {
        return;
      }
      const image = new Image();
      image.decoding = "async";
      worldPlate = image;
      worldPlateRef.current = image;
      worldPlateDecodedRef.current = false;
      const failWorldPlate = () => {
        if (cancelled || worldPlateRef.current !== image) {
          return;
        }
        clearWorldRequestTimer();
        worldPlateDecodedRef.current = false;
        releaseImage(image);
        worldPlateRef.current = null;
        attempts += 1;
        const retryDelay = Math.min(
          TERRAIN_STREAM_POLICY.retryMaximumDelayMs,
          TERRAIN_STREAM_POLICY.retryBaseDelayMs
            * 2 ** Math.min(attempts - 1, 8),
        );
        retryTimer = setTimeout(loadWorldPlate, retryDelay);
      };
      image.onload = () => {
        void image.decode().then(() => {
          if (cancelled || worldPlateRef.current !== image) {
            return;
          }
          clearWorldRequestTimer();
          attempts = 0;
          worldPlateDecodedRef.current = true;
          setViewportRevision((revision) => revision + 1);
          queueRender();
        }, failWorldPlate);
      };
      image.onerror = failWorldPlate;
      requestTimer = setTimeout(
        failWorldPlate,
        TERRAIN_STREAM_POLICY.requestTimeoutMs,
      );
      image.src = LAND_ASSETS.plate;
    };
    loadWorldPlate();

    return () => {
      cancelled = true;
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current);
      }
      clearWorldRequestTimer();
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      if (streamRetryTimerRef.current) {
        clearTimeout(streamRetryTimerRef.current);
        streamRetryTimerRef.current = null;
      }
      for (const timeout of streamRequestTimeouts.values()) {
        clearTimeout(timeout);
      }
      streamRequestTimeouts.clear();
      releaseImage(worldPlate ?? undefined);
      worldPlateRef.current = null;
      worldPlateDecodedRef.current = false;
      if (detailPlateRef.current) {
        releaseImage(detailPlateRef.current);
      }
      detailPlateDecodedRef.current = false;
      for (const image of streamTileImages.values()) {
        releaseImage(image);
      }
      streamTileImages.clear();
      activeStreamKeys.clear();
      decodedStreamKeys.clear();
      capitalCohortRef.current = EMPTY_LOD_COHORT_TRANSITION;
      siteCohortRef.current = EMPTY_LOD_COHORT_TRANSITION;
      streamFailures.clear();
      streamRequestQueueRef.current = [];
      retainedStreamKeysRef.current.clear();
      visibleStreamKeysRef.current.clear();
      capitalPresentationRef.current = {
        value: 0,
        target: 0,
        lastUpdatedAt: 0,
      };
      sitePresentationRef.current = {
        value: 0,
        target: 0,
        lastUpdatedAt: 0,
      };
    };
  }, [queueRender]);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    inlandTerrainEraseMaskRef.current = image;
    inlandTerrainEraseMaskDecodedRef.current = false;
    const fail = () => {
      if (cancelled || inlandTerrainEraseMaskRef.current !== image) {
        return;
      }
      inlandTerrainEraseMaskDecodedRef.current = false;
      releaseImage(image);
      inlandTerrainEraseMaskRef.current = null;
    };
    image.onload = () => {
      void image.decode().then(() => {
        if (cancelled || inlandTerrainEraseMaskRef.current !== image) {
          return;
        }
        inlandTerrainEraseMaskDecodedRef.current = true;
        setViewportRevision((revision) => revision + 1);
        queueRender();
      }, fail);
    };
    image.onerror = fail;
    image.src = NINJAONE_INLAND_TERRAIN_ERASE_MASK.path;
    return () => {
      cancelled = true;
      releaseImage(image);
      if (inlandTerrainEraseMaskRef.current === image) {
        inlandTerrainEraseMaskRef.current = null;
        inlandTerrainEraseMaskDecodedRef.current = false;
      }
    };
  }, [queueRender]);

  useEffect(() => {
    if (
      !detailState.shouldLoadTerritoryAssets
      || detailPlateRetired
    ) {
      return;
    }

    let cancelled = false;
    let detailPlate: HTMLImageElement | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let requestTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const clearDetailRequestTimer = () => {
      if (requestTimer) {
        clearTimeout(requestTimer);
        requestTimer = null;
      }
    };
    const loadDetailPlate = () => {
      if (cancelled) {
        return;
      }
      const image = new Image();
      image.decoding = "async";
      detailPlate = image;
      detailPlateRef.current = image;
      detailPlateDecodedRef.current = false;
      const failDetailPlate = () => {
        if (cancelled || detailPlateRef.current !== image) {
          return;
        }
        clearDetailRequestTimer();
        detailPlateDecodedRef.current = false;
        releaseImage(image);
        detailPlateRef.current = null;
        attempts += 1;
        const retryDelay = Math.min(
          TERRAIN_STREAM_POLICY.retryMaximumDelayMs,
          TERRAIN_STREAM_POLICY.retryBaseDelayMs
            * 2 ** Math.min(attempts - 1, 8),
        );
        retryTimer = setTimeout(loadDetailPlate, retryDelay);
      };
      image.onload = () => {
        void image.decode().then(() => {
          if (cancelled || detailPlateRef.current !== image) {
            return;
          }
          clearDetailRequestTimer();
          attempts = 0;
          detailPlateDecodedRef.current = true;
          detailPlateDecodedAtRef.current = performance.now();
          setViewportRevision((revision) => revision + 1);
          queueRender();
        }, failDetailPlate);
      };
      image.onerror = failDetailPlate;
      requestTimer = setTimeout(
        failDetailPlate,
        TERRAIN_STREAM_POLICY.requestTimeoutMs,
      );
      image.src = LAND_ASSETS.detailPlate;
    };
    loadDetailPlate();

    return () => {
      cancelled = true;
      clearDetailRequestTimer();
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      releaseImage(detailPlate ?? undefined);
      if (detailPlateRef.current === detailPlate) {
        detailPlateRef.current = null;
        detailPlateDecodedRef.current = false;
        detailPlateDecodedAtRef.current = null;
      }
    };
  }, [
    detailPlateRetired,
    detailState.shouldLoadTerritoryAssets,
    queueRender,
  ]);

  useEffect(() => {
    if (
      !detailPlateRetired
      || detailState.shouldLoadSiteAssets
    ) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setDetailPlateRetired(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [
    detailPlateRetired,
    detailState.shouldLoadSiteAssets,
  ]);

  useEffect(() => {
    const reverseNeedsCapital = (
      detailPlateRetired
      && !detailState.shouldLoadSiteAssets
      && sitePresentationRef.current.value > LOD_PRESENTATION_EPSILON
    );
    const retainCapitalPresentation = (
      reverseNeedsCapital
      || shouldRetainLodSource(
        detailState.shouldLoadCapitalAssets,
        capitalPresentationRef.current.value,
      )
    );
    const retainSitePresentation = (
      detailPlateRetired
      && shouldRetainLodSource(
        detailState.shouldLoadSiteAssets,
        sitePresentationRef.current.value,
      )
    );
    const needsCapitalFallback = (
      !retainSitePresentation
      || detailState.capitalToSite < 1 - LOD_PRESENTATION_EPSILON
      || capitalPresentationRef.current.value
        > LOD_PRESENTATION_EPSILON
    );
    const requestedTiers: readonly TerrainStreamSourceTier[] =
      suppressDetailedStreaming
        ? []
        : [
          ...(retainCapitalPresentation && needsCapitalFallback
            ? ["capital" as const]
            : []),
          ...(retainSitePresentation ? ["site" as const] : []),
        ];
    const presentationRetainedKeys = suppressDetailedStreaming
      ? []
      : resolveRetainedLodPresentationKeys([
          {
            transition: capitalCohortRef.current,
            value: capitalPresentationRef.current.value,
          },
          {
            transition: siteCohortRef.current,
            value: sitePresentationRef.current.value,
          },
        ], decodedStreamKeysRef.current);
    const viewportPixels = canvasViewportPixels(canvasRef.current);
    const canvas = canvasRef.current;
    const fixedDecodedBytes =
      (worldPlateDecodedRef.current
        ? LAND_PLATE_DECODED_BYTES.world
        : 0)
      + (detailPlateDecodedRef.current
        ? LAND_PLATE_DECODED_BYTES.territory
        : 0)
      + expectedCanvasDecodedBytes(canvas, detailState.renderScale);
    const maximumDynamicDecodedBytes = Math.max(
      0,
      Math.min(
        TERRAIN_STREAM_POLICY.maximumResidentDecodedBytes,
        TERRAIN_STREAM_POLICY.maximumLandLayerDecodedBytes
          - fixedDecodedBytes,
      ),
    );
    const residencyPolicy = {
      ...TERRAIN_STREAM_POLICY,
      maximumResidentDecodedBytes: maximumDynamicDecodedBytes,
    };
    const residencyTiles: readonly TerrainResidencyTile[] = [
      ...TERRAIN_STREAM_TILES,
      ...TERRAIN_SITE_RESIDENCY_TILES,
    ];
    const fallbackTier: readonly TerrainStreamSourceTier[] =
      sitePresentationRef.current.value
        > capitalPresentationRef.current.value
        ? ["site"]
        : ["capital"];
    const requestedTierCandidates:
      readonly (readonly TerrainStreamSourceTier[])[] =
      requestedTiers.length === 0
        ? []
        : requestedTiers.length > 1
          ? [requestedTiers, fallbackTier]
          : [requestedTiers];
    const admission = planTerrainResidencyWithTierFallback({
      camera,
      pinnedSourceKeys: new Set(presentationRetainedKeys),
      policy: residencyPolicy,
      requestedTierCandidates,
      residentSourceKeys: decodedStreamKeysRef.current,
      tiles: residencyTiles,
      viewportPixels,
    });
    const plan = admission.plan;
    const admittedTiers = admission.requestedTiers;
    const sourceRequestsFor = (
      tiles: readonly TerrainResidencyTile[],
    ): StreamSourceRequest[] => admittedTiers.flatMap((tier) =>
      tiles.flatMap((tile) => {
        const source = tile.sources[tier];
        return source
          ? [{
            key: streamImageKey(tile.id, tier),
            path: source.path,
            tier,
            tileId: tile.id,
          }]
          : [];
      })
    );
    const sourceKeysFor = (
      tiles: readonly TerrainResidencyTile[],
    ): string[] => sourceRequestsFor(tiles).map(({ key }) => key);
    const retainedKeys = new Set([
      ...sourceKeysFor(plan.retainedTiles),
      ...presentationRetainedKeys,
    ]);
    const visibleRequests = sourceRequestsFor(plan.visibleTiles);
    const visibleKeys = new Set(visibleRequests.map(({ key }) => key));
    const visibleTileIds = new Set(plan.visibleTiles.map(({ id }) => id));
    const prefetchRequests = sourceRequestsFor(
      plan.requestedTiles.filter(({ id }) => !visibleTileIds.has(id)),
    );
    const missingVisibleSource = visibleRequests.some(({ key }) =>
      !decodedStreamKeysRef.current.has(key)
    );
    retainedStreamKeysRef.current = retainedKeys;
    visibleStreamKeysRef.current = visibleKeys;

    for (const key of [...activeStreamKeysRef.current]) {
      if (
        retainedKeys.has(key)
        && (!missingVisibleSource || visibleKeys.has(key))
      ) {
        continue;
      }
      cancelStreamSource(key);
    }

    for (const key of streamTileRefs.current.keys()) {
      if (retainedKeys.has(key)) {
        continue;
      }
      cancelStreamSource(key);
      streamFailuresRef.current.delete(key);
    }
    for (const key of streamFailuresRef.current.keys()) {
      if (!retainedKeys.has(key)) {
        streamFailuresRef.current.delete(key);
      }
    }

    streamRequestQueueRef.current = [
      ...visibleRequests,
      ...prefetchRequests,
    ];
    pumpStreamQueueRef.current();

    streamEstimatedDecodedBytesRef.current =
      plan.estimatedResidentDecodedBytes;
    streamResidentTileCountRef.current = new Set(
      [...retainedKeys].map((key) => key.slice(key.indexOf(":") + 1)),
    ).size;
    streamVisibleOverBudgetRef.current = (
      plan.visibleOverBudget
      || admittedTiers.length !== requestedTiers.length
    );
    publishStreamMetrics();
  }, [
    camera,
    cancelStreamSource,
    detailPlateRetired,
    detailState.capitalToSite,
    detailState.shouldLoadCapitalAssets,
    detailState.shouldLoadSiteAssets,
    detailState.renderScale,
    presentationRevision,
    publishStreamMetrics,
    suppressDetailedStreaming,
    viewportRevision,
  ]);

  useLayoutEffect(() => {
    renderRef.current = render;
    render();
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      if (resizeFrame) {
        return;
      }
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        setViewportRevision((revision) => revision + 1);
        queueRender();
      });
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      if (resizeFrame) {
        cancelAnimationFrame(resizeFrame);
      }
    };
  }, [queueRender]);

  return (
    <canvas
      aria-hidden="true"
      className={
        "career-world__layer "
        + "career-world__land-layer "
        + "career-world__land-canvas"
      }
      data-authority-layer="L2"
      data-layer="terrain"
      data-camera-settled={cameraSettled}
      data-capital-lod={detailState.territoryToCapital.toFixed(3)}
      data-capital-site-tile-count={
        TERRAIN_SITE_TILES.length
      }
      data-lod-tier={detailState.tier.id}
      data-site-lod={detailState.capitalToSite.toFixed(3)}
      data-stream-tile-count={TERRAIN_STREAM_TILES.length}
      data-stream-suppressed={suppressDetailedStreaming}
      data-render-scale={detailState.renderScale.toFixed(3)}
      data-site-tile-count={TERRAIN_SITE_TILES.length}
      data-stream-transition-ms={LOD_PRESENTATION_TRANSITION_MS}
      data-territory-lod={detailOpacity.toFixed(3)}
      ref={canvasRef}
    />
  );
}
