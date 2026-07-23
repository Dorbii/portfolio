# Career World architecture

## Source-of-truth rule

The 16:9 world plane is authoritative. A camera view contains only a normalized
origin and span. Zooming or focusing a territory crops that same plane; it
never changes projection, replaces geography, resets the water clock, or
substitutes a separately authored city canvas.

## Layer ownership

| Order | Directory | Owns | Does not own |
| --- | --- | --- | --- |
| 1 | `world-backdrop` | Atmosphere behind the world | Water or land color |
| 2 | `water-surface` | Open water, hydrology, water-side shelf/contact response | Land pixels |
| 3 | `territory-landform` | Geography, land material, baked inner contact edge, territory masks | Foam or moving water |
| 4 | `infrastructure` | Roads, trails, docks, bridges, plazas | Terrain or buildings |
| 5 | `environment` | Vegetation, rocks, logs, signs | Infrastructure |
| 6 | `structures` | Employer, project, skill, and landmark structures | Evidence UI |
| 7 | `actors-effects` | Actors, weather, particles, authored crash/foam accents | Base shoreline response |
| 8 | `interface` | Labels, focus controls, selections, evidence links, QA overlays | World art |

Coastline is an interface between land geometry and water behavior, not a ninth
scene layer. Land publishes the mask. Water derives a continuous shelf and
contact field from it. Phase 7 may add sparse authored crash accents without
redrawing the coast.

## Runtime boundaries

- `composition/` wires layers and owns stacking only.
- `shared/camera.ts` is the sole camera normalization and transform contract.
- `shared/theme.ts` is the sole palette and lighting contract.
- Each active layer owns its renderer, state, and asset manifest.
- Deferred layers expose a typed contract and no speculative renderer.
- Authoring scripts are deterministic and never run in the browser.
- Static raster art may carry authored lighting; its generation must use the
  same world-light contract as procedural layers.

## Camera and detail hierarchy

The camera is global; detail selection is global policy. Layers may provide
different assets or procedural frequencies for a tier, but they resolve the
same tier and the same continuous transition weights from the camera span.
These weights are part of the scene contract, not layer-specific thresholds.

| Tier | Approximate span | Purpose | Geography rule |
| --- | --- | --- | --- |
| World | `0.78–1.0` | Read landmasses, water bodies, macro terrain | Authoritative silhouette |
| Territory | `0.20–0.78` | Read territory terrain and capital placement | Same coast, seams, and major anchors |
| Capital | `0.10–0.20` | Roads, districts, capital and project/skill structures | Registered detail tile; no projection or coastline replacement |

Transitions occupy overlap bands around the tier boundaries. Land crossfades
registered rasters, water progressively raises simulation frequency and render
density, and scene nodes use the same transition weight as their reveal
opacity. A node that first exists at territory or capital detail therefore
does not pop in at a layer-specific magic number.

The landscape may be **re-expressed** at a higher tier—more pixels, denser
linework, resolved vegetation, and locally quieter ground around structures.
It may not reshape the territory, move major terrain anchors, or create a
perspective transition. A capital is therefore a registered subregion inside a
territory, not a replacement map.

The full-world 4x land plate is a premultiplied-alpha resample used only to
preserve Phase 3 line fidelity through territory zoom. It does not claim to add
terrain detail. Production capital views require authored territory-local
detail tiles so a full-world 10K+ raster is never required. Until that tile
exists, entering the capital tier must remain visibly marked as an authoring
requirement rather than presenting an enlarged world plate as finished detail.

## Phase 3 acceptance gates

1. Five distinct territory masks cover the accepted land geography.
2. All focus views stay in bounds and retain one orthographic projection.
3. Land and water receive the identical camera transform.
4. The water animation keeps one continuous world clock through focus changes.
5. Every shoreline receives the same base shelf/contact derivation.
6. The land runtime uses one composited plate; no corrective overlay sits above it.
7. WebGL shader compilation is verified in a real browser and fallback is
   observable through `data-render-state`.
8. Authored crash nodes remain deferred to Phase 7.
