import type { WaterRenderState } from "../../water-surface";
import type { Territory } from "../../territory-landform/model/territories";
import type { CameraView } from "../../../shared/camera";
import type { DetailState } from "../../../shared/lod";
import { TerritoryQaOverlay } from "./TerritoryQaOverlay";

interface WorldInterfaceProps {
  readonly activeViewId: string;
  readonly camera: CameraView;
  readonly detailState: DetailState;
  readonly mode: "world" | "water";
  readonly renderState: WaterRenderState;
  readonly showTopography: boolean;
  readonly showTerritoryQa: boolean;
  readonly territories: readonly Territory[];
  readonly onFocus: (id: string) => void;
  readonly onReset: () => void;
  readonly onToggleTopography: () => void;
  readonly onToggleTerritoryQa: () => void;
}

export function WorldInterface({
  activeViewId,
  camera,
  detailState,
  mode,
  renderState,
  showTopography,
  showTerritoryQa,
  territories,
  onFocus,
  onReset,
  onToggleTopography,
  onToggleTerritoryQa,
}: WorldInterfaceProps) {
  return (
    <div className="career-world__interface" data-layer="interface">
      {showTopography || showTerritoryQa ? (
        <TerritoryQaOverlay
          camera={camera}
          showTopography={showTopography}
          showTerritories={showTerritoryQa}
          territories={territories}
        />
      ) : null}
      <div className="career-world__status-panel">
        <span className="career-world__eyebrow">
          {mode === "water" ? "Water surface" : "Career World"}
        </span>
        <strong>
          {activeViewId === "world"
            ? "Full world extent"
            : activeViewId === "custom"
              ? "Free camera"
              : territories.find(({ id }) => id === activeViewId)?.label}
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

      <div
        aria-label="World view controls"
        className="career-world__controls"
        role="group"
      >
        <button
          aria-pressed={activeViewId === "world"}
          onClick={onReset}
          type="button"
        >
          World
        </button>
        {territories.map((territory) => (
          <button
            aria-pressed={activeViewId === territory.id}
            key={territory.id}
            onClick={() => onFocus(territory.id)}
            type="button"
          >
            {territory.label}
          </button>
        ))}
        <button
          aria-pressed={showTopography}
          className="career-world__qa-toggle"
          onClick={onToggleTopography}
          type="button"
        >
          Topography
        </button>
        <button
          aria-pressed={showTerritoryQa}
          className="career-world__qa-toggle"
          onClick={onToggleTerritoryQa}
          type="button"
        >
          Territory QA
        </button>
      </div>

      <p className="career-world__camera-hint">
        Wheel to zoom · drag to pan · arrow keys to move
      </p>
    </div>
  );
}
