"""Build the shared NinjaOne skill structure sprites.

The authored contact sheet is a source artifact. Runtime assets are exact,
transparent cell crops so every skill keeps one stable pixel grid and can be
positioned by manifest data without runtime image processing.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
STRUCTURES_ROOT = (
    ROOT / "public" / "career-world" / "layers" / "structures"
)
SKILL_SOURCE = (
    STRUCTURES_ROOT / "sources" / "universal-skill-kit-alpha-r1.png"
)

SKILL_OUTPUTS = (
    "safe-writes-r1.png",
    "data-contracts-r1.png",
    "protocol-gateway-r1.png",
    "workflow-orchestration-r1.png",
    "operator-control-r1.png",
    "cloud-infrastructure-r1.png",
    "python-r1.png",
    "databricks-r1.png",
)


def write_cells(
    source_path: Path,
    columns: int,
    output_directory: Path,
    file_names: tuple[str, ...],
) -> None:
    source = Image.open(source_path).convert("RGBA")
    if source.width != source.height or source.width % columns != 0:
        raise ValueError(
            f"{source_path.name} must be a square {columns}x{columns} sheet."
        )

    cell_size = source.width // columns
    output_directory.mkdir(parents=True, exist_ok=True)
    for index, file_name in enumerate(file_names):
        column = index % columns
        row = index // columns
        cell = source.crop((
            column * cell_size,
            row * cell_size,
            (column + 1) * cell_size,
            (row + 1) * cell_size,
        ))
        pixels = bytearray(cell.tobytes())
        for offset in range(0, len(pixels), 4):
            if pixels[offset + 3] == 0:
                pixels[offset:offset + 3] = b"\x00\x00\x00"
        cell = Image.frombytes("RGBA", cell.size, bytes(pixels))
        output = output_directory / file_name
        temporary = output.with_suffix(".tmp.png")
        cell.save(
            temporary,
            format="PNG",
            optimize=True,
        )
        temporary.replace(output)
        print(f"Built {output.relative_to(ROOT)}.")


def main() -> None:
    write_cells(
        SKILL_SOURCE,
        3,
        STRUCTURES_ROOT / "textures" / "skills",
        SKILL_OUTPUTS,
    )


if __name__ == "__main__":
    main()
