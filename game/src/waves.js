// Waves: turning a wave definition into a spawn schedule, and knowing when
// a wave is over (queue empty and every enemy dead or leaked).

import { WAVES, TOTAL_WAVES } from './config.js';

// Build the spawn queue for a wave: a time-sorted list of { at, type, hp, gold }.
export function buildQueue(waveIndex) {
  const wave = WAVES[waveIndex];
  const queue = [];
  for (const group of wave.groups) {
    const delay = group.delay ?? 0;
    for (let i = 0; i < group.count; i++) {
      queue.push({ at: delay + i * group.gap, type: group.type, hp: group.hp, gold: group.gold });
    }
  }
  queue.sort((a, b) => a.at - b.at);
  return queue;
}

export function totalEnemies(waveIndex) {
  return WAVES[waveIndex].groups.reduce((n, g) => n + g.count, 0);
}

export function isBossWave(waveIndex) {
  return WAVES[waveIndex].groups.some((g) => g.type === 'titan');
}

export function waveBanner(waveIndex) {
  return WAVES[waveIndex].banner || `WAVE ${waveIndex + 1}`;
}

export function isLastWave(waveIndex) {
  return waveIndex >= TOTAL_WAVES - 1;
}

// A wave is cleared when nothing is left to spawn and nothing is alive.
export function isWaveCleared(queue, enemies) {
  if (queue.length > 0) return false;
  return !enemies.some((e) => e.alive);
}
