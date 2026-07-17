import databricksSvg from "simple-icons/icons/databricks.svg?raw";
import dockerSvg from "simple-icons/icons/docker.svg?raw";
import goSvg from "simple-icons/icons/go.svg?raw";
import openapiSvg from "simple-icons/icons/openapiinitiative.svg?raw";
import postgresqlSvg from "simple-icons/icons/postgresql.svg?raw";
import pythonSvg from "simple-icons/icons/python.svg?raw";
import reactSvg from "simple-icons/icons/react.svg?raw";
import redisSvg from "simple-icons/icons/redis.svg?raw";
import typescriptSvg from "simple-icons/icons/typescript.svg?raw";

export type TokenGlyph =
  | "anvil"
  | "boundary"
  | "braces"
  | "cloud"
  | "connector"
  | "context"
  | "contract"
  | "cube"
  | "flow"
  | "kaizen"
  | "measure"
  | "replay";

export type VisualToken =
  | {
      kind: "simple-icon";
      label: string;
      path: string;
    }
  | {
      kind: "glyph";
      label: string;
      glyph: TokenGlyph;
    }
  | {
      kind: "image-mask";
      label: string;
      src: string;
      crop: "face";
    };

type Rgb = readonly [number, number, number];

const goGopherUrl = "/go-gopher.png";

function simpleIcon(label: string, svg: string): VisualToken {
  const path = svg.match(/<path d="([^"]+)"/)?.[1];
  if (!path) throw new Error(`Missing Simple Icons path for ${label}`);
  return { kind: "simple-icon", label, path };
}

export const visualTokenByNodeId: Record<string, VisualToken> = {
  "safe-writes": { kind: "glyph", label: "Replay-safe write", glyph: "replay" },
  "context-compression": { kind: "glyph", label: "Context compression", glyph: "context" },
  "workflow-orchestration": { kind: "glyph", label: "Workflow", glyph: "flow" },
  "operator-control": { kind: "glyph", label: "Operator control", glyph: "flow" },
  "data-contracts": { kind: "glyph", label: "Data contract", glyph: "contract" },
  go: {
    kind: "image-mask",
    label: "Go gopher face",
    src: goGopherUrl,
    crop: "face",
  },
  typescript: simpleIcon("TypeScript", typescriptSvg),
  react: simpleIcon("React", reactSvg),
  aws: { kind: "glyph", label: "AWS cloud", glyph: "cloud" },
  postgresql: simpleIcon("PostgreSQL", postgresqlSvg),
  redis: simpleIcon("Redis", redisSvg),
  mcp: { kind: "glyph", label: "MCP connector", glyph: "connector" },
  openapi: simpleIcon("OpenAPI Initiative", openapiSvg),
  python: simpleIcon("Python", pythonSvg),
  docker: simpleIcon("Docker", dockerSvg),
  databricks: simpleIcon("Databricks", databricksSvg),
  csharp: { kind: "glyph", label: "C#", glyph: "braces" },
  localdb: { kind: "glyph", label: "LocalDB", glyph: "cube" },
  "manifest-v3": { kind: "glyph", label: "Manifest V3", glyph: "connector" },
};

export const visualTokenByProjectId: Record<string, VisualToken> = {
  "governed-agent-tooling": { kind: "glyph", label: "Kaizen", glyph: "kaizen" },
  "bounded-agent-context": { kind: "glyph", label: "ContextForge", glyph: "anvil" },
  "cross-provider-orchestration": { kind: "glyph", label: "Vendy", glyph: "cube" },
  "engineering-metrics-pipeline": { kind: "glyph", label: "Kaizen Metrics", glyph: "kaizen" },
  "tanium-risk-assessment": { kind: "glyph", label: "TRA", glyph: "boundary" },
  "uat-automation": { kind: "glyph", label: "UAT Automation", glyph: "flow" },
  cablecar: { kind: "glyph", label: "CableCar", glyph: "contract" },
  "xsearch-extension": { kind: "glyph", label: "xSearch", glyph: "connector" },
  "tmatch-eolmatch": { kind: "glyph", label: "T-Match", glyph: "braces" },
  "evidence-atlas": { kind: "glyph", label: "Evidence Atlas", glyph: "flow" },
};

export const visualTokenVariantsByNodeId: Partial<
  Record<string, readonly VisualToken[]>
> = {
  go: [
    visualTokenByNodeId.go,
    simpleIcon("Go wordmark", goSvg),
  ],
};

export function visualTokenForNode(nodeId: string, variantSeed = 0) {
  const fallback = visualTokenByNodeId[nodeId];
  const variants = visualTokenVariantsByNodeId[nodeId];
  if (!variants?.length) return fallback;
  const index = Math.abs(Math.trunc(variantSeed)) % variants.length;
  return variants[index] ?? fallback;
}

export function visualTokenForProject(projectId: string | null) {
  return projectId ? visualTokenByProjectId[projectId] : undefined;
}

const pathCache = new Map<string, Path2D>();
const imageCache = new Map<string, HTMLImageElement>();
const tokenSpriteCache = new Map<string, HTMLCanvasElement>();
const TOKEN_SPRITE_SIZE = 48;
const TOKEN_SPRITE_ICON_SIZE = 24;
const TOKEN_COLOR_STEP = 32;

export function preloadVisualTokenAssets() {
  if (typeof Image === "undefined") return;
  const imageTokens = Object.values(visualTokenByNodeId).filter(
    (token): token is Extract<VisualToken, { kind: "image-mask" }> =>
      token.kind === "image-mask",
  );
  for (const token of imageTokens) {
    if (imageCache.has(token.src)) continue;
    const image = new Image();
    image.decoding = "async";
    image.src = token.src;
    imageCache.set(token.src, image);
  }
}

preloadVisualTokenAssets();

function rgba(color: Rgb, alpha: number) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

function drawSimpleIcon(
  context: CanvasRenderingContext2D,
  path: string,
  size: number,
) {
  let iconPath = pathCache.get(path);
  if (!iconPath) {
    iconPath = new Path2D(path);
    pathCache.set(path, iconPath);
  }
  const scale = size / 24;
  context.translate(-size / 2, -size / 2);
  context.scale(scale, scale);
  context.fill(iconPath);
}

function drawImageMask(
  context: CanvasRenderingContext2D,
  token: Extract<VisualToken, { kind: "image-mask" }>,
  size: number,
  color: Rgb,
) {
  let image = imageCache.get(token.src);
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.src = token.src;
    imageCache.set(token.src, image);
  }
  if (!image.complete || image.naturalWidth === 0) return false;

  const source = { x: 50, y: 0, width: 412, height: 300 };
  context.translate(-size / 2, -size / 2);
  context.filter = "grayscale(0.2) contrast(1.15)";
  context.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    size,
    size,
  );
  context.filter = "none";
  context.globalCompositeOperation = "source-atop";
  context.fillStyle = rgba(color, 0.12);
  context.fillRect(0, 0, size, size);
  context.globalCompositeOperation = "source-over";
  return true;
}

function drawGlyph(
  context: CanvasRenderingContext2D,
  glyph: TokenGlyph,
  size: number,
) {
  const half = size / 2;
  const line = Math.max(1.2, size * 0.12);
  context.lineWidth = line;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (glyph === "cloud") {
    context.beginPath();
    context.moveTo(-half * 0.82, half * 0.28);
    context.bezierCurveTo(-half, -half * 0.15, -half * 0.56, -half * 0.42, -half * 0.26, -half * 0.3);
    context.bezierCurveTo(-half * 0.08, -half * 0.84, half * 0.62, -half * 0.78, half * 0.68, -half * 0.2);
    context.bezierCurveTo(half * 1.02, -half * 0.08, half, half * 0.36, half * 0.68, half * 0.42);
    context.lineTo(-half * 0.62, half * 0.42);
    context.closePath();
    context.fill();
    return;
  }

  if (glyph === "connector") {
    context.beginPath();
    context.arc(-half * 0.55, 0, line * 0.9, 0, Math.PI * 2);
    context.arc(half * 0.55, 0, line * 0.9, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(-half * 0.36, 0);
    context.bezierCurveTo(-half * 0.08, -half * 0.46, half * 0.08, half * 0.46, half * 0.36, 0);
    context.stroke();
    return;
  }

  if (glyph === "kaizen") {
    context.beginPath();
    context.moveTo(-half * 0.58, -half * 0.78);
    context.lineTo(-half * 0.24, -half * 0.78);
    context.lineTo(-half * 0.24, -half * 0.12);
    context.lineTo(half * 0.36, -half * 0.78);
    context.lineTo(half * 0.82, -half * 0.78);
    context.lineTo(half * 0.12, -half * 0.02);
    context.lineTo(half * 0.84, half * 0.78);
    context.lineTo(half * 0.36, half * 0.78);
    context.lineTo(-half * 0.24, half * 0.12);
    context.lineTo(-half * 0.24, half * 0.78);
    context.lineTo(-half * 0.58, half * 0.78);
    context.closePath();
    context.fill();
    return;
  }

  if (glyph === "anvil") {
    context.beginPath();
    context.moveTo(-half * 0.95, -half * 0.42);
    context.lineTo(half * 0.9, -half * 0.42);
    context.lineTo(half * 0.48, -half * 0.02);
    context.lineTo(half * 0.12, 0);
    context.lineTo(half * 0.12, half * 0.5);
    context.lineTo(half * 0.48, half * 0.78);
    context.lineTo(-half * 0.5, half * 0.78);
    context.lineTo(-half * 0.12, half * 0.5);
    context.lineTo(-half * 0.12, 0);
    context.lineTo(-half * 0.64, -half * 0.08);
    context.closePath();
    context.fill();
    return;
  }

  if (glyph === "braces") {
    context.beginPath();
    context.moveTo(-half * 0.18, -half * 0.82);
    context.bezierCurveTo(-half * 0.7, -half * 0.82, -half * 0.34, -half * 0.18, -half * 0.82, 0);
    context.bezierCurveTo(-half * 0.34, half * 0.18, -half * 0.7, half * 0.82, -half * 0.18, half * 0.82);
    context.moveTo(half * 0.18, -half * 0.82);
    context.bezierCurveTo(half * 0.7, -half * 0.82, half * 0.34, -half * 0.18, half * 0.82, 0);
    context.bezierCurveTo(half * 0.34, half * 0.18, half * 0.7, half * 0.82, half * 0.18, half * 0.82);
    context.stroke();
    return;
  }

  if (glyph === "cube") {
    context.beginPath();
    context.moveTo(0, -half * 0.86);
    context.lineTo(half * 0.75, -half * 0.42);
    context.lineTo(half * 0.75, half * 0.42);
    context.lineTo(0, half * 0.86);
    context.lineTo(-half * 0.75, half * 0.42);
    context.lineTo(-half * 0.75, -half * 0.42);
    context.closePath();
    context.moveTo(0, 0);
    context.lineTo(0, half * 0.86);
    context.moveTo(0, 0);
    context.lineTo(half * 0.75, -half * 0.42);
    context.moveTo(0, 0);
    context.lineTo(-half * 0.75, -half * 0.42);
    context.stroke();
    return;
  }

  if (glyph === "contract") {
    context.strokeRect(-half * 0.7, -half * 0.76, size * 0.88, size * 1.52);
    context.beginPath();
    context.moveTo(-half * 0.42, -half * 0.32);
    context.lineTo(half * 0.45, -half * 0.32);
    context.moveTo(-half * 0.42, 0);
    context.lineTo(half * 0.3, 0);
    context.moveTo(-half * 0.42, half * 0.32);
    context.lineTo(half * 0.12, half * 0.32);
    context.stroke();
    return;
  }

  if (glyph === "boundary") {
    context.beginPath();
    context.moveTo(0, -half * 0.84);
    context.lineTo(half * 0.68, -half * 0.48);
    context.lineTo(half * 0.56, half * 0.26);
    context.lineTo(0, half * 0.84);
    context.lineTo(-half * 0.56, half * 0.26);
    context.lineTo(-half * 0.68, -half * 0.48);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.arc(0, -half * 0.04, line * 0.9, 0, Math.PI * 2);
    context.fill();
    return;
  }

  if (glyph === "replay") {
    context.beginPath();
    context.arc(0, 0, half * 0.68, -Math.PI * 0.72, Math.PI * 1.05);
    context.stroke();
    context.beginPath();
    context.moveTo(-half * 0.78, -half * 0.58);
    context.lineTo(-half * 0.74, -half * 0.08);
    context.lineTo(-half * 0.28, -half * 0.42);
    context.closePath();
    context.fill();
    return;
  }

  if (glyph === "measure") {
    context.beginPath();
    context.moveTo(-half * 0.78, half * 0.62);
    context.lineTo(-half * 0.32, half * 0.05);
    context.lineTo(half * 0.02, half * 0.3);
    context.lineTo(half * 0.78, -half * 0.64);
    context.stroke();
    context.beginPath();
    for (const [x, y] of [[-0.78, 0.62], [-0.32, 0.05], [0.02, 0.3], [0.78, -0.64]]) {
      context.moveTo(x * half + line, y * half);
      context.arc(x * half, y * half, line, 0, Math.PI * 2);
    }
    context.fill();
    return;
  }

  if (glyph === "context") {
    context.beginPath();
    context.arc(0, 0, half * 0.78, -Math.PI * 0.72, Math.PI * 0.72);
    context.moveTo(-half * 0.12, -half * 0.46);
    context.lineTo(half * 0.48, 0);
    context.lineTo(-half * 0.12, half * 0.46);
    context.stroke();
    return;
  }

  context.beginPath();
  context.moveTo(-half * 0.58, -half * 0.48);
  context.lineTo(half * 0.58, 0);
  context.lineTo(-half * 0.58, half * 0.48);
  context.stroke();
  context.beginPath();
  for (const [x, y] of [[-0.58, -0.48], [0.58, 0], [-0.58, 0.48]]) {
    context.moveTo(x * half + line, y * half);
    context.arc(x * half, y * half, line, 0, Math.PI * 2);
  }
  context.fill();
}

export function drawVisualToken(
  context: CanvasRenderingContext2D,
  token: VisualToken,
  x: number,
  y: number,
  size: number,
  color: Rgb,
  alpha: number,
  rotation = 0,
  glow = true,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.fillStyle = rgba(color, alpha);
  context.strokeStyle = rgba(color, alpha);
  context.shadowColor = glow ? rgba(color, alpha * 0.72) : "transparent";
  context.shadowBlur = glow
    ? token.kind === "image-mask"
      ? Math.max(1.5, size * 0.12)
      : Math.max(3, size * 0.48)
    : 0;
  let drawn = true;
  if (token.kind === "simple-icon") {
    drawSimpleIcon(context, token.path, size);
  } else if (token.kind === "image-mask") {
    drawn = drawImageMask(context, token, size, color);
  } else {
    drawGlyph(context, token.glyph, size);
  }
  context.restore();
  return drawn;
}

function quantizeColor(color: Rgb): Rgb {
  return [
    Math.min(255, Math.round(color[0] / TOKEN_COLOR_STEP) * TOKEN_COLOR_STEP),
    Math.min(255, Math.round(color[1] / TOKEN_COLOR_STEP) * TOKEN_COLOR_STEP),
    Math.min(255, Math.round(color[2] / TOKEN_COLOR_STEP) * TOKEN_COLOR_STEP),
  ];
}

function tokenSpriteKey(token: VisualToken, color: Rgb, glow: boolean) {
  const identity = token.kind === "glyph"
    ? token.glyph
    : token.kind === "image-mask"
      ? `${token.label}:${token.crop}`
      : token.label;
  return `${identity}:${color.join("-")}:${glow ? "glow" : "flat"}`;
}

function getVisualTokenSprite(
  token: VisualToken,
  color: Rgb,
  glow: boolean,
) {
  if (typeof document === "undefined") return null;
  const spriteColor = quantizeColor(color);
  const key = tokenSpriteKey(token, spriteColor, glow);
  const cached = tokenSpriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = TOKEN_SPRITE_SIZE;
  canvas.height = TOKEN_SPRITE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const drawn = drawVisualToken(
    context,
    token,
    TOKEN_SPRITE_SIZE / 2,
    TOKEN_SPRITE_SIZE / 2,
    TOKEN_SPRITE_ICON_SIZE,
    spriteColor,
    1,
    0,
    glow,
  );
  if (!drawn) return null;
  tokenSpriteCache.set(key, canvas);
  return canvas;
}

export function drawVisualTokenSprite(
  context: CanvasRenderingContext2D,
  token: VisualToken,
  x: number,
  y: number,
  size: number,
  color: Rgb,
  alpha: number,
  rotation = 0,
  glow = true,
) {
  const sprite = getVisualTokenSprite(token, color, glow);
  if (!sprite) {
    drawVisualToken(context, token, x, y, size, color, alpha, rotation, glow);
    return;
  }

  const drawSize = size * (TOKEN_SPRITE_SIZE / TOKEN_SPRITE_ICON_SIZE);
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.globalAlpha *= alpha;
  context.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
  context.restore();
}
