type Pair = readonly [number, number];

export interface WaveDomain {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8ClampedArray;
  readonly worldMetres: Pair;
  readonly rangeMetres: number;
}

export interface WaveSite {
  readonly id: number;
  readonly kind: "breaker" | "impact";
  readonly center: Pair;
  readonly direction: Pair;
  readonly length: number;
  readonly height: number;
  readonly period: number;
  readonly offset: number;
  readonly seed: number;
}

export interface WaveEvent extends WaveSite {
  readonly age: number;
  readonly strength: number;
}

interface FieldSample {
  readonly distance: number;
  readonly flow: Pair;
  readonly green: number;
}

const BREAKER_LIFETIME = 9;
const IMPACT_LIFETIME = 5;
const BREAKER_TRAVEL_START = -10;
const BREAKER_TRAVEL_END = 12.5;
const FOOTPRINT_CLEARANCE = 10;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function hash32(a: number, b = 0, c = 0): number {
  let value = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77) ^ Math.imul(c | 0, 0xc2b2ae3d)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function unit(seed: number): number {
  return hash32(seed) / 0x1_0000_0000;
}

function normalize(x: number, y: number, fallback: Pair = [1, 0]): Pair {
  const magnitude = Math.hypot(x, y);
  return Number.isFinite(magnitude) && magnitude > 1e-8 ? [x / magnitude, y / magnitude] : fallback;
}

function sample(domain: WaveDomain, point: Pair): FieldSample | undefined {
  const [worldWidth, worldHeight] = domain.worldMetres;
  if (point[0] < 0 || point[1] < 0 || point[0] >= worldWidth || point[1] >= worldHeight) return undefined;
  const x = Math.min(domain.width - 1, Math.floor(point[0] / worldWidth * domain.width));
  const y = Math.min(domain.height - 1, Math.floor(point[1] / worldHeight * domain.height));
  const index = (y * domain.width + x) * 4;
  const red = domain.rgba[index];
  const green = domain.rgba[index + 1];
  const blue = domain.rgba[index + 2];
  return {
    distance: (red / 255 * 2 - 1) * domain.rangeMetres,
    flow: [green / 255 * 2 - 1, blue / 255 * 2 - 1],
    green,
  };
}

function validDomain(domain: WaveDomain): boolean {
  return Number.isInteger(domain.width) && domain.width > 0
    && Number.isInteger(domain.height) && domain.height > 0
    && domain.rgba.length >= domain.width * domain.height * 4
    && domain.worldMetres.length === 2
    && domain.worldMetres.every((value) => Number.isFinite(value) && value > 0)
    && Number.isFinite(domain.rangeMetres) && domain.rangeMetres > 0;
}

function openFootprintIsClear(domain: WaveDomain, center: Pair, direction: Pair, length: number): boolean {
  const lateral: Pair = [-direction[1], direction[0]];
  const alongStart = BREAKER_TRAVEL_START - FOOTPRINT_CLEARANCE;
  const alongEnd = BREAKER_TRAVEL_END + FOOTPRINT_CLEARANCE;
  const halfWidth = length * 0.5 + FOOTPRINT_CLEARANCE;
  const alongSteps = Math.max(1, Math.ceil((alongEnd - alongStart) / 7));
  const lateralSteps = Math.max(1, Math.ceil((halfWidth * 2) / 7));
  for (let ai = 0; ai <= alongSteps; ai++) {
    const along = alongStart + (alongEnd - alongStart) * ai / alongSteps;
    for (let li = 0; li <= lateralSteps; li++) {
      const across = -halfWidth + halfWidth * 2 * li / lateralSteps;
      const field = sample(domain, [
        center[0] + direction[0] * along + lateral[0] * across,
        center[1] + direction[1] * along + lateral[1] * across,
      ]);
      if (!field || field.distance <= 0 || Math.hypot(...field.flow) >= 0.045) return false;
    }
  }
  return true;
}

function createBreakerCandidates(domain: WaveDomain, direction: Pair): Omit<WaveSite, "id">[] {
  const spacing = 114;
  const columns = Math.ceil(domain.worldMetres[0] / spacing);
  const rows = Math.ceil(domain.worldMetres[1] / spacing);
  const sites: Omit<WaveSite, "id">[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const seed = hash32(column, row, 0x62726561);
      const center: Pair = [
        (column + 0.5 + (unit(seed ^ 0x31) - 0.5) * 0.46) * spacing,
        (row + 0.5 + (unit(seed ^ 0x73) - 0.5) * 0.46) * spacing,
      ];
      const length = 24 + unit(seed ^ 0xa1) * 24;
      if (!openFootprintIsClear(domain, center, direction, length)) continue;
      const period = 24 + unit(seed ^ 0xb7) * 24;
      sites.push({
        kind: "breaker",
        center,
        direction,
        length,
        height: 4 + unit(seed ^ 0xc3) * 6,
        period,
        offset: unit(seed ^ 0xd9) * period,
        seed,
      });
    }
  }
  return sites;
}

function createImpactCandidates(domain: WaveDomain): Omit<WaveSite, "id">[] {
  const step = 5;
  const candidates: Omit<WaveSite, "id">[] = [];
  for (let y = step * 0.5, row = 0; y < domain.worldMetres[1]; y += step, row++) {
    for (let x = step * 0.5, column = 0; x < domain.worldMetres[0]; x += step, column++) {
      const field = sample(domain, [x, y]);
      if (!field || field.distance <= 0.3 || field.distance > 6.5 || field.green < 127 || Math.hypot(...field.flow) >= 0.14) continue;
      const epsilon = 2;
      const left = sample(domain, [x - epsilon, y])?.distance;
      const right = sample(domain, [x + epsilon, y])?.distance;
      const above = sample(domain, [x, y - epsilon])?.distance;
      const below = sample(domain, [x, y + epsilon])?.distance;
      if ([left, right, above, below].some((value) => value === undefined)) continue;
      const gradient = normalize(right! - left!, below! - above!, [0, 0]);
      if (gradient[0] === 0 && gradient[1] === 0) continue;
      const direction: Pair = [-gradient[0], -gradient[1]];
      const center: Pair = [
        x + direction[0] * Math.max(0, field.distance - 0.8),
        y + direction[1] * Math.max(0, field.distance - 0.8),
      ];
      const projected = sample(domain, center);
      if (!projected || projected.distance <= 0 || projected.green < 127 || Math.hypot(...projected.flow) >= 0.14) continue;
      const seed = hash32(column, row, 0x696d7061);
      const period = 31 + unit(seed ^ 0x47) * 27;
      candidates.push({
        kind: "impact",
        center,
        direction,
        length: 8 + unit(seed ^ 0x59) * 10,
        height: 5 + unit(seed ^ 0x6d) * 7,
        period,
        offset: unit(seed ^ 0x83) * period,
        seed,
      });
    }
  }

  candidates.sort((a, b) => hash32(a.seed, 0x73706163) - hash32(b.seed, 0x73706163) || a.seed - b.seed);
  const spaced: Omit<WaveSite, "id">[] = [];
  for (const candidate of candidates) {
    if (spaced.every((site) => Math.hypot(site.center[0] - candidate.center[0], site.center[1] - candidate.center[1]) >= 35)) {
      spaced.push(candidate);
    }
  }
  return spaced;
}

export function createWaveEventCatalog(domain: WaveDomain, windRadians: number): readonly WaveSite[] {
  if (!validDomain(domain)) return Object.freeze([]);
  const radians = Number.isFinite(windRadians) ? windRadians : 0;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const direction = normalize((cosine - sine) * 0.8660254, (cosine + sine) * 0.5);
  const candidates = [...createBreakerCandidates(domain, direction), ...createImpactCandidates(domain)];
  candidates.sort((a, b) => a.kind.localeCompare(b.kind) || a.center[1] - b.center[1] || a.center[0] - b.center[0] || a.seed - b.seed);
  return Object.freeze(candidates.map((site, id) => Object.freeze({ id, ...site })));
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function intersectsCamera(site: WaveSite, camera: { origin: Pair; span: Pair }, worldMetres: Pair): boolean {
  if (!worldMetres.every((value) => Number.isFinite(value) && value > 0)) return false;
  const originX = (Number.isFinite(camera.origin[0]) ? camera.origin[0] : 0) * worldMetres[0];
  const originY = (Number.isFinite(camera.origin[1]) ? camera.origin[1] : 0) * worldMetres[1];
  const spanX = Math.max(0, Number.isFinite(camera.span[0]) ? camera.span[0] * worldMetres[0] : worldMetres[0]);
  const spanY = Math.max(0, Number.isFinite(camera.span[1]) ? camera.span[1] * worldMetres[1] : worldMetres[1]);
  const radius = site.length * 0.5 + site.height + (site.kind === "breaker" ? 23 : 10);
  return site.center[0] + radius >= originX && site.center[0] - radius <= originX + spanX
    && site.center[1] + radius >= originY && site.center[1] - radius <= originY + spanY;
}

export function selectWaveEvents(
  sites: readonly WaveSite[],
  seconds: number,
  weather: number,
  camera: { origin: Pair; span: Pair },
  worldMetres: Pair,
  maximum = 8,
): readonly WaveEvent[] {
  const time = Number.isFinite(seconds) ? seconds : 0;
  const normalizedWeather = clamp(Number.isFinite(weather) ? weather : 0, 0, 1);
  const limit = Number.isFinite(maximum) ? Math.max(0, Math.floor(maximum)) : 8;
  if (limit === 0) return Object.freeze([]);

  const events: Array<WaveEvent & { priority: number }> = [];
  for (const site of sites) {
    if (!Number.isFinite(site.period) || site.period <= 0 || !intersectsCamera(site, camera, worldMetres)) continue;
    const age = positiveModulo(time + (Number.isFinite(site.offset) ? site.offset : 0), site.period);
    const lifetime = site.kind === "impact" ? IMPACT_LIFETIME : BREAKER_LIFETIME;
    if (age >= lifetime) continue;
    const propensity = unit(site.seed ^ 0xad6d6974);
    const admission = smoothstep(propensity - 0.16, propensity + 0.16, 0.08 + normalizedWeather * 0.92);
    if (admission <= 0.01) continue;
    const lifeEnvelope = (0.2 + smoothstep(0, 0.65, age) * 0.8) * (1 - smoothstep(lifetime - 1.4, lifetime, age));
    const strength = clamp((0.28 + normalizedWeather * 0.72) * admission * lifeEnvelope, 0, 1);
    if (strength <= 0) continue;
    const cycle = Math.floor((time + site.offset) / site.period);
    events.push({ ...site, age, strength, priority: hash32(site.seed, cycle, site.kind === "impact" ? 1 : 0) });
  }
  events.sort((a, b) => a.priority - b.priority || a.id - b.id);
  return Object.freeze(events.slice(0, limit).map(({ priority: _priority, ...event }) => Object.freeze(event)));
}
