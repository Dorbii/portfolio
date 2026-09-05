// Geometry only: no light, colour grade, or independent coastline authoring.
export function distanceTransform(mask, width, height, target) {
  const distance = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) distance[i] = mask[i] === target ? 0 : 1e6;
  const diagonal = Math.SQRT2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let d = distance[i];
      if (x) d = Math.min(d, distance[i - 1] + 1);
      if (y) {
        d = Math.min(d, distance[i - width] + 1);
        if (x) d = Math.min(d, distance[i - width - 1] + diagonal);
        if (x + 1 < width) d = Math.min(d, distance[i - width + 1] + diagonal);
      }
      distance[i] = d;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      let d = distance[i];
      if (x + 1 < width) d = Math.min(d, distance[i + 1] + 1);
      if (y + 1 < height) {
        d = Math.min(d, distance[i + width] + 1);
        if (x) d = Math.min(d, distance[i + width - 1] + diagonal);
        if (x + 1 < width) d = Math.min(d, distance[i + width + 1] + diagonal);
      }
      distance[i] = d;
    }
  }
  return distance;
}

export function classifyWater(land, shore, width, height, pixelsPerMetre) {
  const sea = new Uint8Array(land.length);
  const queue = new Uint32Array(land.length);
  let head = 0, tail = 0;
  const seed = (i) => {
    if (!land[i] && !sea[i]) { sea[i] = 1; queue[tail++] = i; }
  };
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 1; y + 1 < height; y++) { seed(y * width); seed(y * width + width - 1); }
  while (head < tail) {
    const i = queue[head++], x = i % width;
    if (x) seed(i - 1);
    if (x + 1 < width) seed(i + 1);
    if (i >= width) seed(i - width);
    if (i + width < land.length) seed(i + width);
  }
  // Distance along a channel to broad, sea-connected water. Closed pools have
  // no evidenced outlet and deliberately receive ripples rather than a guessed
  // river direction. This is a visual flow potential, not surveyed hydrology.
  const potential = new Int32Array(land.length).fill(-1);
  const broad = 8 * pixelsPerMetre;
  head = 0; tail = 0;
  for (let i = 0; i < land.length; i++) {
    if (sea[i] && shore[i] >= broad) potential[i] = 0;
  }
  for (let y = 1; y + 1 < height; y++) {
    for (let x = 1; x + 1 < width; x++) {
      const i = y * width + x;
      if (!land[i] && sea[i] && potential[i] < 0 &&
        [i - 1, i + 1, i - width, i + width].some((j) => potential[j] === 0)) {
        potential[i] = 1; queue[tail++] = i;
      }
    }
  }
  const visit = (i, value) => {
    if (!land[i] && sea[i] && potential[i] < 0) { potential[i] = value; queue[tail++] = i; }
  };
  while (head < tail) {
    const i = queue[head++], x = i % width, value = potential[i] + 1;
    if (x) visit(i - 1, value);
    if (x + 1 < width) visit(i + 1, value);
    if (i >= width) visit(i - width, value);
    if (i + width < land.length) visit(i + width, value);
  }
  return { sea, potential };
}

export function encodeWaterField(land, width, height, metresPerPixel, rangeMetres) {
  const shore = distanceTransform(land, width, height, 1);
  const dry = distanceTransform(land, width, height, 0);
  const { sea, potential } = classifyWater(land, shore, width, height, 1 / metresPerPixel);
  const data = Buffer.alloc(land.length * 3);
  const byte = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255);
  let pools = 0, streams = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const signed = (land[i] ? -dry[i] : shore[i]) * metresPerPixel;
      data[i * 3] = byte(0.5 + signed / (2 * rangeMetres));
      let vx = 0, vy = 0;
      if (!land[i] && !sea[i]) { vy = 0.2; pools++; }
      if (!land[i] && sea[i] && potential[i] * metresPerPixel > 15) {
        let best = potential[i], dx = 0, dy = 0;
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = x + ox, ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const p = potential[ny * width + nx];
          if (p >= 0 && p < best) { best = p; dx = ox; dy = oy; }
        }
        vx = dx * 0.6; vy = dy * 0.6; streams++;
      }
      data[i * 3 + 1] = byte(0.5 + vx * 0.5);
      data[i * 3 + 2] = byte(0.5 + vy * 0.5);
    }
  }
  return { data, stats: { pools, streams, seaPixels: sea.reduce((a, b) => a + b, 0) } };
}

export function applyFlowFeature(data, land, width, height, points, radius, strength) {
  const distances = new Map();
  for (let s = 1; s < points.length; s++) {
    const a = points[s - 1], b = points[s];
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    if (!length) continue;
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - radius));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0]) + radius));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - radius));
    const y1 = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1]) + radius));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * width + x;
        if (land[i]) continue;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (length * length)));
        const d = Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
        if (d > radius || d >= (distances.get(i) ?? Infinity)) continue;
        distances.set(i, d);
        data[i * 3 + 1] = Math.round((0.5 + dx / length * strength * 0.5) * 255);
        data[i * 3 + 2] = Math.round((0.5 + dy / length * strength * 0.5) * 255);
      }
    }
  }
  return distances.size;
}

// Unfinished grid edges are not authored coasts. Mark only ocean whose nearest
// bank is land cut off by the served tile footprint; never alter coverage/R.
// Ocean's otherwise-unused tiny negative-X flow code stays below the inland
// classification threshold. RGB avoids browser alpha premultiplication.
export function markProvisionalCoast(data, land, width, height, rectangles, rangePixels) {
  const covered = new Uint8Array(width * height), cuts = new Uint8Array(width * height);
  for (const { x, y, w, h } of rectangles)
    for (let row = y; row < y + h; row++) covered.fill(1, row * width + x, row * width + x + w);
  const seed = (x, y, nx, ny) => {
    if (x < 0 || y < 0 || x >= width || y >= height || !land[y * width + x]) return;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height || !covered[ny * width + nx]) cuts[y * width + x] = 1;
  };
  for (const { x, y, w, h } of rectangles) {
    for (let row = y; row < y + h; row++) { seed(x, row, x - 1, row); seed(x + w - 1, row, x + w, row); }
    for (let col = x; col < x + w; col++) { seed(col, y, col, y - 1); seed(col, y + h - 1, col, y + h); }
  }
  const distance = distanceTransform(cuts, width, height, 1);
  let marked = 0;
  for (let i = 0; i < land.length; i++) {
    if (land[i] || Math.hypot(data[i * 3 + 1] - 128, data[i * 3 + 2] - 128) > 2) continue;
    const shore = (data[i * 3] / 255 - 0.5) * 2 * rangePixels;
    const nearCut = 1 - Math.min(1, Math.max(0, distance[i] - shore) / (rangePixels * 0.22));
    const rangeFade = 1 - Math.min(1, Math.max(0, distance[i] - rangePixels * 0.78) / (rangePixels * 0.22));
    const code = Math.round(128 - 5 * nearCut * rangeFade);
    if (code < 128) { data[i * 3 + 1] = code; marked++; }
  }
  return marked;
}
