import type { CameraView } from "../../../shared/camera";
import { DETAIL_POLICY, DETAIL_TIER_DEPTH, type DetailState } from "../../../shared/lod";
import { loadImage } from "../../../shared/water/webgl";
import { NINJAONE_INLAND_TERRAIN_ERASE_MASK } from "../authority";
import {
  NINJAONE_INLAND_LOCAL_ARTBOARD,
  NINJAONE_INLAND_WATER_MASK_LOCAL_CROP,
} from "../geometry";
import {
  NINJAONE_INLAND_HABITAT_ASSETS,
  NINJAONE_INLAND_HABITAT_PLACEMENTS,
  type InlandHabitatAssetId,
  type InlandHabitatPlacement,
} from "./model";

interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

type HabitatImageMap = ReadonlyMap<InlandHabitatAssetId, HTMLImageElement>;

const HABITAT_ASSET_IDS = Object.freeze(
  Object.keys(NINJAONE_INLAND_HABITAT_ASSETS) as InlandHabitatAssetId[],
);

// The source sprites intentionally retain transparent breathing room for rotation.
// LOD caps describe the authored prop silhouette, not that padded source canvas.
const HABITAT_VISIBLE_WIDTH_FRACTION: Readonly<Record<InlandHabitatAssetId, number>> =
  Object.freeze({
    "bank-reed-tuft": 0.60,
    "submerged-grass-clump": 0.66,
    "submerged-woody-cover": 0.64,
  });

const HABITAT_SCREEN_CAP_GAIN: Readonly<Record<InlandHabitatAssetId, number>> =
  Object.freeze({
    "bank-reed-tuft": 1.28,
    "submerged-grass-clump": 1.28,
    "submerged-woody-cover": 1.40,
  });

const HABITAT_ALPHA_GAIN: Readonly<Record<InlandHabitatAssetId, number>> =
  Object.freeze({
    "bank-reed-tuft": 1.26,
    "submerged-grass-clump": 1.12,
    "submerged-woody-cover": 1.18,
  });

function isBankContactAsset(assetId: InlandHabitatAssetId): boolean {
  return assetId === "bank-reed-tuft";
}

export class NinjaOneInlandHabitatRenderer {
  static async create(canvas: HTMLCanvasElement): Promise<NinjaOneInlandHabitatRenderer> {
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Canvas 2D is unavailable for inland habitat.");

    const [waterMask, ...assetImages] = await Promise.all([
      loadImage(NINJAONE_INLAND_TERRAIN_ERASE_MASK.path),
      ...HABITAT_ASSET_IDS.map((id) => (
        loadImage(NINJAONE_INLAND_HABITAT_ASSETS[id].path)
      )),
    ]);
    const [maskWidth, maskHeight] = NINJAONE_INLAND_TERRAIN_ERASE_MASK.dimensions;
    if (waterMask.naturalWidth !== maskWidth || waterMask.naturalHeight !== maskHeight) {
      throw new Error("Inland habitat water-mask dimensions do not match authority.");
    }

    const assets = new Map<InlandHabitatAssetId, HTMLImageElement>();
    HABITAT_ASSET_IDS.forEach((id, index) => {
      const expected = NINJAONE_INLAND_HABITAT_ASSETS[id].dimensions;
      const image = assetImages[index];
      if (image.naturalWidth !== expected[0] || image.naturalHeight !== expected[1]) {
        throw new Error(
          `${id} dimensions ${image.naturalWidth}x${image.naturalHeight}`
            + ` do not match ${expected.join("x")}.`,
        );
      }
      assets.set(id, image);
    });
    return new NinjaOneInlandHabitatRenderer(canvas, context, waterMask, assets);
  }

  readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly waterMask: HTMLImageElement;
  private readonly assets: HabitatImageMap;
  private camera: CameraView = { origin: [0, 0], span: [1, 1] };
  private detailState: DetailState | null = null;
  private pixelRatio = 1;
  private renderScale = 1;
  private resizePending = true;

  private constructor(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    waterMask: HTMLImageElement,
    assets: HabitatImageMap,
  ) {
    this.canvas = canvas;
    this.context = context;
    this.waterMask = waterMask;
    this.assets = assets;
  }

  setView(camera: CameraView, detailState: DetailState): void {
    this.camera = camera;
    this.detailState = detailState;
    if (this.renderScale !== detailState.renderScale) {
      this.renderScale = detailState.renderScale;
      this.resizePending = true;
    }
    this.render();
  }

  requestResize(): void {
    this.resizePending = true;
  }

  render(): void {
    const detailState = this.detailState;
    if (!detailState) return;
    if (this.resizePending) {
      this.resize();
      this.resizePending = false;
    }

    const context = this.context;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (detailState.territoryToCapital < 0.55) {
      this.publishStats(0, 0);
      return;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const admittedPlacements = NINJAONE_INLAND_HABITAT_PLACEMENTS.filter(
      (placement) => DETAIL_TIER_DEPTH[detailState.tier.id]
        >= DETAIL_TIER_DEPTH[placement.minimumTier],
    );
    const bedPlacements = admittedPlacements.filter(
      (placement) => !isBankContactAsset(placement.assetId),
    );
    const bankPlacements = admittedPlacements.filter(
      (placement) => isBankContactAsset(placement.assetId),
    );
    let visibleCount = 0;
    for (const placement of bedPlacements) {
      if (this.drawPlacement(placement, false)) visibleCount += 1;
    }

    this.applyWaterColumnTint();
    this.clipToWaterMask();
    for (const placement of bankPlacements) {
      if (this.drawPlacement(placement, true)) visibleCount += 1;
    }
    this.publishStats(admittedPlacements.length, visibleCount);
  }

  destroy(): void {
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawPlacement(
    placement: InlandHabitatPlacement,
    bankContact: boolean,
  ): boolean {
    const image = this.assets.get(placement.assetId);
    if (!image) return false;
    const point = this.localToCanvas(placement.localPosition);
    const localScale = this.localPixelScale();
    const distanceLodScale = 0.58
      + (this.detailState?.capitalToSite ?? 0) * 0.25
      + (this.detailState?.siteToClose ?? 0) * 0.17;
    const visibleWidthFraction = HABITAT_VISIBLE_WIDTH_FRACTION[placement.assetId];
    const screenCapGain = HABITAT_SCREEN_CAP_GAIN[placement.assetId];
    const cappedScale = Math.min(
      localScale,
      placement.screenWidthCapPx * distanceLodScale * screenCapGain
        * this.pixelRatio / (placement.widthPx * visibleWidthFraction),
    );
    const width = placement.widthPx * cappedScale;
    const height = width * image.naturalHeight / image.naturalWidth;
    const radius = Math.hypot(width, height) * 0.5;
    if (
      point.x < -radius
      || point.y < -radius
      || point.x > this.canvas.width + radius
      || point.y > this.canvas.height + radius
    ) {
      return false;
    }

    const waterColumn = 1 - placement.depthFraction;
    const context = this.context;
    context.save();
    context.translate(point.x, point.y);
    context.rotate(placement.angle);
    context.scale(placement.mirrorX ? -1 : 1, 1);

    const isFoliage = placement.assetId === "bank-reed-tuft"
      || placement.assetId === "submerged-grass-clump";
    context.save();
    context.translate(
      waterColumn * 1.4 * this.pixelRatio,
      waterColumn * 2.1 * this.pixelRatio,
    );
    context.globalAlpha = isFoliage
      ? 0.055 + placement.depthFraction * 0.045
      : 0.075 + placement.depthFraction * 0.075;
    context.filter = `brightness(0) saturate(0) blur(${(
      0.65 + waterColumn * 1.35
    ) * this.pixelRatio}px)`;
    context.drawImage(image, -width * 0.5, -height * 0.5, width, height);
    context.restore();

    context.globalAlpha = Math.min(
      bankContact ? 0.94 : 0.78,
      placement.opacity * HABITAT_ALPHA_GAIN[placement.assetId]
        * (0.94 + waterColumn * 0.06),
    );
    const saturation = bankContact
      ? 0.88 + waterColumn * 0.14
      : isFoliage
        ? 0.74 + waterColumn * 0.16
        : 0.66 + waterColumn * 0.14;
    const brightness = bankContact
      ? 0.91 + waterColumn * 0.08
      : isFoliage
        ? 0.86 + waterColumn * 0.09
        : 0.80 + waterColumn * 0.10;
    const contrast = bankContact ? 1.12 : 1.04;
    context.filter = `saturate(${saturation}) brightness(${brightness}) contrast(${contrast}) blur(${(
      placement.depthFraction * (bankContact ? 0.10 : 0.26)
    ) * this.pixelRatio}px)`;
    context.drawImage(image, -width * 0.5, -height * 0.5, width, height);
    context.restore();
    return true;
  }

  private applyWaterColumnTint(): void {
    const context = this.context;
    context.save();
    context.globalCompositeOperation = "source-atop";
    context.globalAlpha = 0.24;
    context.fillStyle = "rgb(12 49 61)";
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    context.restore();
  }

  private clipToWaterMask(): void {
    const [cropX, cropY, cropWidth, cropHeight] =
      NINJAONE_INLAND_WATER_MASK_LOCAL_CROP;
    const maskOrigin = this.localToCanvas([cropX, cropY]);
    const maskEnd = this.localToCanvas([cropX + cropWidth, cropY + cropHeight]);
    const context = this.context;
    context.save();
    context.globalCompositeOperation = "destination-in";
    context.globalAlpha = 1;
    context.filter = "none";
    context.drawImage(
      this.waterMask,
      maskOrigin.x,
      maskOrigin.y,
      maskEnd.x - maskOrigin.x,
      maskEnd.y - maskOrigin.y,
    );
    context.restore();
  }

  private localToCanvas(localPoint: readonly [number, number]): CanvasPoint {
    const { dimensions, regionOrigin, regionSpan } = NINJAONE_INLAND_LOCAL_ARTBOARD;
    const worldX = regionOrigin[0] + localPoint[0] / dimensions[0] * regionSpan[0];
    const worldY = regionOrigin[1] + localPoint[1] / dimensions[1] * regionSpan[1];
    return Object.freeze({
      x: (worldX - this.camera.origin[0]) / this.camera.span[0] * this.canvas.width,
      y: (worldY - this.camera.origin[1]) / this.camera.span[1] * this.canvas.height,
    });
  }

  private localPixelScale(): number {
    const { dimensions, regionSpan } = NINJAONE_INLAND_LOCAL_ARTBOARD;
    const scaleX = regionSpan[0] / dimensions[0]
      / this.camera.span[0] * this.canvas.width;
    const scaleY = regionSpan[1] / dimensions[1]
      / this.camera.span[1] * this.canvas.height;
    return (scaleX + scaleY) * 0.5;
  }

  private publishStats(residentCount: number, visibleCount: number): void {
    this.canvas.dataset.residentPropCount = String(residentCount);
    this.canvas.dataset.visiblePropCount = String(visibleCount);
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.pixelRatio = Math.min(
      (window.devicePixelRatio || 1) * this.renderScale,
      DETAIL_POLICY.renderScale.maximumAnimatedWaterDevicePixelRatio,
    );
    const width = Math.max(1, Math.round(bounds.width * this.pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * this.pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }
}
