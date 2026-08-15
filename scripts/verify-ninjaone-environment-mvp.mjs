#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  NINJAONE_MVP_BANNED_FIDELITY_SOURCES,
  NINJAONE_MVP_CHECKPOINT_REFERENCES,
  NINJAONE_MVP_LIMITS,
  NINJAONE_MVP_NATIVE_SOURCE_PREFIX,
  auditCameraDecodedBudgets,
  auditFoliageIsolationEvidence,
  auditFoliageIsolationSceneCrops,
  auditNativeSeamCoverage,
  auditIntegrationOverlays,
  auditNativeStaticFidelity,
} from "./lib/ninjaone-environment-mvp-verification.mjs";

const DEFAULT_NATIVE_MANIFEST =
  "public/career-world/capitals/ninjaone/environment/manifests/native-detail-r2.json";
const DEFAULT_FOLIAGE_MANIFEST =
  "public/career-world/capitals/ninjaone/environment/manifests/foliage-native-r4.json";
const DEFAULT_COAST_MANIFEST =
  "public/career-world/capitals/ninjaone/environment/manifests/coast-transition-native-r2.json";
const DEFAULT_SEAM_MANIFEST =
  "public/career-world/capitals/ninjaone/environment/manifests/seam-integration-native-r2.json";

function usage() {
  return [
    "Usage: node scripts/verify-ninjaone-environment-mvp.mjs [options]",
    "",
    "Options:",
    "  --coast-manifest <file> Override native-original coast supplement manifest.",
    "  --foliage-captures <file> Fixed-camera foliage-isolation evidence JSON.",
    "  --foliage-manifest <file> Override foliage manifest.",
    "  --foliage-scene-crops <file> Exact trail-conifer crop companion JSON.",
    "  --native-manifest <file>  Override native detail manifest.",
    "  --seam-manifest <file>  Override native-original seam supplement manifest.",
    "  --output <file>         Also write the JSON result to a file.",
    "  --root <directory>      Repository root (default: current directory).",
    "  --scope <full|foliage-isolation> Verification scope (default: full).",
  ].join("\n");
}

function parseArguments(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} needs a value.`);
    }
    result[argument.slice(2)] = value;
    index += 1;
  }
  return result;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function manifestInstances(manifest) {
  if (!manifest) return [];
  const resources = new Map(
    (manifest.resources ?? []).map((resource) => [resource.id, resource]),
  );
  if (!Array.isArray(manifest.instances)) {
    return [...resources.values()]
      .filter(({ artboardBounds }) => artboardBounds)
      .map((resource) => Object.freeze({
        artboardBounds: resource.artboardBounds,
        id: `${resource.id}-instance`,
        resource,
      }));
  }
  return manifest.instances.map((instance) => {
    const resourceIds = Array.isArray(instance.resourceIds)
      ? instance.resourceIds
      : instance.atlasResourceId
        ? [instance.atlasResourceId]
      : instance.neutralizationResourceId && instance.canopyResourceId
        ? [instance.neutralizationResourceId, instance.canopyResourceId]
        : [instance.resourceId];
    const instanceResources = resourceIds.map((resourceId) => resources.get(resourceId));
    if (instanceResources.some((resource) => !resource)) {
      throw new Error(`${instance.id} has an unregistered resource.`);
    }
    return Object.freeze({
      ...instance,
      resource: instanceResources[0],
      resources: Object.freeze(instanceResources),
    });
  });
}

function compactStaticFailures(staticAudit, seamCoverage) {
  const failures = [];
  if (!staticAudit.provenance.pass) failures.push("static.native_original_provenance");
  for (const tile of staticAudit.tiles) {
    if (!tile.geometryPass) failures.push(`static.${tile.id}.geometry`);
    if (!tile.palettePass) failures.push(`static.${tile.id}.palette`);
    if (!tile.detailPass) failures.push(`static.${tile.id}.detail_energy`);
  }
  if (!staticAudit.seamGate.pass && !seamCoverage.pass) {
    failures.push("static.native_join");
  }
  if (!staticAudit.c1VoidMask.pass) failures.push("static.c1.void_mask");
  return failures;
}

export async function verifyNinjaOneEnvironmentMvp(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const scope = options.scope ?? "full";
  if (!new Set(["full", "foliage-isolation"]).has(scope)) {
    throw new Error("--scope must be full or foliage-isolation.");
  }
  const nativeManifestPath = path.resolve(
    root, options["native-manifest"] ?? DEFAULT_NATIVE_MANIFEST,
  );
  const foliageManifestPath = path.resolve(
    root, options["foliage-manifest"] ?? DEFAULT_FOLIAGE_MANIFEST,
  );
  const [
    nativeManifest,
    foliageManifest,
    seamManifest,
    coastManifest,
  ] = await Promise.all([
    readJson(nativeManifestPath),
    readJson(foliageManifestPath),
    readJson(path.resolve(
      root, options["seam-manifest"] ?? DEFAULT_SEAM_MANIFEST,
    )),
    readJson(path.resolve(
      root, options["coast-manifest"] ?? DEFAULT_COAST_MANIFEST,
    )),
  ]);
  if (scope === "foliage-isolation") {
    const failures = [];
    let foliageIsolation = Object.freeze({
      failures: Object.freeze(["foliage_isolation.evidence_missing"]),
      pass: false,
    });
    let sceneCrops = Object.freeze({
      failures: Object.freeze(["foliage_scene_crops.evidence_missing"]),
      pass: false,
    });
    const foliageEvidencePath = options["foliage-captures"]
      ? path.resolve(root, options["foliage-captures"])
      : null;
    if (foliageEvidencePath) {
      foliageIsolation = await auditFoliageIsolationEvidence({
        coastManifest,
        evidence: await readJson(foliageEvidencePath),
        evidencePath: foliageEvidencePath,
        foliageManifest,
        nativeManifest,
        referenceRoot: root,
        seamManifest,
      });
    }
    if (foliageEvidencePath && options["foliage-scene-crops"]) {
      const companionPath = path.resolve(root, options["foliage-scene-crops"]);
      sceneCrops = await auditFoliageIsolationSceneCrops({
        companion: await readJson(companionPath),
        companionPath,
        evidencePath: foliageEvidencePath,
        referenceRoot: root,
      });
    }
    failures.push(...foliageIsolation.failures, ...sceneCrops.failures);
    return Object.freeze({
      failures: Object.freeze([...new Set(failures)]),
      foliageIsolation,
      pass: failures.length === 0,
      sceneCrops,
      scope,
    });
  }
  const overlayManifests = [coastManifest, seamManifest].filter(Boolean);
  const [staticAudit, overlayAudit] = await Promise.all([
    auditNativeStaticFidelity({ manifest: nativeManifest, root }),
    auditIntegrationOverlays({
      manifests: overlayManifests,
      root,
    }),
  ]);
  const seamCoverage = auditNativeSeamCoverage({
    manifests: [seamManifest],
    nativeManifest,
    seamMetrics: staticAudit.seamGate.nonCoastFailures,
  });
  const budgetAudit = auditCameraDecodedBudgets({
    coastInstances: coastManifest ? manifestInstances(coastManifest) : [],
    foliageInstances: manifestInstances(foliageManifest),
    foliageMaximumSpan: foliageManifest.eligibility.maxDetailRetainSpan,
    nativeManifest,
    seamInstances: seamManifest ? manifestInstances(seamManifest) : [],
  });
  const coastMetrics = coastManifest === null
    ? []
    : overlayAudit.resources.filter((resource) => (
      resource.manifestId === coastManifest.id
    ));
  const coastEvidencePass = coastMetrics.length > 0
    && coastMetrics.every(({ pass }) => pass);
  const failures = [
    ...compactStaticFailures(staticAudit, seamCoverage),
    ...overlayAudit.resources
      .filter(({ pass }) => !pass)
      .map(({ id }) => `integration_overlay.${id}`),
    ...(!overlayAudit.pass ? ["integration_overlay.gate"] : []),
    ...(!coastEvidencePass
      ? ["coast.native_original_transition_evidence_missing"]
      : []),
    ...(!budgetAudit.pass ? ["budget.camera_sweep"] : []),
  ];
  const result = Object.freeze({
    budgets: budgetAudit,
    failures: Object.freeze([...new Set(failures)]),
    integrationOverlays: overlayAudit,
    coast: Object.freeze({
      manifestProvided: coastManifest !== null,
      nativeOriginalEvidencePass: coastEvidencePass,
    }),
    limits: NINJAONE_MVP_LIMITS,
    pass: failures.length === 0,
    referencePolicy: Object.freeze({
      allowedStaticSourcePrefix: NINJAONE_MVP_NATIVE_SOURCE_PREFIX,
      bannedFidelitySources: NINJAONE_MVP_BANNED_FIDELITY_SOURCES,
      browserScreenshotsAllowedAsStaticReference: false,
      checkpointReferences: NINJAONE_MVP_CHECKPOINT_REFERENCES,
      runtimeCloseQuiltR3AllowedAsStaticReference: false,
    }),
    scope,
    seamCoverage,
    static: staticAudit,
  });
  return result;
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n${usage()}\n`);
    process.exitCode = 2;
    return;
  }
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  try {
    const result = await verifyNinjaOneEnvironmentMvp(options);
    const json = `${JSON.stringify(result, null, 2)}\n`;
    process.stdout.write(json);
    if (options.output) {
      await writeFile(path.resolve(options.root ?? process.cwd(), options.output), json);
    }
    if (!result.pass) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  await main();
}
