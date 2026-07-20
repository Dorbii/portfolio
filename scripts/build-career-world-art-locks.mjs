import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const repoRoot = process.cwd();
const args = process.argv.slice(2);
const exportIndex = args.indexOf("--review-export");
if (exportIndex === -1 || !args[exportIndex + 1]) {
  throw new Error("Usage: node scripts/build-career-world-art-locks.mjs --review-export <path>");
}

const reviewExportPath = path.resolve(args[exportIndex + 1]);
const reviewRaw = fs.readFileSync(reviewExportPath);
const review = JSON.parse(reviewRaw.toString("utf8"));
const outputDir = path.join(repoRoot, "design", "career-world", "production-art");
const auditDir = path.join(outputDir, "audit");
fs.mkdirSync(auditDir, { recursive: true });

const promotions = Object.freeze({
  "project/career-world-portfolio@v1": Object.freeze({
    candidateId: "project-career-world-portfolio-r1-01-canonical-amplification",
    reason: "Completed review had no negative note; calibration leader is the strongest available completed result.",
  }),
  "skill/context-compression@v1": Object.freeze({
    candidateId: "skill-context-compression-r1-04-interface-bridge",
    reason: "Completed review had no negative note; calibration leader is the strongest available completed result.",
  }),
  "skill/python@v1": Object.freeze({
    candidateId: "skill-python-r2-10-python-language-synthesis",
    reason: "Stable consensus and calibration agree on the Python-specific synthesis; the TypeScript annotation does not relabel TypeScript.",
  }),
});

const targeted = Object.freeze({
  "city/tanium@v1": Object.freeze({
    candidateId: "city-tanium-r3-01-central-t-chain",
    sourcePath: "design/career-world/targeted-regeneration/city-project-r3/city-tanium-r3-01-central-t-chain.png",
    reason: "Best capital hierarchy, readable central T plan, surrounding operational structures, and corrected lighter tone.",
  }),
  "project/cablecar@v1": Object.freeze({
    candidateId: "project-cablecar-r3-01-wide-span-cabin",
    sourcePath: "design/career-world/targeted-regeneration/city-project-r3/project-cablecar-r3-01-wide-span-cabin.png",
    reason: "Clearly separated terminals and an unmistakable suspended cabin; no bridge substitution.",
  }),
  "project/vendy-vm-platform@v1": Object.freeze({
    candidateId: "project-vendy-vm-platform-r3-02-three-arm-service-yard",
    sourcePath: "design/career-world/targeted-regeneration/city-project-r3/project-vendy-vm-platform-r3-02-three-arm-service-yard.png",
    reason: "One provisioning surface feeds three visibly different environment classes; clearer than the generic shared campus.",
  }),
  "skill/ai@v1": Object.freeze({
    candidateId: "skill-ai-r3-01-routing-courts",
    sourcePath: "design/career-world/targeted-regeneration/skills-ai-java-r3/skill-ai-r3-01-routing-courts.png",
    reason: "Distinct routing and reasoning courts replace accelerator imagery; the alternative is a generic symmetric hub.",
  }),
  "skill/java@v1": Object.freeze({
    candidateId: "skill-java-r3-01-runtime-keep",
    sourcePath: "design/career-world/targeted-regeneration/skills-ai-java-r3/skill-java-r3-01-runtime-keep.png",
    reason: "Compact layered runtime landmark; the alternative is still capital-scale and overbuilt.",
  }),
  "skill/openapi@v1": Object.freeze({
    candidateId: "skill-openapi-r3-01-contract-hub",
    sourcePath: "design/career-world/targeted-regeneration/skills-openapi-react-r3/skill-openapi-r3-01-contract-hub.png",
    reason: "Three ingress paths visibly mediate through one contract hub into two response paths; the archive alternative reads as a generic temple.",
  }),
  "skill/react@v1": Object.freeze({
    candidateId: "skill-react-r3-02-state-circuit",
    sourcePath: "design/career-world/targeted-regeneration/skills-openapi-react-r3/skill-react-r3-02-state-circuit.png",
    reason: "Parent-to-child component route and return state circuit are legible; the alternative reads as a generic courtyard.",
  }),
});

const categoryTargets = Object.freeze({
  city: Object.freeze({ mapRoleScale: 1, targetSourceOccupancy: 0.82 }),
  project: Object.freeze({ mapRoleScale: 0.44, targetSourceOccupancy: 0.72 }),
  skill: Object.freeze({ mapRoleScale: 0.28, targetSourceOccupancy: 0.64 }),
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, places = 3) => Number(value.toFixed(places));

async function inspectSource(sourcePath, category) {
  const image = sharp(sourcePath).removeAlpha();
  const metadata = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  let maxChannelDelta = 0;
  let foregroundCount = 0;
  let foregroundLuma = 0;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 2) {
    for (let x = 0; x < info.width; x += 2) {
      const offset = (y * info.width + x) * info.channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const delta = Math.max(red, green, blue) - Math.min(red, green, blue);
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      const luma = (red + green + blue) / 3;
      if (luma >= 58) {
        foregroundCount += 1;
        foregroundLuma += luma;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (foregroundCount === 0) {
    throw new Error("No readable foreground found in " + sourcePath);
  }
  const bboxWidth = maxX - minX + 1;
  const bboxHeight = maxY - minY + 1;
  const longAxisOccupancy = Math.max(bboxWidth / info.width, bboxHeight / info.height);
  const foregroundMeanLuma = foregroundLuma / foregroundCount;
  const target = categoryTargets[category];

  return {
    dimensions: { width: metadata.width, height: metadata.height },
    channelAudit: {
      maxSampledRgbDelta: maxChannelDelta,
      policy: "runtime grayscale filter is mandatory for every locked asset; source pixels remain unmodified",
    },
    toneAudit: {
      sampledForegroundMeanLuma: round(foregroundMeanLuma, 1),
      brightnessCompensation: round(clamp(112 / foregroundMeanLuma, 0.84, 1.18)),
      policy: "apply after grayscale conversion during final compositing",
    },
    framingAudit: {
      sampledForegroundBounds: { minX, minY, maxX, maxY },
      sampledLongAxisOccupancy: round(longAxisOccupancy),
      targetLongAxisOccupancy: target.targetSourceOccupancy,
      sourceFrameScale: round(clamp(target.targetSourceOccupancy / longAxisOccupancy, 0.78, 1.22)),
      mapRoleScale: target.mapRoleScale,
      policy: "sourceFrameScale normalizes differing concept margins; mapRoleScale preserves capital > project > skill",
    },
    projectionAudit: {
      status: "director-contact-sheet-pass",
      target: "orthographic true-isometric; azimuth 225 degrees; elevation 35.264 degrees; roll 0",
      policy: "reject perspective convergence or opposite-facing assets before final stitching",
    },
  };
}

function candidateFromSet(set, candidateId) {
  const candidate = set.record.assets.find((asset) => asset.id === candidateId);
  if (!candidate) {
    throw new Error("Missing candidate " + candidateId + " in " + set.catalog.id);
  }
  return {
    candidateId,
    sourcePath: path.posix.join(
      "design/career-world/concept-tournaments",
      set.catalog.folder,
      candidate.relativePath,
    ),
  };
}

const selected = [];
for (const set of review.sets) {
  const id = set.catalog.id;
  let selection = null;
  let lockType = null;
  let reason = null;

  if (targeted[id]) {
    selection = targeted[id];
    lockType = "director-targeted-regeneration-lock";
    reason = targeted[id].reason;
  } else if (set.status === "locked") {
    if (!set.record.lock?.asset?.relativePath) {
      throw new Error("Explicit lock has no selected asset: " + id);
    }
    selection = {
      candidateId: set.record.lock.asset.id,
      sourcePath: path.posix.join(
        "design/career-world/concept-tournaments",
        set.catalog.folder,
        set.record.lock.asset.relativePath,
      ),
    };
    lockType = "explicit-user-review-lock";
    reason = "Preserved exact explicit review lock.";
  } else if (promotions[id]) {
    selection = candidateFromSet(set, promotions[id].candidateId);
    lockType = "director-completed-review-lock";
    reason = promotions[id].reason;
  }

  if (!selection) {
    continue;
  }
  if (!["city", "project", "skill"].includes(set.catalog.category)) {
    throw new Error("Landmark lock unexpectedly includes " + set.catalog.category + ": " + id);
  }

  const absoluteSource = path.resolve(repoRoot, selection.sourcePath);
  if (!fs.existsSync(absoluteSource)) {
    throw new Error("Missing selected source " + absoluteSource);
  }
  const sourceBytes = fs.readFileSync(absoluteSource);
  const audit = await inspectSource(absoluteSource, set.catalog.category);
  selected.push({
    assetId: id,
    name: set.catalog.name,
    category: set.catalog.category,
    candidateId: selection.candidateId,
    sourcePath: selection.sourcePath.replaceAll("\\", "/"),
    sourceSha256: crypto.createHash("sha256").update(sourceBytes).digest("hex"),
    lockType,
    selectionReason: reason,
    sourceReviewStatus: set.status,
    audit,
  });
}

selected.sort((a, b) => a.category.localeCompare(b.category) || a.assetId.localeCompare(b.assetId));
const counts = Object.fromEntries(
  ["city", "project", "skill"].map((category) => [
    category,
    selected.filter((entry) => entry.category === category).length,
  ]),
);
if (selected.length !== 46 || counts.city !== 5 || counts.project !== 16 || counts.skill !== 25) {
  throw new Error("Expected 46 locked landmarks (5/16/25), got " + selected.length + " (" + counts.city + "/" + counts.project + "/" + counts.skill + ")");
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  reviewExport: {
    fileName: path.basename(reviewExportPath),
    sha256: crypto.createHash("sha256").update(reviewRaw).digest("hex"),
  },
  authority: "docs/career-world-production/regional-territory-contract.md",
  status: "locked-for-regional-layouts",
  counts: { total: selected.length, ...counts },
  normalizationContract: {
    sourcePolicy: "preserve exact selected source pixels",
    projection: "orthographic true-isometric; azimuth 225 degrees; elevation 35.264 degrees; roll 0",
    tone: "apply grayscale(1) then per-asset brightnessCompensation during final compositing",
    framing: "apply per-asset sourceFrameScale, then category mapRoleScale",
    hierarchy: { capital: 1, project: 0.44, skill: 0.28 },
    stopBoundary: "normalization metadata is locked; final stitched-map application is deferred",
  },
  exclusions: ["skill/safe-writes@v1", "skill/manifest-v3@v1"],
  mixedTransportPool: [
    "ambient/city-shuttle@v1",
    "ambient/commuter-car@v1",
    "ambient/delivery-van@v1",
    "ambient/cargo-boat@v1",
    "ambient/harbor-ferry@v1",
    "ambient/service-truck@v1",
    "ambient/work-skiff@v1",
  ],
  assets: selected,
};

const manifestPath = path.join(outputDir, "art-lock-manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

async function buildContactSheet(category, entries) {
  const cellWidth = 360;
  const imageHeight = 240;
  const captionHeight = 42;
  const columns = category === "city" ? 2 : category === "project" ? 3 : 4;
  const rows = Math.ceil(entries.length / columns);
  const composites = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * (imageHeight + captionHeight);
    const image = await sharp(path.resolve(repoRoot, entry.sourcePath))
      .resize(cellWidth, imageHeight, { fit: "contain", background: "#101419" })
      .png()
      .toBuffer();
    const shortLabel = entry.name.length > 42 ? entry.name.slice(0, 41) + "…" : entry.name;
    const caption = Buffer.from(
      '<svg width="' + cellWidth + '" height="' + captionHeight + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="100%" height="100%" fill="#101419"/>' +
      '<text x="12" y="17" fill="#f3f5f6" font-family="Segoe UI,Arial" font-size="12" font-weight="600">' +
      shortLabel.replaceAll("&", "&amp;").replaceAll("<", "&lt;") + "</text>" +
      '<text x="12" y="33" fill="#7f8b94" font-family="Consolas,monospace" font-size="9">' +
      entry.candidateId.replaceAll("&", "&amp;").replaceAll("<", "&lt;") + "</text></svg>",
    );
    composites.push({ input: image, left, top });
    composites.push({ input: caption, left, top: top + imageHeight });
  }

  await sharp({
    create: {
      width: cellWidth * columns,
      height: (imageHeight + captionHeight) * rows,
      channels: 3,
      background: "#101419",
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(auditDir, category + "-locked-contact-sheet.png"));
}

for (const category of ["city", "project", "skill"]) {
  await buildContactSheet(category, selected.filter((entry) => entry.category === category));
}

const warningSummary = {
  sourceColorNormalizationApplied: selected.filter((entry) => entry.audit.channelAudit.maxSampledRgbDelta > 4).map((entry) => entry.assetId),
  toneNormalizationApplied: selected.filter((entry) => Math.abs(entry.audit.toneAudit.brightnessCompensation - 1) > 0.08).map((entry) => entry.assetId),
  sourceFramingNormalizationApplied: selected.filter((entry) => Math.abs(entry.audit.framingAudit.sourceFrameScale - 1) > 0.08).map((entry) => entry.assetId),
};
fs.writeFileSync(
  path.join(auditDir, "normalization-summary.json"),
  JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: "PASS_WITH_NONDESTRUCTIVE_NORMALIZATION",
    counts,
    warnings: warningSummary,
    contactSheets: [
      "design/career-world/production-art/audit/city-locked-contact-sheet.png",
      "design/career-world/production-art/audit/project-locked-contact-sheet.png",
      "design/career-world/production-art/audit/skill-locked-contact-sheet.png",
    ],
    finalStitchCreated: false,
  }, null, 2) + "\n",
  "utf8",
);

const normalizedReviewHtml = [
  "<!doctype html>",
  '<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>',
  "<title>Career World locked-art normalization review</title>",
  "<style>html{background:#080b0e;color:#eef2f4;font-family:Inter,Segoe UI,sans-serif}body{margin:0;padding:28px}header{max-width:900px;margin:0 auto 26px}h1{margin:0 0 8px}p{color:#9ca8b1;line-height:1.45}h2{margin:34px 0 12px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}.card{background:#10151a;border:1px solid #2e3841;border-radius:12px;overflow:hidden}.frame{height:210px;display:flex;align-items:center;justify-content:center;background:#0b0e12;overflow:hidden}.frame img{width:100%;height:100%;object-fit:contain;transform-origin:center}.meta{padding:11px 13px 13px}.name{font-size:13px;font-weight:700}.detail{font:10px/1.5 Consolas,monospace;color:#89959e;margin-top:5px}</style></head><body>",
  "<header><h1>Locked art normalization review</h1><p>Non-destructive preview of the locked grayscale, tonal, and source-framing corrections. Category map-role scale remains capital 1.00, project 0.44, and skill 0.28. No final world stitch is present.</p></header>",
  ...["city", "project", "skill"].flatMap((category) => [
    "<section><h2>" + (category === "city" ? "Cities" : category[0].toUpperCase() + category.slice(1) + "s") + "</h2><div class=\"grid\">",
    ...selected.filter((entry) => entry.category === category).map((entry) => {
      const relativeSource = path.relative(auditDir, path.resolve(repoRoot, entry.sourcePath)).replaceAll("\\", "/");
      const brightness = entry.audit.toneAudit.brightnessCompensation;
      const frameScale = entry.audit.framingAudit.sourceFrameScale;
      return '<article class="card"><div class="frame"><img src="' + relativeSource + '" alt="' + entry.name.replaceAll('"', "&quot;") +
        '" style="filter:grayscale(1) brightness(' + brightness + ");transform:scale(" + frameScale +
        ')"></div><div class="meta"><div class="name">' + entry.name + '</div><div class="detail">tone ' + brightness +
        " | frame " + frameScale + " | map role " + entry.audit.framingAudit.mapRoleScale + "</div></div></article>";
    }),
    "</div></section>",
  ]),
  "</body></html>",
].join("\n");
fs.writeFileSync(path.join(auditDir, "normalized-review.html"), normalizedReviewHtml, "utf8");

const transportFamilies = [
  { assetId: "ambient/city-shuttle@v1", domain: "road", minimumDistinctInView: 2 },
  { assetId: "ambient/commuter-car@v1", domain: "road", minimumDistinctInView: 3 },
  { assetId: "ambient/delivery-van@v1", domain: "road", minimumDistinctInView: 2 },
  { assetId: "ambient/cargo-boat@v1", domain: "water", minimumDistinctInView: 1 },
  { assetId: "ambient/harbor-ferry@v1", domain: "water", minimumDistinctInView: 1 },
  { assetId: "ambient/service-truck@v1", domain: "road", minimumDistinctInView: 2 },
  { assetId: "ambient/work-skiff@v1", domain: "water", minimumDistinctInView: 1 },
];
const transportPool = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: "locked-as-mixed-variation-pool",
  selectionMode: "shuffle-without-immediate-local-repeat",
  rule: "Use all approved family variants; do not promote a single tournament winner.",
  domains: {
    road: ["ambient/city-shuttle@v1", "ambient/commuter-car@v1", "ambient/delivery-van@v1", "ambient/service-truck@v1"],
    water: ["ambient/cargo-boat@v1", "ambient/harbor-ferry@v1", "ambient/work-skiff@v1"],
  },
  families: transportFamilies.map((family) => {
    const set = review.sets.find((candidate) => candidate.catalog.id === family.assetId);
    if (!set) {
      throw new Error("Missing transport family " + family.assetId);
    }
    const manifestPath = path.join(repoRoot, "design", "career-world", "concept-tournaments", set.catalog.folder, "tournament-set.json");
    const sourceAssets = set.record?.assets ?? JSON.parse(fs.readFileSync(manifestPath, "utf8")).assets;
    const variants = sourceAssets.map((asset) => ({
      candidateId: asset.id,
      sourcePath: path.posix.join("design/career-world/concept-tournaments", set.catalog.folder, asset.relativePath ?? asset.src),
    }));
    for (const variant of variants) {
      if (!fs.existsSync(path.resolve(repoRoot, variant.sourcePath))) {
        throw new Error("Missing transport variant " + variant.sourcePath);
      }
    }
    return {
      ...family,
      name: set.catalog.name,
      sourceReviewStatus: set.status,
      variantCount: variants.length,
      variants,
    };
  }),
};
transportPool.totalVariantCount = transportPool.families.reduce((sum, family) => sum + family.variantCount, 0);
fs.writeFileSync(
  path.join(outputDir, "transport-pool-manifest.json"),
  JSON.stringify(transportPool, null, 2) + "\n",
  "utf8",
);

process.stdout.write(JSON.stringify({
  status: "PASS_WITH_NONDESTRUCTIVE_NORMALIZATION",
  total: selected.length,
  counts,
  manifest: path.relative(repoRoot, manifestPath),
  transportVariants: transportPool.totalVariantCount,
  warnings: Object.fromEntries(Object.entries(warningSummary).map(([key, value]) => [key, value.length])),
}, null, 2) + "\n");
