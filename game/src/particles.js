// Juice: sparks, bursts, rings, floating combat text, and the screen shake
// that sells a leak. Purely visual — nothing here touches the simulation.

import { rand, TAU } from './utils.js';

export function burst(particles, x, y, { color = '#ffd166', count = 10, speed = 160, size = 3, life = 0.5, grav = 260 } = {}) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU);
    const v = rand(speed * 0.3, speed);
    particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
      life: rand(life * 0.5, life), maxLife: life,
      size: rand(size * 0.5, size * 1.4), color, grav,
      kind: 'spark',
    });
  }
}

export function ring(particles, x, y, { color = '#7fb3ff', radius = 120, life = 0.4 } = {}) {
  particles.push({ x, y, kind: 'ring', radius, life, maxLife: life, color });
}

export function floatText(texts, x, y, text, { color = '#ffcf3f', size = 14 } = {}) {
  texts.push({ x: x + rand(-6, 6), y, text, life: 0.9, maxLife: 0.9, color, size });
}

export function updateParticles(particles, dt) {
  for (const p of particles) {
    p.life -= dt;
    if (p.kind === 'spark') {
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

export function updateTexts(texts, dt) {
  for (const t of texts) {
    t.life -= dt;
    t.y -= 34 * dt;
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    if (texts[i].life <= 0) texts.splice(i, 1);
  }
}

// Screen shake: a trauma value (0..1) that decays; the renderer offsets the
// canvas by trauma^2 * max pixels in a random direction each frame.
export function addTrauma(state, amount) {
  state.trauma = Math.min(1, (state.trauma || 0) + amount);
}

export function shakeOffset(state) {
  const t = state.trauma || 0;
  if (t <= 0) return { x: 0, y: 0 };
  const mag = t * t * 9;
  return { x: rand(-mag, mag), y: rand(-mag, mag) };
}
