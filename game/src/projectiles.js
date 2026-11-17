// Projectiles: homing bolts and shells. A projectile chases its target's
// current position; if the target dies mid-flight it flies on to the last
// known spot and fizzles (or bursts, for splash shells).

import { dist2 } from './utils.js';

export function createProjectile(spec) {
  return {
    x: spec.x, y: spec.y,
    target: spec.target,
    lastX: spec.target.x, lastY: spec.target.y,
    kind: spec.kind,
    dmg: spec.dmg,
    splash: spec.splash || 0,
    speed: spec.speed,
    alive: true,
    trail: [], // past positions, for the renderer's motion streak
  };
}

// Move every projectile; on impact, report the hit to `onHit(projectile,
// x, y)` and let the caller apply damage (so splash stays in one place).
export function updateProjectiles(projectiles, dt, onHit) {
  for (const p of projectiles) {
    if (!p.alive) continue;
    const t = p.target && p.target.alive ? p.target : null;
    const tx = t ? t.x : p.lastX;
    const ty = t ? t.y : p.lastY;
    if (t) { p.lastX = t.x; p.lastY = t.y; }
    const dx = tx - p.x;
    const dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 5) p.trail.shift();
    if (d <= Math.max(step, 8)) {
      p.alive = false;
      onHit(p, tx, ty);
      continue;
    }
    p.x += (dx / d) * step;
    p.y += (dy / d) * step;
  }
}

// Enemies within a splash radius of a point (for mortar/prism bursts).
export function enemiesInRadius(enemies, x, y, radius) {
  const r2 = radius * radius;
  const out = [];
  for (const e of enemies) {
    if (!e.alive || e.s < 0) continue;
    if (dist2(x, y, e.x, e.y) <= r2) out.push(e);
  }
  return out;
}
