import type { ReactElement } from "react";

import {
  assertDetailTier,
  assertNever,
  type DetailTier,
  type GeometryDefinition,
  type GeometryPalette,
  type GeometryPrimitive,
} from "../geometry/types";
import { projectExtrusion } from "../geometry/primitives";
import { applyPalette, assertPalette } from "../geometry/palettes";

export type GeometryRendererProps = Readonly<{
  definition: GeometryDefinition;
  palette: GeometryPalette;
  visibleDetailTier: DetailTier;
}>;

function renderPrimitive(
  primitive: GeometryPrimitive,
  palette: GeometryPalette,
  visibleDetailTier: DetailTier,
): ReactElement {
  const visible = primitive.detailTier <= visibleDetailTier;
  const common = {
    className: `career-world-primitive career-world-primitive-${primitive.type} career-world-detail-${primitive.detailTier}`,
    "data-primitive-id": primitive.id,
    "data-primitive-type": primitive.type,
    "data-detail-tier": primitive.detailTier,
    "data-detail-visible": visible ? "true" : "false",
    visibility: visible ? "visible" : "hidden",
    "aria-hidden": visible ? undefined : true,
  } as const;

  switch (primitive.type) {
    case "surface":
      return (
        <path
          {...common}
          data-fill-slot={primitive.fill}
          data-stroke-slot={primitive.stroke}
          d={primitive.path}
          fill={applyPalette(palette, primitive.fill)}
          stroke={primitive.stroke ? applyPalette(palette, primitive.stroke) : "none"}
          vectorEffect="non-scaling-stroke"
        />
      );
    case "extrusion": {
      const extrusion = projectExtrusion(primitive);
      return (
        <g {...common}>
          {extrusion.sides.map((side) => (
            <path
              key={side.id}
              data-extrusion-face={side.id}
              data-fill-slot={side.tone === "lit" ? primitive.litSide : primitive.shadowSide}
              data-stroke-slot={primitive.stroke}
              d={side.path}
              fill={applyPalette(
                palette,
                side.tone === "lit" ? primitive.litSide : primitive.shadowSide,
              )}
              stroke={applyPalette(palette, primitive.stroke)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            data-extrusion-face="top"
            data-fill-slot={primitive.top}
            data-stroke-slot={primitive.stroke}
            d={extrusion.topPath}
            fill={applyPalette(palette, primitive.top)}
            stroke={applyPalette(palette, primitive.stroke)}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    }
    case "stroke":
      return (
        <path
          {...common}
          data-stroke-slot={primitive.stroke}
          d={primitive.path}
          fill="none"
          stroke={applyPalette(palette, primitive.stroke)}
          vectorEffect="non-scaling-stroke"
        />
      );
    default:
      return assertNever(primitive, "Unknown geometry primitive in renderer");
  }
}

export function GeometryRenderer({
  definition,
  palette,
  visibleDetailTier,
}: GeometryRendererProps): ReactElement {
  assertDetailTier(visibleDetailTier);
  assertPalette(palette);

  return (
    <g
      className="career-world-geometry"
      data-asset-id={definition.assetId}
      data-geometry-key={definition.geometryKey}
      data-master-geometry-hash={definition.masterGeometryHash}
      data-projection={definition.projection}
      data-visible-detail-tier={visibleDetailTier}
    >
      {definition.primitives.map((primitive) => (
        <g key={primitive.id} data-primitive-key={primitive.id}>
          {renderPrimitive(primitive, palette, visibleDetailTier)}
        </g>
      ))}
      <path
        className="career-world-primary-path"
        data-primary-path="true"
        data-detail-tier="0"
        d={definition.primaryPath}
        fill="none"
        stroke={applyPalette(palette, "line.primary")}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
