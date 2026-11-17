// The shore: one winding path from the dark sea to the Keep, and the stone
// plots towers can be built on. Enemies travel by distance along the path,
// so targeting ("furthest along") and movement are both one number.

import { FIELD } from './config.js';

// Waypoints of the Ink Tide's road, in canvas coordinates. It snakes down
// the shore and climbs to the Keep at the top right.
export const PATH_POINTS = [
  { x: -40, y: 160 },
  { x: 1120, y: 160 },
  { x: 1120, y: 350 },
  { x: 160, y: 350 },
  { x: 160, y: 540 },
  { x: 1120, y: 540 },
  { x: 1120, y: 300 },
  { x: 1162, y: 300 },
];

export const PATH_WIDTH = 46;
export const KEEP = { x: 1208, y: 300, radius: 34 };

// Precomputed segment lengths, so pointAt(distance) is a cheap walk.
const segments = [];
let totalLength = 0;
for (let i = 0; i < PATH_POINTS.length - 1; i++) {
  const a = PATH_POINTS[i];
  const b = PATH_POINTS[i + 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  segments.push({ a, b, len, start: totalLength });
  totalLength += len;
}

export const PATH_LENGTH = totalLength;

// Position (and facing angle) at a distance along the path.
export function pointAt(d) {
  const clamped = Math.max(0, Math.min(d, totalLength));
  let seg = segments[segments.length - 1];
  for (const s of segments) {
    if (clamped <= s.start + s.len) { seg = s; break; }
  }
  const t = seg.len === 0 ? 0 : (clamped - seg.start) / seg.len;
  return {
    x: seg.a.x + (seg.b.x - seg.a.x) * t,
    y: seg.a.y + (seg.b.y - seg.a.y) * t,
    angle: Math.atan2(seg.b.y - seg.a.y, seg.b.x - seg.a.x),
  };
}

// Buildable plots: a grid in the bands between the path's runs, each at
// least 55 px from any path centreline and clear of the Keep.
function buildPlots() {
  const plots = [];
  const cols = [100, 260, 420, 580, 740, 900, 1060];
  const rows = [100, 255, 445, 600];
  let id = 0;
  for (const y of rows) {
    for (const x of cols) {
      if (Math.hypot(x - KEEP.x, y - KEEP.y) < 95) continue;
      plots.push({ id: id++, x, y, radius: 26, tower: null });
    }
  }
  return plots;
}

export const PLOTS = buildPlots();

// The plot under a point, if any.
export function plotAt(x, y) {
  for (const p of PLOTS) {
    if (Math.hypot(x - p.x, y - p.y) <= p.radius + 6) return p;
  }
  return null;
}

// Is a point inside the playable field (below the HUD, above the build bar)?
export function inField(x, y) {
  return x >= FIELD.left && x <= FIELD.right && y >= FIELD.top && y <= FIELD.bottom;
}
