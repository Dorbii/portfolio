// Infer a small branch rig from protrusions in the actual crown silhouette.
// These are approximate joints, not recovered botanical anatomy. A smooth
// outline without a branch tip gets no invented branch on that side.
export function deriveBranchJoints(mask, width, height, foot, crownHeight) {
  const result = [];
  for (const side of [-1, 1]) {
    const reach = new Float64Array(height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (mask[y * width + x]) reach[y] = Math.max(reach[y], (x - foot[0]) * side);
      }
    }
    const smooth = Array.from(reach, (_, y) => {
      let sum = 0, count = 0;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy += 1) {
        sum += reach[yy]; count += 1;
      }
      return sum / count;
    });
    const spacing = Math.max(4, Math.round(crownHeight * 0.12));
    const candidates = [];
    for (let y = 2; y < height - 2; y += 1) {
      const above = (foot[1] - y) / crownHeight;
      if (above < 0.18 || above > 0.90 || smooth[y] < 4) continue;
      if (smooth[y] < smooth[y - 1] || smooth[y] <= smooth[y + 1]) continue;
      const shoulder = Math.max(
        Math.min(...smooth.slice(Math.max(0, y - spacing), y)),
        Math.min(...smooth.slice(y + 1, Math.min(height, y + spacing + 1))),
      );
      const prominence = smooth[y] - shoulder;
      if (prominence >= 1) candidates.push({ y, prominence });
    }
    candidates.sort((a, b) => b.prominence - a.prominence || a.y - b.y);
    const chosen = [];
    for (const candidate of candidates) {
      if (chosen.every(y => Math.abs(y - candidate.y) >= spacing)) chosen.push(candidate.y);
      if (chosen.length === 4) break;
    }
    // Pine tips hang below their attachment. Store attachment height above
    // the foot, normalized to the crown; zero marks an unused joint slot.
    const joints = chosen.map(y => Math.min(0.96, (foot[1] - y) / crownHeight + 0.04)).sort((a, b) => a - b);
    while (joints.length < 4) joints.push(0);
    result.push(joints);
  }
  return result;
}
