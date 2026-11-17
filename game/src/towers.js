// Towers: definitions, placement, targeting, firing, upgrades, selling.
// A tower's level indexes its definition's levels array (0-based).

import { TOWERS } from './config.js';
import { dist2 } from './utils.js';
import { applySlow } from './enemies.js';

let nextId = 1;

export function towerStats(tower) {
  return tower.def.levels[tower.level];
}

export function towerSellValue(tower) {
  return Math.floor(tower.invested * 0.7);
}

export function createTower(kind, plot) {
  const def = TOWERS[kind];
  return {
    id: nextId++,
    kind,
    def,
    plot,
    x: plot.x,
    y: plot.y,
    level: 0,
    invested: def.cost,
    cooldown: 0,
    angle: -Math.PI / 2,
    recoil: 0, // barrel kick after firing (render)
    pulse: 0, // gale ring-pulse timer (render)
  };
}

export function upgradeCost(tower) {
  const next = tower.def.levels[tower.level + 1];
  return next ? next.cost : null;
}

export function canUpgrade(tower) {
  return tower.level < tower.def.levels.length - 1;
}

export function upgradeTower(tower) {
  const cost = upgradeCost(tower);
  if (cost === null) return false;
  tower.level += 1;
  tower.invested += cost;
  return true;
}

// Furthest-along enemy inside the tower's range (standard "first" targeting).
export function findTarget(tower, enemies) {
  const stats = towerStats(tower);
  const range2 = stats.range * stats.range;
  let best = null;
  for (const e of enemies) {
    if (!e.alive || e.s < 0) continue;
    if (dist2(tower.x, tower.y, e.x, e.y) > range2) continue;
    if (!best || e.s > best.s) best = e;
  }
  return best;
}

// One tower's behaviour for a step. `fx` is { spawnProjectile, damage }:
// firing towers spawn a projectile, the Gale Fan damages through its aura.
export function updateTower(tower, enemies, dt, now, fx) {
  const stats = towerStats(tower);
  tower.cooldown -= dt;
  tower.recoil = Math.max(0, tower.recoil - dt * 6);

  if (tower.kind === 'gale') {
    // Aura: slow everything in range, and pulse damage on a timer.
    const range2 = stats.range * stats.range;
    let any = false;
    for (const e of enemies) {
      if (!e.alive || e.s < 0) continue;
      if (dist2(tower.x, tower.y, e.x, e.y) <= range2) {
        applySlow(e, stats.slow, stats.slowDur, now);
        any = true;
      }
    }
    tower.pulse -= dt;
    if (any && tower.cooldown <= 0) {
      tower.cooldown = 1 / stats.rate;
      tower.pulse = 0.35;
      for (const e of enemies) {
        if (!e.alive || e.s < 0) continue;
        if (dist2(tower.x, tower.y, e.x, e.y) <= range2) {
          fx.damage(e, stats.dmg, { quiet: true });
        }
      }
    }
    return;
  }

  const target = findTarget(tower, enemies);
  if (!target) return;
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  if (tower.cooldown > 0) return;
  tower.cooldown = 1 / stats.rate;
  tower.recoil = 1;
  fx.spawnProjectile({
    x: tower.x, y: tower.y, target, kind: tower.kind,
    dmg: stats.dmg, splash: stats.splash || 0,
    speed: tower.kind === 'nova' ? 340 : 520,
  });
}
