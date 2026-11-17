// Everything the eye sees, drawn on one canvas: the night shore, the road,
// the Keep's sweeping light, towers, the tide, projectiles, and the juice.
// The HUD and menus are DOM (see ui.js); this file owns the game world.

import { VIEW, COLORS, TOWERS } from './config.js';
import { PATH_POINTS, PATH_WIDTH, PATH_LENGTH, KEEP, PLOTS, pointAt } from './map.js';
import { isSlowed } from './enemies.js';
import { towerStats } from './towers.js';
import { shakeOffset } from './particles.js';
import { clamp, rand, TAU } from './utils.js';

// Static decoration, placed once so the shore does not shimmer.
const GROUND_DOTS = Array.from({ length: 260 }, () => ({
  x: rand(0, VIEW.W), y: rand(48, 644), r: rand(1, 2.6),
  a: rand(0.04, 0.12),
}));

// Path samples, for keeping decoration off the road.
const PATH_SAMPLES = [];
for (let d = 0; d <= PATH_LENGTH; d += 15) PATH_SAMPLES.push(pointAt(d));
function distToPath(x, y) {
  let best = Infinity;
  for (const p of PATH_SAMPLES) {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < best) best = d;
  }
  return best;
}
function clearSpot(x, y, clearance) {
  if (distToPath(x, y) < clearance) return false;
  for (const p of PLOTS) {
    if (Math.hypot(x - p.x, y - p.y) < 40) return false;
  }
  if (Math.hypot(x - KEEP.x, y - KEEP.y) < 80) return false;
  return true;
}
function scatter(count, make) {
  const out = [];
  let tries = 0;
  while (out.length < count && tries < count * 40) {
    tries++;
    const x = rand(20, VIEW.W - 20);
    const y = rand(58, 634);
    if (clearSpot(x, y, 42)) out.push(make(x, y));
  }
  return out;
}
// Rocks, grass tufts and glow-flowers scattered on the empty shore.
const ROCKS = scatter(26, (x, y) => ({ x, y, rx: rand(4, 9), ry: rand(3, 6), a: rand(0.2, 0.4) }));
const TUFTS = scatter(30, (x, y) => ({ x, y, s: rand(0.7, 1.3), a: rand(0.25, 0.5) }));
const FLOWERS = scatter(18, (x, y) => ({
  x, y, color: ['#2ec4b6', '#ffd166', '#c77dff'][Math.floor(rand(0, 3))], tw: rand(0, TAU),
}));
// Fireflies drift over the field; their motion is a pure function of time.
const FIREFLIES = Array.from({ length: 34 }, () => ({
  x: rand(30, VIEW.W - 30), y: rand(60, 630),
  ax: rand(6, 18), ay: rand(4, 12), sp: rand(0.2, 0.6), ph: rand(0, TAU),
}));
// Small stones edging the road, sampled along the path.
const PATH_STONES = [];
for (let d = 30; d < PATH_LENGTH; d += 46) {
  const p = pointAt(d);
  const side = (d / 46) % 2 === 0 ? 1 : -1;
  const nx = Math.cos(p.angle + Math.PI / 2) * side;
  const ny = Math.sin(p.angle + Math.PI / 2) * side;
  PATH_STONES.push({
    x: p.x + nx * (PATH_WIDTH / 2 + 4),
    y: p.y + ny * (PATH_WIDTH / 2 + 4),
    r: rand(2.5, 4.5),
  });
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}

export function render(state, ctx) {
  const now = state.time;
  ctx.save();
  const sh = shakeOffset(state);
  ctx.translate(sh.x, sh.y);

  drawGround(ctx, now);
  drawPath(ctx);
  drawSeaGate(ctx, now);
  drawPlots(state, ctx);
  drawKeep(state, ctx, now);
  drawTowers(state, ctx, now);
  drawEnemies(state, ctx, now);
  drawProjectiles(state, ctx);
  drawParticles(state, ctx);
  drawTexts(state, ctx);
  drawBossBar(state, ctx);
  drawGhost(state, ctx);
  drawVignette(ctx);

  ctx.restore();
}

function drawGround(ctx, now) {
  const g = ctx.createLinearGradient(0, 48, 0, 644);
  g.addColorStop(0, COLORS.sky1);
  g.addColorStop(0.5, COLORS.ground);
  g.addColorStop(1, COLORS.groundDark);
  ctx.fillStyle = g;
  ctx.fillRect(-12, 44, VIEW.W + 24, 612);
  // Subtle darker patches for depth.
  for (const d of GROUND_DOTS) {
    ctx.fillStyle = `rgba(0, 0, 0, ${d.a})`;
    circle(ctx, d.x, d.y, d.r);
    ctx.fill();
  }
  // Rocks.
  for (const r of ROCKS) {
    ctx.fillStyle = `rgba(0, 0, 0, ${r.a})`;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.rx, r.ry, 0, 0, TAU);
    ctx.fill();
  }
  // Grass tufts.
  ctx.strokeStyle = 'rgba(90, 120, 90, 0.55)';
  ctx.lineWidth = 1.5;
  for (const t of TUFTS) {
    ctx.globalAlpha = t.a;
    ctx.beginPath();
    ctx.moveTo(t.x - 4 * t.s, t.y + 3 * t.s);
    ctx.lineTo(t.x - 2 * t.s, t.y - 4 * t.s);
    ctx.moveTo(t.x, t.y + 3 * t.s);
    ctx.lineTo(t.x, t.y - 5 * t.s);
    ctx.moveTo(t.x + 4 * t.s, t.y + 3 * t.s);
    ctx.lineTo(t.x + 2 * t.s, t.y - 4 * t.s);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Glow-flowers, pulsing faintly.
  for (const f of FLOWERS) {
    const a = 0.4 + 0.3 * Math.sin(now * 1.6 + f.tw);
    ctx.fillStyle = f.color;
    ctx.globalAlpha = a;
    circle(ctx, f.x, f.y, 2.5);
    ctx.fill();
    ctx.globalAlpha = a * 0.25;
    circle(ctx, f.x, f.y, 6);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Fireflies drifting over the shore.
  for (const f of FIREFLIES) {
    const x = f.x + Math.sin(now * f.sp + f.ph) * f.ax;
    const y = f.y + Math.cos(now * f.sp * 0.8 + f.ph) * f.ay;
    const a = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(now * 2 + f.ph * 3));
    ctx.fillStyle = `rgba(255, 220, 130, ${a.toFixed(3)})`;
    circle(ctx, x, y, 1.8);
    ctx.fill();
  }
  // The field's top and bottom edges.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 48, VIEW.W, 3);
  ctx.fillRect(0, 641, VIEW.W, 3);
}

function drawPath(ctx) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Road bed.
  ctx.strokeStyle = COLORS.pathEdge;
  ctx.lineWidth = PATH_WIDTH + 8;
  ctx.beginPath();
  ctx.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
  for (const p of PATH_POINTS.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.strokeStyle = COLORS.path;
  ctx.lineWidth = PATH_WIDTH;
  ctx.beginPath();
  ctx.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
  for (const p of PATH_POINTS.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  // Centre dashes, pointing the way.
  ctx.strokeStyle = 'rgba(255, 220, 150, 0.28)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 26]);
  ctx.beginPath();
  ctx.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
  for (const p of PATH_POINTS.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Edge stones.
  ctx.fillStyle = '#6b5d8a';
  for (const s of PATH_STONES) {
    circle(ctx, s.x, s.y, s.r);
    ctx.fill();
  }
}

function drawSeaGate(ctx, now) {
  // Where the tide crawls out of the dark water: a black maw with violet glow.
  const x = 6;
  const y = 160;
  const pulse = 0.5 + 0.2 * Math.sin(now * 2.2);
  const g = ctx.createRadialGradient(x, y, 4, x, y, 64);
  g.addColorStop(0, `rgba(157, 78, 221, ${0.55 * pulse + 0.25})`);
  g.addColorStop(1, 'rgba(157, 78, 221, 0)');
  ctx.fillStyle = g;
  circle(ctx, x, y, 64);
  ctx.fill();
  ctx.fillStyle = '#05070f';
  ctx.beginPath();
  ctx.ellipse(x, y, 26, 34, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#3d2b5e';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawPlots(state, ctx) {
  for (const p of PLOTS) {
    if (p.tower) continue;
    const hovered = state.hoverPlot === p;
    ctx.fillStyle = hovered ? '#2c3a6b' : COLORS.plot;
    circle(ctx, p.x, p.y, p.radius);
    ctx.fill();
    ctx.strokeStyle = hovered ? '#8fa3ff' : COLORS.plotEdge;
    ctx.lineWidth = hovered ? 2.5 : 1.5;
    ctx.stroke();
    // Faint build cross.
    ctx.strokeStyle = hovered ? 'rgba(200, 210, 255, 0.8)' : 'rgba(160, 175, 230, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - 7, p.y);
    ctx.lineTo(p.x + 7, p.y);
    ctx.moveTo(p.x, p.y - 7);
    ctx.lineTo(p.x, p.y + 7);
    ctx.stroke();
  }
}

function drawKeep(state, ctx, now) {
  const { x, y } = KEEP;
  const flash = state.keepFlash > 0 ? state.keepFlash : 0;
  // Rotating light beam.
  const beamAngle = now * 0.35;
  ctx.save();
  ctx.translate(x, y - 34);
  ctx.rotate(beamAngle);
  const beam = ctx.createLinearGradient(0, 0, 260, 0);
  beam.addColorStop(0, 'rgba(255, 209, 102, 0.35)');
  beam.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(260, -34);
  ctx.lineTo(260, 34);
  ctx.lineTo(0, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Lamp glow.
  const glow = ctx.createRadialGradient(x, y - 34, 4, x, y - 34, 70);
  glow.addColorStop(0, 'rgba(255, 209, 102, 0.5)');
  glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = glow;
  circle(ctx, x, y - 34, 70);
  ctx.fill();
  // Tower: striped lighthouse.
  ctx.fillStyle = flash > 0 ? '#ff5d73' : '#e8ecff';
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 22);
  ctx.lineTo(x - 11, y - 30);
  ctx.lineTo(x + 11, y - 30);
  ctx.lineTo(x + 16, y + 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e63946';
  ctx.fillRect(x - 13.5, y - 12, 27, 9);
  ctx.fillRect(x - 15, y + 10, 30, 9);
  // Lamp room.
  ctx.fillStyle = '#2b2d42';
  ctx.fillRect(x - 12, y - 44, 24, 15);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(x - 9, y - 41, 18, 9);
  ctx.fillStyle = '#2b2d42';
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 44);
  ctx.lineTo(x, y - 56);
  ctx.lineTo(x + 14, y - 44);
  ctx.closePath();
  ctx.fill();
  // Base rock.
  ctx.fillStyle = '#3a3350';
  ctx.beginPath();
  ctx.ellipse(x, y + 24, 30, 10, 0, 0, TAU);
  ctx.fill();
}

function drawRangeRing(ctx, x, y, range, color) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  circle(ctx, x, y, range);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawTowers(state, ctx, now) {
  for (const t of state.towers) {
    const stats = towerStats(t);
    if (state.selectedTower === t || state.hoverTower === t) {
      drawRangeRing(ctx, t.x, t.y, stats.range, t.def.color);
    }
    // Base.
    ctx.fillStyle = '#2b3358';
    circle(ctx, t.x, t.y, 22);
    ctx.fill();
    ctx.strokeStyle = '#4a587f';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Level pips.
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i <= t.level ? t.def.color : 'rgba(255,255,255,0.15)';
      circle(ctx, t.x - 12 + i * 12, t.y + 26, 3);
      ctx.fill();
    }
    if (t.kind === 'ember') {
      const kick = t.recoil * 4;
      const bx = t.x + Math.cos(t.angle) * (10 - kick);
      const by = t.y + Math.sin(t.angle) * (10 - kick);
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(bx + Math.cos(t.angle) * 12, by + Math.sin(t.angle) * 12);
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      circle(ctx, t.x, t.y, 9);
      ctx.fill();
      ctx.fillStyle = '#7a4a12';
      circle(ctx, t.x, t.y, 4);
      ctx.fill();
    } else if (t.kind === 'prism') {
      const spin = now * 1.2 + t.id;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(spin);
      ctx.fillStyle = '#2ec4b6';
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 13);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 7);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (t.kind === 'gale') {
      const spin = now * 6 + t.id;
      ctx.strokeStyle = '#7fb3ff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = spin + (i * TAU) / 3;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x + Math.cos(a) * 14, t.y + Math.sin(a) * 14);
        ctx.stroke();
      }
      ctx.fillStyle = '#dbe7ff';
      circle(ctx, t.x, t.y, 6);
      ctx.fill();
      if (t.pulse > 0) {
        ctx.strokeStyle = `rgba(127, 179, 255, ${(t.pulse / 0.35).toFixed(3)})`;
        ctx.lineWidth = 2;
        circle(ctx, t.x, t.y, stats.range * (1 - t.pulse / 0.35) + 20);
        ctx.stroke();
      }
    } else if (t.kind === 'nova') {
      const kick = t.recoil * 3;
      ctx.fillStyle = '#ff6b9d';
      circle(ctx, t.x, t.y, 13 - kick * 0.3);
      ctx.fill();
      ctx.fillStyle = '#5c1631';
      circle(ctx, t.x + Math.cos(t.angle) * 6, t.y + Math.sin(t.angle) * 6, 5);
      ctx.fill();
      ctx.strokeStyle = '#ffd6e5';
      ctx.lineWidth = 2;
      circle(ctx, t.x, t.y, 13);
      ctx.stroke();
    }
  }
}

function drawEnemies(state, ctx, now) {
  for (const e of state.enemies) {
    if (!e.alive || e.s < -2) continue;
    const slowed = isSlowed(e, now);
    const flash = now < e.flashUntil;
    const bob = Math.sin(now * 6 + e.wobble) * 2;
    const y = e.y + bob;
    // Shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.radius * 0.8, e.radius * 0.9, e.radius * 0.35, 0, 0, TAU);
    ctx.fill();
    // Faint glow in the foe's own colour, so the tide reads at a glance.
    const glow = ctx.createRadialGradient(e.x, y, 2, e.x, y, e.radius * 2.2);
    glow.addColorStop(0, e.def.color + '44');
    glow.addColorStop(1, e.def.color + '00');
    ctx.fillStyle = glow;
    circle(ctx, e.x, y, e.radius * 2.2);
    ctx.fill();
    // Body.
    ctx.fillStyle = flash ? '#ffffff' : e.def.color;
    circle(ctx, e.x, y, e.radius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Spikes for brutes and titans.
    if (e.kind === 'brute' || e.kind === 'titan') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + e.wobble;
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(a) * (e.radius - 2), y + Math.sin(a) * (e.radius - 2));
        ctx.lineTo(e.x + Math.cos(a) * (e.radius + 6), y + Math.sin(a) * (e.radius + 6));
        ctx.lineTo(e.x + Math.cos(a + 0.35) * (e.radius - 2), y + Math.sin(a + 0.35) * (e.radius - 2));
        ctx.closePath();
        ctx.fill();
      }
    }
    // Eyes, looking down the path.
    const ex = Math.cos(e.angle);
    const ey = Math.sin(e.angle);
    const px = -ey;
    const py = ex;
    ctx.fillStyle = e.def.eye;
    circle(ctx, e.x + ex * 4 + px * 5, y + ey * 4 + py * 5, e.radius * 0.22);
    ctx.fill();
    circle(ctx, e.x + ex * 4 - px * 5, y + ey * 4 - py * 5, e.radius * 0.22);
    ctx.fill();
    // Slow tint.
    if (slowed) {
      ctx.fillStyle = 'rgba(127, 179, 255, 0.35)';
      circle(ctx, e.x, y, e.radius);
      ctx.fill();
    }
    // HP bar (titans always, others only when hurt).
    if (e.kind === 'titan' || e.hp < e.maxHp) {
      const w = Math.max(26, e.radius * 2);
      const ratio = clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(e.x - w / 2, y - e.radius - 11, w, 5);
      ctx.fillStyle = ratio > 0.5 ? '#80b918' : ratio > 0.25 ? '#ffaa00' : '#ff5d73';
      ctx.fillRect(e.x - w / 2, y - e.radius - 11, w * ratio, 5);
    }
  }
}

function drawProjectiles(state, ctx) {
  for (const p of state.projectiles) {
    if (!p.alive) continue;
    const color = p.kind === 'ember' ? '#ffb347' : p.kind === 'prism' ? '#2ec4b6' : '#ff6b9d';
    // Trail.
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    for (const t of p.trail) ctx.lineTo(t.x, t.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Head.
    ctx.fillStyle = color;
    circle(ctx, p.x, p.y, p.kind === 'nova' ? 6 : 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    circle(ctx, p.x, p.y, 2);
    ctx.fill();
  }
}

function drawParticles(state, ctx) {
  for (const p of state.particles) {
    const ratio = clamp(p.life / p.maxLife, 0, 1);
    if (p.kind === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = ratio;
      ctx.lineWidth = 2.5;
      circle(ctx, p.x, p.y, p.radius * (1 - ratio) + 12);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = ratio;
      ctx.fillStyle = p.color;
      circle(ctx, p.x, p.y, p.size * ratio + 0.5);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawTexts(state, ctx) {
  ctx.textAlign = 'center';
  for (const t of state.texts) {
    const ratio = clamp(t.life / t.maxLife, 0, 1);
    ctx.globalAlpha = ratio;
    ctx.font = `700 ${t.size}px system-ui, sans-serif`;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawBossBar(state, ctx) {
  const boss = state.enemies.find((e) => e.alive && e.kind === 'titan');
  if (!boss) return;
  const w = 420;
  const x = (VIEW.W - w) / 2;
  const y = 56;
  ctx.fillStyle = 'rgba(10, 8, 24, 0.75)';
  ctx.fillRect(x - 8, y - 8, w + 16, 26);
  ctx.strokeStyle = '#ff0054';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 8, y - 8, w + 16, 26);
  const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
  ctx.fillStyle = '#3d0a1e';
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = '#ff0054';
  ctx.fillRect(x, y, w * ratio, 10);
  ctx.fillStyle = '#ffd6e5';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`GLOOM TITAN — ${Math.ceil(boss.hp).toLocaleString('en-US')} HP`, x + w / 2, y - 12 + 22);
  ctx.textAlign = 'left';
}

function drawGhost(state, ctx) {
  if (!state.buildChoice || !state.hoverPlot || state.hoverPlot.tower) return;
  const def = TOWERS[state.buildChoice];
  const p = state.hoverPlot;
  const afford = state.gold >= def.cost;
  drawRangeRing(ctx, p.x, p.y, def.levels[0].range, afford ? '#80b918' : '#ff5d73');
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = def.color;
  circle(ctx, p.x, p.y, 14);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(
    VIEW.W / 2, VIEW.H / 2, VIEW.H * 0.42,
    VIEW.W / 2, VIEW.H / 2, VIEW.H * 0.78,
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
}
