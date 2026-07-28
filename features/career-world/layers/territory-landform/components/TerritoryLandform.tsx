import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import type { CameraView } from "../../../shared/camera";
import {
  DETAIL_POLICY,
  resolveRegisteredRasterVisibility,
  type DetailState,
} from "../../../shared/lod";
import { LAND_ASSETS } from "../model/assets";
import {
  TERRAIN_SITE_TILES,
  type TerrainSiteTile,
} from "../model/siteTiles";
import {
  TERRAIN_STREAM_POLICY,
  TERRAIN_STREAM_TILES,
  terrainTileIntersectsCamera,
  terrainTilesNearCamera,
  type TerrainStreamSourceTier,
  type TerrainStreamTile,
} from "../model/streamTiles";

interface TerritoryLandformProps {
  readonly camera: CameraView;
  readonly detailState: DetailState;
}

function shouldLoadTile(
  tile: TerrainSiteTile,
  detailState: DetailState,
): boolean {
  return (
    tile.minimumTier === "site"
    && detailState.shouldLoadSiteAssets
  );
}

function streamImageKey(
  tileId: string,
  tier: TerrainStreamSourceTier,
): string {
  return `${tier}:${tileId}`;
}

function releaseImage(image: HTMLImageElement | undefined): void {
  if (!image) {
    return;
  }
  image.onload = null;
  image.onerror = null;
  image.src = "";
}

export function TerritoryLandform({
  camera,
  detailState,
}: TerritoryLandformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldPlateRef = useRef<HTMLImageElement | null>(null);
  const detailPlateRef = useRef<HTMLImageElement | null>(null);
  const siteTileRefs = useRef(new Map<string, HTMLImageElement>());
  const streamTileRefs = useRef(new Map<string, HTMLImageElement>());
  const renderFrameRef = useRef(0);
  const renderRef = useRef<() => void>(() => undefined);
  const detailOpacity = detailState.worldToTerritory;
  const preferredStreamTier: TerrainStreamSourceTier =
    detailState.capitalToSite > 0 ? "site" : "capital";

  const queueRender = useCallback(() => {
    if (renderFrameRef.current) {
      return;
    }
    renderFrameRef.current = requestAnimationFrame(() => {
      renderFrameRef.current = 0;
      renderRef.current();
    });
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const worldPlate = worldPlateRef.current;
    if (!canvas || !worldPlate?.complete || !worldPlate.naturalWidth) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    const pixelRatio = Math.min(
      (window.devicePixelRatio || 1) * detailState.renderScale,
      DETAIL_POLICY.renderScale.maximumDevicePixelRatio,
    );
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
      tile: TerrainSiteTile | TerrainStreamTile,
      image: HTMLImageElement,
      opacity: number,
    ) => {
      const left = Math.floor(
        (
          tile.worldBounds.origin[0] - camera.origin[0]
        ) / camera.span[0] * width,
      );
      const top = Math.floor(
        (
          tile.worldBounds.origin[1] - camera.origin[1]
        ) / camera.span[1] * height,
      );
      const right = Math.ceil(
        (
          tile.worldBounds.origin[0]
          + tile.worldBounds.span[0]
          - camera.origin[0]
        ) / camera.span[0] * width,
      );
      const bottom = Math.ceil(
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

    const detailPlate = detailPlateRef.current;
    const detailReady = (
      detailState.shouldLoadTerritoryAssets
      && detailPlate?.complete
      && detailPlate.naturalWidth
    );
    if (!detailReady || detailOpacity < 0.999) {
      drawPlate(worldPlate, 1);
    }
    if (detailReady) {
      drawPlate(detailPlate, detailOpacity);
    }

    const visibleStreamTiles = TERRAIN_STREAM_TILES.filter((tile) =>
      terrainTileIntersectsCamera(tile, camera)
    );
    const streamVisibility = visibleStreamTiles.length > 0
      ? resolveRegisteredRasterVisibility(
        visibleStreamTiles[0],
        detailState,
      )
      : 0;
    const streamTierReady = (tier: TerrainStreamSourceTier) =>
      visibleStreamTiles.every((tile) => {
        const image = streamTileRefs.current.get(
          streamImageKey(tile.id, tier),
        );
        return Boolean(image?.complete && image.naturalWidth);
      });
    const resolvedStreamTier = (
      preferredStreamTier === "site"
      && !streamTierReady("site")
    )
      ? "capital"
      : preferredStreamTier;
    const streamReady = visibleStreamTiles.every((tile) => {
      const image = streamTileRefs.current.get(
        streamImageKey(tile.id, resolvedStreamTier),
      );
      return Boolean(image?.complete && image.naturalWidth);
    });
    if (streamVisibility > 0 && streamReady) {
      for (const tile of visibleStreamTiles) {
        const image = streamTileRefs.current.get(
          streamImageKey(tile.id, resolvedStreamTier),
        );
        if (image) {
          drawRegisteredTile(tile, image, streamVisibility);
        }
      }
    }
    canvas.dataset.streamResolutionTier = resolvedStreamTier;
    canvas.dataset.streamResidentPixelCount = String(
      [...streamTileRefs.current.values()].reduce(
        (total, image) =>
          total + image.naturalWidth * image.naturalHeight,
        0,
      ),
    );

    for (const tile of TERRAIN_SITE_TILES) {
      const visibility = resolveRegisteredRasterVisibility(
        tile,
        detailState,
      );
      if (
        !shouldLoadTile(tile, detailState)
        || visibility <= 0
        || !terrainTileIntersectsCamera(tile, camera)
      ) {
        continue;
      }

      const image = siteTileRefs.current.get(tile.id);
      if (!image?.complete || !image.naturalWidth) {
        continue;
      }
      drawRegisteredTile(tile, image, visibility);
    }
    context.globalAlpha = 1;
  }, [
    camera,
    detailOpacity,
    detailState,
    preferredStreamTier,
  ]);

  useEffect(() => {
    const siteTileImages = siteTileRefs.current;
    const streamTileImages = streamTileRefs.current;
    const worldPlate = new Image();
    worldPlate.decoding = "async";
    worldPlate.src = LAND_ASSETS.plate;
    worldPlate.onload = queueRender;
    worldPlateRef.current = worldPlate;

    return () => {
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current);
      }
      worldPlate.onload = null;
      if (detailPlateRef.current) {
        detailPlateRef.current.onload = null;
      }
      for (const image of siteTileImages.values()) {
        releaseImage(image);
      }
      for (const image of streamTileImages.values()) {
        releaseImage(image);
      }
    };
  }, [queueRender]);

  useEffect(() => {
    if (
      !detailState.shouldLoadTerritoryAssets
      || detailPlateRef.current
    ) {
      return;
    }

    const detailPlate = new Image();
    detailPlate.decoding = "async";
    detailPlate.src = LAND_ASSETS.detailPlate;
    detailPlate.onload = queueRender;
    detailPlateRef.current = detailPlate;
  }, [detailState.shouldLoadTerritoryAssets, queueRender]);

  useEffect(() => {
    const prefetchPadding = TERRAIN_STREAM_POLICY.prefetchPadding;
    const retentionPadding = TERRAIN_STREAM_POLICY.retentionPadding;

    for (const id of siteTileRefs.current.keys()) {
      const tile = TERRAIN_SITE_TILES.find((candidate) => candidate.id === id);
      if (
        tile
        && shouldLoadTile(tile, detailState)
        && terrainTileIntersectsCamera(tile, camera, retentionPadding)
      ) {
        continue;
      }
      releaseImage(siteTileRefs.current.get(id));
      siteTileRefs.current.delete(id);
    }

    for (const tile of TERRAIN_SITE_TILES) {
      if (
        !shouldLoadTile(tile, detailState)
        || !terrainTileIntersectsCamera(tile, camera, prefetchPadding)
        || siteTileRefs.current.has(tile.id)
      ) {
        continue;
      }
      const image = new Image();
      image.decoding = "async";
      image.src = tile.path;
      image.onload = queueRender;
      siteTileRefs.current.set(tile.id, image);
    }
    if (canvasRef.current) {
      canvasRef.current.dataset.localResidentTileCount = String(
        siteTileRefs.current.size,
      );
    }
    queueRender();
  }, [camera, detailState, queueRender]);

  useEffect(() => {
    const requestedTiles = detailState.shouldLoadCapitalAssets
      ? terrainTilesNearCamera(
        camera,
        TERRAIN_STREAM_POLICY.prefetchPadding,
      )
      : [];
    const retentionTiles = detailState.shouldLoadCapitalAssets
      ? terrainTilesNearCamera(
        camera,
        TERRAIN_STREAM_POLICY.retentionPadding,
      )
      : [];
    const retainedIds = new Set<string>();
    for (const tile of [...requestedTiles, ...retentionTiles]) {
      if (
        retainedIds.size
        >= TERRAIN_STREAM_POLICY.maximumResidentTiles
      ) {
        break;
      }
      retainedIds.add(tile.id);
    }

    const retainedKeys = new Set<string>();
    for (const id of retainedIds) {
      retainedKeys.add(streamImageKey(id, "capital"));
      if (detailState.shouldLoadSiteAssets) {
        retainedKeys.add(streamImageKey(id, "site"));
      }
    }

    for (const [key, image] of streamTileRefs.current) {
      if (retainedKeys.has(key)) {
        continue;
      }
      releaseImage(image);
      streamTileRefs.current.delete(key);
    }

    const requestedTiers: TerrainStreamSourceTier[] = ["capital"];
    if (detailState.shouldLoadSiteAssets) {
      requestedTiers.push("site");
    }

    for (const tile of requestedTiles) {
      for (const tier of requestedTiers) {
        const key = streamImageKey(tile.id, tier);
        if (streamTileRefs.current.has(key)) {
          continue;
        }
        const image = new Image();
        image.decoding = "async";
        image.src = tile.sources[tier].path;
        image.onload = queueRender;
        image.onerror = () => {
          if (streamTileRefs.current.get(key) !== image) {
            return;
          }
          releaseImage(image);
          streamTileRefs.current.delete(key);
          queueRender();
        };
        streamTileRefs.current.set(key, image);
      }
    }
    if (canvasRef.current) {
      canvasRef.current.dataset.streamResidentTileCount = String(
        retainedIds.size,
      );
      canvasRef.current.dataset.streamResidentSourceCount = String(
        streamTileRefs.current.size,
      );
    }
    queueRender();
  }, [
    camera,
    detailState.shouldLoadCapitalAssets,
    detailState.shouldLoadSiteAssets,
    queueRender,
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
    const observer = new ResizeObserver(queueRender);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [queueRender]);

  return (
    <canvas
      aria-hidden="true"
      className={
        "career-world__layer "
        + "career-world__land-layer "
        + "career-world__land-canvas"
      }
      data-layer="territory-landform"
      data-capital-lod={detailState.territoryToCapital.toFixed(3)}
      data-capital-site-tile-count={
        TERRAIN_SITE_TILES.length
      }
      data-lod-tier={detailState.tier.id}
      data-site-lod={detailState.capitalToSite.toFixed(3)}
      data-stream-tile-count={TERRAIN_STREAM_TILES.length}
      data-render-scale={detailState.renderScale.toFixed(3)}
      data-site-tile-count={TERRAIN_SITE_TILES.length}
      data-territory-lod={detailOpacity.toFixed(3)}
      ref={canvasRef}
    />
  );
}
