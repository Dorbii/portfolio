"""Apply the accepted Phase 3 coastline refinements to the world mask."""

from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
LAND_ROOT = (
    ROOT / "public" / "career-world" / "layers" / "terrain" / "authority"
)
SOURCE = LAND_ROOT / "masks" / "world-land-mask-r2.png"
OUTPUT = LAND_ROOT / "masks" / "world-land-mask-r3.png"


def organic_quadratic_points(
    start: tuple[float, float],
    control: tuple[float, float],
    end: tuple[float, float],
    *,
    samples: int = 48,
    wobble: float = 1.8,
) -> list[tuple[int, int]]:
    """Sample a softly irregular quadratic edge for a new coastline."""

    points: list[tuple[int, int]] = []
    for index in range(samples + 1):
        t = index / samples
        inverse = 1.0 - t
        x = (
            inverse * inverse * start[0]
            + 2.0 * inverse * t * control[0]
            + t * t * end[0]
        )
        y = (
            inverse * inverse * start[1]
            + 2.0 * inverse * t * control[1]
            + t * t * end[1]
        )
        # Two incommensurate waves prevent a mechanically perfect arc while
        # keeping the edited coast free of straight polygon segments.
        offset = (
            np.sin(t * np.pi * 7.0) * wobble
            + np.sin(t * np.pi * 13.0) * wobble * 0.38
        )
        x += offset * (end[1] - start[1]) / 100.0
        y -= offset * (end[0] - start[0]) / 100.0
        points.append((round(x), round(y)))
    return points


def remove_small_components(
    land: np.ndarray,
    *,
    bounds: tuple[int, int, int, int],
    maximum_area: int,
) -> np.ndarray:
    """Remove tiny land fragments inside one bounded review area."""

    x0, y0, x1, y1 = bounds
    visited = np.zeros_like(land, dtype=bool)
    output = land.copy()
    height, width = land.shape

    for start_y in range(max(0, y0), min(height, y1)):
        for start_x in range(max(0, x0), min(width, x1)):
            if visited[start_y, start_x] or not land[start_y, start_x]:
                continue
            queue = deque([(start_x, start_y)])
            visited[start_y, start_x] = True
            component: list[tuple[int, int]] = []
            touches_bounds = False

            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                if x <= x0 or x >= x1 - 1 or y <= y0 or y >= y1 - 1:
                    touches_bounds = True
                for next_x, next_y in (
                    (x - 1, y),
                    (x + 1, y),
                    (x, y - 1),
                    (x, y + 1),
                ):
                    if (
                        next_x < 0
                        or next_x >= width
                        or next_y < 0
                        or next_y >= height
                        or visited[next_y, next_x]
                        or not land[next_y, next_x]
                    ):
                        continue
                    visited[next_y, next_x] = True
                    queue.append((next_x, next_y))

            if not touches_bounds and len(component) <= maximum_area:
                for x, y in component:
                    output[y, x] = False

    return output


def build() -> None:
    source = Image.open(SOURCE).convert("L")
    land = np.asarray(source, dtype=np.uint8) >= 128

    # The southwest archipelago was visually collapsing into one noisy cluster.
    # A bounded erosion widens its existing channels without moving the macro
    # mass or inventing unsupported elevation.
    southwest_region = Image.new("L", source.size, 0)
    southwest_draw = ImageDraw.Draw(southwest_region)
    southwest_draw.ellipse((88, 365, 500, 742), fill=255)
    southwest_weight = np.asarray(
        southwest_region.filter(ImageFilter.GaussianBlur(10.0)),
        dtype=np.float32,
    ) / 255.0
    eroded = np.asarray(
        source.filter(ImageFilter.MinFilter(7)),
        dtype=np.uint8,
    ) >= 128
    land = np.where(southwest_weight >= 0.5, eroded, land)
    land = remove_small_components(
        land,
        bounds=(70, 345, 520, 760),
        maximum_area=180,
    )

    # Shorten the two needle-like capes into broader headlands. Their new
    # boundaries are sampled curves rather than straight polygon cuts so they
    # retain the same organic coastline language as the source mask.
    cut = Image.new("L", source.size, 0)
    cut_draw = ImageDraw.Draw(cut)
    south_headland = organic_quadratic_points(
        (492, 846),
        (548, 876),
        (612, 826),
        wobble=2.1,
    )
    cut_draw.polygon(
        south_headland
        + [
            (690, source.height),
            (410, source.height),
        ],
        fill=255,
    )
    northeast_headland = organic_quadratic_points(
        (1146, 91),
        (1192, 126),
        (1155, 183),
        wobble=1.9,
    )
    cut_draw.polygon(
        northeast_headland
        + [
            (source.width, 230),
            (source.width, 30),
        ],
        fill=255,
    )
    # Cover the old needle tip above the curved join; otherwise a two-pixel
    # remnant survives as a detached sliver.
    cut_draw.rectangle((1150, 0, source.width, 90), fill=255)
    land &= np.asarray(cut, dtype=np.uint8) < 128
    land = remove_small_components(
        land,
        bounds=(430, 790, 680, source.height),
        maximum_area=64,
    )

    # A small closing pass rounds freshly cut pixels while remaining local to
    # the edited headlands.
    edited = Image.fromarray(np.where(land, 255, 0).astype(np.uint8), mode="L")
    rounded = edited.filter(ImageFilter.MaxFilter(3)).filter(
        ImageFilter.MinFilter(3),
    )
    rounding_region = Image.new("L", source.size, 0)
    rounding_draw = ImageDraw.Draw(rounding_region)
    rounding_draw.ellipse((440, 805, 650, 930), fill=255)
    rounding_draw.ellipse((1115, 45, 1285, 220), fill=255)
    rounding = np.asarray(
        rounding_region.filter(ImageFilter.GaussianBlur(4.0)),
        dtype=np.float32,
    ) / 255.0
    rounded_land = np.asarray(rounded, dtype=np.uint8) >= 128
    land = np.where(rounding >= 0.5, rounded_land, land)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(
        np.where(land, 255, 0).astype(np.uint8),
        mode="L",
    ).save(OUTPUT, optimize=True)


if __name__ == "__main__":
    build()
