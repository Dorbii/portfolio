from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageChops


REPO_ROOT = Path(__file__).resolve().parents[1]
TOURNAMENT_ROOT = REPO_ROOT / "design" / "career-world" / "concept-tournaments"
LEDGER_PATH = TOURNAMENT_ROOT / "tournament-production-ledger.json"
EXPECTED_CATEGORY_COUNTS = {"city": 5, "project": 16, "skill": 27, "ambient": 14}
EXPECTED_CANVAS = (1536, 1024)
JS_PREFIX = "window.__CONCEPT_TOURNAMENT_SET__ = "


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def exact_grayscale(image: Image.Image) -> bool:
    if image.mode != "RGB":
        return False
    red, green, blue = image.split()
    return ImageChops.difference(red, green).getbbox() is None and ImageChops.difference(red, blue).getbbox() is None


def main() -> None:
    ledger = load_json(LEDGER_PATH)
    entries = ledger.get("entries", [])
    errors: list[str] = []
    category_counts = Counter(entry.get("category") for entry in entries)
    if dict(category_counts) != EXPECTED_CATEGORY_COUNTS:
        errors.append(f"category counts {dict(category_counts)} != {EXPECTED_CATEGORY_COUNTS}")

    global_hashes: dict[str, list[str]] = defaultdict(list)
    image_count = 0

    for entry in entries:
        folder = TOURNAMENT_ROOT / entry["folder"]
        label = entry["id"]
        if not folder.is_dir():
            errors.append(f"{label}: missing folder {folder}")
            continue

        required = ["tournament-set.json", "tournament-set.js", "concept-set.md"]
        if entry["category"] != "city":
            required.append("prompt-set.json")
        for filename in required:
            if not (folder / filename).is_file():
                errors.append(f"{label}: missing {filename}")

        manifest_path = folder / "tournament-set.json"
        script_path = folder / "tournament-set.js"
        if not manifest_path.is_file() or not script_path.is_file():
            continue

        manifest = load_json(manifest_path)
        assets = manifest.get("assets", [])
        if len(assets) != 10:
            errors.append(f"{label}: manifest has {len(assets)} assets")

        script = script_path.read_text(encoding="utf-8")
        if not script.startswith(JS_PREFIX) or not script.rstrip().endswith(";"):
            errors.append(f"{label}: malformed JavaScript manifest wrapper")
        else:
            script_manifest = json.loads(script[len(JS_PREFIX):].rstrip()[:-1])
            if script_manifest != manifest:
                errors.append(f"{label}: JSON and JavaScript manifests differ")

        expected_names = [asset.get("src") for asset in assets]
        actual_names = sorted(path.name for path in folder.glob("*.png"))
        if sorted(expected_names) != actual_names:
            errors.append(f"{label}: PNG files do not exactly match manifest sources")

        if entry["category"] != "city" and (folder / "prompt-set.json").is_file():
            prompt_set = load_json(folder / "prompt-set.json")
            prompts = prompt_set.get("prompts", [])
            if len(prompts) != 10:
                errors.append(f"{label}: prompt set has {len(prompts)} records")
            prompt_outputs = [prompt.get("output") for prompt in prompts]
            if prompt_outputs != expected_names:
                errors.append(f"{label}: prompt outputs do not match manifest order")
            if any(not prompt.get("prompt", "").strip() for prompt in prompts):
                errors.append(f"{label}: prompt set contains an empty prompt")

        per_set_hashes: set[str] = set()
        for asset in assets:
            path = folder / asset["src"]
            if not path.is_file():
                errors.append(f"{label}: missing image {asset['src']}")
                continue
            image_count += 1
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest in per_set_hashes:
                errors.append(f"{label}: duplicate image content {asset['src']}")
            per_set_hashes.add(digest)
            global_hashes[digest].append(f"{entry['folder']}/{asset['src']}")

            with Image.open(path) as image:
                if image.size != EXPECTED_CANVAS:
                    errors.append(f"{label}: {asset['src']} is {image.size}, expected {EXPECTED_CANVAS}")
                if not exact_grayscale(image):
                    errors.append(f"{label}: {asset['src']} is not exact RGB grayscale")

        status = entry.get("status")
        if status not in {"ready", "excluded", "variant-kit"} or entry.get("imageCount") != 10:
            errors.append(f"{label}: ledger status/count is {status}/{entry.get('imageCount')}")
        if status == "excluded" and not entry.get("exclusionReason", "").strip():
            errors.append(f"{label}: excluded ledger entry has no reason")
        if status == "variant-kit":
            policy = entry.get("variantKitPolicy") or {}
            if policy.get("minimumVariants", 0) < 2 or not policy.get("reason", "").strip():
                errors.append(f"{label}: variant-kit ledger entry has an incomplete policy")

    duplicate_groups = [paths for paths in global_hashes.values() if len(paths) > 1]
    if duplicate_groups:
        errors.append(f"global duplicate image groups: {duplicate_groups}")
    if len(entries) != 62:
        errors.append(f"ledger has {len(entries)} entries, expected 62")
    if image_count != 620:
        errors.append(f"audited {image_count} images, expected 620")

    summary = {
        "sets": len(entries),
        "activeSets": sum(entry.get("status") in {"ready", "variant-kit"} for entry in entries),
        "reviewSets": sum(entry.get("status") == "ready" for entry in entries),
        "variantKitSets": sum(entry.get("status") == "variant-kit" for entry in entries),
        "excludedSets": sum(entry.get("status") == "excluded" for entry in entries),
        "images": image_count,
        "categories": dict(category_counts),
        "uniqueImageHashes": len(global_hashes),
        "canvas": list(EXPECTED_CANVAS),
        "exactRgbGrayscale": not any("not exact RGB grayscale" in error for error in errors),
        "errors": errors,
    }
    print(json.dumps(summary, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
