// Lumen Keep — the game itself: state, the loop, and every action the
// player (or the screenshot setups) can take. Systems live in their own
// files; this one wires them together and owns the rules of a run.

import { TOWERS, TOTAL_WAVES, DIFFICULTY, ECONOMY } from './config.js';
import { PLOTS, plotAt, pointAt, KEEP } from './map.js';
import { spawnEnemy, updateEnemies, damageEnemy } from './enemies.js';
import { createTower, upgradeCost, canUpgrade, upgradeTower, towerSellValue, updateTower } from './towers.js';
import { createProjectile, updateProjectiles, enemiesInRadius } from './projectiles.js';
import { burst, ring, floatText, updateParticles, updateTexts, addTrauma } from './particles.js';
import { buildQueue, isWaveCleared, isLastWave, waveBanner } from './waves.js';
import { waveClearBonus, interestOn, saveHighScore } from './economy.js';
import { sfx, setMuted, startAmbient, unlockAudio } from './audio.js';
import { render } from './render.js';
import { attachInput } from './input.js';
import { initUI, updateHUD, showScreen, fillEndScreen, banner, toast, setDifficultyButtons } from './ui.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function freshState() {
  return {
    screen: 'title', // title | playing | paused | victory | defeat
    helpFrom: 'title',
    difficulty: 'normal',
    difficultyLabel: DIFFICULTY.normal.label,
    gold: ECONOMY.startGold,
    lives: DIFFICULTY.normal.lives,
    score: 0,
    wave: 0, // index of the NEXT wave (0-based)
    phase: 'build', // build | wave | over
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    texts: [],
    spawnQueue: [],
    waveTime: 0,
    selectedPlot: null,
    selectedTower: null,
    hoverPlot: null,
    hoverTower: null,
    buildChoice: null,
    speed: 1,
    muted: false,
    kills: 0,
    leaks: 0,
    goldEarned: 0,
    elapsed: 0,
    time: 0, // global animation clock, always advancing
    trauma: 0,
    keepFlash: 0,
    newBest: false,
    actions: null,
  };
}

let state = freshState();

function diff() {
  return DIFFICULTY[state.difficulty];
}

function resetPlots() {
  for (const p of PLOTS) p.tower = null;
}

// ------------------------------------------------------------------ actions

function startGame() {
  const keepMuted = state.muted;
  const keepDiff = state.difficulty;
  state = freshState();
  state.muted = keepMuted;
  state.difficulty = keepDiff;
  state.difficultyLabel = DIFFICULTY[keepDiff].label;
  state.lives = DIFFICULTY[keepDiff].lives;
  state.actions = actions;
  resetPlots();
  state.screen = 'playing';
  showScreen('none');
  unlockAudio();
  startAmbient();
  banner('DEFEND THE KEEP — HOLD 15 WAVES');
  toast('Build towers on the glowing plots, then send wave 1.');
}

function startWave() {
  if (state.screen !== 'playing' || state.phase !== 'build') return;
  if (state.wave >= TOTAL_WAVES) return;
  state.spawnQueue = buildQueue(state.wave);
  state.waveTime = 0;
  state.phase = 'wave';
  banner(waveBanner(state.wave));
  sfx.waveStart();
}

function startWaveAt(index) {
  state.wave = index;
  startWave();
}

function setGold(n) {
  state.gold = n;
}

function placeTower(plot, kind) {
  const def = TOWERS[kind];
  if (!plot || plot.tower || state.gold < def.cost) return false;
  state.gold -= def.cost;
  const tower = createTower(kind, plot);
  plot.tower = tower;
  state.towers.push(tower);
  burst(state.particles, plot.x, plot.y, { color: def.color, count: 14, speed: 140 });
  ring(state.particles, plot.x, plot.y, { color: def.color, radius: 40 });
  sfx.build();
  return true;
}

function placeTowerAt(plotId, kind) {
  return placeTower(PLOTS[plotId], kind);
}

function upgradeTowerAt(plotId) {
  const tower = PLOTS[plotId] && PLOTS[plotId].tower;
  if (!tower || !canUpgrade(tower)) return false;
  const cost = upgradeCost(tower);
  if (state.gold < cost) return false;
  state.gold -= cost;
  upgradeTower(tower);
  ring(state.particles, tower.x, tower.y, { color: tower.def.color, radius: 50 });
  sfx.upgrade();
  return true;
}

function upgradeSelected() {
  const t = state.selectedTower;
  if (!t) return;
  const cost = upgradeCost(t);
  if (cost === null) return;
  if (state.gold < cost) { sfx.error(); toast('Not enough gold to upgrade.'); return; }
  state.gold -= cost;
  upgradeTower(t);
  ring(state.particles, t.x, t.y, { color: t.def.color, radius: 50 });
  sfx.upgrade();
}

function sellSelected() {
  const t = state.selectedTower;
  if (!t) return;
  state.gold += towerSellValue(t);
  t.plot.tower = null;
  state.towers = state.towers.filter((x) => x !== t);
  state.selectedTower = null;
  burst(state.particles, t.x, t.y, { color: '#ffcf3f', count: 10, speed: 120 });
  sfx.sell();
}

function togglePause() {
  if (state.screen === 'playing') {
    state.screen = 'paused';
    showScreen('pause');
  } else if (state.screen === 'paused') {
    state.screen = 'playing';
    showScreen('none');
  }
}

function toggleSpeed() {
  if (state.screen !== 'playing') return;
  state.speed = state.speed === 1 ? 2 : 1;
  sfx.click();
}

function toggleMute() {
  state.muted = !state.muted;
  setMuted(state.muted);
  if (!state.muted) sfx.click();
}

function showHelp() {
  if (state.screen === 'playing') state.screen = 'paused';
  state.helpFrom = state.screen === 'title' ? 'title' : 'paused';
  showScreen('help');
}

function closeHelp() {
  if (state.helpFrom === 'title') {
    state.screen = 'title';
    showScreen('title');
  } else {
    state.screen = 'paused';
    showScreen('pause');
  }
}

function toTitle() {
  state = freshState();
  state.actions = actions;
  resetPlots();
  showScreen('title');
}

function setDifficulty(d) {
  if (!DIFFICULTY[d]) return;
  state.difficulty = d;
  setDifficultyButtons(d);
  sfx.click();
}

function chooseBuild(kind) {
  if (state.screen !== 'playing') return;
  state.buildChoice = state.buildChoice === kind ? null : kind;
  state.selectedTower = null;
  sfx.click();
}

// Force an end screen with given stats (screenshot setups only).
function debugEnd(victory, stats) {
  Object.assign(state, stats);
  state.phase = 'over';
  if (victory) {
    state.screen = 'victory';
    fillEndScreen(state, true);
    showScreen('victory');
  } else {
    state.screen = 'defeat';
    fillEndScreen(state, false);
    showScreen('defeat');
  }
}

const actions = {
  chooseBuild, startWave, toggleSpeed, togglePause, toggleMute,
  showHelp, closeHelp, startGame, restart: startGame, toTitle,
  setDifficulty, upgradeSelected, sellSelected,
};
state.actions = actions;

// ---------------------------------------------------------------- simulation

function spawnSplit(kind, s) {
  const e = spawnEnemy(kind, state.wave + 1, diff());
  e.s = s;
  const p = pointAt(Math.max(0, s));
  e.x = p.x;
  e.y = p.y;
  state.enemies.push(e);
}

function handleKill(e) {
  state.kills += 1;
  state.gold += e.gold;
  state.goldEarned += e.gold;
  state.score += Math.round(e.gold * ECONOMY.scorePerGold * diff().scoreMul);
  burst(state.particles, e.x, e.y, { color: e.def.color, count: e.def.boss ? 40 : 12, speed: e.def.boss ? 260 : 170 });
  floatText(state.texts, e.x, e.y - e.radius - 6, `+${e.gold}g`, { color: '#ffcf3f' });
  sfx.kill();
  if (e.gold >= 14) sfx.coin();
  if (e.def.boss) {
    addTrauma(state, 0.5);
    banner('TITAN DOWN!');
  }
}

function damage(target, amount, opts = {}) {
  if (!target.alive) return;
  const result = damageEnemy(target, amount, state.time, spawnSplit);
  if (result === 'dead') handleKill(target);
  else if (!opts.quiet) sfx.hit();
}

function onLeak(e) {
  state.lives -= e.leak;
  state.leaks += 1;
  state.keepFlash = 0.6;
  addTrauma(state, 0.45);
  floatText(state.texts, KEEP.x - 10, KEEP.y - 70, `-${e.leak}`, { color: '#ff5d73', size: 20 });
  burst(state.particles, KEEP.x, KEEP.y, { color: '#ff5d73', count: 16, speed: 200 });
  sfx.leak();
  if (state.lives <= 0) {
    state.lives = 0;
    defeat();
  }
}

function clearWave() {
  const bonus = waveClearBonus(state.wave + 1);
  const interest = interestOn(state.gold);
  state.gold += bonus + interest;
  state.score += Math.round(ECONOMY.scorePerWave * diff().scoreMul);
  toast(`Wave ${state.wave + 1} cleared! +${bonus}g bonus, +${interest}g interest.`);
  sfx.waveClear();
  if (isLastWave(state.wave)) {
    victory();
    return;
  }
  state.wave += 1;
  state.phase = 'build';
}

function victory() {
  state.phase = 'over';
  state.screen = 'victory';
  state.score += Math.round(state.lives * ECONOMY.scorePerLife * diff().scoreMul);
  state.newBest = saveHighScore(state.score, TOTAL_WAVES, state.difficulty);
  fillEndScreen(state, true);
  showScreen('victory');
  sfx.victory();
}

function defeat() {
  state.phase = 'over';
  state.screen = 'defeat';
  saveHighScore(state.score, state.wave, state.difficulty);
  fillEndScreen(state, false);
  showScreen('defeat');
  sfx.defeat();
}

function update(dt) {
  state.elapsed += dt;
  state.keepFlash = Math.max(0, state.keepFlash - dt);
  state.trauma = Math.max(0, state.trauma - dt * 1.8);

  if (state.phase === 'wave') {
    state.waveTime += dt;
    while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.waveTime) {
      const item = state.spawnQueue.shift();
      state.enemies.push(spawnEnemy(item.type, state.wave + 1, diff(), { hp: item.hp, gold: item.gold }));
    }
    updateEnemies(state.enemies, dt, state.time, onLeak);
    if (state.screen !== 'playing') return; // defeat() may have fired mid-update
    const fx = {
      spawnProjectile(spec) {
        state.projectiles.push(createProjectile(spec));
        sfx.shoot(spec.kind);
      },
      damage,
    };
    for (const t of state.towers) updateTower(t, state.enemies, dt, state.time, fx);
    updateProjectiles(state.projectiles, dt, (p, x, y) => {
      if (p.splash > 0) {
        burst(state.particles, x, y, { color: p.kind === 'nova' ? '#ff6b9d' : '#2ec4b6', count: 12, speed: 150 });
        ring(state.particles, x, y, { color: p.kind === 'nova' ? '#ff6b9d' : '#2ec4b6', radius: p.splash });
        sfx.splash();
        for (const e of enemiesInRadius(state.enemies, x, y, p.splash)) {
          damage(e, p.dmg, { quiet: true });
        }
      } else if (p.target && p.target.alive) {
        burst(state.particles, x, y, { color: '#ffb347', count: 5, speed: 110, size: 2.5 });
        damage(p.target, p.dmg);
      }
    });
    state.projectiles = state.projectiles.filter((p) => p.alive);
    state.enemies = state.enemies.filter((e) => e.alive || e.s < 0);
    if (state.phase === 'wave' && isWaveCleared(state.spawnQueue, state.enemies)) {
      clearWave();
    }
  }

  updateParticles(state.particles, dt);
  updateTexts(state.texts, dt);
}

// ------------------------------------------------------------------- input

function towerAt(x, y) {
  for (const t of state.towers) {
    if (Math.hypot(x - t.x, y - t.y) <= 26) return t;
  }
  return null;
}

const game = {
  get state() { return state; },
  startGame, startWave, startWaveAt, setGold, placeTowerAt, upgradeTowerAt, debugEnd,

  pickAt(x, y) {
    if (state.screen !== 'playing') return;
    if (state.buildChoice) {
      const plot = plotAt(x, y);
      if (plot && !plot.tower) {
        const def = TOWERS[state.buildChoice];
        if (state.gold < def.cost) {
          sfx.error();
          toast(`Not enough gold — ${def.name} costs ${def.cost}g.`);
          return;
        }
        placeTower(plot, state.buildChoice);
        state.buildChoice = null;
      } else {
        state.buildChoice = null; // clicked elsewhere: cancel the choice
      }
      return;
    }
    const tower = towerAt(x, y);
    if (tower) {
      state.selectedTower = tower;
      state.selectedPlot = null;
      sfx.click();
      return;
    }
    state.selectedTower = null;
    state.selectedPlot = plotAt(x, y);
  },

  setHover(x, y) {
    state.hoverPlot = plotAt(x, y);
    state.hoverTower = towerAt(x, y);
    if (state.hoverPlot && state.hoverPlot.tower) state.hoverPlot = null;
  },

  key(action) {
    if (action.startsWith('build-')) {
      chooseBuild(action.slice(6));
      return;
    }
    if (action === 'start-wave') {
      if (state.screen === 'title') startGame();
      else if (state.screen === 'victory' || state.screen === 'defeat') startGame();
      else startWave();
      return;
    }
    if (action === 'pause') { togglePause(); return; }
    if (action === 'speed') { toggleSpeed(); return; }
    if (action === 'mute') { toggleMute(); return; }
    if (action === 'confirm') {
      if (state.screen === 'title') startGame();
      else if (state.screen === 'victory' || state.screen === 'defeat') startGame();
      return;
    }
    if (action === 'escape') {
      if (!document.getElementById('screen-help').classList.contains('hidden')) {
        closeHelp();
      } else if (state.buildChoice) {
        state.buildChoice = null;
      } else if (state.selectedTower) {
        state.selectedTower = null;
      } else if (state.screen === 'paused') {
        togglePause();
      } else if (state.screen === 'playing') {
        togglePause();
      }
    }
  },
};

// --------------------------------------------------------------------- boot

function loop(nowMs) {
  requestAnimationFrame(loop);
  const now = nowMs / 1000;
  const dt = Math.min(0.05, now - (loop.last ?? now));
  loop.last = now;
  state.time += dt;
  if (state.screen === 'playing') update(dt * state.speed);
  else {
    // Idle animation still runs behind the title and end screens.
    updateParticles(state.particles, dt);
    updateTexts(state.texts, dt);
    state.trauma = Math.max(0, state.trauma - dt * 1.8);
    state.keepFlash = Math.max(0, state.keepFlash - dt);
  }
  render(state, ctx);
  if (state.screen === 'playing' || state.screen === 'paused') updateHUD(state);
}

initUI(actions);
attachInput(canvas, game);
canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  game.key('escape');
});
setDifficultyButtons('normal');
showScreen('title');

// Exposed for play-testing and screenshots (state inspection from the console).
window.__game = game;

const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) {
  setupShot(game, shot);
  // Let the first frame paint before signalling capture readiness.
  requestAnimationFrame(() => { window.__shotReady = true; });
} else {
  window.__shotReady = true;
}

requestAnimationFrame(loop);
