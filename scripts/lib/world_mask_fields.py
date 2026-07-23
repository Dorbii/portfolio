"""Deterministic Euclidean distance fields for Career World authoring."""

from __future__ import annotations

import numpy as np
from PIL import Image


_LARGE_DISTANCE = 1.0e12


def _squared_distance_transform_1d(values: np.ndarray) -> np.ndarray:
    length = int(values.shape[0])
    locations = np.zeros(length, dtype=np.int32)
    boundaries = np.zeros(length + 1, dtype=np.float64)
    output = np.zeros(length, dtype=np.float64)
    envelope_size = 0
    locations[0] = 0
    boundaries[0] = -np.inf
    boundaries[1] = np.inf

    for position in range(1, length):
        previous = int(locations[envelope_size])
        intersection = (
            (float(values[position]) + position * position)
            - (float(values[previous]) + previous * previous)
        ) / (2.0 * (position - previous))
        while intersection <= boundaries[envelope_size]:
            envelope_size -= 1
            previous = int(locations[envelope_size])
            intersection = (
                (float(values[position]) + position * position)
                - (float(values[previous]) + previous * previous)
            ) / (2.0 * (position - previous))
        envelope_size += 1
        locations[envelope_size] = position
        boundaries[envelope_size] = intersection
        boundaries[envelope_size + 1] = np.inf

    envelope_size = 0
    for position in range(length):
        while boundaries[envelope_size + 1] < position:
            envelope_size += 1
        nearest = int(locations[envelope_size])
        output[position] = (
            (position - nearest) * (position - nearest)
            + float(values[nearest])
        )
    return output


def distance_from_feature(mask: Image.Image) -> np.ndarray:
    """Return Euclidean distance to the nearest non-zero mask pixel."""

    feature = np.asarray(mask.convert("L"), dtype=np.uint8) >= 128
    field = np.where(feature, 0.0, _LARGE_DISTANCE).astype(np.float64)
    horizontal = np.empty_like(field)
    for row_index in range(field.shape[0]):
        horizontal[row_index, :] = _squared_distance_transform_1d(
            field[row_index, :],
        )
    squared = np.empty_like(field)
    for column_index in range(field.shape[1]):
        squared[:, column_index] = _squared_distance_transform_1d(
            horizontal[:, column_index],
        )
    return np.sqrt(np.maximum(squared, 0.0))


def exterior_falloff(
    land_mask: Image.Image,
    maximum_distance: float,
    *,
    distance: np.ndarray | None = None,
) -> np.ndarray:
    """Return a smooth 0..1 water-side field with no dilation bands."""

    if maximum_distance <= 0:
        raise ValueError("maximum_distance must be positive.")
    land = np.asarray(land_mask.convert("L"), dtype=np.uint8) >= 128
    if distance is None:
        distance = distance_from_feature(land_mask)
    normalized = np.clip(
        1.0 - distance / float(maximum_distance),
        0.0,
        1.0,
    )
    smooth = normalized * normalized * (3.0 - 2.0 * normalized)
    return np.where(land, 0.0, smooth).astype(np.float32)

