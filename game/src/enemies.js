// The Ink Tide: enemy kinds, spawning, movement along the path, slowing,
// splitting, and what happens when one reaches the Keep.

import { ENEMIES, hpMultiplier, speedMultiplier } from './config.js';
import { PATH_LENGTH, pointAt } from './map.js';
import { rand } from './utils.js';

let nextId = 1;

// Spawn one enemy of a kind for a wave. `overrides` lets boss waves set HP
// and gold (the later Titans are worth more).
export function spawnEnemy(kind, wave, difficulty, overrides = {}) {
  const def = ENEMIES[kind];
  const boss = !!def.boss;
  const hpMul = boss ? 1 : hpMultiplier(wave) * difficulty.hpMul;
  const maxHp = Math.round((overrides.hp ?? def.hp) * hpMul);
  const gold = overrides.gold ?? def.gold;
  return {
    id: nextId++,
    kind,
    def,
    x: -60, y: 160, angle: 0,
    s: -rand(0, 24), // small stagger so a group does not stack perfectly
    speed: def.speed * speedMultiplier(wave) * rand(0.94, 1.06),
    hp: maxHp,
    maxHp,
    radius: def.radius,
    gold,
    leak: def.leak,
    slowUntil: 0,
    slowFactor: 0,
    flashUntil: 0, // hit-flash timer (render)
    wobble: rand(0, Math.PI * 2), // per-enemy animation phase
    alive: true,
    leaked: false,
    reachedEnd: false,
  };
}

// Move every enemy; returns the ones that reached the Keep this step.
export function updateEnemies(enemies, dt, now, onLeak) {
  const leaked = [];
  for (const e of enemies) {
    if (!e.alive) continue;
    const slowed = now < e.slowUntil;
    const factor = slowed ? 1 - e.slowFactor : 1;
    e.s += e.speed * factor * dt;
    if (e.s >= PATH_LENGTH) {
      e.alive = false;
      e.leaked = true;
      e.reachedEnd = true;
      leaked.push(e);
      if (onLeak) onLeak(e);
      continue;
    }
    const p = pointAt(Math.max(0, e.s));
    e.x = p.x;
    e.y = p.y;
    e.angle = p.angle;
  }
  return leaked;
}

// Apply a slow: the strongest slow wins, its duration refreshes.
export function applySlow(e, factor, duration, now) {
  if (factor >= e.slowFactor || now >= e.slowUntil) {
    e.slowFactor = factor;
    e.slowUntil = now + duration;
  } else {
    e.slowUntil = Math.max(e.slowUntil, now + duration * 0.5);
  }
}

// Damage an enemy. Returns 'dead' | 'alive'. Death spawns splits.
export function damageEnemy(e, amount, now, spawnSplit) {
  if (!e.alive) return 'dead';
  e.hp -= amount;
  e.flashUntil = now + 0.09;
  if (e.hp > 0) return 'alive';
  e.alive = false;
  if (e.def.splits && spawnSplit) {
    for (let i = 0; i < e.def.splitCount; i++) {
      spawnSplit(e.def.splits, e.s, e.hp);
    }
  }
  return 'dead';
}

export function isSlowed(e, now) {
  return now < e.slowUntil;
}
