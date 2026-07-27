import { useSyncExternalStore } from "react";
import type { WaterRenderState } from "../../water-surface";
import type { Territory } from "../../territory-landform/model/territories";
import type { DetailState } from "../../../shared/lod";
interface WorldInterfaceProps {
  readonly activeViewId: string;
  readonly detailState: DetailState;
  readonly enableDevelopmentTools: boolean;
  readonly mode: "world" | "water";
  readonly renderState: WaterRenderState;
  readonly showGrid: boolean;
  readonly showTopography: boolean;
  readonly showTerritoryQa: boolean;
  readonly territories: readonly Territory[];
  readonly onFocus: (id: string) => void;
  readonly onReset: () => void;
  readonly onToggleGrid: () => void;
  readonly onToggleTopography: () => void;
  readonly onToggleTerritoryQa: () => void;
}

const subscribeToHydration = () => () => {};

export function WorldInterface({
  activeViewId,
  detailState,
  enableDevelopmentTools,
  mode,
  renderState,
  showGrid,
  showTopography,
  showTerritoryQa,
  territories,
  onFocus,
  onReset,
  onToggleGrid,
  onToggleTopography,
  onToggleTerritoryQa,
}: WorldInterfaceProps) {
  const isInteractive = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  return (
    <div className="career-world__interface" data-layer="interface">
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
