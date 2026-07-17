"use strict";

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const sharpPackage = require("sharp/package.json");

const sourceArgument = process.argv[2];
const outputArgument = process.argv[3];

if (!sourceArgument || !outputArgument) {
  throw new Error("USAGE: node render-contextforge-guide.cjs <source.svg> <output.png>");
}

const sourcePath = path.resolve(sourceArgument);
const outputPath = path.resolve(outputArgument);

if (!fs.existsSync(sourcePath)) {
  throw new Error("SOURCE_SVG_MISSING");
}

if (fs.existsSync(outputPath)) {
  throw new Error("FINAL_PNG_ALREADY_EXISTS");
}

async function render() {
  const info = await sharp(sourcePath, {
    density: 72,
    animated: false,
    failOn: "error",
    sequentialRead: true,
  })
    .flatten({ background: "#080B10" })
    .removeAlpha()
    .toColourspace("srgb")
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
      effort: 10,
      force: true,
    })
    .toFile(outputPath);

  const compliant =
    info.format === "png" &&
    info.width === 1536 &&
    info.height === 1024 &&
    info.channels === 3;

  const receipt = {
    status: compliant ? "SINGLE_RENDER_COMPLETED" : "NONCOMPLIANT_SINGLE_RENDER",
    node: process.version,
    sharp: sharpPackage.version,
    libvips: sharp.versions.vips,
    sourcePath,
    outputPath,
    info,
  };

  const serialized = JSON.stringify(receipt);
  if (!compliant) {
    console.error(serialized);
    process.exitCode = 2;
    return;
  }

  console.log(serialized);
}

render().catch((error) => {
  console.error(
    JSON.stringify({
      status: "SINGLE_RENDER_FAILED",
      node: process.version,
      sharp: sharpPackage.version,
      libvips: sharp.versions.vips,
      sourcePath,
      outputPath,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
