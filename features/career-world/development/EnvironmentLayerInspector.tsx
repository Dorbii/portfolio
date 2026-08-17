import {
  ENVIRONMENT_LAYER_DEFINITIONS,
  isEnvironmentLayerEffectivelyVisible,
  type EnvironmentLayerId,
  type EnvironmentLayerVisibility,
} from "../shared/environmentLayers";

interface EnvironmentLayerInspectorProps {
  readonly onToggle: (id: EnvironmentLayerId) => void;
  readonly visibility: EnvironmentLayerVisibility;
}

export function EnvironmentLayerInspector({
  onToggle,
  visibility,
}: EnvironmentLayerInspectorProps) {
  return (
    <details
      className="career-world__layer-inspector"
      data-layer-inspector="environment"
      open
    >
      <summary>Layer inspection · L1–L4</summary>
      <div className="career-world__layer-inspector-list">
        {ENVIRONMENT_LAYER_DEFINITIONS.map((layer) => {
          const parentVisible = layer.parentId
            ? visibility[layer.parentId]
            : true;
          const effective = isEnvironmentLayerEffectivelyVisible(
            visibility,
            layer.id,
          );
          return (
            <label
              className="career-world__layer-inspector-row"
              data-available={layer.available}
              data-child={Boolean(layer.parentId)}
              data-effective={effective}
              key={layer.id}
              title={layer.owns}
            >
              <input
                checked={visibility[layer.id]}
                disabled={!layer.available || !parentVisible}
                onChange={() => onToggle(layer.id)}
                type="checkbox"
              />
              <code>{layer.id}</code>
              <span>{layer.label}</span>
              <small>{layer.available ? (effective ? "on" : "off") : "pending"}</small>
            </label>
          );
        })}
      </div>
    </details>
  );
}
