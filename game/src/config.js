// Lumen Keep — balance bible: every number the game plays by lives here.
// One file, so tuning never means hunting through the systems.

export const VIEW = { W: 1280, H: 720 };
// The playable field: below the top HUD bar, above the bottom build bar.
export const FIELD = { top: 48, bottom: 644, left: 0, right: 1280 };

export const COLORS = {
  sky0: '#0b1026', sky1: '#141b3d', ground: '#1a2340', groundDark: '#121830',
  path: '#3a3350', pathEdge: '#574b73', plot: '#232c4d', plotEdge: '#3d4a75',
  keep: '#ffd166', gold: '#ffcf3f', life: '#ff5d73', ink: '#e8ecff',
  muted: '#93a0c8', panel: 'rgba(13, 18, 42, 0.92)', panelEdge: '#39477f',
};

export const ECONOMY = {
  startGold: 150,
  waveBonusBase: 20, // + this per wave cleared, times the wave number's factor
  waveBonusPerWave: 4, // bonus = base + perWave * wave
  interestRate: 0.04, // paid on banked gold at wave clear
  interestCap: 25,
  sellRate: 0.7, // refund of everything invested in the tower
  scorePerGold: 10, // score per gold earned from kills
  scorePerWave: 50, // score per wave cleared
  scorePerLife: 100, // victory bonus per life left
};

export const DIFFICULTY = {
  normal: { label: 'Normal', lives: 20, hpMul: 1.0, scoreMul: 1.0,
            blurb: 'The tide as it comes. Learn the ropes.' },
  hard: { label: 'Hard', lives: 12, hpMul: 1.25, scoreMul: 1.2,
          blurb: 'Fewer lives, tougher tide, +20% score.' },
};

// Enemy HP grows with the wave (bosses carry their own HP per appearance).
export function hpMultiplier(wave) {
  return 1 + 0.13 * (wave - 1) + Math.max(0, wave - 10) * 0.12;
}
export function speedMultiplier(wave) {
  return Math.min(1.18, 1 + 0.013 * (wave - 1));
}

export const TOWERS = {
  ember: {
    key: 'ember', name: 'Ember Turret', short: 'Ember', cost: 50, color: '#ffb347',
    desc: 'Rapid bolts. Cheap, reliable, always useful.',
    levels: [
      { dmg: 8, range: 130, rate: 3 },
      { dmg: 13, range: 145, rate: 3, cost: 45 },
      { dmg: 20, range: 150, rate: 4, cost: 80 },
    ],
  },
  prism: {
    key: 'prism', name: 'Prism Spire', short: 'Prism', cost: 100, color: '#2ec4b6',
    desc: 'Bolts burst on impact, splashing nearby foes.',
    levels: [
      { dmg: 14, range: 150, rate: 1, splash: 55 },
      { dmg: 22, range: 160, rate: 1, splash: 65, cost: 80 },
      { dmg: 34, range: 170, rate: 1.2, splash: 80, cost: 140 },
    ],
  },
  gale: {
    key: 'gale', name: 'Gale Fan', short: 'Gale', cost: 80, color: '#7fb3ff',
    desc: 'A chilling aura that slows every foe in reach.',
    levels: [
      { dmg: 3, range: 120, rate: 2, slow: 0.3, slowDur: 1.2 },
      { dmg: 5, range: 135, rate: 2, slow: 0.4, slowDur: 1.4, cost: 60 },
      { dmg: 8, range: 150, rate: 2, slow: 0.5, slowDur: 1.6, cost: 100 },
    ],
  },
  nova: {
    key: 'nova', name: 'Nova Mortar', short: 'Nova', cost: 160, color: '#ff6b9d',
    desc: 'Heavy shells, huge bursts. Slow to reload.',
    levels: [
      { dmg: 40, range: 190, rate: 0.5, splash: 80 },
      { dmg: 65, range: 200, rate: 0.5, splash: 95, cost: 130 },
      { dmg: 100, range: 210, rate: 0.55, splash: 110, cost: 200 },
    ],
  },
};
export const TOWER_ORDER = ['ember', 'prism', 'gale', 'nova'];

export const ENEMIES = {
  mote: { key: 'mote', name: 'Mote', plural: 'Motes', hp: 22, speed: 95,
          gold: 5, leak: 1, radius: 11, color: '#c77dff', eye: '#f3e5ff' },
  husk: { key: 'husk', name: 'Husk', plural: 'Husks', hp: 55, speed: 62,
          gold: 8, leak: 1, radius: 14, color: '#8d99ae', eye: '#ffd166' },
  wraith: { key: 'wraith', name: 'Wraith', plural: 'Wraiths', hp: 34, speed: 130,
            gold: 9, leak: 1, radius: 12, color: '#90e0ef', eye: '#ffffff' },
  brute: { key: 'brute', name: 'Brute', plural: 'Brutes', hp: 220, speed: 42,
           gold: 15, leak: 2, radius: 19, color: '#e63946', eye: '#ffe66d' },
  spitter: { key: 'spitter', name: 'Spitter', plural: 'Spitters', hp: 80, speed: 55,
             gold: 12, leak: 1, radius: 14, color: '#80b918', eye: '#1d3557',
             splits: 'mote', splitCount: 2 },
  titan: { key: 'titan', name: 'Gloom Titan', plural: 'Titans', hp: 1800, speed: 34,
           gold: 150, leak: 5, radius: 28, color: '#ff0054', eye: '#ffffff', boss: true },
};

// A wave is groups of enemies: { type, count, gap, delay, hp?, gold? }.
// gap = seconds between spawns inside the group; delay = seconds after the
// wave starts before the group begins. Boss groups set their own hp and gold.
export const WAVES = [
  { groups: [{ type: 'mote', count: 8, gap: 0.9 }] },
  { groups: [{ type: 'husk', count: 8, gap: 1.0 },
             { type: 'mote', count: 6, gap: 0.7, delay: 4 }] },
  { groups: [{ type: 'wraith', count: 8, gap: 0.8 },
             { type: 'husk', count: 6, gap: 1.0, delay: 3 }] },
  { groups: [{ type: 'brute', count: 5, gap: 1.6 },
             { type: 'mote', count: 10, gap: 0.5, delay: 3 }] },
  { groups: [{ type: 'titan', count: 1, gap: 1, hp: 1800, gold: 150 },
             { type: 'husk', count: 8, gap: 1.0, delay: 2 },
             { type: 'wraith', count: 6, gap: 0.7, delay: 6 }],
    banner: 'WAVE 5 — THE TITAN WAKES' },
  { groups: [{ type: 'spitter', count: 6, gap: 1.2 },
             { type: 'wraith', count: 10, gap: 0.6, delay: 2 }] },
  { groups: [{ type: 'brute', count: 8, gap: 1.3 },
             { type: 'husk', count: 10, gap: 0.8, delay: 3 }] },
  { groups: [{ type: 'wraith', count: 16, gap: 0.5 },
             { type: 'spitter', count: 6, gap: 1.1, delay: 4 }] },
  { groups: [{ type: 'brute', count: 10, gap: 1.2 },
             { type: 'mote', count: 16, gap: 0.4, delay: 2 },
             { type: 'husk', count: 8, gap: 0.9, delay: 6 }] },
  { groups: [{ type: 'titan', count: 1, gap: 1, hp: 5000, gold: 250 },
             { type: 'brute', count: 6, gap: 1.4, delay: 3 },
             { type: 'spitter', count: 8, gap: 1.0, delay: 6 }],
    banner: 'WAVE 10 — THE TITAN RETURNS' },
  { groups: [{ type: 'wraith', count: 26, gap: 0.45 },
             { type: 'husk', count: 16, gap: 0.7, delay: 3 }] },
  { groups: [{ type: 'brute', count: 15, gap: 1.1 },
             { type: 'spitter', count: 13, gap: 0.9, delay: 3 },
             { type: 'mote', count: 26, gap: 0.35, delay: 6 }] },
  { groups: [{ type: 'wraith', count: 24, gap: 0.5 },
             { type: 'brute', count: 13, gap: 1.1, delay: 2 },
             { type: 'spitter', count: 11, gap: 0.9, delay: 5 }] },
  { groups: [{ type: 'brute', count: 18, gap: 1.0 },
             { type: 'husk', count: 20, gap: 0.6, delay: 2 },
             { type: 'wraith', count: 22, gap: 0.45, delay: 5 }] },
  { groups: [{ type: 'titan', count: 1, gap: 1, hp: 10000, gold: 400 },
             { type: 'brute', count: 14, gap: 1.2, delay: 4 },
             { type: 'spitter', count: 13, gap: 0.9, delay: 7 },
             { type: 'wraith', count: 20, gap: 0.5, delay: 10 },
             { type: 'mote', count: 28, gap: 0.35, delay: 12 }],
    banner: 'WAVE 15 — THE FINAL TIDE' },
];
export const TOTAL_WAVES = WAVES.length;

// Human-readable preview of a wave's composition, for the Start Wave button.
export function wavePreview(waveIndex) {
  const wave = WAVES[waveIndex];
  if (!wave) return '';
  return wave.groups
    .map((g) => `${g.count} ${ENEMIES[g.type].plural}`)
    .join(' + ');
}
